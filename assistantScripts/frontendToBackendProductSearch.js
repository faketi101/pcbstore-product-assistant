// ==UserScript==
// @name         PCB Frontend Admin Search + Specs Copy
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Open backend product search in a new tab and copy full frontend technical specs with product name.
// @author       faketi101
// @match        https://pcbstore.com.bd/product/*
// @match        https://www.pcbstore.com.bd/product/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  const BACKEND_PRODUCTS_URL = "https://admin.pcbstore.net/admin/products";
  const SHORTCUT_KEY = "i"; // Alt+I
  const ADMIN_BUTTON_ID = "pcb-admin-search-btn";
  const COPY_BUTTON_ID = "pcb-copy-specs-btn";
  const BUTTON_WRAP_ID = "pcb-admin-tools-wrap";
  const TOAST_WRAP_ID = "pcb-admin-tools-toast-wrap";

  const normalizeText = (value) => value.replace(/\s+/g, " ").trim();

  const getProductNameFromDom = () => {
    const preferred = document.querySelector("h1");
    if (preferred?.textContent?.trim()) {
      return normalizeText(preferred.textContent);
    }

    const fallbackByTitle = document.querySelector("span[title]");
    if (fallbackByTitle?.getAttribute("title")?.trim()) {
      return normalizeText(fallbackByTitle.getAttribute("title"));
    }

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle?.content?.trim()) {
      return normalizeText(ogTitle.content);
    }

    return "";
  };

  const encodeSearchTerm = (term) =>
    encodeURIComponent(term).replace(/%20/g, "+");

  const buildBackendSearchUrl = (productName) =>
    `${BACKEND_PRODUCTS_URL}?search=${encodeSearchTerm(productName)}`;

  const ensureToastWrap = () => {
    let wrap = document.getElementById(TOAST_WRAP_ID);
    if (wrap) return wrap;

    wrap = document.createElement("div");
    wrap.id = TOAST_WRAP_ID;
    wrap.style.setProperty("position", "fixed", "important");
    wrap.style.setProperty("right", "16px", "important");
    wrap.style.setProperty("top", "136px", "important");
    wrap.style.setProperty("z-index", "2147483647", "important");
    wrap.style.setProperty("display", "flex", "important");
    wrap.style.setProperty("flex-direction", "column", "important");
    wrap.style.setProperty("gap", "8px", "important");
    wrap.style.setProperty("max-width", "340px", "important");
    wrap.style.setProperty("pointer-events", "none", "important");
    (document.body || document.documentElement).appendChild(wrap);
    return wrap;
  };

  const showToast = (message, type = "info") => {
    const wrap = ensureToastWrap();
    const toast = document.createElement("div");
    const colors = {
      success: { bg: "#065f46", border: "#10b981" },
      error: { bg: "#7f1d1d", border: "#ef4444" },
      info: { bg: "#1e3a8a", border: "#60a5fa" },
    };
    const theme = colors[type] || colors.info;

    toast.textContent = message;
    toast.style.setProperty("background", theme.bg, "important");
    toast.style.setProperty("border", `1px solid ${theme.border}`, "important");
    toast.style.setProperty("color", "#ffffff", "important");
    toast.style.setProperty("padding", "10px 12px", "important");
    toast.style.setProperty("border-radius", "10px", "important");
    toast.style.setProperty("font-family", "Segoe UI, Arial, sans-serif", "important");
    toast.style.setProperty("font-size", "12px", "important");
    toast.style.setProperty("font-weight", "600", "important");
    toast.style.setProperty("box-shadow", "0 10px 24px rgba(0,0,0,0.35)", "important");
    toast.style.setProperty("opacity", "0", "important");
    toast.style.setProperty("transform", "translateY(-4px)", "important");
    toast.style.setProperty("transition", "opacity 180ms ease, transform 180ms ease", "important");

    wrap.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-4px)";
      setTimeout(() => toast.remove(), 220);
    }, 2400);
  };

  const collectSpecsText = () => {
    const productName = getProductNameFromDom();
    const technicalHeading = Array.from(document.querySelectorAll("h2")).find(
      (el) => normalizeText(el.textContent || "").toLowerCase() === "technical specifications",
    );

    if (!productName || !technicalHeading) {
      return "";
    }

    const lines = [productName, "", "Technical Specifications", ""];
    let sectionNode = technicalHeading.parentElement;
    if (sectionNode?.parentElement) {
      sectionNode = sectionNode.parentElement;
    }

    const sectionBlocks = sectionNode
      ? Array.from(sectionNode.querySelectorAll("h3"))
      : [];

    if (!sectionBlocks.length) {
      const rows = sectionNode
        ? Array.from(sectionNode.querySelectorAll("tr"))
        : [];
      rows.forEach((row) => {
        const key = normalizeText(row.querySelector("td:first-child")?.textContent || "");
        const value = normalizeText(row.querySelector("td:nth-child(2)")?.textContent || "");
        if (key && value) {
          lines.push(`${key}: ${value}`);
        }
      });
      return lines.join("\n").trim();
    }

    sectionBlocks.forEach((h3, index) => {
      const heading = normalizeText(h3.textContent || "");
      if (heading) {
        lines.push(heading);
      }

      let node = h3.nextElementSibling;
      while (node && node.tagName !== "H3") {
        if (node.tagName === "TR") {
          const key = normalizeText(node.querySelector("td:first-child")?.textContent || "");
          const value = normalizeText(node.querySelector("td:nth-child(2)")?.textContent || "");
          if (key && value) {
            lines.push(`${key}: ${value}`);
          }
        }
        node = node.nextElementSibling;
      }

      if (index < sectionBlocks.length - 1) {
        lines.push("");
      }
    });

    return lines.join("\n").trim();
  };

  const copySpecsToClipboard = async () => {
    const text = collectSpecsText();
    if (!text) {
      showToast("Could not detect technical specifications on this page.", "error");
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "true");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      showToast("Specs copied with product name.", "success");
    } catch {
      showToast("Copy failed. Please try again.", "error");
    }
  };

  const redirectToBackendSearch = () => {
    const productName = getProductNameFromDom();
    if (!productName) {
      showToast("Could not detect product name on this page.", "error");
      return;
    }

    const targetUrl = buildBackendSearchUrl(productName);

    window.open(targetUrl, "_blank", "noopener");
  };

  const applyButtonStyle = (button, backgroundColor) => {
    button.style.setProperty("display", "inline-flex", "important");
    button.style.setProperty("align-items", "center", "important");
    button.style.setProperty("justify-content", "center", "important");
    button.style.setProperty("visibility", "visible", "important");
    button.style.setProperty("opacity", "1", "important");
    button.style.setProperty("pointer-events", "auto", "important");
    button.style.setProperty("border", "none", "important");
    button.style.setProperty("border-radius", "999px", "important");
    button.style.setProperty("padding", "10px 14px", "important");
    button.style.setProperty("background", backgroundColor, "important");
    button.style.setProperty("color", "#ffffff", "important");
    button.style.setProperty("font-size", "13px", "important");
    button.style.setProperty("font-weight", "700", "important");
    button.style.setProperty("line-height", "1.2", "important");
    button.style.setProperty("cursor", "pointer", "important");
    button.style.setProperty("box-shadow", "0 8px 22px rgba(0,0,0,0.35)", "important");
    button.style.setProperty("font-family", "Segoe UI, Arial, sans-serif", "important");
    button.style.setProperty("white-space", "nowrap", "important");
  };

  const createActionButtons = () => {
    const existingAdmin = document.getElementById(ADMIN_BUTTON_ID);
    const existingCopy = document.getElementById(COPY_BUTTON_ID);
    if (existingAdmin && existingCopy) return;

    let wrap = document.getElementById(BUTTON_WRAP_ID);
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = BUTTON_WRAP_ID;
      wrap.style.setProperty("position", "fixed", "important");
      wrap.style.setProperty("right", "16px", "important");
      wrap.style.setProperty("top", "88px", "important");
      wrap.style.setProperty("z-index", "2147483647", "important");
      wrap.style.setProperty("display", "flex", "important");
      wrap.style.setProperty("gap", "8px", "important");
      wrap.style.setProperty("align-items", "center", "important");
      (document.body || document.documentElement).appendChild(wrap);
    }

    if (!existingAdmin) {
      const adminButton = document.createElement("button");
      adminButton.id = ADMIN_BUTTON_ID;
      adminButton.textContent = "Admin Search";
      adminButton.title = "Go to backend product search (Alt+I)";
      applyButtonStyle(adminButton, "#e11d48");

      adminButton.addEventListener("mouseenter", () => {
        adminButton.style.background = "#be123c";
      });

      adminButton.addEventListener("mouseleave", () => {
        adminButton.style.background = "#e11d48";
      });

      adminButton.addEventListener("click", () => {
        redirectToBackendSearch();
      });

      wrap.appendChild(adminButton);
    }

    if (!existingCopy) {
      const copyButton = document.createElement("button");
      copyButton.id = COPY_BUTTON_ID;
      copyButton.textContent = "Copy Specs";
      copyButton.title = "Copy full technical specs with product name";
      applyButtonStyle(copyButton, "#0f766e");

      copyButton.addEventListener("mouseenter", () => {
        copyButton.style.background = "#115e59";
      });

      copyButton.addEventListener("mouseleave", () => {
        copyButton.style.background = "#0f766e";
      });

      copyButton.addEventListener("click", () => {
        copySpecsToClipboard();
      });

      wrap.appendChild(copyButton);
    }
  };

  const bindShortcut = () => {
    document.addEventListener("keydown", (event) => {
      if (event.altKey && !event.shiftKey && !event.ctrlKey) {
        if (event.key.toLowerCase() === SHORTCUT_KEY) {
          event.preventDefault();
          redirectToBackendSearch();
        }
      }
    });
  };

  const init = () => {
    createActionButtons();
    bindShortcut();

    // Keep button alive on SPA transitions or DOM rewrites.
    setInterval(createActionButtons, 1500);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
