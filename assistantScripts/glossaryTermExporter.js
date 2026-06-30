// ==UserScript==
// @name         PCB Glossary Term Exporter
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Export all glossary terms with category, status, and frontend link across all pages
// @author       faketi101
// @match        https://admin.pcbstore.net/admin/glossary/terms*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const BASE_URL = "https://pcbstore.com.bd";
  const GLOSSARY_PATH = "/glossary";
  const SESSION_KEY = "gte_session";
  const DATA_KEY_PREFIX = "gte_page_";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const slugify = (text) =>
    text
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const escapeCsv = (value) => {
    const str = String(value ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const getSessionId = () => {
    let session = localStorage.getItem(SESSION_KEY);
    if (!session) {
      session = "s_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
      localStorage.setItem(SESSION_KEY, session);
    }
    return session;
  };

  const clearSession = () => {
    const session = getSessionId();
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DATA_KEY_PREFIX + session)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem(SESSION_KEY);
  };

  const savePageData = (page, data) => {
    const session = getSessionId();
    localStorage.setItem(DATA_KEY_PREFIX + session + "_" + page, JSON.stringify(data));
  };

  const getAllData = () => {
    const session = getSessionId();
    const pages = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DATA_KEY_PREFIX + session)) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          pages.push(data);
        } catch (_) {}
      }
    }
    pages.sort((a, b) => a.page - b.page);
    return pages;
  };

  const getTotalPages = () => {
    const links = $$(".pagination .page-link");
    let maxPage = 0;
    links.forEach((link) => {
      const num = parseInt(link.textContent.trim(), 10);
      if (!isNaN(num) && num > maxPage) maxPage = num;
    });
    return maxPage || 1;
  };

  const getCurrentPage = () => {
    return parseInt(new URLSearchParams(window.location.search).get("page") || "1", 10);
  };

  const scrapePage = () => {
    const rows = $$("table.table tbody tr");
    return rows.map((row) => {
      const cells = row.querySelectorAll("td");
      if (cells.length < 5) return null;

      const sl = cells[0]?.textContent?.trim() || "";
      const term = cells[1]?.textContent?.trim() || "";
      const category = cells[2]?.textContent?.trim() || "";

      const checkbox = cells[3]?.querySelector('input[type="checkbox"]');
      const status = checkbox?.checked ? "Active" : "Inactive";

      const editLink = cells[4]?.querySelector('a[href*="/edit"]');
      const toggleLink = cells[4]?.querySelector('a[href*="/toggle"]');

      const idMatch = editLink?.href?.match(/\/term\/(\d+)\/edit/) || toggleLink?.href?.match(/\/term\/(\d+)\/toggle/);
      const id = idMatch ? idMatch[1] : "";

      const frontendLink = `${BASE_URL}${GLOSSARY_PATH}/${slugify(term)}`;

      return { sl, term, category, status, id, frontendLink };
    }).filter(Boolean);
  };

  const getNextPageUrl = () => {
    const nextLink = $('a.page-link[rel="next"]');
    if (nextLink) return nextLink.href;
    const currentPage = getCurrentPage();
    const link = $(`.pagination a.page-link[href*="page=${currentPage + 1}"]`);
    return link ? link.href : null;
  };

  const downloadCsv = (allPages) => {
    const allTerms = allPages.flatMap((p) => p.terms);

    const header = "SL,Term,Category,Status,ID,Frontend Link";
    const csvRows = [header];
    allTerms.forEach((t) => {
      csvRows.push(
        [escapeCsv(t.sl), escapeCsv(t.term), escapeCsv(t.category), escapeCsv(t.status), escapeCsv(t.id), escapeCsv(t.frontendLink)].join(",")
      );
    });

    const csv = csvRows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `glossary_terms_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return allTerms.length;
  };

  const processPage = () => {
    const currentPage = getCurrentPage();
    const totalPages = getTotalPages();

    const terms = scrapePage();
    savePageData(currentPage, { page: currentPage, terms });

    if (currentPage >= totalPages) {
      const allPages = getAllData();
      const total = downloadCsv(allPages);
      clearSession();

      const bar = $("#gte-bar");
      if (bar) {
        const status = $("#gte-status");
        if (status) {
          status.textContent = `Exported ${total} terms from ${totalPages} pages`;
          status.style.color = "#22c55e";
        }
        const btn = $("#gte-export-btn");
        if (btn) {
          btn.textContent = `Exported (${total})`;
          btn.disabled = false;
          btn.style.background = "#22c55e";
        }
      }

      return;
    }

    const nextUrl = getNextPageUrl();
    if (nextUrl) {
      const bar = $("#gte-bar");
      if (bar) {
        const status = $("#gte-status");
        if (status) {
          status.textContent = `Scraped page ${currentPage}/${totalPages} — navigating to next...`;
        }
      }
      setTimeout(() => {
        window.location.href = nextUrl;
      }, 500);
    } else {
      const bar = $("#gte-bar");
      if (bar) {
        const status = $("#gte-status");
        if (status) {
          status.textContent = "Error: could not find next page link";
          status.style.color = "#ef4444";
        }
        const btn = $("#gte-export-btn");
        if (btn) {
          btn.textContent = "Error";
          btn.disabled = false;
        }
      }
    }
  };

  const startExport = () => {
    clearSession();
    const btn = $("#gte-export-btn");
    if (btn) {
      btn.textContent = "Scraping...";
      btn.disabled = true;
    }
    processPage();
  };

  const injectUI = () => {
    const container = $(".container-fluid.mt-3");
    if (!container) return;

    const bar = document.createElement("div");
    bar.id = "gte-bar";
    bar.style.cssText = `
      display:flex; align-items:center; gap:12px; flex-wrap:wrap;
      padding:12px 16px; margin-bottom:12px;
      background:rgba(238,69,107,0.08);
      border:1px solid rgba(238,69,107,0.25);
      border-radius:10px;
    `;

    const progressInfo = document.createElement("span");
    progressInfo.id = "gte-progress";
    progressInfo.style.cssText = "font-size:12px; color:#6b7280; font-weight:600;";

    const status = document.createElement("span");
    status.id = "gte-status";
    status.style.cssText = "font-size:13px; color:#6b7280; font-weight:600;";

    const button = document.createElement("button");
    button.id = "gte-export-btn";
    button.textContent = "Export All Glossary Terms";
    button.style.cssText = `
      padding:9px 18px; background:#ee456b; color:#fff;
      border:none; border-radius:7px; font-weight:700;
      font-size:13px; cursor:pointer;
      transition:opacity 0.2s;
    `;
    button.addEventListener("mouseenter", () => (button.style.opacity = "0.85"));
    button.addEventListener("mouseleave", () => (button.style.opacity = "1"));
    button.addEventListener("click", startExport);

    const currentPage = getCurrentPage();
    const totalPages = getTotalPages();
    progressInfo.textContent = `Page ${currentPage} of ${totalPages}`;

    bar.appendChild(button);
    bar.appendChild(progressInfo);
    bar.appendChild(status);

    const card = $(".mb-3.card", container);
    if (card) {
      container.insertBefore(bar, card);
    } else {
      container.prepend(bar);
    }

    const sessionId = localStorage.getItem(SESSION_KEY);
    const storedPages = getAllData();
    const storedPageNumbers = storedPages.map((p) => p.page);

    if (sessionId && storedPages.length > 0) {
      if (currentPage >= totalPages && storedPageNumbers.includes(currentPage)) {
        if (!localStorage.getItem(SESSION_KEY)) return;
        const total = downloadCsv(storedPages);
        clearSession();
        status.textContent = `Exported ${total} terms from ${totalPages} pages`;
        status.style.color = "#22c55e";
        button.textContent = `Exported (${total})`;
        button.style.background = "#22c55e";
      } else if (!storedPageNumbers.includes(currentPage)) {
        button.textContent = "Scraping...";
        button.disabled = true;
        status.textContent = `Auto-advancing: page ${currentPage}/${totalPages}...`;
        setTimeout(() => processPage(), 500);
      }
    }
  };

  const init = () => {
    if ($("#gte-export-btn")) return;
    injectUI();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 600));
  } else {
    setTimeout(init, 600);
  }
})();
