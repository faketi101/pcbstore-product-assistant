/**
 * Site-specific configuration registry for price scraping.
 *
 * HOW TO ADD A NEW SITE:
 *   1. Find the domain key (e.g. "newsite.com.bd")
 *   2. Add an entry to SITE_CONFIGS below
 *   3. That's it — the scraper will use your config automatically
 *
 * If you don't add a config, the scraper still works — it uses
 * JSON-LD, meta tags, and generic BDT price pattern detection.
 */

const SITE_CONFIGS = {
  "startech.com.bd": {
    name: "Star Tech",
    /**
     * StarTech price structure (from .product-info-table):
     *   <td class="product-price"><ins>4,300৳</ins><del>4,900৳</del></td>
     *   <td class="product-regular-price">4,840৳</td>
     *
     * Bundle with PC is a radio option that changes price via JS after user
     * selection — it does NOT appear in the initial HTML, so the default
     * page price is always the Single (standalone) price.
     *
     * We also check the "Bundle With PC , Single Price - XXXX" label text
     * to confirm we're reading the single price.
     */
    pricePatterns: [
      // Primary: <ins> inside .product-price = cash sale price (Single)
      /class="[^"]*product-price[^"]*"[^>]*>[\s\S]{0,100}<ins[^>]*>([\d,]+)[\s]*৳/i,
      // Fallback: .product-price without ins (no discount active)
      /class="[^"]*product-price[^"]*"[^>]*>\s*([\d,]+)[\s]*৳/i,
    ],
    // <del> inside .product-price = original single price (before discount)
    originalPricePatterns: [
      /class="[^"]*product-price[^"]*"[^>]*>[\s\S]{0,200}<del[^>]*>([\d,]+)[\s]*৳/i,
    ],
    // "In Stock" or "Out Of Stock" from product-status cell
    stockPatterns: [
      /class="[^"]*product-status[^"]*"[^>]*>\s*(In Stock|Out Of Stock|Pre Order)/i,
    ],
    priceAnchors: ["product-price", "product-regular-price"],
  },

  "ryans.com": {
    name: "Ryans",
    /**
     * Ryans price structure (from product page screenshot):
     *   Special Price:  Tk 11,400   ← current/sale price
     *   Regular Price:  Tk 12,370   ← original price
     *   EMI TK 1,031
     *
     * They also use: .special-price, .regular-price, .price-box classes
     * Cloudflare blocks simple requests — we send full browser-like headers.
     */
    pricePatterns: [
      // Special Price block: "Special Price\nTk 11,400"
      /Special\s+Price[\s\S]{0,60}Tk\s*([\d,]+)/i,
      // .special-price class
      /class="[^"]*special-price[^"]*"[\s\S]{0,200}Tk\s*([\d,]+)/i,
      // price-box / price-new
      /class="[^"]*price-new[^"]*"[\s\S]{0,100}Tk\s*([\d,]+)/i,
      // Fallback: first "Tk X,XXX" on page
      /\bTk\s*([\d,]{4,})/i,
    ],
    originalPricePatterns: [
      /Regular\s+Price[\s\S]{0,60}Tk\s*([\d,]+)/i,
      /class="[^"]*regular-price[^"]*"[\s\S]{0,200}Tk\s*([\d,]+)/i,
      /class="[^"]*price-old[^"]*"[\s\S]{0,100}Tk\s*([\d,]+)/i,
    ],
    // Ryans uses Cloudflare — send full browser headers to avoid 403
    extraHeaders: {
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "max-age=0",
      "Sec-Ch-Ua": '"Chromium";v="131", "Not_A Brand";v="24", "Google Chrome";v="131"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
      "Referer": "https://www.google.com/",
    },
  },

  "techlandbd.com": {
    name: "Tech Land",
    pricePatterns: [
      /class="[^"]*product-price[^"]*"[^>]*>[\s\S]*?(\d[\d,]*)/i,
      /class="[^"]*price-new[^"]*"[^>]*>[\s\S]*?(\d[\d,]*)/i,
      /class="[^"]*price_color[^"]*"[^>]*>[\s\S]*?(\d[\d,]*)/i,
    ],
    priceAnchors: ["product-price", "price-new", "price_color"],
  },

  "globalbrand.com.bd": {
    name: "Global Brand",
    pricePatterns: [
      /class="[^"]*price-new[^"]*"[^>]*>[\s\S]*?(\d[\d,]*)/i,
      /class="[^"]*price-old[^"]*"[^>]*>[\s\S]*?(\d[\d,]*)/i,
      /class="[^"]*product-price[^"]*"[^>]*>[\s\S]*?(\d[\d,]*)/i,
    ],
    priceAnchors: ["price-new", "price-old"],
  },

  "skyland.com.bd": {
    name: "Skyland",
    pricePatterns: [
      /class="[^"]*price-new[^"]*"[^>]*>[\s\S]*?(\d[\d,]*)/i,
      /class="[^"]*product-price[^"]*"[^>]*>[\s\S]*?(\d[\d,]*)/i,
    ],
    priceAnchors: ["price-new", "product-price"],
  },

  "smartbd.com": {
    name: "Smart BD",
    pricePatterns: [
      // WooCommerce: price inside <bdi> after &#2547; or ৳ entity
      /woocommerce-Price-amount[^>]*>[\s\S]*?(?:&#2547;|৳)\s*([\d,]{3,}(?:\.\d{1,2})?)/i,
      /class="[^"]*price[^"]*"[^>]*>[\s\S]*?<ins[\s\S]*?(?:&#2547;|৳)\s*([\d,]{3,}(?:\.\d{1,2})?)/i,
      /class="[^"]*price[^"]*"[^>]*>[\s\S]*?(?:&#2547;|৳)\s*([\d,]{3,}(?:\.\d{1,2})?)/i,
    ],
    priceAnchors: ["woocommerce-Price-amount", "summary .price"],
  },

  "perennial.com.bd": {
    name: "Perennial",
    pricePatterns: [
      /class="[^"]*price-new[^"]*"[^>]*>[\s\S]*?(\d[\d,]*)/i,
      /class="[^"]*product-price[^"]*"[^>]*>[\s\S]*?(\d[\d,]*)/i,
    ],
    priceAnchors: ["price-new", "product-price"],
  },

  "bdstall.com": {
    name: "BD Stall",
    pricePatterns: [
      /class="[^"]*product-price[^"]*"[^>]*>[\s\S]*?(\d[\d,]*)/i,
    ],
    priceAnchors: ["product-price"],
  },

  "ultratech.com.bd": {
    name: "UltraTech",
    pricePatterns: [
      /class="[^"]*price-new[^"]*"[^>]*>[\s\S]*?(\d[\d,]*)/i,
      /class="[^"]*product-price[^"]*"[^>]*>[\s\S]*?(\d[\d,]*)/i,
    ],
    priceAnchors: ["price-new", "product-price"],
  },
};

/**
 * Get config for a URL. Falls back to empty config (generic extraction still works).
 */
function getConfigForUrl(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    for (const [domain, config] of Object.entries(SITE_CONFIGS)) {
      if (hostname === domain || hostname.endsWith("." + domain)) {
        return { ...config, domain };
      }
    }
  } catch {}
  return { name: null, domain: null, pricePatterns: [], priceAnchors: [] };
}

/**
 * Extract a human-readable site name from a URL.
 */
function getSiteName(url) {
  const config = getConfigForUrl(url);
  if (config.name) return config.name;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

module.exports = { SITE_CONFIGS, getConfigForUrl, getSiteName };
