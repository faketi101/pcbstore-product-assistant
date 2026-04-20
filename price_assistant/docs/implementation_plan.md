# Competitor Price Scraper & Analysis Dashboard

Build a **server-side scraper** (Node.js) that fetches competitor product pages and extracts prices using smart, site-aware parsing — then a **premium analysis dashboard** (HTML) to compare your PCBStore prices against competitors.

## The Core Problem & Our Smart Solution

Each BD tech e-commerce site renders prices differently:
- **StarTech** — uses JSON-LD `Product` schema + `.product-price` elements
- **Ryans** — blocks direct fetch (403), requires browser-like headers
- **TechLand** — dynamically loaded prices, minimal structured data
- **GlobalBrand** — OpenCart-based, uses `.price-new` / `.price-old` selectors
- **Skyland** — StarTech clone structure (OpenCart-based)
- **SmartBD** — WooCommerce, uses `woocommerce-Price-amount`

### Strategy: Multi-Layer Price Extraction

Instead of writing fragile per-site CSS selectors, we'll use a **3-tier extraction pipeline**:

1. **JSON-LD / Schema.org** — Most BD sites embed `<script type="application/ld+json">` with `Product` schema containing `offers.price`. This is the most reliable source.
2. **Open Graph / Meta tags** — Many sites put price in `og:price:amount` or `product:price:amount` meta tags.
3. **Site-specific CSS selectors** — Fallback to known selectors per domain, with a configurable registry so you can add new sites easily.

> [!IMPORTANT]
> Some sites (like Ryans) block automated requests. The scraper will use proper User-Agent headers and handle errors gracefully, showing which sites failed so you can investigate.

## Proposed Changes

### Scraper Backend

#### [NEW] [priceScraperServer.js](file:///mnt/OCCODES/Coding/under_development/pcbstore-product-automation/price_assistant/priceScraperServer.js)

Node.js HTTP server (runs on port **4071**) with these endpoints:

| Endpoint | Method | Description |
|---|---|---|
| `/api/scrape` | POST | Accepts `{ urls: string[] }` → scrapes all URLs in parallel, returns extracted prices |
| `/api/scrape-product` | POST | Accepts `{ productId, urls }` → scrapes all competitor URLs for one product |
| `/api/scrape-all` | POST | Reads `competitorProductLink.json` + `output.json`, scrapes all competitor URLs, returns full comparison data |
| `/api/scrape-status` | GET | Returns last scrape results (cached) |
| `/health` | GET | Health check |

**Price extraction pipeline per URL:**
1. Fetch HTML with browser-like headers (User-Agent, Accept, etc.)
2. Parse with regex-based extractors (no heavy DOM dependency):
   - Extract JSON-LD `Product` schema → `offers.price`, `offers.lowPrice`
   - Extract `<meta property="product:price:amount">` or `og:price:amount`
   - Extract from site-specific CSS patterns using regex
3. Return: `{ url, siteName, price, originalPrice, discountPrice, currency, inStock, error, method }`

**Site-specific selector registry** (easily extensible):
```js
const SITE_CONFIGS = {
  "startech.com.bd": {
    priceSelectors: [".product-price .product-offer-price", ".product-price td:last-child"],
    nameSelector: ".product-short-info h2",
    stockSelector: ".product-status"
  },
  "ryans.com": {
    priceSelectors: [".product-price .current-price", ".pr-total"],
    headers: { /* extra headers for anti-bot */ }
  },
  "techlandbd.com": { ... },
  "globalbrand.com.bd": { ... },
  "skyland.com.bd": { ... },
  "smartbd.com": { ... },
  "perennial.com.bd": { ... }
};
```

---

### Analysis Dashboard

#### [NEW] [priceAnalyzer.html](file:///mnt/OCCODES/Coding/under_development/pcbstore-product-automation/price_assistant/priceAnalyzer.html)

A premium, dark-themed dashboard with:

1. **Product Comparison Table** — Shows each PCBStore product with:
   - Your price & discount price
   - All competitor prices side-by-side
   - Price difference (₿ amount + %)
   - Color-coded: 🟢 you're cheapest, 🟡 within 5%, 🔴 you're most expensive
   - Market position indicator (cheapest/mid/expensive)

2. **Summary Cards** at top:
   - Total products tracked
   - Products where you're cheapest
   - Products where you're most expensive
   - Average price difference %

3. **Controls Panel**:
   - "Scrape All Prices" button — triggers backend scrape
   - Filter by brand/category
   - Sort by price difference
   - Search
   - Export comparison report (CSV)

4. **Per-Product Detail Expandable Row**:
   - Bar chart visualization comparing all competitor prices
   - Link to each competitor page
   - Suggested price adjustment
   - Last scraped timestamp

---

### Server Updates

#### [MODIFY] [linksApiServer.js](file:///mnt/OCCODES/Coding/under_development/pcbstore-product-automation/price_assistant/linksApiServer.js)

Add serving of the new `priceAnalyzer.html` page. No other changes needed — the new scraper runs on a separate port.

#### [NEW] [start-price-server.bat](file:///mnt/OCCODES/Coding/under_development/pcbstore-product-automation/price_assistant/start-price-server.bat)

Batch file to start the price scraper server.

## Open Questions

> [!IMPORTANT]
> **Do you want both servers combined into one?** Currently the links API runs on port 4070 and the scraper would run on 4071. I can merge them into one server if you prefer. Keeping them separate means you can run just the viewer without the scraper overhead.

> [!NOTE]
> **Rate limiting / politeness**: The scraper will add a small delay (200-500ms) between requests to the same domain to avoid being blocked. Some sites may still block — those will show as "failed" in the dashboard.

## Verification Plan

### Automated Tests
- Start the price scraper server
- Test scraping the 3 product IDs that already have competitor links (5924, 5949, 5995)
- Verify prices are extracted correctly from at least StarTech and GlobalBrand
- Open the analysis dashboard in browser and verify UI renders

### Manual Verification
- Visual inspection of the dashboard UI
- Compare scraped prices against manually checked prices on competitor sites
