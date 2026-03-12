// ==UserScript==
// @name         PCB Product Assistant
// @namespace    http://tampermonkey.net/
// @version      4.2
// @description  All-in-one productivity assistant: Short desc formatter, description paste cleaner, keyword highlighter, meta counters, field status dashboard, FAQ/Spec/Warranty importer
// @author       faketi101
// @match        https://admin.pcbstore.net/admin/product/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // ─── CONFIG ──────────────────────────────────────────────────
  const SHORTCUT_KEY = "q"; // Alt+Q toggles panel
  const STORAGE_KEY = "pcb_assistant_config";
  const STATS_KEY = "pcb_stats";

  const getConfig = () => {
    const defaults = { highlightWords: [], activeTab: "editor" };
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch {
      return defaults;
    }
  };
  const saveConfig = (cfg) =>
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));

  const getStats = () => {
    const defaults = {
      faqs: 0,
      specGroups: 0,
      specItems: 0,
      warranties: 0,
      shortDescItems: 0,
      descItems: 0,
      categories: 0,
      attributes: 0,
    };
    try {
      const saved = localStorage.getItem(STATS_KEY);
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch {
      return defaults;
    }
  };
  const saveStats = (stats) => {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    updateStatsUI();
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ─── SVG ICONS ───────────────────────────────────────────────
  const I = {
    zap: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    edit: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    wand: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 4-1 1"/><path d="m18 7-1 1"/><path d="m15 8 1 1"/><path d="m18 5 1 1"/><path d="m3 21 9-9"/><circle cx="15" cy="6" r="3"/></svg>`,
    barChart: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>`,
    checkCircle: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    helpCircle: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    table: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>`,
    shield: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    activity: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    x: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
    tag: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
    download: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    target: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
    clipboard: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>`,
    trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  };

  // ─── STYLES ──────────────────────────────────────────────────
  const injectStyles = () => {
    const s = document.createElement("style");
    s.textContent = `
      /* ── Panel Container ── */
      #pa-panel {
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 99999;
        background: rgba(10, 10, 10, 0.75);
        backdrop-filter: blur(28px);
        -webkit-backdrop-filter: blur(28px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(220,38,38,0.15);
        display: none;
        width: 560px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-height: 94vh;
        overflow-y: auto;
        font-size: 14px;
        color: #e5e5e5;
      }
      #pa-panel::-webkit-scrollbar { width: 5px; }
      #pa-panel::-webkit-scrollbar-track { background: transparent; }
      #pa-panel::-webkit-scrollbar-thumb { background: rgba(220,38,38,0.3); border-radius: 3px; }
      #pa-panel::-webkit-scrollbar-thumb:hover { background: rgba(220,38,38,0.5); }

      /* ── Header ── */
      .pa-hdr {
        background: linear-gradient(135deg, rgba(26,26,26,0.85) 0%, rgba(13,13,13,0.85) 100%);
        border-bottom: 2px solid #dc2626;
        padding: 16px 20px;
        border-radius: 16px 16px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: sticky;
        top: 0;
        z-index: 5;
      }
      .pa-hdr-title {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #fff;
        font-size: 16px;
        font-weight: 700;
        letter-spacing: 0.5px;
      }
      .pa-hdr-title svg { color: #dc2626; }
      .pa-close {
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.1);
        color: #999;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }
      .pa-close:hover { background: #dc2626; color: #fff; border-color: #dc2626; }

      /* ── Tabs ── */
      .pa-tabs {
        display: flex;
        background: rgba(255,255,255,0.02);
        border-bottom: 1px solid rgba(255,255,255,0.05);
        padding: 0 16px;
        position: sticky;
        top: 56px;
        z-index: 4;
      }
      .pa-tab {
        flex: 1;
        padding: 12px 8px;
        text-align: center;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #666;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        user-select: none;
      }
      .pa-tab:hover { color: #aaa; }
      .pa-tab.active { color: #dc2626; border-bottom-color: #dc2626; }
      .pa-tab svg { width: 14px; height: 14px; }
      .pa-tab-content { display: none; }
      .pa-tab-content.active { display: block; }

      /* ── Section ── */
      .pa-sec {
        padding: 16px 20px;
        border-bottom: 1px solid rgba(255,255,255,0.05);
      }
      .pa-sec:last-child { border-bottom: none; }
      .pa-sec-title {
        font-weight: 700;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1.2px;
        color: #dc2626;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .pa-sec-title svg { opacity: 0.8; }

      /* ── Buttons ── */
      .pa-btn {
        border: none;
        padding: 10px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }
      .pa-btn:active { transform: scale(0.97); }
      .pa-btn-red {
        background: #dc2626;
        color: #fff;
      }
      .pa-btn-red:hover { background: #ef4444; box-shadow: 0 0 20px rgba(220,38,38,0.3); }
      .pa-btn-dark {
        background: rgba(255,255,255,0.05);
        color: #ccc;
        border: 1px solid rgba(255,255,255,0.08);
      }
      .pa-btn-dark:hover { background: rgba(255,255,255,0.14); color: #fff; }
      .pa-btn-green { background: #16a34a; color: #fff; }
      .pa-btn-green:hover { background: #22c55e; }
      .pa-btn-blue { background: #2563eb; color: #fff; }
      .pa-btn-blue:hover { background: #3b82f6; }
      .pa-btn-sm { padding: 6px 10px; font-size: 11px; border-radius: 6px; }

      /* ── Inputs ── */
      .pa-textarea {
        width: 100%;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 10px;
        padding: 12px 14px;
        font-size: 13px;
        font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
        color: #e5e5e5;
        resize: vertical;
        box-sizing: border-box;
        transition: border-color 0.2s;
        line-height: 1.5;
      }
      .pa-textarea::placeholder { color: #555; }
      .pa-textarea:focus { outline: none; border-color: #dc2626; background: rgba(255,255,255,0.05); }

      .pa-input {
        width: 100%;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 8px;
        padding: 9px 12px;
        font-size: 13px;
        color: #e5e5e5;
        box-sizing: border-box;
        transition: border-color 0.2s;
      }
      .pa-input::placeholder { color: #555; }
      .pa-input:focus { outline: none; border-color: #dc2626; }

      /* ── Hint text ── */
      .pa-hint { font-size: 11px; color: #555; margin-top: 6px; line-height: 1.4; }

      /* ── Meta counter badges ── */
      .pa-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.3px;
      }
      .pa-badge-ok { background: rgba(22,163,74,0.15); color: #4ade80; border: 1px solid rgba(22,163,74,0.25); }
      .pa-badge-warn { background: rgba(245,158,11,0.15); color: #fbbf24; border: 1px solid rgba(245,158,11,0.25); }
      .pa-badge-bad { background: rgba(220,38,38,0.15); color: #f87171; border: 1px solid rgba(220,38,38,0.25); }

      /* ── Field status grid ── */
      .pa-fgrid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      }
      .pa-fitem {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
        border: 1px solid transparent;
        user-select: none;
      }
      .pa-fitem:hover { transform: translateX(2px); }
      .pa-fitem.ok {
        background: rgba(22,163,74,0.08);
        border-color: rgba(22,163,74,0.2);
      }
      .pa-fitem.no {
        background: rgba(220,38,38,0.06);
        border-color: rgba(220,38,38,0.15);
      }
      .pa-fitem.no-optional {
        background: rgba(245,158,11,0.06);
        border-color: rgba(245,158,11,0.15);
      }
      .pa-fitem:hover.ok { background: rgba(22,163,74,0.15); }
      .pa-fitem:hover.no { background: rgba(220,38,38,0.12); }
      .pa-fitem:hover.no-optional { background: rgba(245,158,11,0.12); }
      .pa-fdot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .pa-fdot.g { background: #22c55e; box-shadow: 0 0 6px rgba(34,197,94,0.4); }
      .pa-fdot.r { background: #ef4444; box-shadow: 0 0 6px rgba(239,68,68,0.4); }
      .pa-fdot.o { background: #f59e0b; box-shadow: 0 0 6px rgba(245,158,11,0.4); }
      .pa-fname { font-weight: 500; flex: 1; }
      .pa-fgo { color: #555; display: flex; align-items: center; transition: color 0.2s; }
      .pa-fitem:hover .pa-fgo { color: #dc2626; }

      /* ── Summary bar ── */
      .pa-summary {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 12px 16px;
        border-radius: 12px;
        background: rgba(255,255,255,0.02);
        border: 1px solid rgba(255,255,255,0.05);
        margin-bottom: 12px;
      }
      .pa-ring { position: relative; width: 52px; height: 52px; flex-shrink: 0; }
      .pa-ring svg { transform: rotate(-90deg); }
      .pa-ring .bg { stroke: rgba(255,255,255,0.08); }
      .pa-ring .fg { transition: stroke-dashoffset 0.6s ease; }
      .pa-ring-pct {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 13px;
        font-weight: 800;
      }

      /* ── Stats grid ── */
      .pa-stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
        margin-bottom: 10px;
      }
      .pa-stat-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        border-radius: 8px;
        background: rgba(255,255,255,0.02);
        border: 1px solid rgba(255,255,255,0.05);
        font-size: 12px;
      }
      .pa-stat-val { font-weight: 800; color: #dc2626; font-size: 14px; }
      .pa-stat-reset {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        color: #666;
        padding: 2px 6px;
        font-size: 9px;
        border-radius: 4px;
        cursor: pointer;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .pa-stat-reset:hover { background: #dc2626; color: #fff; border-color: #dc2626; }

      /* ── Tags ── */
      .pa-tag {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: rgba(220,38,38,0.1);
        border: 1px solid rgba(220,38,38,0.25);
        color: #f87171;
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 12px;
      }
      .pa-tag-x {
        cursor: pointer;
        font-size: 14px;
        line-height: 1;
        opacity: 0.5;
        font-weight: bold;
      }
      .pa-tag-x:hover { opacity: 1; }
      .pa-tags-box { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; min-height: 28px; }

      /* ── Toast ── */
      .pa-toast {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(80px);
        background: rgba(10,10,10,0.95);
        border: 1px solid #dc2626;
        color: #fff;
        padding: 12px 24px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 500;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        z-index: 9999999;
        opacity: 0;
        transition: all 0.3s ease;
        pointer-events: none;
        box-shadow: 0 8px 30px rgba(220,38,38,0.2);
      }
      .pa-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
      .pa-toast.toast-success { border-color: #22c55e; box-shadow: 0 8px 30px rgba(34,197,94,0.2); }
      .pa-toast.toast-error { border-color: #ef4444; box-shadow: 0 8px 30px rgba(239,68,68,0.2); }
      .pa-toast.toast-warning { border-color: #f59e0b; box-shadow: 0 8px 30px rgba(245,158,11,0.2); }

      /* ── Inline counter (injected near meta fields) ── */
      .pa-ictr {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-top: 5px;
        font-size: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #888;
      }
      .pa-ictr b { font-weight: 700; }

      /* ── Divider ── */
      .pa-hr {
        border: none;
        height: 1px;
        background: rgba(255,255,255,0.06);
        margin: 0;
      }

      /* ── Flash highlight for scroll-to-field ── */
      @keyframes pa-flash {
        0%, 100% { box-shadow: none; }
        50% { box-shadow: 0 0 0 3px rgba(220,38,38,0.5), 0 0 20px rgba(220,38,38,0.3); }
      }
      .pa-flash-highlight {
        animation: pa-flash 0.4s ease 3;
      }

      /* ── Loading spinner on buttons ── */
      @keyframes pa-spin {
        to { transform: rotate(360deg); }
      }
      .pa-btn-loading svg {
        animation: pa-spin 1s linear infinite;
        display: inline-block;
      }

      /* ── Contenteditable paste editor ── */
      .pa-paste-editor {
        width: 100%;
        min-height: 120px;
        max-height: 280px;
        overflow-y: auto;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 10px;
        padding: 12px 14px;
        font-size: 13px;
        color: #e5e5e5;
        box-sizing: border-box;
        line-height: 1.5;
        outline: none;
        transition: border-color 0.2s;
      }
      .pa-paste-editor:focus {
        border-color: #dc2626;
        background: rgba(255,255,255,0.05);
      }
      .pa-paste-editor:empty::before {
        content: attr(data-placeholder);
        color: #555;
        pointer-events: none;
      }
      .pa-paste-editor::-webkit-scrollbar { width: 4px; }
      .pa-paste-editor::-webkit-scrollbar-track { background: transparent; }
      .pa-paste-editor::-webkit-scrollbar-thumb { background: rgba(220,38,38,0.3); border-radius: 2px; }

      /* ── CSS Highlight API for keyword highlighting ── */
      ::highlight(pa-keywords) {
        background-color: #fef08a;
        color: #000;
      }
    `;
    document.head.appendChild(s);
  };

  // ─── TOAST ───────────────────────────────────────────────────
  let toastEl = null;
  const showToast = (msg, duration = 2500, type = "success") => {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "pa-toast";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    // Remove previous type classes
    toastEl.classList.remove("toast-success", "toast-error", "toast-warning");
    // Apply color based on type: success=green, error=red, warning=orange
    if (type === "success") toastEl.classList.add("toast-success");
    else if (type === "error") toastEl.classList.add("toast-error");
    else if (type === "warning") toastEl.classList.add("toast-warning");
    toastEl.classList.add("show");
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove("show"), duration);
  };

  // ─── HELPERS ─────────────────────────────────────────────────
  const escapeHtml = (s) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const correctULTagFromQuill = (str) => {
    if (str.includes('data-list="bullet"')) {
      const arr = str.split(/(<[^>]+>)/);
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] === "<ol>") {
          const next = arr.slice(i + 1).find((e) => e.startsWith("<li"));
          if (next && next.includes('data-list="bullet"')) {
            arr[i] = '<ul><li data-list="bullet">';
            const end = arr.findIndex((e, j) => j > i && e === "</ol>");
            if (end > -1) arr[end] = "</ul>";
          }
        }
      }
      return arr.join("");
    }
    return str;
  };

  const triggerQuillSync = (containerSel) => {
    const c = document.querySelector(containerSel);
    if (!c) return;
    const ed = c.querySelector(".ql-editor");
    if (ed) ed.dispatchEvent(new Event("input", { bubbles: true }));
    if (containerSel === "#editor") {
      const h = document.getElementById("description");
      if (h && ed) h.value = correctULTagFromQuill(ed.innerHTML);
    } else if (containerSel === "#specificationEditor") {
      const h = document.getElementById("specification");
      if (h && ed) h.value = correctULTagFromQuill(ed.innerHTML);
    }
  };

  const cleanBackgroundFromHtml = (html) => {
    let c = html;
    // Remove background-color properties only
    c = c.replace(/background-color\s*:\s*[^;}"']+;?/gi, "");
    // Remove background shorthand with color values only
    c = c.replace(
      /background\s*:\s*(rgb[^;}"']*|#[0-9a-fA-F]{3,8}|[a-z]+)\s*;?/gi,
      "",
    );
    // Remove ALL inline text color — let the site's own CSS handle light/dark mode
    c = c.replace(/(?<![\w-])color\s*:\s*[^;}"']+;?/gi, "");
    // Remove empty style attributes left behind
    c = c.replace(/\s*style\s*=\s*["']\s*["']/gi, "");
    return c;
  };

  // highlightInTextNodes removed — replaced by CSS Custom Highlight API

  // ─── BUILD PANEL ─────────────────────────────────────────────
  const buildPanel = () => {
    const p = document.createElement("div");
    p.id = "pa-panel";
    p.innerHTML = `
      <!-- HEADER -->
      <div class="pa-hdr">
        <div class="pa-hdr-title">${I.zap} PCB Product Assistant</div>
        <button class="pa-close" id="pa-close" title="Close (Alt+Q)">${I.x}</button>
      </div>

      <!-- TABS -->
      <div class="pa-tabs">
        <div class="pa-tab active" data-tab="editor">${I.edit} Editor</div>
        <div class="pa-tab" data-tab="import">${I.download} Import</div>
        <div class="pa-tab" data-tab="status">${I.checkCircle} Status</div>
      </div>

      <!-- ═══ EDITOR TAB ═══ -->
      <div class="pa-tab-content active" data-tab="editor">

        <!-- Short Description -->
        <div class="pa-sec">
          <div class="pa-sec-title">${I.edit} Short Description</div>
          <textarea class="pa-textarea" id="pa-sd-input" rows="5" placeholder="Key Features&#10;WD Blue SN570&#10;3300MB/s Read Speed&#10;PCIe Gen3 NVMe&#10;250GB Storage Capacity"></textarea>
          <div style="display:flex; gap:8px; margin-top:10px;">
            <button class="pa-btn pa-btn-red" id="pa-sd-fill" style="flex:1;">Format & Fill</button>
            <button class="pa-btn pa-btn-dark" id="pa-sd-clear">Clear</button>
          </div>
          <div class="pa-hint">First line becomes H2 bold heading. Rest become bullet points. BG colors stripped.</div>
        </div>

        <!-- Description Paste Editor -->
        <div class="pa-sec">
          <div class="pa-sec-title">${I.wand} Description Editor</div>
          <div class="pa-paste-editor" id="pa-desc-editor" contenteditable="true" data-placeholder="Paste your rich description HTML here..."></div>
          <div style="display:flex; gap:8px; margin-top:10px;">
            <button class="pa-btn pa-btn-red" id="pa-desc-fill" style="flex:1;">Clean & Fill Description</button>
            <button class="pa-btn pa-btn-dark" id="pa-desc-clear-editor">Clear</button>
          </div>
          <div class="pa-hint">Paste rich content here. All tags (h1, h2, etc.) preserved. Only background colors are stripped on fill.</div>
        </div>

        <!-- Keyword Highlighter -->
        <div class="pa-sec">
          <div class="pa-sec-title">${I.tag} Highlight Keywords</div>
          <div style="display:flex; gap:8px;">
            <input class="pa-input" id="pa-kw-input" placeholder="Type a keyword and press Enter..." style="flex:1;">
            <button class="pa-btn pa-btn-red pa-btn-sm" id="pa-kw-add">Add</button>
          </div>
          <div class="pa-tags-box" id="pa-kw-tags"></div>
          <div style="display:flex; gap:8px; margin-top:10px;">
            <button class="pa-btn pa-btn-dark" id="pa-desc-hl" style="flex:1;">Highlight in Description</button>
            <button class="pa-btn pa-btn-dark" id="pa-desc-hl-clear">Clear Highlights</button>
          </div>
          <div class="pa-hint" style="margin-top:6px;">Uses CSS Highlight API — does not modify editor content. Keywords appear highlighted visually only.</div>
        </div>

        <!-- Meta Title Editor -->
        <div class="pa-sec">
          <div class="pa-sec-title">${I.edit} Meta Title</div>
          <textarea class="pa-textarea" id="pa-meta-title-input" rows="2" placeholder="Enter meta title..."></textarea>
          <div style="display:flex; gap:8px; margin-top:10px;">
            <button class="pa-btn pa-btn-red" id="pa-meta-title-fill" style="flex:1;">Fill Meta Title</button>
            <button class="pa-btn pa-btn-dark" id="pa-meta-title-clear">Clear</button>
          </div>
          <div class="pa-hint">Fills the meta title field on the form. Recommended: under 60 chars.</div>
        </div>

        <!-- Meta Description Editor -->
        <div class="pa-sec">
          <div class="pa-sec-title">${I.edit} Meta Description</div>
          <textarea class="pa-textarea" id="pa-meta-desc-input" rows="3" placeholder="Enter meta description..."></textarea>
          <div style="display:flex; gap:8px; margin-top:10px;">
            <button class="pa-btn pa-btn-red" id="pa-meta-desc-fill" style="flex:1;">Fill Meta Description</button>
            <button class="pa-btn pa-btn-dark" id="pa-meta-desc-clear">Clear</button>
          </div>
          <div class="pa-hint">Fills the meta description field on the form. Recommended: under 160 chars.</div>
        </div>

        <!-- Meta Counters -->
        <div class="pa-sec">
          <div class="pa-sec-title">${I.barChart} Meta Counters</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div>
              <div style="font-size:11px; color:#777; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px;">Meta Title</div>
              <div id="pa-mt-badge" class="pa-badge pa-badge-ok">0 / 60 chars</div>
            </div>
            <div>
              <div style="font-size:11px; color:#777; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px;">Meta Description</div>
              <div id="pa-md-badge" class="pa-badge pa-badge-ok">0 / 160 chars</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ IMPORT TAB ═══ -->
      <div class="pa-tab-content" data-tab="import">

        <!-- FAQ Importer -->
        <div class="pa-sec">
          <div class="pa-sec-title">${I.helpCircle} FAQ Importer</div>
          <textarea class="pa-textarea" id="pa-faq-input" rows="5" placeholder="Question line ending with ?&#10;Answer on the next line&#10;&#10;Another question?&#10;Its answer here"></textarea>
          <button class="pa-btn pa-btn-red" id="pa-faq-fill" style="width:100%; margin-top:10px;">Fill FAQs</button>
        </div>

        <!-- Specification Importer -->
        <div class="pa-sec">
          <div class="pa-sec-title">${I.table} Specification Table</div>
          <textarea class="pa-textarea" id="pa-spec-input" rows="6" placeholder="General&#10;Brand&#9;Logitech&#10;Model&#9;G502&#10;&#10;Connectivity&#10;Interface&#9;USB"></textarea>
          <button class="pa-btn pa-btn-blue" id="pa-spec-fill" style="width:100%; margin-top:10px;">Fill Specifications</button>
          <div class="pa-hint">Group name on its own line. Key→Tab→Value on following lines.</div>
        </div>

        <!-- Warranty Claims -->
        <div class="pa-sec">
          <div class="pa-sec-title">${I.shield} Warranty Claims</div>
          <div style="display:flex; gap:8px;">
            <input class="pa-input" id="pa-war-input" placeholder="e.g. Laptop, RAM, SSD..." style="flex:1;">
            <button class="pa-btn pa-btn-green pa-btn-sm" id="pa-war-sel">Select</button>
            <button class="pa-btn pa-btn-dark pa-btn-sm" id="pa-war-clr">Clear</button>
          </div>
          <div class="pa-hint" style="margin-top:6px;">Matches category prefix before colon in warranty dropdown.</div>
        </div>
      </div>

      <!-- ═══ STATUS TAB ═══ -->
      <div class="pa-tab-content" data-tab="status">

        <!-- Field Status -->
        <div class="pa-sec">
          <div class="pa-sec-title">${I.checkCircle} Field Completion</div>
          <div class="pa-summary">
            <div class="pa-ring">
              <svg width="52" height="52" viewBox="0 0 52 52">
                <circle class="bg" cx="26" cy="26" r="22" fill="none" stroke-width="4"/>
                <circle class="fg" id="pa-ring-fg" cx="26" cy="26" r="22" fill="none" stroke="#dc2626" stroke-width="4" stroke-linecap="round"
                  stroke-dasharray="138.23" stroke-dashoffset="138.23"/>
              </svg>
              <span class="pa-ring-pct" id="pa-ring-pct" style="color:#dc2626;">0%</span>
            </div>
            <div style="flex:1;">
              <div style="font-weight:700; font-size:15px; color:#fff;" id="pa-f-count">0 / 18 fields</div>
              <div style="font-size:12px; color:#666;">Product completeness</div>
            </div>
            <button class="pa-btn pa-btn-dark pa-btn-sm" id="pa-f-refresh">${I.refresh} Refresh</button>
          </div>
          <div class="pa-fgrid" id="pa-fgrid"></div>
        </div>

        <!-- Stats -->
        <div class="pa-sec">
          <div class="pa-sec-title">${I.activity} Session Stats</div>
          <div class="pa-stats">
            <div class="pa-stat-item">
              <div><span style="color:#888;">Short Desc</span></div>
              <span class="pa-stat-val" id="pa-st-sd">0</span>
              <button class="pa-stat-reset" data-type="shortDescItems">rst</button>
            </div>
            <div class="pa-stat-item">
              <div><span style="color:#888;">Desc Items</span></div>
              <span class="pa-stat-val" id="pa-st-desc">0</span>
              <button class="pa-stat-reset" data-type="descItems">rst</button>
            </div>
            <div class="pa-stat-item">
              <div><span style="color:#888;">FAQs</span></div>
              <span class="pa-stat-val" id="pa-st-faq">0</span>
              <button class="pa-stat-reset" data-type="faqs">rst</button>
            </div>
            <div class="pa-stat-item">
              <div><span style="color:#888;">Spec Groups</span></div>
              <span class="pa-stat-val" id="pa-st-groups">0</span>
              <button class="pa-stat-reset" data-type="specGroups">rst</button>
            </div>
            <div class="pa-stat-item">
              <div><span style="color:#888;">Spec Items</span></div>
              <span class="pa-stat-val" id="pa-st-items">0</span>
              <button class="pa-stat-reset" data-type="specItems">rst</button>
            </div>
            <div class="pa-stat-item">
              <div><span style="color:#888;">Warranties</span></div>
              <span class="pa-stat-val" id="pa-st-war">0</span>
              <button class="pa-stat-reset" data-type="warranties">rst</button>
            </div>
            <div class="pa-stat-item">
              <div><span style="color:#888;">Categories</span></div>
              <span class="pa-stat-val" id="pa-st-cat">0</span>
              <button class="pa-stat-reset" data-type="categories">rst</button>
            </div>
            <div class="pa-stat-item">
              <div><span style="color:#888;">Attributes</span></div>
              <span class="pa-stat-val" id="pa-st-attr">0</span>
              <button class="pa-stat-reset" data-type="attributes">rst</button>
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="pa-btn pa-btn-dark pa-btn-sm" id="pa-st-copy" style="flex:1;">${I.clipboard} Copy Stats</button>
            <button class="pa-btn pa-btn-dark pa-btn-sm" id="pa-st-reset" style="flex:1;">${I.trash} Reset All</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(p);
    return p;
  };

  // ─── UPDATE STATS UI ────────────────────────────────────────
  const updateStatsUI = () => {
    const s = getStats();
    const el = (id) => document.getElementById(id);
    const sd = el("pa-st-sd");
    if (sd) sd.textContent = s.shortDescItems;
    const desc = el("pa-st-desc");
    if (desc) desc.textContent = s.descItems;
    const faq = el("pa-st-faq");
    if (faq) faq.textContent = s.faqs;
    const grp = el("pa-st-groups");
    if (grp) grp.textContent = s.specGroups;
    const itm = el("pa-st-items");
    if (itm) itm.textContent = s.specItems;
    const war = el("pa-st-war");
    if (war) war.textContent = s.warranties;
    const cat = el("pa-st-cat");
    if (cat) cat.textContent = s.categories;
    const attr = el("pa-st-attr");
    if (attr) attr.textContent = s.attributes;
  };

  // ─── 1. SHORT DESCRIPTION FORMATTER ─────────────────────────
  const formatShortDescription = (rawText) => {
    const lines = rawText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) return "";
    const heading = lines[0];
    const bullets = lines.slice(1);
    let html = `<h2><strong>${escapeHtml(heading)}</strong></h2>`;
    if (bullets.length > 0) {
      html += "<ol>";
      bullets.forEach((b) => {
        html += `<li data-list="bullet"><span class="ql-ui" contenteditable="false"></span>${escapeHtml(b)}</li>`;
      });
      html += "</ol>";
    }
    return html;
  };

  const fillShortDescription = (rawText) => {
    const html = formatShortDescription(rawText);
    if (!html) return showToast("No text to format", 2500, "warning");
    const ed = document.querySelector("#editor .ql-editor");
    if (!ed)
      return showToast("Short description editor not found", 2500, "error");
    ed.innerHTML = html;
    const h = document.getElementById("description");
    if (h) h.value = correctULTagFromQuill(html);
    triggerQuillSync("#editor");
    // Clear the input textarea after filling
    const inp = document.getElementById("pa-sd-input");
    if (inp) inp.value = "";
    // Count bullet items (lines after the heading)
    const sdLines = rawText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const bulletCount = Math.max(0, sdLines.length - 1);
    if (bulletCount > 0) {
      const stats = getStats();
      stats.shortDescItems += bulletCount;
      saveStats(stats);
    }
    showToast(
      `Short description formatted & filled! (${bulletCount} items)`,
      2500,
      "success",
    );
    refreshFieldStatus();
  };

  // ─── 2. DESCRIPTION FILL (from paste editor in panel) ───────
  // No paste interceptors — user pastes into the page editor normally without auto-clean.
  // For cleaning, user pastes into the panel's contenteditable editor, then clicks "Clean & Fill".

  const fillDescriptionFromPasteEditor = () => {
    const pasteEditor = document.getElementById("pa-desc-editor");
    if (!pasteEditor || pasteEditor.textContent.trim().length === 0) {
      return showToast("Paste content into the editor first", 2500, "warning");
    }
    const container = document.querySelector("#specificationEditor");
    if (!container)
      return showToast("Specification editor not found", 2500, "error");
    const ed = container.querySelector(".ql-editor");
    if (!ed) return showToast("Specification editor not found", 2500, "error");

    // Clean backgrounds, inline text colors, and normalize whitespace
    let html = cleanBackgroundFromHtml(pasteEditor.innerHTML);

    // The contenteditable div wraps lines in <div>...</div> which causes
    // extra line spacing. Convert those to proper block elements or strip them.
    html = html.replace(/<div>\s*<br\s*\/?>\s*<\/div>/gi, "<br>");
    html = html.replace(
      /<div>((?:(?!<(?:div|h[1-6]|ul|ol|table|blockquote)[>\s])[\s\S])*?)<\/div>/gi,
      "<p>$1</p>",
    );

    // Transfer the cleaned HTML via a hidden element so the injected
    // page-context script can read it (avoids Tampermonkey scope issues).
    let transfer = document.getElementById("pa-html-transfer");
    if (!transfer) {
      transfer = document.createElement("div");
      transfer.id = "pa-html-transfer";
      transfer.style.display = "none";
      document.body.appendChild(transfer);
    }
    transfer.innerHTML = html;

    // Inject a <script> that runs in the PAGE's JS context where Quill lives.
    const script = document.createElement("script");
    script.textContent = `
      (function() {
        var container = document.querySelector('#specificationEditor');
        var transfer = document.getElementById('pa-html-transfer');
        if (!container || !transfer) return;
        var html = transfer.innerHTML;
        transfer.innerHTML = '';
        var ed = container.querySelector('.ql-editor');
        if (!ed) return;

        // ── Find Quill instance ──
        var quill = null;

        // Method 1: __quill on container
        if (container.__quill) quill = container.__quill;

        // Method 2: Quill.find()
        if (!quill && typeof Quill !== 'undefined' && Quill.find) {
          try { quill = Quill.find(container); } catch(e) {}
        }

        // Method 3: scan window for Quill instances
        if (!quill) {
          var keys = Object.keys(window);
          for (var i = 0; i < keys.length; i++) {
            try {
              var obj = window[keys[i]];
              if (obj && obj.constructor && obj.constructor.name === 'Quill' &&
                  obj.container === container) {
                quill = obj;
                break;
              }
            } catch(e) {}
          }
        }

        // Method 4: __blot on editor element
        if (!quill && ed.__blot) {
          try {
            var blot = ed.__blot.blot || ed.__blot;
            if (blot.scroll && blot.scroll.domNode && blot.scroll.domNode.parentNode) {
              var scrollContainer = blot.scroll.domNode.parentNode;
              if (scrollContainer.__quill) quill = scrollContainer.__quill;
            }
          } catch(e) {}
        }

        console.log('PA-inject: Quill found:', !!quill);
        if (quill) {
          console.log('PA-inject: Quill version:', typeof Quill !== 'undefined' ? Quill.version : 'unknown');
          console.log('PA-inject: has setContents:', typeof quill.setContents);
          console.log('PA-inject: has clipboard:', !!quill.clipboard);
          console.log('PA-inject: has dangerouslyPasteHTML:', quill.clipboard ? typeof quill.clipboard.dangerouslyPasteHTML : 'no clipboard');
        }

        var success = false;

        // ── STRATEGY 1: clipboard.dangerouslyPasteHTML (full replace) ──
        if (quill && quill.clipboard && typeof quill.clipboard.dangerouslyPasteHTML === 'function') {
          try {
            quill.setText('\\n', 'silent');
            quill.clipboard.dangerouslyPasteHTML(0, html, 'user');
            success = true;
            console.log('PA-inject: dangerouslyPasteHTML SUCCESS');
          } catch(e) {
            console.log('PA-inject: dangerouslyPasteHTML error:', e);
          }
        }

        // ── STRATEGY 2: clipboard.convert + setContents ──
        if (!success && quill && typeof quill.setContents === 'function' && quill.clipboard) {
          try {
            // Quill v1: convert(html), Quill v2: convert({html})
            var delta;
            try { delta = quill.clipboard.convert(html); } catch(e1) {
              try { delta = quill.clipboard.convert({html: html}); } catch(e2) {}
            }
            if (delta && delta.ops && delta.ops.length > 0) {
              quill.setContents(delta, 'user');
              success = true;
              console.log('PA-inject: setContents SUCCESS, ops:', delta.ops.length);
            }
          } catch(e) {
            console.log('PA-inject: setContents error:', e);
          }
        }

        // ── STRATEGY 3: Synthetic paste event ──
        if (!success && quill) {
          try {
            ed.focus();
            quill.setSelection(0, quill.getLength(), 'silent');
            var dt = new DataTransfer();
            dt.setData('text/html', html);
            var tmp = document.createElement('div');
            tmp.innerHTML = html;
            dt.setData('text/plain', tmp.textContent);
            var evt = new ClipboardEvent('paste', {
              bubbles: true, cancelable: true, clipboardData: dt
            });
            ed.dispatchEvent(evt);
            success = true;
            console.log('PA-inject: synthetic paste dispatched');
          } catch(e) {
            console.log('PA-inject: synthetic paste error:', e);
          }
        }

        // ── STRATEGY 4: Direct innerHTML (no Quill found) ──
        if (!success) {
          console.log('PA-inject: all strategies failed, using innerHTML');
          ed.innerHTML = html;
        }

        // Sync hidden input
        var hidden = document.getElementById('specification');
        if (hidden) {
          setTimeout(function() {
            hidden.value = ed.innerHTML;
            console.log('PA-inject: hidden field synced, length:', hidden.value.length);
          }, 300);
        }
      })();
    `;
    document.body.appendChild(script);
    script.remove();

    // Update hidden field from our side too
    const hidden = document.getElementById("specification");
    setTimeout(() => {
      if (hidden) hidden.value = correctULTagFromQuill(ed.innerHTML);
    }, 500);

    // Count each description fill as 1
    const stats = getStats();
    stats.descItems += 1;
    saveStats(stats);
    pasteEditor.innerHTML = "";
    showToast("Description filled!", 2500, "success");
    refreshFieldStatus();
  };

  // ─── 3. META COUNTERS ───────────────────────────────────────
  const setupMetaCounters = () => {
    const mt = document.querySelector("input#meta_title");
    const md = document.querySelector('textarea[name="meta_description"]');

    if (mt) {
      const ctr = document.createElement("div");
      ctr.className = "pa-ictr";
      mt.parentNode.insertBefore(ctr, mt.nextSibling);

      const update = () => {
        const len = mt.value.length;
        const w = mt.value.trim() ? mt.value.trim().split(/\s+/).length : 0;
        const color = len > 60 ? "#ef4444" : len > 50 ? "#f59e0b" : "#22c55e";
        ctr.innerHTML = `<b style="color:${color}">${len}</b> / 60 chars &nbsp;|&nbsp; ${w} words`;
        const badge = document.getElementById("pa-mt-badge");
        if (badge) {
          badge.textContent = `${len} / 60 chars`;
          badge.className = `pa-badge ${len > 60 ? "pa-badge-bad" : len > 50 ? "pa-badge-warn" : "pa-badge-ok"}`;
        }
      };
      mt.addEventListener("input", update);
      mt.addEventListener("change", update);
      update();
    }

    if (md) {
      const ctr = document.createElement("div");
      ctr.className = "pa-ictr";
      md.parentNode.insertBefore(ctr, md.nextSibling);

      const update = () => {
        const len = md.value.length;
        const w = md.value.trim() ? md.value.trim().split(/\s+/).length : 0;
        const color = len > 160 ? "#ef4444" : len > 140 ? "#f59e0b" : "#22c55e";
        ctr.innerHTML = `<b style="color:${color}">${len}</b> / 160 chars &nbsp;|&nbsp; ${w} words`;
        const badge = document.getElementById("pa-md-badge");
        if (badge) {
          badge.textContent = `${len} / 160 chars`;
          badge.className = `pa-badge ${len > 160 ? "pa-badge-bad" : len > 140 ? "pa-badge-warn" : "pa-badge-ok"}`;
        }
      };
      md.addEventListener("input", update);
      md.addEventListener("change", update);
      update();
    }
  };

  // ─── 4. FIELD COMPLETION STATUS ──────────────────────────────
  // Required fields for validation (used for submit button & field status coloring)
  const REQUIRED_FIELD_NAMES = [
    "Product Name",
    "Slug",
    "Short Description",
    "Categories",
    "Main Thumbnail",
    "Selling Price",
  ];

  const FIELDS = [
    {
      name: "Product Name",
      sel: 'input[name="name"]',
      check: () => {
        try {
          return !!document.querySelector('input[name="name"]')?.value.trim();
        } catch {
          return false;
        }
      },
    },
    {
      name: "Slug",
      sel: "input#slug",
      check: () => {
        try {
          return !!document.querySelector("input#slug")?.value.trim();
        } catch {
          return false;
        }
      },
    },
    {
      name: "Short Description",
      sel: "#editor",
      check: () => {
        try {
          const e = document.querySelector("#editor .ql-editor");
          return e && e.textContent.trim().length > 0;
        } catch {
          return false;
        }
      },
    },
    {
      name: "Description",
      sel: "#specificationEditor",
      check: () => {
        try {
          const e = document.querySelector("#specificationEditor .ql-editor");
          return e && e.textContent.trim().length > 0;
        } catch {
          return false;
        }
      },
    },
    {
      name: "Brand",
      sel: 'select[name="brand"]',
      check: () => {
        try {
          const s = document.querySelector('select[name="brand"]');
          return s && s.value && s.value !== "";
        } catch {
          return false;
        }
      },
    },
    {
      name: "Categories",
      sel: "#categoryTree",
      check: () => {
        try {
          return (
            document.querySelectorAll('input[name="categories[]"]:checked')
              .length > 0
          );
        } catch {
          return false;
        }
      },
    },
    {
      name: "Main Thumbnail",
      sel: "input#thumbnail",
      check: () => {
        try {
          // 1. Check the actual file input first
          const fileInput = document.querySelector(
            'input#thumbnail, input[name="thumbnail"]',
          );
          if (fileInput && fileInput.files && fileInput.files.length > 0)
            return true;

          // Define what counts as a "fake" or default image
          const isPlaceholder = (src) => {
            if (!src || src.length < 10) return true;
            const s = src.toLowerCase();
            return (
              s.includes("placeholder") ||
              s.includes("placehold.co") ||
              s === "https://placehold.co/500x500/f1f5f9/png" ||
              s.endsWith("#") ||
              s.endsWith("/")
            );
          };

          // 2. Check the preview image by ID
          const preview = document.getElementById("preview");
          if (preview && preview.src && !isPlaceholder(preview.src)) {
            return true;
          }

          // 3. Check any generic thumbnail images in the vicinity
          const imgPreviews = document.querySelectorAll(
            'img.img-thumbnail, img[src*="product"], img[src*="upload"], img[src*="storage"]',
          );
          for (const img of imgPreviews) {
            if (img.src && !isPlaceholder(img.src)) {
              return true;
            }
          }

          // 4. Fallback to the internal flag
          if (window._paImageSelected) return true;

          return false;
        } catch (e) {
          return false;
        }
      },
    },
    {
      name: "Buying Price",
      sel: "input#buy_price",
      check: () => {
        try {
          const v = document.querySelector("input#buy_price")?.value;
          return v && parseFloat(v) > 0 && parseFloat(v) !== 10;
        } catch {
          return false;
        }
      },
    },
    {
      name: "Selling Price",
      sel: "input#price",
      check: () => {
        try {
          const v = document.querySelector("input#price")?.value;
          return v && parseFloat(v) > 0 && parseFloat(v) !== 10;
        } catch {
          return false;
        }
      },
    },
    {
      name: "Unit",
      sel: "select#unit",
      check: () => {
        try {
          const s = document.querySelector("select#unit");
          return s && s.value && s.value !== "";
        } catch {
          return false;
        }
      },
    },
    {
      name: "Meta Title",
      sel: "input#meta_title",
      check: () => {
        try {
          return !!document.querySelector("input#meta_title")?.value.trim();
        } catch {
          return false;
        }
      },
    },
    {
      name: "Meta Description",
      sel: 'textarea[name="meta_description"]',
      check: () => {
        try {
          return !!document
            .querySelector('textarea[name="meta_description"]')
            ?.value.trim();
        } catch {
          return false;
        }
      },
    },
    {
      name: "Meta Keywords",
      sel: 'select[name="meta_keywords[]"]',
      check: () => {
        try {
          const s = document.querySelector('select[name="meta_keywords[]"]');
          return s && Array.from(s.options).some((o) => o.selected);
        } catch {
          return false;
        }
      },
    },
    {
      name: "Warranty Validity",
      sel: "input#warranty_validity",
      check: () => {
        try {
          return !!document
            .querySelector("input#warranty_validity")
            ?.value.trim();
        } catch {
          return false;
        }
      },
    },
    {
      name: "Warranty Claims",
      sel: 'select[name="warranty_claims[]"]',
      check: () => {
        try {
          const s = document.querySelector('select[name="warranty_claims[]"]');
          return s && Array.from(s.options).some((o) => o.selected);
        } catch {
          return false;
        }
      },
    },
    {
      name: "FAQ",
      sel: "#faqContainer",
      check: () => {
        try {
          const q = document.querySelector('input[name="question[]"]');
          return q && q.value.trim().length > 0;
        } catch {
          return false;
        }
      },
    },
    {
      name: "Specifications",
      sel: ".specGroup",
      check: () => {
        try {
          const g = document.querySelector(
            'input[name="specs[0][group_name]"]',
          );
          return g && g.value.trim().length > 0;
        } catch {
          return false;
        }
      },
    },
    {
      name: "Cat. Attributes",
      sel: ".attributeBox",
      check: () => {
        try {
          return (
            document.querySelectorAll(
              'input.attributeBox[name="category_attribute_ids[]"]:checked',
            ).length > 0
          );
        } catch {
          return false;
        }
      },
    },
    {
      name: "Delivery Weight",
      sel: 'input[name="delivery_weight"]',
      check: () => {
        try {
          return !!document
            .querySelector('input[name="delivery_weight"]')
            ?.value.trim();
        } catch {
          return false;
        }
      },
    },
  ];

  const scrollToField = (selector) => {
    try {
      const el = document.querySelector(selector);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("pa-flash-highlight");
      if (el.focus && el.tagName !== "DIV") el.focus();
      setTimeout(() => el.classList.remove("pa-flash-highlight"), 2500);
    } catch (e) {
      console.warn("[PA] scroll error:", e);
    }
  };

  const refreshFieldStatus = () => {
    try {
      const grid = document.getElementById("pa-fgrid");
      if (!grid) return;

      let filled = 0;
      const total = FIELDS.length;
      grid.innerHTML = "";

      FIELDS.forEach((f) => {
        const ok = f.check();
        if (ok) filled++;
        const isRequired = REQUIRED_FIELD_NAMES.includes(f.name);
        // Color: green=filled, red=required & missing, orange=optional & missing
        const statusClass = ok ? "ok" : isRequired ? "no" : "no-optional";
        const dotClass = ok ? "g" : isRequired ? "r" : "o";

        const item = document.createElement("div");
        item.className = `pa-fitem ${statusClass}`;
        item.innerHTML = `
          <span class="pa-fdot ${dotClass}"></span>
          <span class="pa-fname">${f.name}${isRequired ? ' <span style="color:#ef4444;font-size:10px;">★</span>' : ""}</span>
          <span class="pa-fgo">${I.target}</span>
        `;
        item.addEventListener("click", () => scrollToField(f.sel));
        grid.appendChild(item);
      });

      const pct = Math.round((filled / total) * 100);
      const circ = 2 * Math.PI * 22; // r=22
      const fg = document.getElementById("pa-ring-fg");
      if (fg) {
        fg.style.strokeDashoffset = circ - (pct / 100) * circ;
        fg.setAttribute(
          "stroke",
          pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#dc2626",
        );
      }
      const pctEl = document.getElementById("pa-ring-pct");
      if (pctEl) {
        pctEl.textContent = `${pct}%`;
        pctEl.style.color =
          pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#dc2626";
      }
      const cntEl = document.getElementById("pa-f-count");
      if (cntEl) cntEl.textContent = `${filled} / ${total} fields`;

      // Update submit button state based on required fields
      updateSubmitButtonState();
    } catch (e) {
      console.error("[PA] field status error:", e);
    }
  };

  // ─── SUBMIT BUTTON GATING ───────────────────────────────────
  const checkRequiredFieldsFilled = () => {
    return FIELDS.filter((f) => REQUIRED_FIELD_NAMES.includes(f.name)).every(
      (f) => f.check(),
    );
  };

  const REQUIRED_TOOLTIP =
    "Fill all required fields: Product Name, Slug, Short Description, Categories, Main Thumbnail, Selling Price";

  const setButtonDisabled = (btn, allFilled) => {
    if (!btn) return;
    if (!allFilled) {
      btn.disabled = true;
      btn.style.opacity = "0.5";
      btn.style.pointerEvents = "none";
      btn.title = REQUIRED_TOOLTIP;
      // For onclick buttons, store and remove the onclick to prevent any clicks
      if (btn.getAttribute("onclick") && !btn.dataset.paOrigOnclick) {
        btn.dataset.paOrigOnclick = btn.getAttribute("onclick");
        btn.removeAttribute("onclick");
      }
    } else {
      btn.disabled = false;
      btn.style.opacity = "1";
      btn.style.pointerEvents = "auto";
      btn.title = "";
      // Restore onclick if we previously removed it
      if (btn.dataset.paOrigOnclick) {
        btn.setAttribute("onclick", btn.dataset.paOrigOnclick);
        delete btn.dataset.paOrigOnclick;
      }
    }
  };

  const updateSubmitButtonState = () => {
    try {
      const allFilled = checkRequiredFieldsFilled();

      // Create product page: find BOTH "Save As Draft" and "Save And Publish" buttons
      // Draft button: onclick="submitProductForm('draft')"
      const draftBtn =
        document.querySelector(
          "button[onclick*=\"submitProductForm('draft')\"]",
        ) ||
        document.querySelector(
          "button[data-pa-orig-onclick*=\"submitProductForm('draft')\"]",
        );
      // Publish button: onclick="submitProductForm('publish')"
      const publishBtn =
        document.querySelector(
          "button[onclick*=\"submitProductForm('publish')\"]",
        ) ||
        document.querySelector(
          "button[data-pa-orig-onclick*=\"submitProductForm('publish')\"]",
        ) ||
        (() => {
          // Fallback: btn-success with "Save" and "Publish" text
          let found = null;
          document.querySelectorAll("button.btn-success").forEach((btn) => {
            if (
              btn.textContent.includes("Save") &&
              btn.textContent.includes("Publish")
            )
              found = btn;
          });
          return found;
        })();

      setButtonDisabled(draftBtn, allFilled);
      setButtonDisabled(publishBtn, allFilled);

      // Update product page: form submit button (type="submit")
      const formSubmitBtns = document.querySelectorAll(
        'form button[type="submit"], form input[type="submit"]',
      );
      formSubmitBtns.forEach((btn) => setButtonDisabled(btn, allFilled));
    } catch (e) {
      console.warn("[PA] submit button state error:", e);
    }
  };

  // ─── REAL-TIME FIELD MONITORING ──────────────────────────────
  const setupRealtimeFieldMonitoring = () => {
    // Debounce helper to avoid excessive refresh calls
    let _refreshTimer = null;
    const debouncedRefresh = () => {
      clearTimeout(_refreshTimer);
      _refreshTimer = setTimeout(refreshFieldStatus, 300);
    };

    // 1. Listen for input/change on all form inputs, selects, textareas
    document.addEventListener(
      "input",
      (e) => {
        if (e.target.closest("#pa-panel")) return; // ignore our own panel
        debouncedRefresh();
      },
      true,
    );

    document.addEventListener(
      "change",
      (e) => {
        if (e.target.closest("#pa-panel")) return;
        // Special handling for file inputs — set tracking flag
        if (e.target.type === "file") {
          window._paImageSelected = !!(
            e.target.files && e.target.files.length > 0
          );
        }
        debouncedRefresh();
      },
      true,
    );

    // 2. Listen for clicks (checkboxes, radio buttons, category tree, etc.)
    document.addEventListener(
      "click",
      (e) => {
        if (e.target.closest("#pa-panel")) return;
        const t = e.target;
        // Trigger refresh for checkbox/radio clicks and buttons inside forms
        if (
          t.type === "checkbox" ||
          t.type === "radio" ||
          t.closest(".attributeBox") ||
          t.closest("#categoryTree")
        ) {
          debouncedRefresh();
        }

        // Track category checkbox selections for stats
        if (t.type === "checkbox" && t.name === "categories[]") {
          const stats = getStats();
          stats.categories += t.checked ? 1 : -1;
          if (stats.categories < 0) stats.categories = 0;
          saveStats(stats);
        }

        // Track attribute checkbox selections for stats
        if (t.type === "checkbox" && t.name === "category_attribute_ids[]") {
          const stats = getStats();
          stats.attributes += t.checked ? 1 : -1;
          if (stats.attributes < 0) stats.attributes = 0;
          saveStats(stats);
        }
      },
      true,
    );

    // 3. MutationObserver for Quill editors (they change innerHTML without input events)
    const quillEditors = document.querySelectorAll(
      "#editor .ql-editor, #specificationEditor .ql-editor",
    );
    if (quillEditors.length > 0) {
      const observer = new MutationObserver(debouncedRefresh);
      quillEditors.forEach((ed) => {
        observer.observe(ed, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      });
    }

    // 4. MutationObserver on the form body for dynamically added elements (FAQ rows, spec groups)
    const form = document.querySelector("form") || document.body;
    const formObserver = new MutationObserver((mutations) => {
      // Only refresh if actual form-relevant nodes were added/removed
      for (const m of mutations) {
        if (m.type === "childList" && m.addedNodes.length > 0) {
          debouncedRefresh();
          break;
        }
      }
    });
    formObserver.observe(form, { childList: true, subtree: true });

    // 5. Select2/jQuery change events (warranty, meta keywords, etc.)
    if (typeof $ !== "undefined" || typeof jQuery !== "undefined") {
      const jq = $ || jQuery;
      try {
        jq(document).on("change", "select", debouncedRefresh);
        jq(document).on("select2:select select2:unselect", debouncedRefresh);
      } catch (e) {
        /* jQuery not available */
      }
    }

    // 6. Fallback interval (reduced from 12s to 5s since we have real-time now)
    setInterval(refreshFieldStatus, 5000);
  };

  // ─── 5. FAQ IMPORTER (from autoFill.js) ──────────────────────
  function generateFAQ(rawText) {
    const lines = rawText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const arr = [];
    let curQ = null;
    lines.forEach((line) => {
      if (line.endsWith("?")) {
        curQ = line;
      } else if (curQ) {
        arr.push({ question: curQ, answer: line });
        curQ = null;
      }
    });
    return arr;
  }

  async function processFAQ() {
    const input = document.getElementById("pa-faq-input");
    const faqs = generateFAQ(input.value);
    if (faqs.length === 0)
      return showToast("No valid FAQs found", 2500, "warning");

    const faqBtn = document.getElementById("pa-faq-fill");
    if (faqBtn) {
      faqBtn.disabled = true;
      faqBtn.classList.add("pa-btn-loading");
      faqBtn.innerHTML = `${I.refresh} Filling FAQs...`;
      faqBtn.style.opacity = "0.6";
      faqBtn.style.pointerEvents = "none";
    }

    const addBtn =
      document.querySelector("button[onclick*='addFaq']") ||
      document.querySelector(
        "div.mb-3:nth-child(2) > div:nth-child(1) > div:nth-child(1) > h5:nth-child(1) > button:nth-child(1)",
      );

    for (let i = 0; i < faqs.length; i++) {
      let rows = document.querySelectorAll(".faqRow");
      if (i >= rows.length) {
        if (addBtn) {
          addBtn.click();
          await sleep(400);
          rows = document.querySelectorAll(".faqRow");
        }
      }
      const row = rows[i];
      if (row) {
        const q = row.querySelector('input[name="question[]"]');
        const a = row.querySelector('input[name="answer[]"]');
        if (q && a) {
          q.value = faqs[i].question;
          a.value = faqs[i].answer;
          [q, a].forEach((el) => {
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
          });
        }
      }
    }

    const stats = getStats();
    stats.faqs += faqs.length;
    saveStats(stats);
    showToast(`${faqs.length} FAQs added!`, 2500, "success");
    input.value = "";
    refreshFieldStatus();

    if (faqBtn) {
      faqBtn.disabled = false;
      faqBtn.classList.remove("pa-btn-loading");
      faqBtn.innerHTML = "Fill FAQs";
      faqBtn.style.opacity = "1";
      faqBtn.style.pointerEvents = "auto";
    }
  }

  // ─── 6. SPECIFICATION IMPORTER (from autoFill.js) ────────────
  function generateSpecificationTable(rawText) {
    const lines = rawText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const table = [];
    let group = null;
    lines.forEach((line) => {
      const [c1, c2] = line.split("\t");
      if (
        typeof c2 === "undefined" ||
        c2.toLowerCase() === "details" ||
        c2.toLowerCase() === "—"
      ) {
        group = c1;
      } else {
        table.push({ groupName: group || "General", name: c1, title: c2 });
      }
    });
    return table;
  }

  async function processSpecs() {
    const input = document.getElementById("pa-spec-input");
    const specs = generateSpecificationTable(input.value);
    if (specs.length === 0)
      return showToast("No valid Specs found", 2500, "warning");

    const specBtn = document.getElementById("pa-spec-fill");
    if (specBtn) {
      specBtn.disabled = true;
      specBtn.classList.add("pa-btn-loading");
      specBtn.innerHTML = `${I.refresh} Filling Specs...`;
      specBtn.style.opacity = "0.6";
      specBtn.style.pointerEvents = "none";
    }

    const addGroupBtn = document.querySelector("button.btn-secondary");
    let curIdx = -1;
    let lastName = "";
    let groupCount = 0;

    for (let i = 0; i < specs.length; i++) {
      const item = specs[i];

      if (item.groupName !== lastName) {
        curIdx++;
        groupCount++;
        lastName = item.groupName;

        if (curIdx > 0) {
          if (addGroupBtn) addGroupBtn.click();
          await sleep(500);
        }

        let groups = document.querySelectorAll(".specGroup");
        let groupEl = groups[curIdx];
        if (groupEl) {
          let gInput = groupEl.querySelector('input[name*="[group_name]"]');
          if (gInput) {
            gInput.value = item.groupName;
            gInput.dispatchEvent(new Event("input", { bubbles: true }));
            gInput.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }
      }

      let groups = document.querySelectorAll(".specGroup");
      let groupEl = groups[curIdx];

      if (groupEl) {
        let rows = groupEl.querySelectorAll(".specRow");
        if (
          rows.length === 0 ||
          (i > 0 && specs[i].groupName === specs[i - 1].groupName)
        ) {
          let addFieldBtn = groupEl.querySelector(
            "button.btn-success, button.btn-primary",
          );
          if (addFieldBtn) {
            addFieldBtn.click();
            await sleep(350);
            rows = groupEl.querySelectorAll(".specRow");
          }
        }

        let targetRow = rows[rows.length - 1];
        if (targetRow) {
          let nameInput = targetRow.querySelector('input[name*="[name]"]');
          let titleInput = targetRow.querySelector('input[name*="[title]"]');
          if (nameInput && titleInput) {
            nameInput.value = item.name;
            titleInput.value = item.title;
            [nameInput, titleInput].forEach((el) => {
              el.dispatchEvent(new Event("input", { bubbles: true }));
              el.dispatchEvent(new Event("change", { bubbles: true }));
            });
          }
        }
      }
    }

    const stats = getStats();
    stats.specGroups += groupCount;
    stats.specItems += specs.length;
    saveStats(stats);
    showToast("Specification import complete!", 2500, "success");
    input.value = "";
    refreshFieldStatus();

    if (specBtn) {
      specBtn.disabled = false;
      specBtn.classList.remove("pa-btn-loading");
      specBtn.innerHTML = "Fill Specifications";
      specBtn.style.opacity = "1";
      specBtn.style.pointerEvents = "auto";
    }
  }

  // ─── 7. WARRANTY SELECTOR (from autoFill.js) ─────────────────
  function processWarranty() {
    const input = document.getElementById("pa-war-input");
    const keyword = input.value.trim().toLowerCase();
    if (!keyword) return showToast("Enter a warranty keyword", 2500, "warning");

    const $sel = $('select[name="warranty_claims[]"]');
    if ($sel.length === 0)
      return showToast("Warranty dropdown not found", 2500, "error");

    let current = $sel.val() || [];
    let count = 0;

    $sel.find("option").each(function () {
      const text = $(this).text().toLowerCase();
      const val = $(this).val();
      if (val && text.split(":")[0].trim() === keyword) {
        if (!current.includes(val)) {
          current.push(val);
          count++;
        }
      }
    });

    if (count > 0) {
      $sel.val(current).trigger("change");
      const stats = getStats();
      stats.warranties += count;
      saveStats(stats);
      showToast(
        `Added ${count} warranty items for "${keyword}"`,
        2500,
        "success",
      );
      input.value = "";
      refreshFieldStatus();
    } else {
      showToast(`No new items for "${keyword}"`, 2500, "warning");
    }
  }

  // ─── KEYWORD MANAGEMENT ──────────────────────────────────────
  const renderKeywordTags = () => {
    const box = document.getElementById("pa-kw-tags");
    if (!box) return;
    const config = getConfig();
    const words = config.highlightWords || [];

    box.innerHTML = "";
    if (words.length === 0) {
      box.innerHTML =
        '<span style="font-size:11px; color:#555;">No keywords configured</span>';
      return;
    }

    words.forEach((w, idx) => {
      const tag = document.createElement("span");
      tag.className = "pa-tag";
      tag.innerHTML = `${escapeHtml(w)} <span class="pa-tag-x" data-i="${idx}">×</span>`;
      box.appendChild(tag);
    });

    box.querySelectorAll(".pa-tag-x").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const cfg = getConfig();
        cfg.highlightWords.splice(parseInt(e.target.dataset.i), 1);
        saveConfig(cfg);
        renderKeywordTags();
        showToast("Keyword removed", 2500, "success");
      });
    });
  };

  // ─── KEYWORD HIGHLIGHT (CSS Highlight API — zero DOM modification) ──
  const highlightKeywordsInEditor = () => {
    const config = getConfig();
    const words = config.highlightWords || [];
    if (words.length === 0)
      return showToast("No keywords to highlight", 2500, "warning");

    const ed = document.querySelector("#specificationEditor .ql-editor");
    if (!ed) return showToast("Specification editor not found", 2500, "error");

    if (!window.CSS?.highlights) {
      return showToast(
        "Browser does not support CSS Highlight API",
        2500,
        "error",
      );
    }

    const escapedWords = words
      .filter((w) => w.trim())
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    if (escapedWords.length === 0) return;

    const regex = new RegExp(escapedWords.join("|"), "gi");
    const ranges = [];

    // Walk all text nodes in the editor — no DOM changes at all
    const walker = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent;
      let match;
      regex.lastIndex = 0;
      while ((match = regex.exec(text))) {
        const range = new Range();
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        ranges.push(range);
      }
    }

    if (ranges.length > 0) {
      CSS.highlights.set("pa-keywords", new Highlight(...ranges));
      showToast(`Highlighted ${ranges.length} match(es)`, 2500, "success");
    } else {
      CSS.highlights.delete("pa-keywords");
      showToast("No keyword matches found in description", 2500, "warning");
    }
  };

  const clearKeywordHighlights = () => {
    if (window.CSS?.highlights) {
      CSS.highlights.delete("pa-keywords");
    }
    showToast("Highlights cleared", 2500, "success");
  };

  // ─── TAB SWITCHING ───────────────────────────────────────────
  const setupTabs = () => {
    document.querySelectorAll("#pa-panel .pa-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.tab;

        document
          .querySelectorAll("#pa-panel .pa-tab")
          .forEach((t) => t.classList.remove("active"));
        document
          .querySelectorAll("#pa-panel .pa-tab-content")
          .forEach((c) => c.classList.remove("active"));

        tab.classList.add("active");
        const content = document.querySelector(
          `#pa-panel .pa-tab-content[data-tab="${target}"]`,
        );
        if (content) content.classList.add("active");

        if (target === "status") refreshFieldStatus();

        const config = getConfig();
        config.activeTab = target;
        saveConfig(config);
      });
    });

    // Restore last active tab
    const config = getConfig();
    if (config.activeTab && config.activeTab !== "editor") {
      const t = document.querySelector(
        `#pa-panel .pa-tab[data-tab="${config.activeTab}"]`,
      );
      if (t) t.click();
    }
  };

  // ─── INIT ────────────────────────────────────────────────────
  const init = () => {
    try {
      injectStyles();
      const panel = buildPanel();

      // Toggle Alt+Q
      document.addEventListener("keydown", (e) => {
        if (e.altKey && e.key.toLowerCase() === SHORTCUT_KEY) {
          e.preventDefault();
          panel.style.display =
            panel.style.display === "none" ? "block" : "none";
          if (panel.style.display === "block") {
            refreshFieldStatus();
            updateStatsUI();
          }
        }
      });

      // Close
      document.getElementById("pa-close").addEventListener("click", () => {
        panel.style.display = "none";
      });

      // Tabs
      setupTabs();

      // ── Editor tab handlers ──
      document.getElementById("pa-sd-fill").addEventListener("click", () => {
        fillShortDescription(document.getElementById("pa-sd-input").value);
      });
      document.getElementById("pa-sd-clear").addEventListener("click", () => {
        document.getElementById("pa-sd-input").value = "";
      });

      document
        .getElementById("pa-desc-fill")
        .addEventListener("click", fillDescriptionFromPasteEditor);
      document
        .getElementById("pa-desc-clear-editor")
        .addEventListener("click", () => {
          document.getElementById("pa-desc-editor").innerHTML = "";
        });

      // Meta Title fill
      document
        .getElementById("pa-meta-title-fill")
        .addEventListener("click", () => {
          const inp = document.getElementById("pa-meta-title-input");
          const val = inp.value.trim();
          if (!val)
            return showToast("Enter a meta title first", 2500, "warning");
          const field = document.querySelector("input#meta_title");
          if (!field)
            return showToast("Meta title field not found", 2500, "error");
          field.value = val;
          field.dispatchEvent(new Event("input", { bubbles: true }));
          field.dispatchEvent(new Event("change", { bubbles: true }));
          inp.value = "";
          showToast("Meta title filled!", 2500, "success");
          refreshFieldStatus();
        });
      document
        .getElementById("pa-meta-title-clear")
        .addEventListener("click", () => {
          document.getElementById("pa-meta-title-input").value = "";
        });

      // Meta Description fill
      document
        .getElementById("pa-meta-desc-fill")
        .addEventListener("click", () => {
          const inp = document.getElementById("pa-meta-desc-input");
          const val = inp.value.trim();
          if (!val)
            return showToast("Enter a meta description first", 2500, "warning");
          const field = document.querySelector(
            'textarea[name="meta_description"]',
          );
          if (!field)
            return showToast("Meta description field not found", 2500, "error");
          field.value = val;
          field.dispatchEvent(new Event("input", { bubbles: true }));
          field.dispatchEvent(new Event("change", { bubbles: true }));
          inp.value = "";
          showToast("Meta description filled!", 2500, "success");
          refreshFieldStatus();
        });
      document
        .getElementById("pa-meta-desc-clear")
        .addEventListener("click", () => {
          document.getElementById("pa-meta-desc-input").value = "";
        });

      document
        .getElementById("pa-desc-hl")
        .addEventListener("click", highlightKeywordsInEditor);
      document
        .getElementById("pa-desc-hl-clear")
        .addEventListener("click", clearKeywordHighlights);

      // Keyword add
      const addKW = () => {
        const inp = document.getElementById("pa-kw-input");
        const w = inp.value.trim();
        if (!w) return;
        const cfg = getConfig();
        if (!cfg.highlightWords.includes(w)) {
          cfg.highlightWords.push(w);
          saveConfig(cfg);
          showToast(`Added "${w}"`, 2500, "success");
        }
        inp.value = "";
        renderKeywordTags();
      };
      document.getElementById("pa-kw-add").addEventListener("click", addKW);
      document
        .getElementById("pa-kw-input")
        .addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addKW();
          }
        });

      // ── Import tab handlers ──
      document
        .getElementById("pa-faq-fill")
        .addEventListener("click", processFAQ);
      document
        .getElementById("pa-spec-fill")
        .addEventListener("click", processSpecs);
      document
        .getElementById("pa-war-sel")
        .addEventListener("click", processWarranty);
      document.getElementById("pa-war-clr").addEventListener("click", () => {
        if (confirm("Clear all warranty selections?")) {
          $('select[name="warranty_claims[]"]').val(null).trigger("change");
          showToast("Warranty claims cleared", 2500, "success");
          refreshFieldStatus();
        }
      });
      document
        .getElementById("pa-war-input")
        .addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            processWarranty();
          }
        });

      // ── Status tab handlers ──
      document
        .getElementById("pa-f-refresh")
        .addEventListener("click", refreshFieldStatus);

      // Stats handlers
      document.querySelectorAll("#pa-panel .pa-stat-reset").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const type = e.target.dataset.type;
          const label = type
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (c) => c.toUpperCase());
          if (!confirm(`Reset "${label.trim()}" counter to 0?`)) return;
          const s = getStats();
          s[type] = 0;
          saveStats(s);
          showToast(`${label.trim()} counter reset`, 2500, "success");
        });
      });

      document.getElementById("pa-st-copy").addEventListener("click", () => {
        const s = getStats();
        const txt = `Short Desc: ${s.shortDescItems}\nDesc Items: ${s.descItems}\nFAQs: ${s.faqs}\nSpec Groups: ${s.specGroups}\nSpec Items: ${s.specItems}\nWarranties: ${s.warranties}\nCategories: ${s.categories}\nAttributes: ${s.attributes}`;
        navigator.clipboard
          .writeText(txt)
          .then(() => showToast("Stats copied!", 2500, "success"));
      });

      document.getElementById("pa-st-reset").addEventListener("click", () => {
        if (confirm("Reset ALL stats?")) {
          saveStats({
            faqs: 0,
            specGroups: 0,
            specItems: 0,
            warranties: 0,
            shortDescItems: 0,
            descItems: 0,
            categories: 0,
            attributes: 0,
          });
          showToast("All stats reset", 2500, "success");
        }
      });

      // ── Setup counters (no paste interceptors — user pastes normally) ──
      setupMetaCounters();

      // ── Initial render ──
      renderKeywordTags();
      updateStatsUI();
      refreshFieldStatus();

      // ── Real-time field status monitoring ──
      setupRealtimeFieldMonitoring();

      console.log("[PCB Product Assistant v2.0] Ready! Alt+Q to toggle.");
      showToast("Product Assistant ready — Alt+Q to open", 2500, "success");
    } catch (err) {
      console.error("[PA] Init error:", err);
    }
  };

  // Wait for page load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 1200));
  } else {
    setTimeout(init, 1200);
  }
})();
