const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const PORT = 4070;
const ROOT = __dirname;
const LINKS_FILE = path.join(ROOT, "competitorProductLink.json");

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
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

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      res.end();
      return;
    }

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

    if (url.pathname === "/health") {
      sendJson(res, 200, { ok: true, port: PORT });
      return;
    }

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

server.listen(PORT, () => {
  console.log(`Links API server running on http://localhost:${PORT}`);
  console.log(`Open viewer: http://localhost:${PORT}/outputViewer.html`);
});
