/**
 * Multi-layer price extraction engine.
 *
 * Extraction priority:
 *   1. JSON-LD Product schema (most reliable)
 *   2. Open Graph / meta tags
 *   3. Site-specific regex patterns (from siteConfigs.js)
 *   4. Generic BDT price detection (regex for ৳, BDT, Tk patterns)
 *
 * Works on ANY website — site configs are optional enhancements.
 */

const https = require("https");
const http = require("http");
const zlib = require("zlib");
const { getConfigForUrl, getSiteName } = require("./siteConfigs");

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate",
  Connection: "keep-alive",
  "Cache-Control": "no-cache",
};

const TIMEOUT_MS = 15000;

// ─── Main export ──────────────────────────────────────────────

/**
 * Scrape a single URL and extract price data.
 * @param {string} url
 * @returns {Promise<ScrapeResult>}
 */
async function scrapePrice(url) {
  const start = Date.now();
  const siteConfig = getConfigForUrl(url);
  const siteName = getSiteName(url);

  try {
    const html = await fetchPage(url, siteConfig.extraHeaders || {});
    const result = extractPriceFromHtml(html, url, siteConfig);

    return {
      url,
      siteName,
      domain: siteConfig.domain || extractDomain(url),
      ...result,
      fetchTimeMs: Date.now() - start,
      scrapedAt: new Date().toISOString(),
      error: null,
    };
  } catch (err) {
    return {
      url,
      siteName,
      domain: siteConfig.domain || extractDomain(url),
      price: null,
      originalPrice: null,
      discountPrice: null,
      currency: "BDT",
      inStock: null,
      method: "failed",
      fetchTimeMs: Date.now() - start,
      scrapedAt: new Date().toISOString(),
      error: String(err.message || err),
    };
  }
}

/**
 * Scrape multiple URLs with concurrency control and per-domain delay.
 * @param {string[]} urls
 * @param {number} concurrency
 * @returns {Promise<ScrapeResult[]>}
 */
async function scrapeMultiple(urls, concurrency = 4) {
  const results = [];
  const queue = [...urls];
  const domainLastFetch = {};

  const worker = async () => {
    while (queue.length) {
      const url = queue.shift();
      if (!url) continue;

      const domain = extractDomain(url);

      // Politeness delay: wait 300ms between requests to same domain
      const lastFetch = domainLastFetch[domain] || 0;
      const elapsed = Date.now() - lastFetch;
      if (elapsed < 300) {
        await sleep(300 - elapsed);
      }

      domainLastFetch[domain] = Date.now();
      const result = await scrapePrice(url);
      results.push(result);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, () => worker()));
  return results;
}

// ─── HTML Fetcher ─────────────────────────────────────────────

function fetchPage(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === "https:" ? https : http;

    const headers = { ...DEFAULT_HEADERS, ...extraHeaders };

    const req = client.get(
      url,
      {
        headers,
        timeout: TIMEOUT_MS,
        rejectUnauthorized: false,
      },
      (res) => {
        // Follow redirects (up to 5)
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, url).toString();
          return fetchPage(redirectUrl, extraHeaders).then(resolve).catch(reject);
        }

        // On 403, fallback to curl which has a real TLS fingerprint
        if (res.statusCode === 403) {
          res.resume();
          return fetchWithCurl(url, headers).then(resolve).catch(reject);
        }

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          res.resume();
          return;
        }

        const chunks = [];
        const encoding = (res.headers["content-encoding"] || "").toLowerCase();
        let stream = res;

        if (encoding === "gzip") {
          stream = res.pipe(zlib.createGunzip());
        } else if (encoding === "deflate") {
          stream = res.pipe(zlib.createInflate());
        } else if (encoding === "br") {
          stream = res.pipe(zlib.createBrotliDecompress());
        }

        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
        stream.on("error", reject);
      }
    );

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });
    req.on("error", reject);
  });
}

/**
 * Fallback fetcher using system curl — bypasses Cloudflare TLS fingerprinting.
 * Used automatically when Node.js https gets a 403.
 */
function fetchWithCurl(url, headers = {}) {
  const { execFile } = require("child_process");

  const args = [
    "-s",                       // silent
    "-L",                       // follow redirects
    "--max-time", "20",         // 20s timeout
    "--compressed",             // handle gzip/br
    "-A", DEFAULT_HEADERS["User-Agent"],
    "-H", `Accept: ${DEFAULT_HEADERS["Accept"]}`,
    "-H", `Accept-Language: ${DEFAULT_HEADERS["Accept-Language"]}`,
  ];

  // Add any extra headers from site config
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== "user-agent" &&
        key.toLowerCase() !== "accept" &&
        key.toLowerCase() !== "accept-language") {
      args.push("-H", `${key}: ${value}`);
    }
  }

  args.push(url);

  return new Promise((resolve, reject) => {
    execFile("curl", args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`curl failed: ${err.message}`));
      } else {
        resolve(stdout);
      }
    });
  });
}

// ─── Multi-layer Price Extraction ─────────────────────────────

