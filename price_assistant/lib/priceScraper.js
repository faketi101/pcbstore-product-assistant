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
 *
 * Fetch strategy (per request, tried in order):
 *   A. Node https.get         — fast, works for most sites
 *   B. curl                   — better TLS fingerprint, handles more CF configs
 *   C. Node native fetch()    — different TLS stack than both above (Node 18+)
 *   D. Playwright/Chromium    — real browser, defeats all bot protection
 *                               (optional; only runs if siteConfig.usePlaywright=true
 *                                OR all above return a challenge page)
 */

const https = require("https");
const http = require("http");
const zlib = require("zlib");
const { getConfigForUrl, getSiteName } = require("./siteConfigs");

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  // NOTE: deliberately NO Accept-Encoding here — Node's zlib handles it explicitly.
  // We add it only for curl where --compressed controls decompression.
  Connection: "keep-alive",
  "Cache-Control": "no-cache",
};

const TIMEOUT_MS = 15000;

// ─── Cloudflare / bot-protection detection ────────────────────

/**
 * Returns true when the HTML is a Cloudflare challenge page or other bot-wall,
 * meaning we got a response but it contains no real product data.
 */
function isChallengePage(html) {
  if (!html || html.length < 200) return true; // empty / near-empty body
  const lower = html.toLowerCase();
  return (
    // Cloudflare challenge markers
    lower.includes("cf-browser-verification") ||
    lower.includes("checking your browser") ||
    lower.includes("enable javascript and cookies") ||
    lower.includes("cf_chl_") ||
    lower.includes("jschl_vc") ||
    lower.includes("ray id") && lower.includes("cloudflare") ||
    // Turnstile widget
    lower.includes("challenges.cloudflare.com") ||
    // Generic bot walls
    lower.includes("access denied") && lower.includes("bot") ||
    lower.includes("please wait while we verify") ||
    // Completely empty / whitespace only
    html.trim().length === 0
  );
}

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
    const html = await fetchWithFallbacks(url, siteConfig);
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

  await Promise.all(
    Array.from({ length: Math.min(concurrency, urls.length) }, () => worker())
  );
  return results;
}

// ─── Multi-layer Fetch Strategy ───────────────────────────────

/**
 * Try each fetch method in order, moving to the next one when:
 *   - the current method throws (network error, non-200, etc.), OR
 *   - the response is a challenge/bot-wall page
 *
 * @param {string} url
 * @param {object} siteConfig
 * @returns {Promise<string>} HTML
 */
async function fetchWithFallbacks(url, siteConfig) {
  const extraHeaders = siteConfig.extraHeaders || {};
  const usePlaywright = siteConfig.usePlaywright || false;
  const errors = [];

  // ── A: Node https.get ──────────────────────────────────────
  try {
    const html = await fetchPage(url, extraHeaders);
    if (!isChallengePage(html)) return html;
    errors.push("Node https: challenge page");
  } catch (err) {
    errors.push(`Node https: ${err.message}`);
  }

  // ── B: curl with safe Accept-Encoding ─────────────────────
  try {
    // Strip brotli from Accept-Encoding to avoid curl builds without brotli
    // support exiting non-zero. --compressed already handles gzip/deflate/br
    // if curl supports it; passing a mismatched header crashes it otherwise.
    const safeHeaders = buildSafeCurlHeaders(extraHeaders);
    const html = await fetchWithCurl(url, safeHeaders);
    if (!isChallengePage(html)) return html;
    errors.push("curl: challenge page");
  } catch (err) {
    errors.push(`curl: ${err.message}`);
  }

  // ── C: Node native fetch() — different TLS fingerprint ────
  try {
    const html = await fetchWithNativeFetch(url, extraHeaders);
    if (!isChallengePage(html)) return html;
    errors.push("native fetch: challenge page");
  } catch (err) {
    errors.push(`native fetch: ${err.message}`);
  }

  // ── D: Playwright (real Chromium) ─────────────────────────
  // Only attempted when explicitly configured OR all above failed with challenge
  const allChallenges = errors.every(
    (e) => e.includes("challenge page") || e.includes("403")
  );
  if (usePlaywright || allChallenges) {
    try {
      const html = await fetchWithPlaywright(url, extraHeaders);
      if (!isChallengePage(html)) return html;
      errors.push("playwright: challenge page");
    } catch (err) {
      errors.push(`playwright: ${err.message}`);
    }
  }

  throw new Error(
    `All fetch methods failed for ${url}. Attempts: ${errors.join(" | ")}`
  );
}

