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
     * Bundle with PC: a JS radio changes the price dynamically AFTER page load.
     * The default (initial HTML) always shows the Single standalone price.
     *
     * Strategy:
     *  1. Try <ins> inside .product-price  → discounted single price
     *  2. Try "Single Price" label proximity → explicit single price text
     *  3. Fallback: first number in .product-price
     */
    pricePatterns: [
      // Primary: <ins> inside .product-price = cash/sale single price
      /class="[^"]*product-price[^"]*"[^>]*>[\s\S]{0,120}<ins[^>]*>([\d,]+)[\s]*৳/i,
      // Secondary: "Single Price" label near a price number
      /Single\s+Price[\s\S]{0,120}([\d,]{3,})\s*৳/i,
      // Tertiary: .product-price with plain number (no ins/del = no discount)
      /class="[^"]*product-price[^"]*"[^>]*>[\s\S]{0,60}([\d,]{3,})\s*৳/i,
    ],
    // <del> inside .product-price = original single price before discount
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

  "selltech.com.bd": {
    name: "Sell Tech BD",
    pricePatterns: [
      // OpenCart / WooCommerce style: price inside .price-new or .special-price
      /class="[^"]*price-new[^"]*"[^>]*>[\s\S]*?(\d[\d,]*)/i,
      /class="[^"]*special-price[^"]*"[^>]*>[\s\S]*?(\d[\d,]*)/i,
      /class="[^"]*product-price[^"]*"[^>]*>[\s\S]*?(\d[\d,]*)/i,
    ],
    priceAnchors: ["price-new", "special-price", "product-price"],
  },

  "neton.com.bd": {
    name: "Neton Tech",
    /**
     * Neton is WooCommerce. Server-side HTML structure (prices ARE server-rendered):
     *
     *   <del><span class="woocommerce-Price-amount">৳&nbsp;17,000</span></del>
     *   <span class="screen-reader-text">Original price was: ৳&nbsp;17,000.</span>
     *   <span class="woocommerce-Price-amount">৳&nbsp;15,000</span>
     *   <span class="screen-reader-text">Current price is: ৳&nbsp;15,000.</span>
     *
     *   <!-- Hidden GTM input — very reliable: -->
     *   <input name="gtm4wp_product_data" value="{...&quot;price&quot;:15000...}">
     *
     * The "screen-reader-text" labels are UNIQUE to the main product (not repeated
     * in related product carousels), making them the safest anchor.
     *
     * Note: DO NOT set usePlaywright — prices are server-rendered just fine.
     */
    pricePatterns: [
      // 1. WooCommerce screen-reader-text "Current price is: ৳ 15,000"
      //    This text is ONLY in the main product price block — not in related products
      /class="screen-reader-text">\s*Current price is:?\s*(?:৳|&#2547;)(?:&nbsp;|&amp;nbsp;)?\s*([\d,]+)/i,
      // 2. GTM4WP hidden JSON input — "price":15000 — main add-to-cart form only
      /name="gtm4wp_product_data"[^>]*?&quot;price&quot;:([\d]+)/,
      // 3. price-single container → price AFTER </del> (= sale price, not original)
      /class="price-single"[\s\S]{0,800}?<\/del>[\s\S]{0,400}?(?:৳|&#2547;)(?:&nbsp;)?\s*([\d,]+)/i,
    ],
    originalPricePatterns: [
      // 1. WooCommerce screen-reader-text "Original price was: ৳ 17,000"
      /class="screen-reader-text">\s*Original price was:?\s*(?:৳|&#2547;)(?:&nbsp;|&amp;nbsp;)?\s*([\d,]+)/i,
      // 2. price-single → price inside <del>
      /class="price-single"[\s\S]{0,400}?<del>[\s\S]{0,300}?(?:৳|&#2547;)(?:&nbsp;)?\s*([\d,]+)/i,
    ],
    stockPatterns: [
      // GTM4WP JSON: "stockstatus":"instock"
      /&quot;stockstatus&quot;:&quot;(instock|outofstock)/i,
      // WooCommerce class: class="stock in-stock" or class="out-of-stock"
      /class="stock\s+(in-stock|out-of-stock)"/i,
    ],
    priceAnchors: ["price-single", "screen-reader-text"],
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