function extractPriceFromHtml(html, url, siteConfig) {
  const hasSitePatterns = siteConfig.pricePatterns && siteConfig.pricePatterns.length > 0;

  // Layer 1: JSON-LD (always most reliable)
  const jsonLd = extractFromJsonLd(html);
  if (jsonLd.price !== null) return jsonLd;

  // Layer 2a: Site-specific patterns (run FIRST when config exists — more precise than meta tags)
  if (hasSitePatterns) {
    const siteSpecific = extractFromSitePatterns(html, siteConfig);
    if (siteSpecific.price !== null) return siteSpecific;
  }

  // Layer 2b: Meta tags (og:price:amount etc.)
  const meta = extractFromMetaTags(html);
  if (meta.price !== null) return meta;

  // Layer 3: Site-specific patterns fallback (if not already tried)
  if (!hasSitePatterns) {
    const siteSpecific = extractFromSitePatterns(html, siteConfig);
    if (siteSpecific.price !== null) return siteSpecific;
  }

  // Layer 4: Generic BDT price detection
  const generic = extractGenericBdtPrice(html);
  if (generic.price !== null) return generic;

  return {
    price: null,
    originalPrice: null,
    discountPrice: null,
    currency: "BDT",
    inStock: extractStockStatus(html),
    method: "none",
  };
}

// ─── Layer 1: JSON-LD Schema.org ──────────────────────────────

function extractFromJsonLd(html) {
  const result = { price: null, originalPrice: null, discountPrice: null, currency: "BDT", inStock: null, method: "json-ld" };

  // Find all JSON-LD blocks
  const jsonLdPattern = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = jsonLdPattern.exec(html)) !== null) {
    try {
      let data = JSON.parse(match[1].trim());

      // Handle @graph wrapper
      if (data["@graph"] && Array.isArray(data["@graph"])) {
        data = data["@graph"];
      }

      const products = findProductObjects(Array.isArray(data) ? data : [data]);

      for (const product of products) {
        const offers = product.offers || product.Offers;
        if (!offers) continue;

        const offerList = Array.isArray(offers) ? offers : [offers];
        for (const offer of offerList) {
          const price = parsePrice(offer.price || offer.lowPrice || offer.highPrice);
          if (price !== null) {
            result.price = price;
            result.currency = offer.priceCurrency || "BDT";

            // Check for original vs sale price
            if (offer.price && offer.lowPrice && offer.price !== offer.lowPrice) {
              result.originalPrice = parsePrice(offer.price);
              result.discountPrice = parsePrice(offer.lowPrice);
            }

            // Stock status
            const availability = String(offer.availability || "").toLowerCase();
            if (availability.includes("instock") || availability.includes("in_stock")) {
              result.inStock = true;
            } else if (availability.includes("outofstock") || availability.includes("out_of_stock")) {
              result.inStock = false;
            }

            return result;
          }
        }
      }
    } catch {
      // Invalid JSON-LD, continue
    }
  }

  return result;
}

function findProductObjects(items) {
  const products = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const type = String(item["@type"] || "").toLowerCase();
    if (type === "product" || type === "individualproduct" || type === "productmodel") {
      products.push(item);
    }
    // Recurse into arrays
    for (const val of Object.values(item)) {
      if (Array.isArray(val)) {
        products.push(...findProductObjects(val));
      } else if (val && typeof val === "object" && val["@type"]) {
        products.push(...findProductObjects([val]));
      }
    }
  }
  return products;
}

// ─── Layer 2: Meta Tags ───────────────────────────────────────