/**
 * Build curl-safe headers: remove Accept-Encoding to avoid brotli crashes.
 * curl --compressed handles decompression natively; we don't need to advertise
 * encodings manually. If the original config overrides Accept/Accept-Language,
 * keep those because they affect content negotiation (not decompression).
 */
function buildSafeCurlHeaders(extraHeaders) {
  const safe = { ...extraHeaders };
  // Remove Accept-Encoding — --compressed flag already handles this correctly
  delete safe["Accept-Encoding"];
  delete safe["accept-encoding"];
  return safe;
}

// ─── Fetch Method A: Node https.get ──────────────────────────

function fetchPage(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === "https:" ? https : http;
    const headers = { ...DEFAULT_HEADERS, ...extraHeaders };

    const req = client.get(
      url,
      { headers, timeout: TIMEOUT_MS, rejectUnauthorized: false },
      (res) => {
        // Follow redirects (up to 5)
        if (
          [301, 302, 303, 307, 308].includes(res.statusCode) &&
          res.headers.location
        ) {
          const redirectUrl = new URL(res.headers.location, url).toString();
          return fetchPage(redirectUrl, extraHeaders).then(resolve).catch(reject);
        }

        // 403 → let fetchWithFallbacks try curl next
        if (res.statusCode === 403) {
          res.resume();
          return reject(new Error("HTTP 403"));
        }

        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }

        const chunks = [];
        const encoding = (res.headers["content-encoding"] || "").toLowerCase();
        let stream = res;

        if (encoding === "gzip") stream = res.pipe(zlib.createGunzip());
        else if (encoding === "deflate") stream = res.pipe(zlib.createInflate());
        else if (encoding === "br") stream = res.pipe(zlib.createBrotliDecompress());

        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
        stream.on("error", reject);
      }
    );

    req.on("timeout", () => { req.destroy(); reject(new Error("Request timed out")); });
    req.on("error", reject);
  });
}

// ─── Fetch Method B: curl ─────────────────────────────────────

/**
 * curl has a better TLS fingerprint than Node's https module.
 * Uses execFile (array args) so no shell injection is possible.
 *
 * Key fixes vs original:
 *  - Resolves with stdout even on non-zero exit (Cloudflare may return
 *    a challenge page with exit 0, or reset connection with exit 35/56)
 *  - Does NOT pass Accept-Encoding header — --compressed handles encoding
 *  - Strips Connection header (HTTP/2 forbids it; causes curl error 92)
 */
function fetchWithCurl(url, safeExtraHeaders = {}) {
  const { execFile } = require("child_process");

  const args = [
    "-s",                   // silent (no progress)
    "-L",                   // follow redirects
    "--max-time", "20",     // 20s hard timeout
    "--compressed",         // auto decompress gzip/deflate/br (if curl supports br)
    "--http1.1",            // force HTTP/1.1 — avoids HTTP/2 fingerprint checks
    "-A", DEFAULT_HEADERS["User-Agent"],
    "-H", `Accept: ${DEFAULT_HEADERS["Accept"]}`,
    "-H", `Accept-Language: ${DEFAULT_HEADERS["Accept-Language"]}`,
  ];

  // Append safe extra headers (Accept-Encoding already stripped by buildSafeCurlHeaders)
  const skipKeys = new Set(["user-agent", "accept", "accept-language", "connection"]);
  for (const [key, value] of Object.entries(safeExtraHeaders)) {
    if (!skipKeys.has(key.toLowerCase())) {
      args.push("-H", `${key}: ${value}`);
    }
  }

  args.push(url);

  return new Promise((resolve, reject) => {
    execFile(
      "curl",
      args,
      { maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          // Non-zero exit code from curl.
          // Common codes: 6=DNS fail, 7=connect refused, 35/56=SSL/recv error
          // If stdout has content despite the error, try to use it
          // (some CF configs reset after sending partial body → exit 56)
          if (stdout && stdout.trim().length > 200) {
            return resolve(stdout);
          }
          return reject(new Error(`curl exited ${err.code}: ${err.message}`));
        }
        resolve(stdout);
      }
    );
  });
}

// ─── Fetch Method C: Node native fetch() ─────────────────────

/**
 * Node 18+ has a built-in fetch() backed by undici.
 * undici uses a different TLS implementation and HTTP/2 stack than Node's
 * https module, giving a slightly different fingerprint — worth one more try
 * before reaching for a real browser.
 */
