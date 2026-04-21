const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { scrapePrice, scrapeMultiple } = require("./lib/priceScraper");
const { getSiteName } = require("./lib/siteConfigs");

const CONFIG = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8")); } catch { return {}; } })();
const PORT = CONFIG.PORT || 4070;
const HOST = CONFIG.HOST || "localhost";
const ROOT = __dirname;
const LINKS_FILE = path.join(ROOT, "competitorProductLink.json");
const PRICE_CACHE_FILE = path.join(ROOT, "scrapedPrices.json");

// ─── Shared helpers ───────────────────────────────────────────

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Access-Control-Allow-Origin": "*",
  });
  res.end(text);
}

function getStaticContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js") return "application/javascript; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  return "application/octet-stream";
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

// ─── Links file operations ────────────────────────────────────

async function ensureLinksFile() {
  try {
    await fsp.access(LINKS_FILE, fs.constants.F_OK);
  } catch {
    await fsp.writeFile(LINKS_FILE, "{}\n", "utf8");
  }
}

async function readLinks() {
  await ensureLinksFile();
  const raw = await fsp.readFile(LINKS_FILE, "utf8");
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
    return {};
  } catch {
    return {};
  }
}

async function writeLinks(payload) {
  await ensureLinksFile();
  const safePayload = payload && typeof payload === "object" ? payload : {};
  await fsp.writeFile(LINKS_FILE, JSON.stringify(safePayload, null, 2) + "\n", "utf8");
}

// ─── Price cache operations ───────────────────────────────────