function extractFromMetaTags(html) {
  const result = { price: null, originalPrice: null, discountPrice: null, currency: "BDT", inStock: null, method: "meta-tag" };

  const metaPatterns = [
    /meta\s[^>]*property\s*=\s*["'](?:og:|product:)price:amount["'][^>]*content\s*=\s*["']([^"']+)["']/gi,
    /meta\s[^>]*content\s*=\s*["']([^"']+)["'][^>]*property\s*=\s*["'](?:og:|product:)price:amount["']/gi,
  ];

  for (const pattern of metaPatterns) {
    const match = pattern.exec(html);
    if (match) {
      const price = parsePrice(match[1]);
      if (price !== null) {
        result.price = price;

        // Try to find currency meta
        const currencyMatch = html.match(
          /meta\s[^>]*property\s*=\s*["'](?:og:|product:)price:currency["'][^>]*content\s*=\s*["']([^"']+)["']/i
        );
        if (currencyMatch) result.currency = currencyMatch[1];

        result.inStock = extractStockStatus(html);
        return result;
      }
    }
  }

  return result;
}

// ─── Layer 3: Site-specific Patterns ──────────────────────────

function extractFromSitePatterns(html, siteConfig) {
  const result = { price: null, originalPrice: null, discountPrice: null, currency: "BDT", inStock: null, method: "site-pattern" };

  if (!siteConfig.pricePatterns || !siteConfig.pricePatterns.length) {
    return result;
  }

  // Extract current/sale price
  for (const pattern of siteConfig.pricePatterns) {
    const match = pattern.exec(html);
    if (match && match[1]) {
      const price = parsePrice(match[1]);
      if (price !== null && price > 0) {
        result.price = price;
        break;
      }
    }
  }

  // Extract original price using dedicated originalPricePatterns if defined
  if (siteConfig.originalPricePatterns && siteConfig.originalPricePatterns.length) {
    for (const pattern of siteConfig.originalPricePatterns) {
      const match = pattern.exec(html);
      if (match && match[1]) {
        const origPrice = parsePrice(match[1]);
        if (origPrice !== null && origPrice > 0) {
          result.originalPrice = origPrice;
          break;
        }
      }
    }
    // If we got both, the lower one is the sale/discount price
    if (result.price !== null && result.originalPrice !== null) {
      if (result.price < result.originalPrice) {
        result.discountPrice = result.price; // current price is the discounted one
      } else if (result.price > result.originalPrice) {
        // Regex matched old price first; swap
        result.discountPrice = result.originalPrice;
        result.originalPrice = result.price;
        result.price = result.discountPrice;
      }
    }
  } else if (result.price === null) {
    return result;
  } else {
    // No dedicated original patterns: try second pricePattern for original
    for (let i = 1; i < siteConfig.pricePatterns.length; i++) {
      const match = siteConfig.pricePatterns[i].exec(html);
      if (match && match[1]) {
        const price2 = parsePrice(match[1]);
        if (price2 !== null && price2 > 0 && price2 !== result.price) {
          if (price2 > result.price) {
            result.originalPrice = price2;
            result.discountPrice = result.price;
          } else {
            result.originalPrice = result.price;
            result.discountPrice = price2;
            result.price = price2;
          }
          break;
        }
      }
    }
  }

  // Extract stock status using site-specific stock patterns if defined
  if (siteConfig.stockPatterns && siteConfig.stockPatterns.length) {
    for (const pattern of siteConfig.stockPatterns) {
      const match = pattern.exec(html);
      if (match && match[1]) {
        const status = match[1].toLowerCase();
        result.inStock = status === "in stock";
        break;
      }
    }
  } else {
    result.inStock = extractStockStatus(html);
  }

  return result;
}

// ─── Layer 4: Generic BDT Price Detection ─────────────────────

function extractGenericBdtPrice(html) {
  const result = { price: null, originalPrice: null, discountPrice: null, currency: "BDT", inStock: null, method: "generic-bdt" };

  // Look for BDT price patterns anywhere in the page body
  // Common formats: ৳12,500 | BDT 12,500 | Tk. 12,500 | 12,500/- | &#2547;12,500
  const bdtPatterns = [
    // ৳ symbol followed by amount
    /[৳]\s*([\d,]+(?:\.\d{1,2})?)/g,
    // HTML entity for ৳
    /&#2547;\s*([\d,]+(?:\.\d{1,2})?)/g,
    // "BDT" or "Tk" prefix
    /(?:BDT|Tk\.?)\s*([\d,]+(?:\.\d{1,2})?)/gi,
    // Price-like class context
    /class="[^"]*price[^"]*"[^>]*>[\s\S]*?([\d,]{3,}(?:\.\d{1,2})?)\s*(?:<|৳|BDT|Tk)/gi,
    // Amount followed by /-
    /([\d,]{4,})\s*\/-/g,
  ];

  const foundPrices = [];

  for (const pattern of bdtPatterns) {
    let match;
    // Reset lastIndex for reusable global regexes
    pattern.lastIndex = 0;
    while ((match = pattern.exec(html)) !== null) {
      const price = parsePrice(match[1]);
      // Filter out unreasonable prices (< 50 BDT or > 100M BDT)
      if (price !== null && price >= 50 && price <= 100000000) {
        foundPrices.push(price);
      }
      if (foundPrices.length >= 10) break; // Don't scan entire page
    }
  }

  if (foundPrices.length > 0) {
    // The most commonly occurring price is likely the product price
    const freq = {};
    foundPrices.forEach((p) => (freq[p] = (freq[p] || 0) + 1));
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    const mainPrice = parseFloat(sorted[0][0]);

    result.price = mainPrice;

    // Filter out extreme outliers: only keep prices within 3x of the main price
    const reasonable = [...new Set(foundPrices)]
      .filter((p) => p >= mainPrice * 0.2 && p <= mainPrice * 3)
      .sort((a, b) => a - b);

    if (reasonable.length >= 2) {
      const lowest = reasonable[0];
      const highest = reasonable[reasonable.length - 1];
      if (lowest !== highest) {
        result.discountPrice = lowest;
        result.originalPrice = highest;
        result.price = lowest; // current/sale price
      }
    }

    result.inStock = extractStockStatus(html);
  }

  return result;
}

// ─── Helpers ──────────────────────────────────────────────────

function parsePrice(value) {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/[,\s৳]/g, "").replace(/\/-$/, "").trim();
  const num = Number(cleaned);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function extractStockStatus(html) {
  const lowerHtml = html.toLowerCase();
  if (/out\s*of\s*stock/i.test(html) || /stock\s*out/i.test(html)) return false;
  if (/in\s*stock/i.test(html) || /add\s*to\s*cart/i.test(html)) return true;
  return null;
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { scrapePrice, scrapeMultiple };