async function fetchWithNativeFetch(url, extraHeaders = {}) {
  if (typeof globalThis.fetch !== "function") {
    throw new Error("Native fetch not available (Node < 18)");
  }

  const headers = {
    "User-Agent": DEFAULT_HEADERS["User-Agent"],
    Accept: DEFAULT_HEADERS["Accept"],
    "Accept-Language": DEFAULT_HEADERS["Accept-Language"],
    "Cache-Control": "no-cache",
    // Merge site-specific headers, but skip encoding (undici handles it)
    ...Object.fromEntries(
      Object.entries(extraHeaders).filter(
        ([k]) =>
          !["accept-encoding", "connection"].includes(k.toLowerCase())
      )
    ),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await globalThis.fetch(url, {
      headers,
      redirect: "follow",
      signal: controller.signal,
    });

    if (res.status === 403) throw new Error("HTTP 403");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

// ─── Fetch Method D: Playwright (real Chromium) ───────────────

/**
 * Uses a real Chromium browser — defeats virtually all bot-protection.
 *
 * Prerequisites (run once):
 *   npx playwright install chromium
 *
 * siteConfig opt-in:
 *   usePlaywright: true   → always use Playwright for this site
 *
 * Automatic fallback:
 *   fetchWithFallbacks() calls this when A/B/C all return challenge pages.
 */
async function fetchWithPlaywright(url, extraHeaders = {}) {
  let playwright;
  try {
    playwright = require("playwright");
  } catch {
    throw new Error(
      "Playwright not installed. Run: npm install playwright && npx playwright install chromium"
    );
  }

  const { chromium } = playwright;
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: DEFAULT_HEADERS["User-Agent"],
      extraHTTPHeaders: Object.fromEntries(
        Object.entries(extraHeaders).filter(
          ([k]) =>
            !["accept-encoding", "user-agent"].includes(k.toLowerCase())
        )
      ),
      // Mimic a real Chrome install
      locale: "en-US",
      timezoneId: "Asia/Dhaka",
    });

    const page = await context.newPage();

    // Block images/fonts/media to speed up load
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (["image", "font", "media", "stylesheet"].includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Wait a tick for any inline JS price rendering
    await page.waitForTimeout(1500);

    return await page.content();
  } finally {
    if (browser) await browser.close();
  }
}

// ─── Multi-layer Price Extraction ─────────────────────────────

function extractPriceFromHtml(html, url, siteConfig) {
  const hasSitePatterns =
    siteConfig.pricePatterns && siteConfig.pricePatterns.length > 0;

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
  const result = {
    price: null,
    originalPrice: null,
    discountPrice: null,
    currency: "BDT",
    inStock: null,
    method: "json-ld",
  };

  const jsonLdPattern =
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = jsonLdPattern.exec(html)) !== null) {
    try {
      let data = JSON.parse(match[1].trim());

      if (data["@graph"] && Array.isArray(data["@graph"])) {
        data = data["@graph"];
      }

      const products = findProductObjects(Array.isArray(data) ? data : [data]);

      for (const product of products) {
        const offers = product.offers || product.Offers;
        if (!offers) continue;

        const offerList = Array.isArray(offers) ? offers : [offers];
        for (const offer of offerList) {
          const price = parsePrice(
            offer.price || offer.lowPrice || offer.highPrice
          );
          if (price !== null) {
            result.price = price;
            result.currency = offer.priceCurrency || "BDT";

            if (
              offer.price &&
              offer.lowPrice &&
              offer.price !== offer.lowPrice
            ) {
              result.originalPrice = parsePrice(offer.price);
              result.discountPrice = parsePrice(offer.lowPrice);
            }

            const availability = String(offer.availability || "").toLowerCase();
            if (
              availability.includes("instock") ||
              availability.includes("in_stock")
            ) {
              result.inStock = true;
            } else if (
              availability.includes("outofstock") ||
              availability.includes("out_of_stock")
            ) {
              result.inStock = false;
            }

            return result;
          }
        }
      }
    } catch {
      // Invalid JSON-LD block, continue to next
    }
  }

  return result;
}

