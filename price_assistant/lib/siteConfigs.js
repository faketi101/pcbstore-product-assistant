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
    pricePatterns: [
      /class="[^"]*current-price[^"]*"[^>]*>[\s\S]*?(\d[\d,]*)/i,
      /class="[^"]*pr-total[^"]*"[^>]*>[\s\S]*?(\d[\d,]*)/i,
      /class="[^"]*att-product-price[^"]*"[^>]*>[\s\S]*?(\d[\d,]*)/i,
    ],
    priceAnchors: ["current-price", "att-product-price"],
    // Ryans blocks simple fetches; send browser-like headers
    extraHeaders: {
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate, br",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
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