async function readPriceCache() {
  try {
    const raw = await fsp.readFile(PRICE_CACHE_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writePriceCache(data) {
  await fsp.writeFile(PRICE_CACHE_FILE, JSON.stringify(data, null, 2) + "\n", "utf8");
}

// ─── Scraper API handlers ─────────────────────────────────────

/**
 * POST /api/scrape
 * Body: { urls: string[] }
 * Scrapes given URLs and returns price data.
 */
async function handleScrape(req, res) {
  const body = await readRequestBody(req);
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    sendJson(res, 400, { error: "Invalid JSON" });
    return;
  }

  const urls = Array.isArray(payload.urls) ? payload.urls.filter(Boolean) : [];
  if (!urls.length) {
    sendJson(res, 400, { error: "No URLs provided" });
    return;
  }

  const results = await scrapeMultiple(urls);
  sendJson(res, 200, { results });
}

/**
 * POST /api/scrape-product
 * Body: { productId: string, urls?: string[] }
 * Scrapes competitor URLs for a single product.
 */
async function handleScrapeProduct(req, res) {
  const body = await readRequestBody(req);
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    sendJson(res, 400, { error: "Invalid JSON" });
    return;
  }

  const productId = String(payload.productId || "").trim();
  let urls = Array.isArray(payload.urls) ? payload.urls : [];

  // If no URLs provided, look them up from the links file
  if (!urls.length && productId) {
    const links = await readLinks();
    urls = Array.isArray(links[productId]) ? links[productId] : [];
  }

  if (!urls.length) {
    sendJson(res, 400, { error: "No URLs found for this product" });
    return;
  }

  const results = await scrapeMultiple(urls);

  // Update cache
  const cache = await readPriceCache();
  cache[productId] = {
    results,
    scrapedAt: new Date().toISOString(),
  };
  await writePriceCache(cache);

  sendJson(res, 200, { productId, results });
}

/**
 * POST /api/scrape-all
 * Reads links file + output.json, scrapes ALL competitor URLs.
 * Returns full comparison data.
 */
async function handleScrapeAll(req, res) {
  const links = await readLinks();
  const productIds = Object.keys(links);

  if (!productIds.length) {
    sendJson(res, 200, { message: "No competitor links configured", results: {} });
    return;
  }

  // Collect all URLs with their product IDs
  const allUrls = [];
  const urlToProductId = {};

  for (const pid of productIds) {
    const urls = Array.isArray(links[pid]) ? links[pid] : [];
    for (const url of urls) {
      allUrls.push(url);
      urlToProductId[url] = pid;
    }
  }

  // Scrape all with concurrency
  const scrapeResults = await scrapeMultiple(allUrls, 3);

  // Group results by product ID
  const grouped = {};
  for (const result of scrapeResults) {
    const pid = urlToProductId[result.url];
    if (!grouped[pid]) grouped[pid] = [];
    grouped[pid].push(result);
  }

  // Load product data for context
  let products = [];
  try {
    const raw = await fsp.readFile(path.join(ROOT, "output.json"), "utf8");
    products = JSON.parse(raw);
  } catch {}

  // Update cache
  const cache = {};
  for (const [pid, results] of Object.entries(grouped)) {
    cache[pid] = { results, scrapedAt: new Date().toISOString() };
  }
  await writePriceCache(cache);

  sendJson(res, 200, {
    totalProducts: productIds.length,
    totalUrls: allUrls.length,
    results: grouped,
    scrapedAt: new Date().toISOString(),
  });
}

/**
 * GET /api/price-cache
 * Returns cached scrape results.
 */
async function handlePriceCache(req, res) {
  const cache = await readPriceCache();
  sendJson(res, 200, cache);
}

// ─── Server ───────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // CORS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      res.end();
      return;
    }

    // ── Links API (existing) ──────────────────────────────────

    if (url.pathname === "/api/links" && req.method === "GET") {
      const links = await readLinks();
      sendJson(res, 200, links);
      return;
    }

    if (url.pathname === "/api/links" && req.method === "PUT") {
      const body = await readRequestBody(req);
      let payload = {};
      try {
        payload = body ? JSON.parse(body) : {};
      } catch {
        sendJson(res, 400, { error: "Invalid JSON payload" });
        return;
      }
      await writeLinks(payload);
      sendJson(res, 200, { ok: true });
      return;
    }

    // ── Scraper API (new) ─────────────────────────────────────

    if (url.pathname === "/api/scrape" && req.method === "POST") {
      await handleScrape(req, res);
      return;
    }

    if (url.pathname === "/api/scrape-product" && req.method === "POST") {
      await handleScrapeProduct(req, res);
      return;
    }

    if (url.pathname === "/api/scrape-all" && req.method === "POST") {
      await handleScrapeAll(req, res);
      return;
    }

    if (url.pathname === "/api/price-cache" && req.method === "GET") {
      await handlePriceCache(req, res);
      return;
    }

    // ── Health ─────────────────────────────────────────────────

    if (url.pathname === "/health") {
      sendJson(res, 200, { ok: true, port: PORT, host: HOST });
      return;
    }

    if (url.pathname === "/api/config" && req.method === "GET") {
      sendJson(res, 200, { PORT, HOST, API_URL: `http://${HOST}:${PORT}` });
      return;
    }

    // ── Static files ──────────────────────────────────────────

    let requestedPath = decodeURIComponent(url.pathname);
    if (requestedPath === "/") requestedPath = "/outputViewer.html";
    const safePath = path.normalize(requestedPath).replace(/^([.][.][/\\])+/, "");
    const fullPath = path.join(ROOT, safePath);

    if (!fullPath.startsWith(ROOT)) {
      sendText(res, 403, "Forbidden");
      return;
    }

    const stat = await fsp.stat(fullPath).catch(() => null);
    if (!stat || !stat.isFile()) {
      sendText(res, 404, "Not Found");
      return;
    }

    const file = await fsp.readFile(fullPath);
    sendText(res, 200, file, getStaticContentType(fullPath));
  } catch (err) {
    sendJson(res, 500, { error: "Internal Server Error", detail: String(err && err.message || err) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`\n  ┌─────────────────────────────────────────────────┐`);
  console.log(`  │  PCB Price Assistant Server                     │`);
  console.log(`  │  Running on http://${HOST}:${PORT}              │`);
  console.log(`  ├─────────────────────────────────────────────────┤`);
  console.log(`  │  📋 Product Viewer:  /outputViewer.html         │`);
  console.log(`  │  💰 Price Analyzer:  /priceAnalyzer.html        │`);
  console.log(`  │  🔗 Links API:       GET/PUT /api/links         │`);
  console.log(`  │  🕷️  Scrape API:      POST /api/scrape-all      │`);
  console.log(`  │  ⚙️  Config:          GET /api/config           │`);
  console.log(`  └─────────────────────────────────────────────────┘\n`);
  console.log(`  Open: http://${HOST}:${PORT}/priceAnalyzer.html\n`);
});
