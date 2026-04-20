// ==UserScript==
// @name         PCB In-Stock Product Lister
// @namespace    http://tampermonkey.net/
// @version      1.6.0
// @description  Crawl all product pages, collect only in-stock products, fetch slug from edit page, and show results in a modern UI.
// @author       faketi101
// @match        https://admin.pcbstore.net/admin/products*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const STORAGE_KEY = "pcb_instock_lister_settings_v2";
  const DEFAULT_FRONTEND_BASE = "https://pcbstore.com.bd";

  const state = {
    data: [],
    filteredData: [],
    loading: false,
    cancelled: false,
    settings: loadSettings(),
  };

  const ui = {
    panel: null,
    rows: null,
    chip: null,
    status: null,
    progress: null,
    noData: null,
    search: null,
    notifyHost: null,
  };

  init();

  function init() {
    injectStyles();
    buildUI();
    hydrateBrandFromUrl();
    bindEvents();
    notify("Ready", "Use Scan All In-Stock to collect data from all pages.", "info");
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        frontendBase: parsed.frontendBase || DEFAULT_FRONTEND_BASE,
        excludeBrands: Array.isArray(parsed.excludeBrands) ? parsed.excludeBrands : [],
      };
    } catch {
      return {
        frontendBase: DEFAULT_FRONTEND_BASE,
        excludeBrands: [],
      };
    }
  }

  function saveSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
  }

  function injectStyles() {
    const s = document.createElement("style");
    s.textContent = `
      :root {
        --pl-bg: #0d1428;
        --pl-bg-2: #111b34;
        --pl-card: rgba(8, 14, 30, 0.88);
        --pl-line: rgba(255, 255, 255, 0.12);
        --pl-text: #e9f0ff;
        --pl-muted: #9fb0d9;
        --pl-accent: #2ec5a8;
        --pl-accent-2: #5c87ff;
        --pl-warn: #f2bf5e;
        --pl-danger: #ff6b88;
      }

      #pl-root {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 999999;
        font-family: "Segoe UI", "Poppins", sans-serif;
      }

      #pl-open {
        border: 0;
        border-radius: 999px;
        padding: 12px 16px;
        font-weight: 700;
        color: #f4f8ff;
        background: linear-gradient(130deg, var(--pl-accent-2), var(--pl-accent));
        box-shadow: 0 14px 34px rgba(25, 52, 108, 0.45);
        cursor: pointer;
      }

      #pl-panel {
        position: fixed;
        right: 18px;
        bottom: 72px;
        width: min(1060px, calc(100vw - 30px));
        height: min(82vh, 820px);
        display: none;
        flex-direction: column;
        background:
          radial-gradient(900px 260px at -10% -35%, rgba(92, 135, 255, 0.25), transparent),
          radial-gradient(700px 220px at 110% -30%, rgba(46, 197, 168, 0.2), transparent),
          var(--pl-card);
        border: 1px solid var(--pl-line);
        border-radius: 16px;
        backdrop-filter: blur(14px);
        box-shadow: 0 28px 72px rgba(0, 0, 0, 0.52);
        color: var(--pl-text);
        overflow: hidden;
      }

      #pl-panel.open { display: flex; }

      .pl-head {
        padding: 12px 16px;
        border-bottom: 1px solid var(--pl-line);
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: rgba(5, 10, 22, 0.58);
      }

      .pl-title {
        margin: 0;
        font-size: 15px;
      }

      .pl-chip {
        border-radius: 999px;
        font-size: 11px;
        padding: 4px 10px;
        margin-left: 10px;
        color: #d6e0ff;
        background: rgba(92, 135, 255, 0.2);
      }

      .pl-close {
        width: 30px;
        height: 30px;
        border-radius: 8px;
        border: 1px solid var(--pl-line);
        background: rgba(255, 255, 255, 0.03);
        color: var(--pl-text);
        cursor: pointer;
      }

      .pl-body {
        flex: 1;
        min-height: 0;
        display: grid;
        grid-template-columns: 330px 1fr;
        gap: 12px;
        padding: 12px;
      }

      .pl-side,
      .pl-main {
        border: 1px solid var(--pl-line);
        border-radius: 12px;
        background: rgba(5, 11, 24, 0.6);
        min-height: 0;
      }

      .pl-side {
        overflow: auto;
      }

      .pl-main {
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .pl-block {
        padding: 11px;
        border-bottom: 1px solid var(--pl-line);
      }

      .pl-block:last-child { border-bottom: 0; }

      .pl-label {
        display: block;
        font-size: 12px;
        color: var(--pl-muted);
        margin-bottom: 6px;
      }

      .pl-input,
      .pl-select,
      .pl-textarea {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid var(--pl-line);
        border-radius: 10px;
        padding: 9px 10px;
        color: var(--pl-text);
        background: rgba(255, 255, 255, 0.03);
      }

      .pl-textarea {
        min-height: 80px;
        resize: vertical;
      }

      .pl-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .pl-btn {
        border: 1px solid var(--pl-line);
        border-radius: 10px;
        padding: 8px 11px;
        background: rgba(255, 255, 255, 0.03);
        color: var(--pl-text);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }

      .pl-btn.primary {
        border-color: transparent;
        background: linear-gradient(130deg, var(--pl-accent-2), var(--pl-accent));
      }

      .pl-btn.danger {
        border-color: rgba(255, 107, 136, 0.45);
        background: rgba(255, 107, 136, 0.14);
      }

      .pl-progress-wrap {
        margin-top: 8px;
        height: 8px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        overflow: hidden;
      }

      .pl-progress {
        width: 0%;
        height: 100%;
        background: linear-gradient(90deg, var(--pl-accent), var(--pl-accent-2));
        transition: width 0.2s ease;
      }

      .pl-status {
        margin-top: 8px;
        color: var(--pl-muted);
        font-size: 12px;
      }

      .pl-top {
        padding: 10px;
        border-bottom: 1px solid var(--pl-line);
      }

      .pl-table-wrap {
        flex: 1;
        overflow: auto;
      }

      .pl-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }

      .pl-table th,
      .pl-table td {
        border-bottom: 1px solid var(--pl-line);
        text-align: left;
        vertical-align: top;
        padding: 8px 9px;
      }

      .pl-table th {
        position: sticky;
        top: 0;
        z-index: 1;
        text-transform: uppercase;
        font-size: 11px;
        color: #c6d5ff;
        background: rgba(8, 15, 30, 0.97);
      }

      .pl-table a {
        color: #8eb4ff;
        text-decoration: none;
      }

      #pl-rows tr {
        display: table-row !important;
        opacity: 1 !important;
        visibility: visible !important;
        animation: none !important;
      }

      #pl-rows td {
        display: table-cell !important;
      }

      .pl-stock-in {
        display: inline-block;
        border-radius: 999px;
        padding: 2px 8px;
        font-size: 11px;
        color: #d8fff6;
        background: rgba(46, 197, 168, 0.2);
        border: 1px solid rgba(46, 197, 168, 0.45);
      }

      .pl-empty {
        text-align: center;
        color: var(--pl-muted);
        padding: 20px;
      }

      #pl-notify {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000000;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .pl-toast {
        min-width: 250px;
        max-width: 370px;
        border-radius: 11px;
        border: 1px solid var(--pl-line);
        background: rgba(7, 13, 28, 0.95);
        color: var(--pl-text);
        padding: 10px 12px;
      }

      .pl-toast b {
        display: block;
        font-size: 12px;
        margin-bottom: 2px;
      }

      .pl-toast.info { border-left: 3px solid var(--pl-accent-2); }
      .pl-toast.success { border-left: 3px solid var(--pl-accent); }
      .pl-toast.warn { border-left: 3px solid var(--pl-warn); }
      .pl-toast.error { border-left: 3px solid var(--pl-danger); }

      @media (max-width: 980px) {
        .pl-body { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(s);
  }

  function buildUI() {
    const root = document.createElement("div");
    root.id = "pl-root";

    const notifyHost = document.createElement("div");
    notifyHost.id = "pl-notify";
    ui.notifyHost = notifyHost;
    document.body.appendChild(notifyHost);

    const open = document.createElement("button");
    open.id = "pl-open";
    open.textContent = "In-Stock Lister";

    const panel = document.createElement("div");
    panel.id = "pl-panel";
    panel.innerHTML = `
      <div class="pl-head">
        <div>
          <h3 class="pl-title">All In-Stock Product Collector <span id="pl-chip" class="pl-chip">0 items</span></h3>
        </div>
        <button id="pl-close" class="pl-close">x</button>
      </div>

      <div class="pl-body">
        <aside class="pl-side">
          <div class="pl-block">
            <label class="pl-label" for="pl-frontend">Frontend Base URL</label>
            <input id="pl-frontend" class="pl-input" type="text" value="${escapeHtml(state.settings.frontendBase)}" />
          </div>

          <div class="pl-block">
            <label class="pl-label" for="pl-brand-filter">Brand Filter (backend URL filter)</label>
            <select id="pl-brand-filter" class="pl-select"></select>
            <div class="pl-actions" style="margin-top:8px;">
              <button id="pl-apply-brand" class="pl-btn">Open Brand Filter</button>
              <button id="pl-reset-brand" class="pl-btn">Reset Brand</button>
            </div>
          </div>

          <div class="pl-block">
            <label class="pl-label" for="pl-exclude-brands">Exclude Brands (multiple, comma/newline)</label>
            <textarea id="pl-exclude-brands" class="pl-textarea" placeholder="ASUS, MSI">${escapeHtml(state.settings.excludeBrands.join("\n"))}</textarea>
          </div>

          <div class="pl-block">
            <div class="pl-actions">
              <button id="pl-scan" class="pl-btn primary">Scan All In-Stock</button>
              <button id="pl-cancel" class="pl-btn danger">Cancel</button>
            </div>
            <div class="pl-progress-wrap"><div id="pl-progress" class="pl-progress"></div></div>
            <div id="pl-status" class="pl-status">Idle</div>
          </div>

          <div class="pl-block">
            <div class="pl-actions">
              <button id="pl-export" class="pl-btn">Export CSV</button>
              <button id="pl-copy" class="pl-btn">Copy JSON</button>
            </div>
          </div>
        </aside>

        <main class="pl-main">
          <div class="pl-top">
            <input id="pl-search" class="pl-input" type="text" placeholder="Search results..." />
          </div>
          <div class="pl-table-wrap">
            <table class="pl-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Discount</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th>Brand</th>
                  <th>Categories</th>
                  <th>Slug</th>
                  <th>Admin</th>
                  <th>Frontend</th>
                </tr>
              </thead>
              <tbody id="pl-rows"></tbody>
            </table>
            <div id="pl-empty" class="pl-empty">No data yet. Click Scan All In-Stock.</div>
          </div>
        </main>
      </div>
    `;

    ui.panel = panel;
    ui.rows = panel.querySelector("#pl-rows");
    ui.chip = panel.querySelector("#pl-chip");
    ui.status = panel.querySelector("#pl-status");
    ui.progress = panel.querySelector("#pl-progress");
    ui.noData = panel.querySelector("#pl-empty");
    ui.search = panel.querySelector("#pl-search");

    root.appendChild(open);
    root.appendChild(panel);
    document.body.appendChild(root);

    open.addEventListener("click", () => panel.classList.toggle("open"));
    panel.querySelector("#pl-close").addEventListener("click", () => panel.classList.remove("open"));

    cloneBrandSelect("#brand", "#pl-brand-filter");
  }

  function bindEvents() {
    const frontendInput = ui.panel.querySelector("#pl-frontend");
    const excludeInput = ui.panel.querySelector("#pl-exclude-brands");

    frontendInput.addEventListener("change", () => {
      state.settings.frontendBase = normalizeFrontendBase(frontendInput.value);
      frontendInput.value = state.settings.frontendBase;
      saveSettings();
      notify("Saved", "Frontend base URL saved.", "success");
    });

    excludeInput.addEventListener("change", () => {
      state.settings.excludeBrands = parseExcludeBrands(excludeInput.value);
      saveSettings();
      applyResultFilter();
      notify("Saved", `Exclude brands updated (${state.settings.excludeBrands.length}).`, "success");
    });

    ui.panel.querySelector("#pl-apply-brand").addEventListener("click", applyBrandFilter);
    ui.panel.querySelector("#pl-reset-brand").addEventListener("click", resetBrandFilter);

    ui.panel.querySelector("#pl-scan").addEventListener("click", runScanAllInStock);

    ui.panel.querySelector("#pl-cancel").addEventListener("click", () => {
      state.cancelled = true;
      setStatus("Cancelling...", "warn");
    });

    ui.panel.querySelector("#pl-export").addEventListener("click", exportCSV);
    ui.panel.querySelector("#pl-copy").addEventListener("click", copyJSON);

    ui.search.addEventListener("input", applyResultFilter);
  }

  function cloneBrandSelect(sourceSelector, targetSelector) {
    const source = document.querySelector(sourceSelector);
    const target = ui.panel.querySelector(targetSelector);
    if (!source || !target) return;

    target.innerHTML = "";
    source.querySelectorAll("option").forEach((o) => {
      const op = document.createElement("option");
      op.value = o.value;
      op.textContent = o.textContent.replace(/\s+/g, " ").trim();
      target.appendChild(op);
    });
  }

  function hydrateBrandFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const brand = params.get("brand") || "";
    const el = ui.panel.querySelector("#pl-brand-filter");
    if (el) el.value = brand;
  }

  function applyBrandFilter() {
    const brandVal = ui.panel.querySelector("#pl-brand-filter")?.value || "";
    const url = new URL(window.location.href);
    if (brandVal) {
      url.searchParams.set("brand", brandVal);
    } else {
      url.searchParams.delete("brand");
    }
    url.searchParams.delete("page");
    window.location.href = url.toString();
  }

  function resetBrandFilter() {
    const url = new URL(window.location.href);
    url.searchParams.delete("brand");
    url.searchParams.delete("page");
    window.location.href = url.toString();
  }

  async function runScanAllInStock() {
    if (state.loading) {
      notify("Busy", "Scan is already running.", "warn");
      return;
    }

    state.loading = true;
    state.cancelled = false;
    state.data = [];
    applyResultFilter();
    setProgress(0);

    try {
      const baseUrl = new URL(window.location.href);
      const maxPage = detectMaxPage(document);
      const earlyStopMode = isHighToLowStockSort(baseUrl);

      setStatus(
        earlyStopMode
          ? `Collecting in-stock rows (high_to_low mode, early-stop enabled)...`
          : `Collecting in-stock rows from ${maxPage} page(s)...`,
        "info"
      );

      const collected = [];
      let stoppedEarly = false;
      for (let page = 1; page <= maxPage; page += 1) {
        if (state.cancelled) break;

        const pageUrl = new URL(baseUrl.toString());
        pageUrl.searchParams.set("page", String(page));
        const pageDoc = await fetchPageDoc(pageUrl.toString());

        const rows = Array.from(pageDoc.querySelectorAll("table tbody tr"));
        let stockOutSeenOnPage = false;

        for (const row of rows) {
          const item = extractRow(row);
          if (!item) continue;

          if (item.stockStatus === "InStock") {
            collected.push(item);
          } else if (earlyStopMode) {
            stockOutSeenOnPage = true;
            break;
          }
        }

        const pct = Math.round((page / maxPage) * 50);
        setProgress(pct);
        setStatus(`Page ${page}/${maxPage} scanned. In-stock so far: ${collected.length}`, "info");

        if (earlyStopMode && stockOutSeenOnPage) {
          stoppedEarly = true;
          setStatus(
            `Stopped at page ${page}: first stock-out encountered (high_to_low optimization). In-stock: ${collected.length}`,
            "success"
          );
          break;
        }
      }

      if (state.cancelled) {
        state.data = collected;
        applyResultFilter();
        setStatus(`Cancelled. Collected ${collected.length} in-stock products.`, "warn");
        notify("Cancelled", `Collected ${collected.length} products before cancel.`, "warn");
        return;
      }

      setStatus(`Fetching show-page details for ${collected.length} products...`, "info");
      await enrichProducts(collected);

      state.data = collected;
      applyResultFilter();
      setProgress(100);
      if (stoppedEarly) {
        setStatus(
          `Done (early-stop). Total in-stock products: ${state.data.length}`,
          "success"
        );
        notify(
          "Completed",
          `Collected ${state.data.length} in-stock products with high_to_low early-stop.`,
          "success"
        );
      } else {
        setStatus(`Done. Total in-stock products: ${state.data.length}`, "success");
        notify("Completed", `Collected ${state.data.length} in-stock products.`, "success");
      }
    } catch (err) {
      console.error(err);
      setStatus("Scan failed. Check console for details.", "error");
      notify("Error", "Scan failed due to unexpected error.", "error");
    } finally {
      state.loading = false;
    }
  }

  async function enrichProducts(items) {
    const total = items.length;
    if (!total) return;

    let done = 0;
    const queue = [...items];
    const workers = 5;

    const worker = async () => {
      while (queue.length && !state.cancelled) {
        const item = queue.shift();
        if (!item) continue;

        try {
          const detail = await fetchProductDetail(item.viewUrl, item.editUrl);
          item.slug = detail.slug || "";
          item.brand = detail.brand || item.brand || "";
          item.categories = Array.isArray(detail.categories) ? detail.categories : [];
          item.categoryText = item.categories.join(", ");
          if (detail.price) item.price = detail.price;
          if (detail.discountPrice) item.discountPrice = detail.discountPrice;
          item.frontendUrl = item.slug ? `${state.settings.frontendBase}/product/${item.slug}` : "";
        } catch {
          item.slug = item.slug || "";
        }

        done += 1;
        const pct = 50 + Math.round((done / total) * 50);
        setProgress(pct);
        setStatus(`Details ${done}/${total}`, "info");
        if (done % 20 === 0 || done === total) applyResultFilter();
      }
    };

    await Promise.all(Array.from({ length: workers }, () => worker()));
  }

  function extractRow(row) {
    const cells = row.querySelectorAll("td");
    if (!cells.length) return null;

    const name = (cells[2]?.textContent || "").replace(/\s+/g, " ").trim();
    const quantity = (cells[3]?.textContent || "").replace(/\s+/g, " ").trim();
    const priceRaw = (cells[4]?.textContent || "").replace(/\s+/g, " ").trim();
    const discountPriceRaw = (cells[5]?.textContent || "").replace(/\s+/g, " ").trim();
    const price = sanitizeMoney(priceRaw);
    const discountPrice = sanitizeMoney(discountPriceRaw);

    const actionCell = cells[cells.length - 1];
    const viewUrl = actionCell?.querySelector('a[href*="/show"]')?.href || "";
    const editUrl = actionCell?.querySelector('a[href*="/edit"]')?.href || "";

    const qtyNumber = parseQuantity(quantity);
    const isStockOut = /stock\s*out/i.test(quantity) || qtyNumber <= 0;

    return {
      name,
      viewUrl,
      editUrl,
      price,
      discountPrice,
      quantity,
      stockStatus: isStockOut ? "StockOut" : "InStock",
      brand: "",
      categories: [],
      categoryText: "",
      slug: "",
      frontendUrl: "",
    };
  }

  function detectMaxPage(doc) {
    const nums = Array.from(doc.querySelectorAll(".pagination a[href*='page=']"))
      .map((a) => {
        try {
          const u = new URL(a.href, window.location.origin);
          return Number(u.searchParams.get("page") || "0");
        } catch {
          return 0;
        }
      })
      .filter((n) => Number.isFinite(n) && n > 0);

    return nums.length ? Math.max(...nums) : 1;
  }

  async function fetchPageDoc(url) {
    const res = await fetch(url, { credentials: "include" });
    const html = await res.text();
    return new DOMParser().parseFromString(html, "text/html");
  }

  async function fetchProductDetail(showUrl, editUrl) {
    const detailFromShow = await fetchProductDetailFromShow(showUrl);
    const needsFallback = !detailFromShow.slug || !detailFromShow.brand;

    if (!needsFallback || !editUrl) {
      return detailFromShow;
    }

    const fallback = await fetchProductDetailFromEdit(editUrl);
    return {
      slug: detailFromShow.slug || fallback.slug,
      brand: detailFromShow.brand || fallback.brand,
      categories: detailFromShow.categories?.length ? detailFromShow.categories : fallback.categories,
      price: detailFromShow.price || "",
      discountPrice: detailFromShow.discountPrice || "",
    };
  }

  async function fetchProductDetailFromShow(showUrl) {
    if (!showUrl) {
      return { slug: "", brand: "", categories: [], price: "", discountPrice: "" };
    }

    const res = await fetch(showUrl, { credentials: "include" });
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    const slugValue = findTableValueByLabel(doc, /^slug$/i);
    const brandValue = findTableValueByLabel(doc, /^brand$/i);
    const categoryValue = findTableValueByLabel(doc, /^categories?$/i);
    const priceValue = findTableValueByLabel(doc, /^price$/i);
    const discountValue = findTableValueByLabel(doc, /^discount\s*price$/i);

    let slug = slugValue;
    if (!slug) {
      const possible = Array.from(doc.querySelectorAll("a[href*='/product/']"))
        .map((a) => a.getAttribute("href") || "")
        .find((href) => /\/product\//.test(href));
      if (possible) {
        const split = possible.split("/product/");
        slug = split[1] ? split[1].split(/[?#]/)[0] : "";
      }
    }

    const categories = categoryValue
      ? categoryValue.split(",").map((x) => normalizeCategoryName(x)).filter(Boolean)
      : [];

    return {
      slug: slug.trim(),
      brand: (brandValue || "").trim(),
      categories,
      price: sanitizeMoney(priceValue),
      discountPrice: sanitizeMoney(discountValue),
    };
  }

  async function fetchProductDetailFromEdit(editUrl) {
    if (!editUrl) {
      return { slug: "", brand: "", categories: [] };
    }

    const res = await fetch(editUrl, { credentials: "include" });
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    let slug =
      doc.querySelector('input[name="slug"]')?.value ||
      doc.querySelector('input[name="product_slug"]')?.value ||
      doc.querySelector("#slug")?.value ||
      "";

    let brand = "";
    const brandSelect = doc.querySelector('select[name="brand_id"], select[name="brand"]');
    if (brandSelect) {
      const selected = brandSelect.options[brandSelect.selectedIndex];
      brand = selected ? selected.textContent.replace(/\s+/g, " ").trim() : "";
    }

    const categories = extractCategoriesFromDoc(doc);
    return { slug: slug.trim(), brand, categories };
  }

  function findTableValueByLabel(doc, labelRegex) {
    const rows = doc.querySelectorAll("table tr");
    for (const row of rows) {
      const cells = row.querySelectorAll("td");
      if (cells.length < 2) continue;

      const label = normalizeShowTableText(cells[0].textContent || "");
      if (!labelRegex.test(label)) continue;

      const value = normalizeShowTableText(cells[1].textContent || "").replace(/^:\s*/, "");
      return value;
    }
    return "";
  }

  function normalizeShowTableText(text) {
    return String(text || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function extractCategoriesFromDoc(doc) {
    const out = new Set();
    const categoryOptionSelectors = [
      'select[name="category_id[]"] option:checked',
      'select[name="category_ids[]"] option:checked',
      'select[name="categories[]"] option:checked',
      'select[name="category_id"] option:checked',
      'select[name="category"] option:checked',
      '#category option:checked',
      'select[id*="category"] option:checked',
      'select[name*="category"] option:checked'
    ];

    categoryOptionSelectors.forEach((selector) => {
      doc.querySelectorAll(selector).forEach((opt) => {
        const name = normalizeCategoryName(opt.textContent || "");
        if (name) out.add(name);
      });
    });

    if (!out.size) {
      doc.querySelectorAll('.select2-selection__choice, .badge-category, [data-category-name]').forEach((node) => {
        const txt = node.getAttribute("data-category-name") || node.textContent || "";
        const name = normalizeCategoryName(txt);
        if (name) out.add(name);
      });
    }

    return Array.from(out);
  }

  function normalizeCategoryName(text) {
    const normalized = String(text || "")
      .replace(/\u00a0/g, " ")
      .replace(/^[-\s>]+/, "")
      .replace(/\s+/g, " ")
      .trim();
    return normalized;
  }

  function applyResultFilter() {
    const keyword = (ui.search?.value || "").trim().toLowerCase();
    const excludes = state.settings.excludeBrands
      .map((b) => b.trim().toLowerCase())
      .filter(Boolean);

    state.filteredData = state.data.filter((item) => {
      if (item.stockStatus !== "InStock") return false;

      const haystack = `${item.name} ${item.brand} ${item.slug} ${item.price} ${item.discountPrice} ${item.categoryText || ""}`.toLowerCase();
      if (keyword && !haystack.includes(keyword)) return false;

      if (!excludes.length) return true;
      const brandSource = (item.brand || "").trim().toLowerCase();
      if (!brandSource) return true;
      return !excludes.includes(brandSource);
    });

    renderRows();
  }

  function renderRows() {
    ui.rows.innerHTML = "";
    const list = state.filteredData;

    ui.chip.textContent = `${list.length} items`;
    ui.noData.style.display = list.length ? "none" : "block";

    const frag = document.createDocumentFragment();
    list.forEach((item, index) => {
      const tr = document.createElement("tr");
      tr.style.display = "table-row";
      tr.style.opacity = "1";
      tr.style.visibility = "visible";
      tr.style.animation = "none";
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.price)}</td>
        <td>${escapeHtml(item.discountPrice)}</td>
        <td>${escapeHtml(item.quantity)}</td>
        <td><span class="pl-stock-in">InStock</span></td>
        <td>${escapeHtml(item.brand)}</td>
        <td>${escapeHtml(item.categoryText || "")}</td>
        <td>${escapeHtml(item.slug)}</td>
        <td>${item.viewUrl ? `<a href="${escapeHtml(item.viewUrl)}" target="_blank">open</a>` : "-"}</td>
        <td>${item.frontendUrl ? `<a href="${escapeHtml(item.frontendUrl)}" target="_blank">product</a>` : "-"}</td>
      `;
      frag.appendChild(tr);
    });
    ui.rows.appendChild(frag);
  }

  function isHighToLowStockSort(urlObj) {
    return (urlObj.searchParams.get("sort_stock") || "").toLowerCase() === "high_to_low";
  }

  function exportCSV() {
    if (!state.filteredData.length) {
      notify("No Data", "Nothing to export.", "warn");
      return;
    }

    const headers = ["name", "price", "discountPrice", "quantity", "stockStatus", "brand", "categories", "slug", "adminViewUrl", "adminEditUrl", "frontendUrl"];
    const lines = [headers.join(",")];

    state.filteredData.forEach((r) => {
      lines.push([
        csvCell(r.name),
        csvCell(r.price),
        csvCell(r.discountPrice),
        csvCell(r.quantity),
        csvCell(r.stockStatus),
        csvCell(r.brand),
        csvCell((r.categories || []).join(" | ")),
        csvCell(r.slug),
        csvCell(r.viewUrl),
        csvCell(r.editUrl),
        csvCell(r.frontendUrl),
      ].join(","));
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pcb-instock-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    notify("Exported", `CSV exported (${state.filteredData.length} rows).`, "success");
  }

  async function copyJSON() {
    if (!state.filteredData.length) {
      notify("No Data", "Nothing to copy.", "warn");
      return;
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(state.filteredData, null, 2));
      notify("Copied", `Copied ${state.filteredData.length} rows to clipboard.`, "success");
    } catch {
      notify("Clipboard Error", "Clipboard permission failed.", "error");
    }
  }

  function parseExcludeBrands(text) {
    return (text || "")
      .split(/[\n,]+/)
      .map((x) => x.trim())
      .filter(Boolean);
  }

  function normalizeFrontendBase(url) {
    let val = (url || "").trim();
    if (!val) val = DEFAULT_FRONTEND_BASE;
    return val.replace(/\/$/, "");
  }

  function parseQuantity(text) {
    const m = (text || "").replace(/,/g, "").match(/-?\d+/);
    return m ? Number(m[0]) : 0;
  }

  function sanitizeMoney(text) {
    if (!text) return "";
    const cleaned = String(text).replace(/[^\d.-]/g, "");
    if (!cleaned) return "";
    const num = Number(cleaned);
    if (!Number.isFinite(num)) return cleaned;
    return num.toFixed(2);
  }

  function setStatus(message, type) {
    ui.status.textContent = message;
    if (type === "error") ui.status.style.color = "#ffafc0";
    else if (type === "warn") ui.status.style.color = "#ffd795";
    else if (type === "success") ui.status.style.color = "#a4f4e6";
    else ui.status.style.color = "#9fb0d9";
  }

  function setProgress(pct) {
    ui.progress.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  }

  function notify(title, text, type) {
    const el = document.createElement("div");
    el.className = `pl-toast ${type || "info"}`;
    el.innerHTML = `<b>${escapeHtml(title)}</b><div>${escapeHtml(text)}</div>`;
    ui.notifyHost.appendChild(el);

    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateX(12px)";
      setTimeout(() => el.remove(), 220);
    }, 3200);
  }

  function csvCell(v) {
    return `"${String(v ?? "").replace(/"/g, '""')}"`;
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
