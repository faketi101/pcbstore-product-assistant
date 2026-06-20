// ==UserScript==
// @name         PCB Glossary Upload Assistant
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @description  Fill, clean, validate, and track PCBStore glossary terms, definitions, SEO metadata, and FAQs
// @author       faketi101
// @match        https://admin.pcbstore.net/admin/glossary/term/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const SHORTCUT_KEY = "q";
  const CONFIG_KEY = "pcb_glossary_assistant_config";
  const STATS_KEY = "pcb_glossary_assistant_stats";
  const THEME_KEY = "theme";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const ICONS = {
    book: `<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14Z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>`,
    x: `<svg viewBox="0 0 24 24"><path d="m18 6-12 12M6 6l12 12"/></svg>`,
    sun: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.31 11.31 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></svg>`,
    moon: `<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>`,
    check: `<svg viewBox="0 0 24 24"><path d="m20 6-11 11-5-5"/></svg>`,
    wand: `<svg viewBox="0 0 24 24"><path d="m15 4-1 1m4 2-1 1m-2 0 1 1m2-4 1 1M3 21l9-9"/><circle cx="15" cy="6" r="3"/></svg>`,
    faq: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 1 1 4.8 2.4C12.7 12.3 12 12.7 12 14m0 4h.01"/></svg>`,
    chart: `<svg viewBox="0 0 24 24"><path d="M4 20V10m6 10V4m6 16v-7m4 7H2"/></svg>`,
  };

  const escapeHtml = (value) =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const getConfig = () => {
    const defaults = { activeTab: "content" };
    try {
      return { ...defaults, ...JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}") };
    } catch {
      return defaults;
    }
  };

  const saveConfig = (config) =>
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));

  const getStats = () => {
    const defaults = { terms: 0, definitions: 0, faqs: 0 };
    try {
      return { ...defaults, ...JSON.parse(localStorage.getItem(STATS_KEY) || "{}") };
    } catch {
      return defaults;
    }
  };

  const saveStats = (stats) => {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    updateStats();
  };

  let toastTimer;
  const toast = (message, type = "success") => {
    let element = $("#gua-toast");
    if (!element) {
      element = document.createElement("div");
      element.id = "gua-toast";
      document.body.appendChild(element);
    }
    element.className = `gua-toast gua-${type} show`;
    element.textContent = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove("show"), 2600);
  };

  const dispatchValue = (element, value) => {
    if (!element) return false;
    const prototype =
      element.tagName === "TEXTAREA"
        ? HTMLTextAreaElement.prototype
        : element.tagName === "SELECT"
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (setter) setter.call(element, value);
    else element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  };

  const slugify = (text) =>
    text
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const cleanHtml = (html) => {
    const documentFragment = document.implementation.createHTMLDocument("");
    documentFragment.body.innerHTML = html;

    documentFragment.body
      .querySelectorAll("script, style, meta, link, iframe, object")
      .forEach((node) => node.remove());
    documentFragment.body.querySelectorAll("*").forEach((node) => {
      [...node.attributes].forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        if (name.startsWith("on") || name === "style" || name === "class" || name === "id") {
          node.removeAttribute(attribute.name);
        }
      });
      if (node.tagName === "H1") {
        const h2 = documentFragment.createElement("h2");
        h2.innerHTML = node.innerHTML;
        node.replaceWith(h2);
      }
    });

    while (documentFragment.body.lastElementChild) {
      const last = documentFragment.body.lastElementChild;
      const empty = !last.textContent.trim() && !last.querySelector("img, video, table, hr");
      if (!empty) break;
      last.remove();
    }
    return documentFragment.body.innerHTML.trim();
  };

  const plainTextToHtml = (text) => {
    const blocks = text
      .replace(/\r/g, "")
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean);
    return blocks
      .map((block) => {
        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
        if (lines.length > 1 && lines.every((line) => /^[-*•]\s+/.test(line))) {
          return `<ul>${lines.map((line) => `<li>${escapeHtml(line.replace(/^[-*•]\s+/, ""))}</li>`).join("")}</ul>`;
        }
        return `<p>${lines.map(escapeHtml).join("<br>")}</p>`;
      })
      .join("");
  };

  const editorSourceHtml = () => {
    const source = $("#gua-definition");
    if (!source) return "";
    const hasElements = source.children.length > 0;
    return cleanHtml(hasElements ? source.innerHTML : plainTextToHtml(source.innerText));
  };

  // CKEditor lives in the page context. A transfer node and injected script let
  // this work in Tampermonkey even when the userscript runs in an isolated world.
  const setCkEditorData = (html) => {
    let transfer = $("#gua-html-transfer");
    if (!transfer) {
      transfer = document.createElement("textarea");
      transfer.id = "gua-html-transfer";
      transfer.hidden = true;
      document.body.appendChild(transfer);
    }
    transfer.value = html;

    const script = document.createElement("script");
    script.textContent = `
      (function () {
        var transfer = document.getElementById('gua-html-transfer');
        var html = transfer ? transfer.value : '';
        var editable = document.querySelector('.ck-editor__editable[contenteditable="true"]');
        var source = document.getElementById('editor');
        var hidden = document.querySelector('input[name="definition"], #description');
        var candidates = [];
        [source, editable].forEach(function (element) {
          if (!element) return;
          try {
            if (element.ckeditorInstance) candidates.push(element.ckeditorInstance);
            if (element.editor) candidates.push(element.editor);
          } catch (_) {}
        });
        ['editor', 'ckeditor', 'ckEditor', 'glossaryEditor'].forEach(function (key) {
          try { if (window[key]) candidates.push(window[key]); } catch (_) {}
        });
        try {
          Object.keys(window).forEach(function (key) {
            try {
              var value = window[key];
              if (value && typeof value.setData === 'function' && typeof value.getData === 'function') {
                candidates.push(value);
              }
            } catch (_) {}
          });
        } catch (_) {}
        var instance = candidates.find(function (item) {
          if (!item || typeof item.setData !== 'function') return false;
          try {
            var root = item.ui && item.ui.view && item.ui.view.editable && item.ui.view.editable.element;
            return !editable || !root || root === editable;
          } catch (_) { return true; }
        });
        try { if (instance) instance.setData(html); } catch (error) { console.warn('[GUA] CKEditor setData failed', error); }
        if (!instance && editable) {
          editable.innerHTML = html || '<p><br data-cke-filler="true"></p>';
          editable.dispatchEvent(new Event('input', { bubbles: true }));
          editable.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (hidden) {
          hidden.value = instance && typeof instance.getData === 'function' ? instance.getData() : html;
          hidden.dispatchEvent(new Event('input', { bubbles: true }));
          hidden.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (transfer) transfer.value = '';
      })();
    `;
    document.documentElement.appendChild(script);
    script.remove();

    const hidden = $('input[name="definition"], #description');
    if (hidden) dispatchValue(hidden, html);
    return true;
  };

  const getDefinitionText = () => {
    const editable = $(".ck-editor__editable[contenteditable='true']");
    if (editable) return editable.textContent.trim();
    const hidden = $('input[name="definition"], #description');
    if (!hidden?.value) return "";
    const temp = document.createElement("div");
    temp.innerHTML = hidden.value;
    return temp.textContent.trim();
  };

  const parseFaqs = (text) => {
    const lines = text.replace(/\r/g, "").split("\n");
    const faqs = [];
    let question = "";
    let answer = [];
    const commit = () => {
      if (question && answer.join(" ").trim()) {
        faqs.push({ question: question.trim(), answer: answer.join(" ").trim() });
      }
      question = "";
      answer = [];
    };

    lines.forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) {
        if (question && answer.length) commit();
        return;
      }
      const qMatch = line.match(/^(?:q(?:uestion)?\s*[:.)-]\s*)?(.*\?)$/i);
      const aMatch = line.match(/^a(?:nswer)?\s*[:.)-]\s*(.+)$/i);
      if (qMatch) {
        commit();
        question = qMatch[1].trim();
      } else if (question) {
        answer.push(aMatch ? aMatch[1].trim() : line);
      }
    });
    commit();
    return faqs;
  };

  const getFaqRows = () => $$("#faqContainer .faqRow");

  const fillFaqs = async (rawText, silent = false) => {
    const faqs = parseFaqs(rawText);
    if (!faqs.length) {
      if (!silent) toast("No valid question-and-answer pairs found", "warning");
      return 0;
    }

    const addButton = $('button[onclick*="addFaq"]');
    let filled = 0;
    for (let index = 0; index < faqs.length; index++) {
      let rows = getFaqRows();
      if (index >= rows.length && addButton) {
        addButton.click();
        await sleep(120);
        rows = getFaqRows();
      }
      const row = rows[index];
      if (!row) continue;
      const question = $('input[name="question[]"], textarea[name="question[]"]', row);
      const answer = $('input[name="answer[]"], textarea[name="answer[]"]', row);
      if (question && answer) {
        dispatchValue(question, faqs[index].question);
        dispatchValue(answer, faqs[index].answer);
        filled++;
      }
    }

    if (!filled) {
      if (!silent) toast("FAQ rows could not be created on this page", "error");
      return 0;
    }
    const stats = getStats();
    stats.faqs += filled;
    saveStats(stats);
    if (!silent) toast(`${filled} FAQ${filled === 1 ? "" : "s"} filled`);
    refreshStatus();
    return filled;
  };

  const detectTheme = () => {
    const storedTheme = localStorage.getItem(THEME_KEY);
    if (storedTheme === "dark" || storedTheme === "light") return storedTheme;

    const declaredTheme =
      document.documentElement.dataset.bsTheme ||
      document.documentElement.dataset.theme ||
      document.body?.dataset.bsTheme ||
      document.body?.dataset.theme;
    if (declaredTheme === "dark" || declaredTheme === "light") return declaredTheme;

    const classes = `${document.documentElement.className} ${document.body?.className || ""}`;
    if (/\b(?:dark|dark-mode|theme-dark)\b/i.test(classes)) return "dark";
    if (/\b(?:light|light-mode|theme-light)\b/i.test(classes)) return "light";

    return window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  };

  const refreshCategoryOptions = () => {
    const panelSelect = $("#gua-category");
    const pageSelect = $('select[name="glossary_category_id"]');
    if (!panelSelect || !pageSelect) return;

    const selectedValue = panelSelect.value || pageSelect.value || "";
    panelSelect.innerHTML = [...pageSelect.options]
      .map(
        (option) =>
          `<option value="${escapeHtml(option.value)}">${escapeHtml(option.textContent.trim())}</option>`,
      )
      .join("");
    panelSelect.value = selectedValue;
    if (panelSelect.value !== selectedValue) panelSelect.value = pageSelect.value || "";
  };

  const buildPanel = () => {
    const panel = document.createElement("aside");
    panel.id = "gua-panel";
    panel.dataset.theme = detectTheme();
    panel.innerHTML = `
      <header class="gua-header">
        <div class="gua-title">${ICONS.book}<span>Glossary Upload Assistant</span></div>
        <div class="gua-header-actions">
          <button id="gua-theme" class="gua-icon-btn" type="button" title="Toggle theme"></button>
          <button id="gua-close" class="gua-icon-btn" type="button" title="Close (Alt+Q)">${ICONS.x}</button>
        </div>
      </header>
      <nav class="gua-tabs">
        <button class="gua-tab active" data-tab="content">Content</button>
        <button class="gua-tab" data-tab="faq">FAQs</button>
        <button class="gua-tab" data-tab="status">Status</button>
      </nav>

      <section class="gua-page active" data-tab="content">
        <div class="gua-section">
          <label class="gua-label" for="gua-name">Term name</label>
          <input id="gua-name" class="gua-input" placeholder="e.g. PCI Express">
          <div class="gua-row gua-top-8">
            <div class="gua-grow">
              <label class="gua-label" for="gua-slug">Slug</label>
              <input id="gua-slug" class="gua-input" placeholder="Auto-generated from name">
            </div>
            <button id="gua-make-slug" class="gua-btn gua-btn-muted gua-align-end" type="button">Generate</button>
          </div>
          <label class="gua-label gua-top-12" for="gua-category">Category</label>
          <select id="gua-category" class="gua-input"><option value="">Loading categories…</option></select>
        </div>

        <div class="gua-section">
          <div class="gua-section-title">${ICONS.wand} Definition</div>
          <div id="gua-definition" class="gua-editor" contenteditable="true" data-placeholder="Paste the formatted definition here..."></div>
          <div class="gua-counter"><span id="gua-definition-words">0 words</span></div>
          <div class="gua-hint">Formatting is preserved; unsafe tags, inline colors, classes, and H1 tags are cleaned on fill.</div>
        </div>

        <div class="gua-section">
          <label class="gua-label" for="gua-meta-title">Meta title</label>
          <input id="gua-meta-title" class="gua-input" placeholder="Recommended: 50–60 characters">
          <div class="gua-counter"><span id="gua-title-count">0 / 60</span></div>
          <label class="gua-label gua-top-10" for="gua-meta-description">Meta description</label>
          <textarea id="gua-meta-description" class="gua-input gua-textarea" rows="3" placeholder="Recommended: 140–160 characters"></textarea>
          <div class="gua-counter"><span id="gua-description-count">0 / 160</span></div>
        </div>

        <div class="gua-action-bar">
          <button id="gua-fill-all" class="gua-btn gua-btn-primary gua-grow" type="button">Fill All Content</button>
          <button id="gua-clear-content" class="gua-btn gua-btn-muted" type="button">Clear</button>
        </div>
      </section>

      <section class="gua-page" data-tab="faq">
        <div class="gua-section">
          <div class="gua-section-title">${ICONS.faq} FAQ importer</div>
          <textarea id="gua-faqs" class="gua-input gua-textarea gua-faq-box" placeholder="What is PCIe?\nPCI Express is a high-speed expansion interface.\n\nQ: Is PCIe backward compatible?\nA: Yes, in most configurations."></textarea>
          <div class="gua-hint">A question must end in “?”. Answers may span multiple lines. Blank lines separate pairs.</div>
          <button id="gua-fill-faqs" class="gua-btn gua-btn-primary gua-full gua-top-12" type="button">Fill FAQs</button>
        </div>
      </section>

      <section class="gua-page" data-tab="status">
        <div class="gua-section">
          <div class="gua-section-title">${ICONS.check} Page completion</div>
          <div class="gua-progress"><span id="gua-progress-bar"></span></div>
          <div id="gua-progress-text" class="gua-progress-text">0 / 7 fields</div>
          <div id="gua-status-list" class="gua-status-list"></div>
        </div>
        <div class="gua-section">
          <div class="gua-section-title">${ICONS.chart} Session stats</div>
          <div class="gua-stats">
            <div><span>Terms filled</span><b id="gua-stat-terms">0</b></div>
            <div><span>Definitions</span><b id="gua-stat-definitions">0</b></div>
            <div><span>FAQs added</span><b id="gua-stat-faqs">0</b></div>
          </div>
          <button id="gua-reset-stats" class="gua-btn gua-btn-muted gua-full gua-top-12" type="button">Reset Stats</button>
        </div>
      </section>
    `;
    document.body.appendChild(panel);
    refreshCategoryOptions();
    updateThemeIcon();
    return panel;
  };

  const injectStyles = () => {
    const style = document.createElement("style");
    style.textContent = `
      #gua-panel { --bg:rgba(10,10,12,.92); --surface:rgba(255,255,255,.045); --surface2:rgba(255,255,255,.08); --border:rgba(255,255,255,.1); --text:#e5e7eb; --muted:#8b93a1; --accent:#dc2626; position:fixed; z-index:999999; top:12px; right:12px; width:520px; max-height:94vh; overflow:auto; display:none; color:var(--text); background:var(--bg); border:1px solid var(--border); border-radius:16px; box-shadow:0 24px 70px rgba(0,0,0,.5); backdrop-filter:blur(24px); font:13px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
      #gua-panel[data-theme="light"] { --bg:rgba(255,255,255,.96); --surface:#f8fafc; --surface2:#eef2f7; --border:#dbe2ea; --text:#1f2937; --muted:#64748b; }
      #gua-panel * { box-sizing:border-box; }
      #gua-panel svg { width:17px; height:17px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
      #gua-panel::-webkit-scrollbar { width:5px; } #gua-panel::-webkit-scrollbar-thumb { background:rgba(220,38,38,.4); border-radius:8px; }
      .gua-header { position:sticky; z-index:4; top:0; display:flex; justify-content:space-between; align-items:center; padding:15px 18px; background:var(--bg); border-bottom:2px solid var(--accent); border-radius:16px 16px 0 0; }
      .gua-title,.gua-header-actions,.gua-row,.gua-section-title { display:flex; align-items:center; gap:9px; } .gua-title { font-size:16px; font-weight:750; } .gua-title svg,.gua-section-title svg { color:var(--accent); }
      .gua-icon-btn { display:grid; place-items:center; width:32px; height:32px; padding:0; border:1px solid var(--border); border-radius:8px; color:var(--muted); background:var(--surface); cursor:pointer; } .gua-icon-btn:hover { color:#fff; background:var(--accent); }
      .gua-tabs { position:sticky; z-index:3; top:63px; display:flex; padding:0 14px; background:var(--bg); border-bottom:1px solid var(--border); }
      .gua-tab { flex:1; padding:12px 8px; color:var(--muted); background:none; border:0; border-bottom:2px solid transparent; text-transform:uppercase; letter-spacing:.8px; font-size:11px; font-weight:700; cursor:pointer; } .gua-tab.active { color:var(--accent); border-bottom-color:var(--accent); }
      .gua-page { display:none; } .gua-page.active { display:block; } .gua-section { padding:16px 19px; border-bottom:1px solid var(--border); }
      .gua-section-title { margin-bottom:11px; color:var(--accent); text-transform:uppercase; letter-spacing:1px; font-size:11px; font-weight:800; }
      .gua-label { display:block; margin:0 0 5px; color:var(--muted); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; }
      .gua-input,.gua-editor { width:100%; color:var(--text); background:var(--surface); border:1px solid var(--border); border-radius:9px; padding:10px 12px; outline:none; font:inherit; transition:.2s; } .gua-input:focus,.gua-editor:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(220,38,38,.1); }
      select.gua-input option { color:#111827; background:#fff; } .gua-textarea { resize:vertical; min-height:75px; } .gua-faq-box { min-height:250px; font-family:"SFMono-Regular",Consolas,monospace; }
      .gua-editor { min-height:190px; max-height:330px; overflow:auto; line-height:1.6; } .gua-editor:empty::before { content:attr(data-placeholder); color:var(--muted); pointer-events:none; } .gua-editor p:first-child { margin-top:0; } .gua-editor p:last-child { margin-bottom:0; }
      .gua-btn { display:inline-flex; align-items:center; justify-content:center; min-height:38px; padding:8px 14px; border:0; border-radius:8px; font-weight:700; cursor:pointer; } .gua-btn:active { transform:scale(.98); } .gua-btn-primary { color:white; background:var(--accent); } .gua-btn-primary:hover { background:#ef4444; } .gua-btn-muted { color:var(--text); background:var(--surface2); border:1px solid var(--border); } .gua-btn-muted:hover { filter:brightness(1.12); }
      .gua-action-bar { display:flex; gap:8px; padding:15px 19px; } .gua-grow { flex:1; } .gua-full { width:100%; } .gua-align-end { align-self:flex-end; } .gua-top-8 { margin-top:8px; } .gua-top-10 { margin-top:10px; } .gua-top-12 { margin-top:12px; }
      .gua-counter { display:flex; justify-content:flex-end; height:19px; padding-top:3px; color:var(--muted); font-size:10px; } .gua-hint { margin-top:5px; color:var(--muted); font-size:10.5px; }
      .gua-progress { height:7px; overflow:hidden; margin:4px 0 8px; background:var(--surface2); border-radius:9px; } .gua-progress span { display:block; width:0; height:100%; background:var(--accent); transition:width .3s; } .gua-progress-text { margin-bottom:12px; font-weight:750; }
      .gua-status-list { display:grid; grid-template-columns:1fr 1fr; gap:6px; } .gua-status-item { display:flex; align-items:center; gap:8px; padding:8px 10px; background:var(--surface); border:1px solid var(--border); border-radius:8px; cursor:pointer; } .gua-dot { width:8px; height:8px; border-radius:50%; background:#f59e0b; } .gua-status-item.ok .gua-dot { background:#22c55e; } .gua-status-item.required:not(.ok) .gua-dot { background:#ef4444; }
      .gua-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:7px; } .gua-stats div { display:flex; flex-direction:column; gap:3px; padding:10px; background:var(--surface); border:1px solid var(--border); border-radius:8px; color:var(--muted); } .gua-stats b { color:var(--accent); font-size:18px; }
      .gua-toast { position:fixed; z-index:1000000; left:50%; bottom:25px; opacity:0; transform:translate(-50%,70px); padding:11px 20px; color:#fff; background:#101114; border:1px solid #22c55e; border-radius:10px; box-shadow:0 10px 35px rgba(0,0,0,.35); font:600 13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; pointer-events:none; transition:.25s; } .gua-toast.show { opacity:1; transform:translate(-50%,0); } .gua-toast.gua-warning { border-color:#f59e0b; } .gua-toast.gua-error { border-color:#ef4444; }
      @media (max-width:600px) { #gua-panel { inset:6px; width:auto; max-height:calc(100vh - 12px); } .gua-status-list { grid-template-columns:1fr; } }
    `;
    document.head.appendChild(style);
  };

  const updateThemeIcon = () => {
    const panel = $("#gua-panel");
    const button = $("#gua-theme");
    if (!panel || !button) return;
    const light = panel.dataset.theme === "light";
    button.innerHTML = light ? ICONS.moon : ICONS.sun;
    button.title = `Switch to ${light ? "dark" : "light"} theme`;
  };

  const counters = () => {
    const titleLength = $("#gua-meta-title")?.value.length || 0;
    const descriptionLength = $("#gua-meta-description")?.value.length || 0;
    const definitionText = $("#gua-definition")?.textContent.trim() || "";
    const words = definitionText ? definitionText.split(/\s+/).length : 0;
    const paint = (element, length, warningAt, limit) => {
      if (!element) return;
      element.textContent = `${length} / ${limit}`;
      element.style.color = length > limit ? "#ef4444" : length >= warningAt ? "#f59e0b" : "#22c55e";
    };
    paint($("#gua-title-count"), titleLength, 50, 60);
    paint($("#gua-description-count"), descriptionLength, 140, 160);
    if ($("#gua-definition-words")) $("#gua-definition-words").textContent = `${words} word${words === 1 ? "" : "s"}`;
  };

  const statusFields = [
    { name: "Term Name", required: true, selector: 'input[name="name"]', check: () => !!$('input[name="name"]')?.value.trim() },
    { name: "Slug", selector: 'input[name="slug"]', check: () => !!$('input[name="slug"]')?.value.trim() },
    { name: "Category", selector: 'select[name="glossary_category_id"]', check: () => !!$('select[name="glossary_category_id"]')?.value },
    { name: "Definition", required: true, selector: ".ck-editor__editable", check: () => !!getDefinitionText() },
    { name: "Meta Title", selector: 'input[name="meta_title"]', check: () => !!$('input[name="meta_title"]')?.value.trim() },
    { name: "Meta Description", selector: 'textarea[name="meta_description"]', check: () => !!$('textarea[name="meta_description"]')?.value.trim() },
    { name: "FAQs", selector: "#faqContainer", check: () => !!$('#faqContainer input[name="question[]"]')?.value.trim() },
  ];

  const refreshStatus = () => {
    const list = $("#gua-status-list");
    if (!list) return;
    let completed = 0;
    list.innerHTML = "";
    statusFields.forEach((field) => {
      const ok = field.check();
      if (ok) completed++;
      const item = document.createElement("div");
      item.className = `gua-status-item${ok ? " ok" : ""}${field.required ? " required" : ""}`;
      item.innerHTML = `<span class="gua-dot"></span><span>${escapeHtml(field.name)}${field.required ? " *" : ""}</span>`;
      item.addEventListener("click", () => {
        const target = $(field.selector);
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
        target?.focus?.();
      });
      list.appendChild(item);
    });
    const percent = Math.round((completed / statusFields.length) * 100);
    $("#gua-progress-bar").style.width = `${percent}%`;
    $("#gua-progress-bar").style.background = percent >= 80 ? "#22c55e" : percent >= 50 ? "#f59e0b" : "#dc2626";
    $("#gua-progress-text").textContent = `${completed} / ${statusFields.length} fields · ${percent}%`;
  };

  const updateStats = () => {
    const stats = getStats();
    if ($("#gua-stat-terms")) $("#gua-stat-terms").textContent = stats.terms;
    if ($("#gua-stat-definitions")) $("#gua-stat-definitions").textContent = stats.definitions;
    if ($("#gua-stat-faqs")) $("#gua-stat-faqs").textContent = stats.faqs;
  };

  const syncPanelFromPage = () => {
    refreshCategoryOptions();
    const copyValue = (panelSelector, pageSelector) => {
      const panelField = $(panelSelector);
      if (panelField) panelField.value = $(pageSelector)?.value || "";
    };
    copyValue("#gua-name", 'input[name="name"]');
    copyValue("#gua-slug", 'input[name="slug"]');
    copyValue("#gua-category", 'select[name="glossary_category_id"]');
    copyValue("#gua-meta-title", 'input[name="meta_title"]');
    copyValue("#gua-meta-description", 'textarea[name="meta_description"]');
    if ($("#gua-slug").value) $("#gua-slug").dataset.edited = "true";
    else delete $("#gua-slug").dataset.edited;
    const pageHtml = $('input[name="definition"], #description')?.value || $(".ck-editor__editable")?.innerHTML || "";
    if (pageHtml && !$("#gua-definition").textContent.trim()) $("#gua-definition").innerHTML = pageHtml;
    counters();
  };

  const fillAll = async () => {
    const name = $("#gua-name").value.trim();
    const definition = editorSourceHtml();
    if (!name) return toast("Enter a term name first", "warning");
    if (!definition || !$("#gua-definition").textContent.trim()) return toast("Add a definition first", "warning");

    const slug = $("#gua-slug").value.trim() || slugify(name);
    dispatchValue($('input[name="name"]'), name);
    dispatchValue($('input[name="slug"]'), slug);
    dispatchValue($('select[name="glossary_category_id"]'), $("#gua-category").value);
    dispatchValue($('input[name="meta_title"]'), $("#gua-meta-title").value.trim());
    dispatchValue($('textarea[name="meta_description"]'), $("#gua-meta-description").value.trim());
    setCkEditorData(definition);

    const stats = getStats();
    stats.terms += 1;
    stats.definitions += 1;
    saveStats(stats);

    let faqCount = 0;
    if ($("#gua-faqs").value.trim()) faqCount = await fillFaqs($("#gua-faqs").value, true);
    $("#gua-slug").value = slug;
    toast(`Glossary content filled${faqCount ? ` with ${faqCount} FAQs` : ""}`);
    refreshStatus();
  };

  const clearContent = () => {
    ["#gua-name", "#gua-slug", "#gua-meta-title", "#gua-meta-description"].forEach((selector) => {
      const element = $(selector);
      if (element) element.value = "";
    });
    $("#gua-category").value = "";
    $("#gua-definition").innerHTML = "";
    delete $("#gua-slug").dataset.edited;
    counters();
  };

  const bindEvents = (panel) => {
    $("#gua-close").addEventListener("click", () => (panel.style.display = "none"));
    $("#gua-theme").addEventListener("click", () => {
      panel.dataset.theme = panel.dataset.theme === "light" ? "dark" : "light";
      localStorage.setItem(THEME_KEY, panel.dataset.theme);
      updateThemeIcon();
    });
    window.addEventListener("storage", (event) => {
      if (event.key !== THEME_KEY) return;
      panel.dataset.theme = detectTheme();
      updateThemeIcon();
    });

    const themeObserver = new MutationObserver(() => {
      const detectedTheme = detectTheme();
      if (panel.dataset.theme !== detectedTheme) {
        panel.dataset.theme = detectedTheme;
        updateThemeIcon();
      }
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "data-bs-theme"],
    });
    if (document.body) {
      themeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ["class", "data-theme", "data-bs-theme"],
      });
    }

    const systemTheme = window.matchMedia?.("(prefers-color-scheme: dark)");
    systemTheme?.addEventListener?.("change", () => {
      if (localStorage.getItem(THEME_KEY)) return;
      panel.dataset.theme = detectTheme();
      updateThemeIcon();
    });

    $$(".gua-tab", panel).forEach((tab) => {
      tab.addEventListener("click", () => {
        $$(".gua-tab", panel).forEach((item) => item.classList.toggle("active", item === tab));
        $$(".gua-page", panel).forEach((page) => page.classList.toggle("active", page.dataset.tab === tab.dataset.tab));
        const config = getConfig();
        config.activeTab = tab.dataset.tab;
        saveConfig(config);
        if (tab.dataset.tab === "status") refreshStatus();
      });
    });

    $("#gua-name").addEventListener("input", () => {
      if (!$("#gua-slug").dataset.edited) $("#gua-slug").value = slugify($("#gua-name").value);
    });
    $("#gua-slug").addEventListener("input", () => ($("#gua-slug").dataset.edited = "true"));
    $("#gua-make-slug").addEventListener("click", () => {
      $("#gua-slug").value = slugify($("#gua-name").value);
      delete $("#gua-slug").dataset.edited;
    });
    ["#gua-meta-title", "#gua-meta-description", "#gua-definition"].forEach((selector) => $(selector).addEventListener("input", counters));
    $("#gua-fill-all").addEventListener("click", fillAll);
    $("#gua-clear-content").addEventListener("click", clearContent);
    $("#gua-fill-faqs").addEventListener("click", async () => {
      const count = await fillFaqs($("#gua-faqs").value);
      if (count) $("#gua-faqs").value = "";
    });
    $("#gua-reset-stats").addEventListener("click", () => {
      if (!confirm("Reset all glossary assistant stats?")) return;
      saveStats({ terms: 0, definitions: 0, faqs: 0 });
      toast("Stats reset");
    });

    document.addEventListener("keydown", (event) => {
      if (event.altKey && event.key.toLowerCase() === SHORTCUT_KEY) {
        event.preventDefault();
        const opening = panel.style.display !== "block";
        panel.style.display = opening ? "block" : "none";
        if (opening) {
          syncPanelFromPage();
          refreshStatus();
          updateStats();
        }
      }
    });

    let refreshTimer;
    const delayedRefresh = (event) => {
      if (event?.target?.closest?.("#gua-panel")) return;
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(refreshStatus, 200);
    };
    document.addEventListener("input", delayedRefresh, true);
    document.addEventListener("change", delayedRefresh, true);
    const observer = new MutationObserver(delayedRefresh);
    const watched = $("form") || document.body;
    observer.observe(watched, { childList: true, subtree: true, characterData: true });

    const pageCategory = $('select[name="glossary_category_id"]');
    if (pageCategory) {
      const categoryObserver = new MutationObserver(refreshCategoryOptions);
      categoryObserver.observe(pageCategory, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    // Keep the submitted hidden value synchronized even if CKEditor was not exposed globally.
    const glossaryForm = $("form");
    glossaryForm?.addEventListener(
      "submit",
      () => {
        const editable = $(".ck-editor__editable[contenteditable='true']");
        const hidden = $('input[name="definition"], #description');
        if (editable && hidden) hidden.value = cleanHtml(editable.innerHTML);
      },
      true,
    );
    glossaryForm?.addEventListener("formdata", (event) => {
      const editable = $(".ck-editor__editable[contenteditable='true']");
      if (editable) event.formData.set("definition", cleanHtml(editable.innerHTML));
    });

    const active = getConfig().activeTab;
    $(`.gua-tab[data-tab="${active}"]`, panel)?.click();
  };

  const init = () => {
    if ($("#gua-panel") || !$('form[action*="/admin/glossary/term/"]')) return;
    injectStyles();
    const panel = buildPanel();
    bindEvents(panel);
    counters();
    updateStats();
    refreshStatus();
    console.log("[PCB Glossary Upload Assistant v1.0.0] Ready — Alt+Q to toggle");
    toast("Glossary Assistant ready — Alt+Q to open");
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 900));
  } else {
    setTimeout(init, 900);
  }
})();