function findProductObjects(items) {
  const products = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const type = String(item["@type"] || "").toLowerCase();
    if (
      type === "product" ||
      type === "individualproduct" ||
      type === "productmodel"
    ) {
      products.push(item);
    }
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
  const result = {
    price: null,
    originalPrice: null,
    discountPrice: null,
    currency: "BDT",
    inStock: null,
    method: "meta-tag",
  };

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
  const result = {
    price: null,
    originalPrice: null,
    discountPrice: null,
    currency: "BDT",
    inStock: null,
    method: "site-pattern",
  };

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
    if (result.price !== null && result.originalPrice !== null) {
      if (result.price < result.originalPrice) {
        result.discountPrice = result.price;
      } else if (result.price > result.originalPrice) {
        result.discountPrice = result.originalPrice;
        result.originalPrice = result.price;
        result.price = result.discountPrice;
      }
    }
  } else if (result.price === null) {
    return result;
  } else {
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

  if (siteConfig.stockPatterns && siteConfig.stockPatterns.length) {
    for (const pattern of siteConfig.stockPatterns) {
      const match = pattern.exec(html);
      if (match && match[1]) {
        // Normalize: "in stock", "in-stock", "instock" → true
        //            "out of stock", "out-of-stock", "outofstock" → false
        const normalized = match[1].toLowerCase().replace(/[\s-]/g, "");
        if (normalized === "instock") { result.inStock = true; break; }
        if (normalized === "outofstock") { result.inStock = false; break; }
      }
    }
    // If patterns matched but inStock still null, fall back to generic detection
    if (result.inStock === null) result.inStock = extractStockStatus(html);
  } else {
    result.inStock = extractStockStatus(html);
  }

  return result;
}

// ─── Layer 4: Generic BDT Price Detection ─────────────────────

function extractGenericBdtPrice(html) {
  const result = {
    price: null,
    originalPrice: null,
    discountPrice: null,
    currency: "BDT",
    inStock: null,
    method: "generic-bdt",
  };

  // Strip nav/header/footer noise before scanning — these sections often
  // contain prices from other products (related items, cart totals, etc.)
  // that confuse the frequency-based picker.
  const bodyHtml = html
    .replace(/<(?:nav|header|footer)[^>]*>[\s\S]*?<\/(?:nav|header|footer)>/gi, " ")
    .replace(/class="[^"]*(?:menu|navigation|navbar|breadcrumb|widget)[^"]*"[^>]*>[\s\S]{0,2000}?<\/[a-z]+>/gi, " ");

  const bdtPatterns = [
    // Highest confidence: price near a BDT/Taka currency marker in a price element
    /class="[^"]*price[^"]*"[^>]*>[\s\S]*?([\d,]{4,}(?:\.\d{1,2})?)\s*(?:<|৳|BDT|Tk)/gi,
    // ৳ symbol directly followed by amount (e.g. ৳ 15,000)
    /[৳]\s*([\d,]+(?:\.\d{1,2})?)/g,
    // &#2547; HTML entity for ৳
    /&#2547;\s*([\d,]+(?:\.\d{1,2})?)/g,
    // BDT/Tk prefix
    /(?:BDT|Tk\.?)\s*([\d,]+(?:\.\d{1,2})?)/gi,
    // X/- patterns (common in BD pricing)
    /([\d,]{4,})\s*\/-/g,
  ];

  const foundPrices = [];

  for (const pattern of bdtPatterns) {
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(bodyHtml)) !== null) {
      const price = parsePrice(match[1]);
      // Floor at 500 to filter out nav numbers, IDs, quantities etc.
      // Ceiling at 10 million (covers most BD electronics)
      if (price !== null && price >= 500 && price <= 10000000) {
        foundPrices.push(price);
      }
      if (foundPrices.length >= 15) break;
    }
  }

  if (foundPrices.length > 0) {
    // Use frequency to find the most-mentioned price (the main product price
    // is repeated in multiple places: breadcrumb, add-to-cart, meta tags etc.)
    const freq = {};
    foundPrices.forEach((p) => (freq[p] = (freq[p] || 0) + 1));
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
    const mainPrice = parseFloat(sorted[0][0]);

    result.price = mainPrice;

    // Look for a second distinct price within a reasonable range (discount scenario)
    const reasonable = [...new Set(foundPrices)]
      .filter((p) => p >= mainPrice * 0.5 && p <= mainPrice * 2.0)
      .sort((a, b) => a - b);

    if (reasonable.length >= 2) {
      const lowest = reasonable[0];
      const highest = reasonable[reasonable.length - 1];
      if (lowest !== highest && highest / lowest >= 1.02) { // at least 2% difference
        result.discountPrice = lowest;
        result.originalPrice = highest;
        result.price = lowest;
      }
    }

    result.inStock = extractStockStatus(html);
  }

  return result;
}

// ─── Helpers ──────────────────────────────────────────────────

function parsePrice(value) {
  if (value === null || value === undefined) return null;
  const cleaned = String(value)
    .replace(/[,\s৳]/g, "")
    .replace(/\/-$/, "")
    .trim();
  const num = Number(cleaned);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function extractStockStatus(html) {
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