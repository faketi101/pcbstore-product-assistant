// ==UserScript==
// @name         PCB Product Screenshot Capture
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Auto-captures full page screenshot when saving a product. Filename includes product slug + full date & time.
// @author       faketi101
// @match        https://admin.pcbstore.net/admin/product/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // ─── HELPERS ─────────────────────────────────────────────────

  /** Get the product slug from the slug input field */
  const getSlug = () => {
    const slugInput = document.querySelector("input#slug");
    const slug = slugInput?.value?.trim();
    return slug || "unknown-product";
  };

  /** Format current date/time as YYYY-MM-DD_HH-MM-SS */
  const getDateTimeStamp = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const YYYY = now.getFullYear();
    const MM = pad(now.getMonth() + 1);
    const DD = pad(now.getDate());
    const HH = pad(now.getHours());
    const MIN = pad(now.getMinutes());
    const SS = pad(now.getSeconds());
    return `${YYYY}-${MM}-${DD}_${HH}-${MIN}-${SS}`;
  };

  /** Show a brief toast notification */
  const showToast = (msg, color = "#22c55e", duration = 3500) => {
    const existing = document.getElementById("psc-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "psc-toast";
    toast.textContent = msg;
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "28px",
      right: "28px",
      zIndex: "999999",
      background: color,
      color: "#fff",
      padding: "10px 18px",
      borderRadius: "10px",
      fontSize: "13px",
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontWeight: "600",
      boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
      opacity: "1",
      transition: "opacity 0.4s ease",
      pointerEvents: "none",
    });
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 450);
    }, duration);
  };

  // ─── SCREENSHOT CAPTURE ──────────────────────────────────────

  let _capturing = false;

  /**
   * Capture a full-page screenshot and download it.
   * @param {string}        reason  - Label shown in toast (e.g. "Publish", "Manual")
   * @param {Function|null} onDone  - Called after the file has been downloaded (or on error)
   */
  const captureFullScreenshot = async (reason = "", onDone = null) => {
    if (_capturing) {
      showToast("⏳ Screenshot already in progress…", "#f59e0b");
      // Still call onDone so the save isn't blocked forever
      if (onDone) onDone();
      return;
    }
    _capturing = true;

    const slug = getSlug();
    const timestamp = getDateTimeStamp();
    // Use .jpg — dramatically faster to encode than PNG for large pages
    const filename = `${slug}_${timestamp}.jpg`;

    showToast(
      `📸 Capturing${reason ? " (" + reason + ")" : ""}…`,
      "#3b82f6",
      4000,
    );

    const finish = (ok, msg) => {
      _capturing = false;
      if (ok) {
        showToast(`✅ Saved: ${filename}`, "#22c55e", 4000);
        console.log(`[PSC] Screenshot saved → ${filename}`);
      } else {
        showToast(msg || "❌ Screenshot failed", "#ef4444");
      }
      if (onDone) onDone();
    };

    try {
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      window.scrollTo(0, 0);

      const canvas = await html2canvas(document.documentElement, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        removeContainer: true,
        // scale < 1 = biggest speed win; 0.75 cuts pixel count ~44%
        scale: 0.75,
        imageTimeout: 4000,
        scrollX: 0,
        scrollY: 0,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      });

      window.scrollTo(scrollX, scrollY);

      // JPEG (quality 0.88) is 5-10× faster to encode + smaller file than PNG
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            finish(false, "❌ Screenshot failed: empty canvas");
            return;
          }

          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          finish(true);
        },
        "image/jpeg",
        0.88,
      );
    } catch (err) {
      console.error("[PSC] Screenshot error:", err);
      finish(false, "❌ Screenshot failed — check console");
    }
  };

  // ─── AUTO-CAPTURE ON PRODUCT SAVE ───────────────────────────
  // Intercepts clicks on "Save As Draft" and "Save And Publish".
  // Flow: click → block original action → screenshot → auto-fire save.

  const interceptSaveButtons = () => {
    const handleSaveClick = (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;

      const onclickAttr =
        btn.getAttribute("onclick") || btn.dataset.paOrigOnclick || "";
      const text = (btn.textContent || "").trim();

      const isDraft =
        onclickAttr.includes("submitProductForm('draft')") ||
        (text.includes("Draft") && text.includes("Save"));
      const isPublish =
        onclickAttr.includes("submitProductForm('publish')") ||
        (text.includes("Publish") && text.includes("Save"));
      const isFormSubmit =
        btn.type === "submit" &&
        !!btn.closest("form") &&
        !isDraft &&
        !isPublish;

      if (!isDraft && !isPublish && !isFormSubmit) return;

      // ── Block the original click so the form doesn't submit immediately ──
      e.stopImmediatePropagation();
      e.preventDefault();

      const label = isDraft ? "Draft" : isPublish ? "Publish" : "Save";
      const action = isDraft ? "draft" : "publish";

      // ── After screenshot is saved, auto-fire the real form submission ──
      captureFullScreenshot(label, () => {
        try {
          if (isDraft || isPublish) {
            // Call the page's own submit function directly
            // eslint-disable-next-line no-undef
            if (typeof submitProductForm === "function") {
              submitProductForm(action);
            } else {
              // Fallback: restore onclick and re-click
              const origOnclick = btn.dataset.paOrigOnclick;
              if (origOnclick) {
                btn.setAttribute("onclick", origOnclick);
                delete btn.dataset.paOrigOnclick;
              }
              btn.disabled = false;
              btn.style.opacity = "1";
              btn.style.pointerEvents = "auto";
              btn.click();
            }
          } else if (isFormSubmit) {
            btn.closest("form").requestSubmit(btn);
          }
        } catch (err) {
          console.error("[PSC] Post-screenshot form submit error:", err);
          showToast(
            "⚠️ Screenshot done but save failed — submit manually",
            "#f59e0b",
            5000,
          );
        }
      });
    };

    // Capture phase (true) so we intercept before any other listener
    document.addEventListener("click", handleSaveClick, true);
  };

  // ─── FLOATING MANUAL CAPTURE BUTTON ─────────────────────────

  const injectFloatingButton = () => {
    if (document.getElementById("psc-btn")) return;

    const btn = document.createElement("button");
    btn.id = "psc-btn";
    btn.title = "Capture full page screenshot (slug + datetime)";
    btn.innerHTML = `
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8
                 a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
      <span>Screenshot</span>
    `;

    Object.assign(btn.style, {
      position: "fixed",
      bottom: "80px",
      right: "18px",
      zIndex: "99998",
      display: "flex",
      alignItems: "center",
      gap: "7px",
      background: "rgba(10,10,10,0.82)",
      backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)",
      color: "#e5e5e5",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: "12px",
      padding: "8px 14px",
      fontSize: "13px",
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontWeight: "600",
      cursor: "pointer",
      boxShadow: "0 6px 24px rgba(0,0,0,0.45)",
      transition: "background 0.2s, transform 0.1s",
      userSelect: "none",
    });

    btn.addEventListener("mouseenter", () => {
      btn.style.background = "rgba(59,130,246,0.85)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "rgba(10,10,10,0.82)";
    });
    btn.addEventListener("mousedown", () => {
      btn.style.transform = "scale(0.95)";
    });
    btn.addEventListener("mouseup", () => {
      btn.style.transform = "scale(1)";
    });

    btn.addEventListener("click", () => captureFullScreenshot("Manual"));

    document.body.appendChild(btn);
  };

  // ─── INIT ────────────────────────────────────────────────────

  const init = () => {
    try {
      injectFloatingButton();
      interceptSaveButtons();

      console.log(
        "[PCB Product Screenshot v1.1] Ready — click Save to screenshot first, then auto-submit.",
      );
      showToast("📸 Screenshot capture ready", "#3b82f6", 3000);
    } catch (err) {
      console.error("[PSC] Init error:", err);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 1200));
  } else {
    setTimeout(init, 1200);
  }
})();
