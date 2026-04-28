// ==UserScript==
// @name         PCB Category Tree Organizer V2
// @namespace    http://tampermonkey.net/
// @version      2.0.0
// @description  Enhanced category tree extractor with hierarchy slug paths, filters, sortable table, and multi-format export (JSON/MD/CSV/XLSX)
// @match        https://admin.pcbstore.net/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  /* ───────────────────────── constants ───────────────────────── */
  const FRONTEND_BASE = "https://pcbstore.com.bd";
  const MODAL_ID = "cto2-modal";
  const TREE_SELECTOR = "#categoryTree";
  const SCAN_TIMEOUT_MS = 30000;

  /* ───────────────────────── state ───────────────────────── */
  const S = {
    all: [],
    filtered: [],
    filters: { name: "", depth: "all", state: "all", parent: "" },
    sortCol: "depth",
    sortAsc: true,
    scanning: false,
  };

  /* ───────────────────────── helpers ───────────────────────── */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const esc = (v) =>
    String(v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const slugify = (text) =>
    String(text)
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const getDirectChildUl = (li) =>
    Array.from(li.children).find((c) => c.tagName === "UL") || null;

  const getDirectAnchor = (li) =>
    Array.from(li.children).find(
      (c) => c.tagName === "A" && c.classList.contains("jstree-anchor")
    ) || null;

  /* ───────────────────────── tree reading (read-only) ───────────────────────── */
  const getTreeRoot = () =>
    document.querySelector(TREE_SELECTOR) ||
    document.querySelector(".jstree") ||
    null;

  const waitForTreeIdle = (root, idleMs = 300, maxMs = 2000) =>
    new Promise((resolve) => {
      let timer = null;
      const obs = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(done, idleMs);
      });
      const done = () => {
        obs.disconnect();
        resolve();
      };
      obs.observe(root, { childList: true, subtree: true, attributes: true });
      timer = setTimeout(done, maxMs);
    });

  const expandAllNodes = async () => {
    const root = getTreeRoot();
    if (!root) return 0;
    let expanded = 0;
    let rounds = 0;
    const t0 = Date.now();

    while (rounds < 50 && Date.now() - t0 < SCAN_TIMEOUT_MS) {
      const closed = Array.from(
        root.querySelectorAll("li.jstree-closed > .jstree-ocl")
      );
      if (!closed.length) break;
      for (const ocl of closed.slice(0, 30)) {
        ocl.dispatchEvent(
          new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            view: window,
          })
        );
        expanded++;
        await sleep(40);
      }
      rounds++;
      await waitForTreeIdle(root);
    }
    await sleep(200);
    return expanded;
  };

  const parseTree = () => {
    const root = getTreeRoot();
    if (!root) return [];
    const containerUl =
      root.querySelector("ul.jstree-container-ul") ||
      root.querySelector("ul");
    if (!containerUl) return [];

    const results = [];

    const walk = (parentUl, parentName, parentSlugPath, depth) => {
      for (const li of parentUl.children) {
        if (li.tagName !== "LI") continue;
        const anchor = getDirectAnchor(li);
        if (!anchor) continue;

        const name = anchor.textContent.replace(/\s+/g, " ").trim();
        const id = li.getAttribute("data-id") || li.id || "";
        const slug = slugify(name);
        const slugPath = parentSlugPath ? parentSlugPath + "/" + slug : slug;
        const nodeState = li.classList.contains("jstree-open")
          ? "open"
          : li.classList.contains("jstree-closed")
            ? "closed"
            : li.classList.contains("jstree-leaf")
              ? "leaf"
              : "unknown";

        results.push({
          id,
          name,
          slug,
          slugPath,
          depth,
          state: nodeState,
          parent: parentName || "root",
          link: FRONTEND_BASE + "/" + slugPath,
        });

        const childUl = getDirectChildUl(li);
        if (childUl) walk(childUl, name, slugPath, depth + 1);
      }
    };

    walk(containerUl, null, "", 0);
    return results;
  };

  /* ───────────────────────── filter / sort ───────────────────────── */
  const applyFilters = () => {
    const { name, depth, state, parent } = S.filters;
    const nl = name.toLowerCase();
    const pl = parent.toLowerCase();

    S.filtered = S.all.filter((c) => {
      if (nl && !c.name.toLowerCase().includes(nl)) return false;
      if (depth !== "all" && String(c.depth) !== depth) return false;
      if (state !== "all" && c.state !== state) return false;
      if (pl && !c.parent.toLowerCase().includes(pl)) return false;
      return true;
    });

    applySorting();
  };

  const applySorting = () => {
    const col = S.sortCol;
    const asc = S.sortAsc ? 1 : -1;
    S.filtered.sort((a, b) => {
      let va = a[col],
        vb = b[col];
      if (typeof va === "number") return (va - vb) * asc;
      va = String(va).toLowerCase();
      vb = String(vb).toLowerCase();
      return va < vb ? -1 * asc : va > vb ? 1 * asc : 0;
    });
  };

  /* ───────────────────────── export helpers ───────────────────────── */
  const exportData = () =>
    S.filtered.map((c) => ({
      ID: c.id,
      Depth: c.depth,
      Name: c.name,
      Slug: c.slug,
      "Slug Path": c.slugPath,
      State: c.state,
      Parent: c.parent,
      Link: c.link,
    }));

  const downloadBlob = (content, filename, mime) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: filename,
    });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const doExportJSON = () => {
    const data = exportData();
    downloadBlob(
      JSON.stringify(data, null, 2),
      `pcb-categories-${datestamp()}.json`,
      "application/json"
    );
    setStatus(`Exported ${data.length} categories as JSON`, "ok");
  };

  const doExportCSV = () => {
    const data = exportData();
    if (!data.length) return setStatus("Nothing to export", "warn");
    const keys = Object.keys(data[0]);
    const lines = [
      keys.join(","),
      ...data.map((r) =>
        keys.map((k) => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(",")
      ),
    ];
    downloadBlob(
      lines.join("\n"),
      `pcb-categories-${datestamp()}.csv`,
      "text/csv"
    );
    setStatus(`Exported ${data.length} categories as CSV`, "ok");
  };

  const doExportMarkdown = () => {
    const data = exportData();
    if (!data.length) return setStatus("Nothing to export", "warn");
    const keys = Object.keys(data[0]);
    const md = [
      "| " + keys.join(" | ") + " |",
      "| " + keys.map(() => "---").join(" | ") + " |",
      ...data.map((r) => "| " + keys.map((k) => String(r[k])).join(" | ") + " |"),
    ].join("\n");
    downloadBlob(
      md,
      `pcb-categories-${datestamp()}.md`,
      "text/markdown"
    );
    setStatus(`Exported ${data.length} categories as Markdown`, "ok");
  };

  const doExportXLSX = () => {
    if (typeof XLSX === "undefined") {
      return setStatus("XLSX library not loaded yet — try again shortly", "warn");
    }
    const data = exportData();
    if (!data.length) return setStatus("Nothing to export", "warn");

    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 10 },
      { wch: 7 },
      { wch: 30 },
      { wch: 25 },
      { wch: 55 },
      { wch: 9 },
      { wch: 30 },
      { wch: 65 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Categories");
    XLSX.writeFile(wb, `pcb-categories-${datestamp()}.xlsx`);
    setStatus(`Exported ${data.length} categories as XLSX`, "ok");
  };

  const doCopyAll = async () => {
    const header = "Depth\tName\tSlug Path\tState\tParent\tLink";
    const rows = S.filtered
      .map(
        (c) =>
          `${c.depth}\t${c.name}\t${c.slugPath}\t${c.state}\t${c.parent}\t${c.link}`
      )
      .join("\n");
    try {
      await navigator.clipboard.writeText(header + "\n" + rows);
      setStatus(`Copied ${S.filtered.length} rows to clipboard`, "ok");
    } catch {
      setStatus("Clipboard write failed — check permissions", "err");
    }
  };

  const datestamp = () => new Date().toISOString().slice(0, 10);

  /* ───────────────────────── UI rendering ───────────────────────── */
  const setStatus = (msg, tone) => {
    const el = document.getElementById("cto2-status");
    if (!el) return;
    el.textContent = (tone === "ok" ? "✓ " : tone === "warn" ? "⚠ " : tone === "err" ? "✗ " : "") + msg;
    el.className = "cto2-status " + (tone || "");
  };

  const renderTable = () => {
    const tbody = document.getElementById("cto2-tbody");
    if (!tbody) return;

    if (!S.filtered.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="cto2-empty">${
        S.all.length === 0
          ? 'Click <b>"Scan All Categories"</b> to begin'
          : "No categories match current filters"
      }</td></tr>`;
      updateStats();
      return;
    }

    const CAP = 5000;
    const show = S.filtered.slice(0, CAP);
    const frag = document.createDocumentFragment();

    for (const c of show) {
      const tr = document.createElement("tr");
      tr.innerHTML =
        `<td class="cto2-col-depth">${c.depth}</td>` +
        `<td style="padding-left:${8 + c.depth * 14}px">${esc(c.name)}</td>` +
        `<td class="cto2-col-slug" title="${esc(c.slugPath)}">${esc(c.slugPath)}</td>` +
        `<td><span class="cto2-badge cto2-badge-${c.state}">${c.state}</span></td>` +
        `<td>${esc(c.parent)}</td>` +
        `<td><a href="${esc(c.link)}" target="_blank" rel="noopener" class="cto2-link">&#8599;</a></td>`;
      frag.appendChild(tr);
    }

    tbody.innerHTML = "";
    tbody.appendChild(frag);

    if (S.filtered.length > CAP) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="6" class="cto2-empty">Showing ${CAP} of ${S.filtered.length}</td>`;
      tbody.appendChild(tr);
    }
    updateStats();
  };

  const updateStats = () => {
    const q = (id) => document.getElementById(id);
    const maxD = S.all.reduce((m, c) => Math.max(m, c.depth), 0);
    if (q("cto2-stat-total")) q("cto2-stat-total").textContent = S.all.length;
    if (q("cto2-stat-filtered"))
      q("cto2-stat-filtered").textContent = S.filtered.length;
    if (q("cto2-stat-depth")) q("cto2-stat-depth").textContent = maxD;
    if (q("cto2-row-count"))
      q("cto2-row-count").textContent = `Rows: ${S.filtered.length}`;
  };

  const refreshSortIndicators = () => {
    document.querySelectorAll(".cto2-th[data-col]").forEach((th) => {
      const arrow = th.querySelector(".cto2-sort-arrow");
      if (!arrow) return;
      if (th.dataset.col === S.sortCol) {
        arrow.textContent = S.sortAsc ? " ▲" : " ▼";
        arrow.style.opacity = "1";
      } else {
        arrow.textContent = " ▲";
        arrow.style.opacity = "0.25";
      }
    });
  };

  /* ───────────────────────── build UI ───────────────────────── */
  const injectStyles = () => {
    if (document.getElementById("cto2-styles")) return;
    const style = document.createElement("style");
    style.id = "cto2-styles";
    style.textContent = `
      /* overlay */
      #${MODAL_ID}{position:fixed;top:0;left:0;width:100%;height:100%;z-index:999999;
        background:rgba(0,0,0,.88);backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;}
      #${MODAL_ID}.open{display:flex;}

      /* container */
      .cto2-box{background:linear-gradient(145deg,#0b1120 0%,#131c33 100%);
        border:1px solid rgba(96,165,250,.18);border-radius:20px;width:92%;max-width:1440px;height:93vh;
        display:flex;flex-direction:column;color:#e2e8f0;
        font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
        box-shadow:0 32px 80px rgba(0,0,0,.65);}

      /* header */
      .cto2-header{display:flex;align-items:center;justify-content:space-between;
        padding:22px 28px;border-bottom:1px solid rgba(96,165,250,.15);
        background:linear-gradient(135deg,rgba(11,17,32,.97),rgba(19,28,51,.97));}
      .cto2-title{font-size:24px;font-weight:800;letter-spacing:-.4px;
        background:linear-gradient(135deg,#e0e7ff,#93c5fd);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
      .cto2-close{width:40px;height:40px;border:1px solid rgba(255,255,255,.12);
        background:rgba(255,255,255,.06);border-radius:12px;color:#fff;font-size:22px;
        cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.15s;}
      .cto2-close:hover{background:rgba(239,68,68,.25);border-color:#ef4444;}

      /* body layout */
      .cto2-body{display:flex;flex:1;overflow:hidden;}

      /* sidebar */
      .cto2-sidebar{width:260px;min-width:260px;border-right:1px solid rgba(255,255,255,.08);
        overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:6px;}
      .cto2-sec-title{font-size:11px;text-transform:uppercase;letter-spacing:1.4px;
        color:#60a5fa;font-weight:700;margin:14px 0 8px;}
      .cto2-sec-title:first-child{margin-top:0;}
      .cto2-label{font-size:11.5px;font-weight:600;color:#94a3b8;margin-bottom:3px;margin-top:6px;}
      .cto2-input,.cto2-select{width:100%;padding:9px 11px;border:1px solid rgba(255,255,255,.1);
        background:rgba(255,255,255,.04);color:#f1f5f9;border-radius:8px;font-size:12.5px;
        box-sizing:border-box;transition:.15s;}
      .cto2-input::placeholder{color:rgba(148,163,184,.55);}
      .cto2-input:focus,.cto2-select:focus{outline:none;border-color:rgba(96,165,250,.45);background:rgba(37,99,235,.07);}
      .cto2-btn{display:block;width:100%;padding:10px 14px;border:1px solid rgba(255,255,255,.12);
        background:linear-gradient(135deg,rgba(30,41,59,.5),rgba(15,23,42,.5));color:#e0e7ff;
        border-radius:10px;font-size:12.5px;font-weight:600;cursor:pointer;text-align:center;
        transition:.15s;margin-bottom:6px;box-sizing:border-box;}
      .cto2-btn:hover{border-color:rgba(96,165,250,.35);background:rgba(37,99,235,.12);}
      .cto2-btn-primary{background:linear-gradient(135deg,#2563eb,#1d4ed8);
        border-color:rgba(96,165,250,.5);color:#fff;}
      .cto2-btn-primary:hover{background:linear-gradient(135deg,#3b82f6,#2563eb);}
      .cto2-btn-danger{background:rgba(239,68,68,.14);border-color:rgba(239,68,68,.35);color:#fca5a5;}
      .cto2-btn-danger:hover{background:rgba(239,68,68,.25);}
      .cto2-btn-xlsx{background:linear-gradient(135deg,#2563eb,#1e40af);border-color:rgba(59,130,246,.6);color:#fff;}
      .cto2-btn-xlsx:hover{background:linear-gradient(135deg,#3b82f6,#2563eb);}

      /* stats */
      .cto2-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px;}
      .cto2-stat{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);
        border-radius:10px;padding:12px 8px;text-align:center;}
      .cto2-stat-val{font-size:22px;font-weight:700;color:#60a5fa;}
      .cto2-stat-val.highlight{color:#22d3ee;}
      .cto2-stat-lbl{font-size:10px;text-transform:uppercase;letter-spacing:.08em;
        color:rgba(226,232,240,.5);margin-top:3px;}
      .cto2-stat-full{grid-column:1/-1;}

      /* main */
      .cto2-main{flex:1;display:flex;flex-direction:column;overflow:hidden;}
      .cto2-toolbar{display:flex;gap:10px;padding:14px 20px;border-bottom:1px solid rgba(255,255,255,.07);
        align-items:center;flex-wrap:wrap;}
      .cto2-toolbar .cto2-tbtn{padding:8px 16px;border:1px solid rgba(255,255,255,.12);
        background:rgba(30,41,59,.5);color:#e0e7ff;border-radius:8px;font-size:12px;
        font-weight:600;cursor:pointer;transition:.15s;}
      .cto2-toolbar .cto2-tbtn:hover{border-color:rgba(96,165,250,.35);background:rgba(37,99,235,.12);}
      .cto2-toolbar .cto2-tbtn-danger{background:rgba(239,68,68,.14);border-color:rgba(239,68,68,.35);color:#fca5a5;}
      .cto2-toolbar .cto2-tbtn-danger:hover{background:rgba(239,68,68,.25);}
      #cto2-row-count{margin-left:auto;font-size:11.5px;color:#64748b;}

      /* table */
      .cto2-table-wrap{flex:1;overflow:auto;}
      .cto2-table{width:100%;border-collapse:collapse;font-size:12.5px;}
      .cto2-table thead{position:sticky;top:0;z-index:2;
        background:rgba(11,17,32,.95);border-bottom:2px solid rgba(96,165,250,.18);}
      .cto2-th{padding:12px 14px;text-align:left;font-weight:700;color:#60a5fa;
        white-space:nowrap;cursor:pointer;user-select:none;font-size:12px;transition:.12s;}
      .cto2-th:hover{background:rgba(96,165,250,.08);}
      .cto2-sort-arrow{font-size:10px;margin-left:3px;}
      .cto2-table td{padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.04);}
      .cto2-table tbody tr:hover{background:rgba(96,165,250,.06);}
      .cto2-col-depth{color:#64748b;font-weight:600;width:55px;}
      .cto2-col-slug{color:#60a5fa;font-family:"Cascadia Code","Fira Code",monospace;font-size:11.5px;
        max-width:380px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .cto2-badge{display:inline-block;padding:3px 10px;border-radius:6px;font-size:10.5px;font-weight:700;letter-spacing:.03em;}
      .cto2-badge-open{background:rgba(34,197,94,.12);color:#86efac;}
      .cto2-badge-closed{background:rgba(245,158,11,.12);color:#fbbf24;}
      .cto2-badge-leaf{background:rgba(96,165,250,.12);color:#93c5fd;}
      .cto2-badge-unknown{background:rgba(148,163,184,.12);color:#94a3b8;}
      .cto2-link{color:#60a5fa;text-decoration:none;font-size:15px;transition:.12s;}
      .cto2-link:hover{color:#93c5fd;}
      .cto2-empty{text-align:center;padding:28px 20px!important;color:#475569;font-size:13px;}

      /* status bar */
      .cto2-status{padding:10px 20px;font-size:12px;color:#64748b;
        border-top:1px solid rgba(255,255,255,.06);background:rgba(0,0,0,.15);
        flex-shrink:0;}
      .cto2-status.ok{color:#4ade80;}
      .cto2-status.warn{color:#fbbf24;}
      .cto2-status.err{color:#f87171;}

      /* trigger button */
      #cto2-trigger{position:fixed;bottom:80px;right:20px;z-index:999998;
        padding:11px 22px;background:linear-gradient(135deg,#2563eb,#1e40af);color:#fff;
        border:none;border-radius:12px;cursor:pointer;font-weight:700;font-size:13px;
        box-shadow:0 6px 24px rgba(37,99,235,.35);transition:.2s;font-family:inherit;}
      #cto2-trigger:hover{transform:translateY(-2px);box-shadow:0 10px 32px rgba(37,99,235,.45);}

      /* scrollbar */
      .cto2-sidebar::-webkit-scrollbar,.cto2-table-wrap::-webkit-scrollbar{width:6px;height:6px;}
      .cto2-sidebar::-webkit-scrollbar-track,.cto2-table-wrap::-webkit-scrollbar-track{background:transparent;}
      .cto2-sidebar::-webkit-scrollbar-thumb,.cto2-table-wrap::-webkit-scrollbar-thumb{
        background:rgba(96,165,250,.2);border-radius:4px;}
    `;
    document.head.appendChild(style);
  };

  const buildModal = () => {
    if (document.getElementById(MODAL_ID)) return;
    const modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.innerHTML = `
    <div class="cto2-box">
      <div class="cto2-header">
        <div class="cto2-title">PCB Category Tree Organizer</div>
        <button class="cto2-close" id="cto2-close" title="Close">&times;</button>
      </div>
      <div class="cto2-body">
        <!-- SIDEBAR -->
        <div class="cto2-sidebar">
          <div class="cto2-sec-title">Actions</div>
          <button class="cto2-btn cto2-btn-primary" id="cto2-scan">&#128202; Scan All Categories</button>

          <div class="cto2-sec-title">Filters</div>
          <div class="cto2-label">By Name</div>
          <input type="text" class="cto2-input" id="cto2-f-name" placeholder="e.g., Laptop, Monitor...">
          <div class="cto2-label">By Depth</div>
          <select class="cto2-select" id="cto2-f-depth">
            <option value="all">All levels</option>
            <option value="0">0 &mdash; Root</option>
            <option value="1">1 &mdash; Sub-category</option>
            <option value="2">2 &mdash; Brand / Type</option>
            <option value="3">3 &mdash; Level 3</option>
            <option value="4">4 &mdash; Level 4</option>
          </select>
          <div class="cto2-label">By State</div>
          <select class="cto2-select" id="cto2-f-state">
            <option value="all">All states</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="leaf">Leaf</option>
          </select>
          <div class="cto2-label">By Parent</div>
          <input type="text" class="cto2-input" id="cto2-f-parent" placeholder="e.g., PC Components...">
          <button class="cto2-btn" id="cto2-reset" style="margin-top:10px;">Reset Filters</button>

          <div class="cto2-sec-title">Stats</div>
          <div class="cto2-stats">
            <div class="cto2-stat">
              <div class="cto2-stat-val" id="cto2-stat-total">0</div>
              <div class="cto2-stat-lbl">Total</div>
            </div>
            <div class="cto2-stat">
              <div class="cto2-stat-val highlight" id="cto2-stat-filtered">0</div>
              <div class="cto2-stat-lbl">Filtered</div>
            </div>
            <div class="cto2-stat cto2-stat-full">
              <div class="cto2-stat-val" id="cto2-stat-depth">0</div>
              <div class="cto2-stat-lbl">Max Depth</div>
            </div>
          </div>

          <div class="cto2-sec-title">Export</div>
          <button class="cto2-btn" id="cto2-exp-json">JSON</button>
          <button class="cto2-btn" id="cto2-exp-md">Markdown</button>
          <button class="cto2-btn" id="cto2-exp-csv">CSV</button>
          <button class="cto2-btn cto2-btn-xlsx" id="cto2-exp-xlsx">XLSX</button>
        </div>

        <!-- MAIN -->
        <div class="cto2-main">
          <div class="cto2-toolbar">
            <button class="cto2-tbtn" id="cto2-copy">Copy All</button>
            <button class="cto2-tbtn cto2-tbtn-danger" id="cto2-clear">Clear Filters</button>
            <span id="cto2-row-count">Rows: 0</span>
          </div>
          <div class="cto2-table-wrap">
            <table class="cto2-table">
              <thead>
                <tr>
                  <th class="cto2-th" data-col="depth" style="width:55px">Depth<span class="cto2-sort-arrow"> ▲</span></th>
                  <th class="cto2-th" data-col="name" style="width:200px">Name<span class="cto2-sort-arrow"> ▲</span></th>
                  <th class="cto2-th" data-col="slugPath">Slug Path<span class="cto2-sort-arrow"> ▲</span></th>
                  <th class="cto2-th" data-col="state" style="width:80px">State<span class="cto2-sort-arrow"> ▲</span></th>
                  <th class="cto2-th" data-col="parent" style="width:160px">Parent<span class="cto2-sort-arrow"> ▲</span></th>
                  <th style="width:45px;padding:12px 14px;color:#60a5fa;font-weight:700;font-size:12px;">Link</th>
                </tr>
              </thead>
              <tbody id="cto2-tbody">
                <tr><td colspan="6" class="cto2-empty">Click <b>"Scan All Categories"</b> to begin</td></tr>
              </tbody>
            </table>
          </div>
          <div class="cto2-status" id="cto2-status">Waiting for scan&hellip;</div>
        </div>
      </div>
    </div>`;
    document.body.appendChild(modal);
    wireEvents(modal);
  };

  /* ───────────────────────── events ───────────────────────── */
  const wireEvents = (modal) => {
    /* close */
    modal.querySelector("#cto2-close").addEventListener("click", () => {
      modal.classList.remove("open");
    });
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("open");
    });

    /* scan */
    modal.querySelector("#cto2-scan").addEventListener("click", async () => {
      if (S.scanning) return;
      S.scanning = true;
      const btn = modal.querySelector("#cto2-scan");
      btn.textContent = "⏳ Scanning...";
      btn.style.pointerEvents = "none";
      setStatus("Expanding closed nodes...", "warn");

      const expanded = await expandAllNodes();
      setStatus("Reading tree DOM...", "warn");
      await sleep(150);

      S.all = parseTree();
      applyFilters();
      renderTable();

      const msg = `Scanned ${S.all.length} categories${expanded ? ` (${expanded} nodes expanded first)` : ""}`;
      setStatus(msg, "ok");
      btn.innerHTML = "&#128202; Scan All Categories";
      btn.style.pointerEvents = "";
      S.scanning = false;
    });

    /* filters */
    const onFilter = () => {
      S.filters.name = modal.querySelector("#cto2-f-name").value;
      S.filters.depth = modal.querySelector("#cto2-f-depth").value;
      S.filters.state = modal.querySelector("#cto2-f-state").value;
      S.filters.parent = modal.querySelector("#cto2-f-parent").value;
      applyFilters();
      renderTable();
    };
    modal.querySelector("#cto2-f-name").addEventListener("input", onFilter);
    modal.querySelector("#cto2-f-depth").addEventListener("change", onFilter);
    modal.querySelector("#cto2-f-state").addEventListener("change", onFilter);
    modal.querySelector("#cto2-f-parent").addEventListener("input", onFilter);

    const resetFilters = () => {
      S.filters = { name: "", depth: "all", state: "all", parent: "" };
      modal.querySelector("#cto2-f-name").value = "";
      modal.querySelector("#cto2-f-depth").value = "all";
      modal.querySelector("#cto2-f-state").value = "all";
      modal.querySelector("#cto2-f-parent").value = "";
      applyFilters();
      renderTable();
    };
    modal.querySelector("#cto2-reset").addEventListener("click", resetFilters);
    modal.querySelector("#cto2-clear").addEventListener("click", resetFilters);

    /* sort */
    modal.querySelectorAll(".cto2-th[data-col]").forEach((th) => {
      th.addEventListener("click", () => {
        const col = th.dataset.col;
        if (S.sortCol === col) {
          S.sortAsc = !S.sortAsc;
        } else {
          S.sortCol = col;
          S.sortAsc = true;
        }
        applySorting();
        renderTable();
        refreshSortIndicators();
      });
    });

    /* exports */
    modal.querySelector("#cto2-copy").addEventListener("click", doCopyAll);
    modal.querySelector("#cto2-exp-json").addEventListener("click", doExportJSON);
    modal.querySelector("#cto2-exp-md").addEventListener("click", doExportMarkdown);
    modal.querySelector("#cto2-exp-csv").addEventListener("click", doExportCSV);
    modal.querySelector("#cto2-exp-xlsx").addEventListener("click", doExportXLSX);
  };

  /* ───────────────────────── init ───────────────────────── */
  const createTrigger = () => {
    if (document.getElementById("cto2-trigger")) return;
    const btn = document.createElement("button");
    btn.id = "cto2-trigger";
    btn.textContent = "📊 Category Tree V2";
    btn.style.cssText = `
      position:fixed;bottom:80px;right:20px;z-index:2147483647;
      padding:11px 22px;background:linear-gradient(135deg,#2563eb,#1e40af);color:#fff;
      border:none;border-radius:12px;cursor:pointer;font-weight:700;font-size:13px;
      box-shadow:0 6px 24px rgba(37,99,235,.35);font-family:inherit;
    `;
    btn.addEventListener("click", () => {
      injectStyles();
      buildModal();
      const m = document.getElementById(MODAL_ID);
      if (m) m.classList.add("open");
      refreshSortIndicators();
    });
    document.body.appendChild(btn);
  };

  const boot = () => {
    const check = () =>
      document.querySelector(TREE_SELECTOR) ||
      document.querySelector(".jstree");
    if (check()) {
      createTrigger();
      return;
    }
    const obs = new MutationObserver(() => {
      if (check()) {
        obs.disconnect();
        createTrigger();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => obs.disconnect(), 30000);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
