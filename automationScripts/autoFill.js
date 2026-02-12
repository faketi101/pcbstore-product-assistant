// ==UserScript==
// @name         PCB Product Data Auto-Filler (FAQ and Specification Table)
// @namespace    http://tampermonkey.net/
// @version      2.4
// @description  Bulk import FAQ and Specifications using strict sibling traversal
// @author       faketi101
// @match        https://admin.pcbstore.net/admin/product/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const SHORTCUT_KEY = "q";

  // --- Counter State Management ---
  const getStats = () => {
    const defaultStats = {
      faqs: 0,
      specGroups: 0,
      specItems: 0,
      warranties: 0,
    };
    const saved = localStorage.getItem("pcb_stats");
    return saved ? JSON.parse(saved) : defaultStats;
  };

  const saveStats = (stats) => {
    localStorage.setItem("pcb_stats", JSON.stringify(stats));
    updateUI();
  };

  // --- UI Setup ---
  const container = document.createElement("div");
  container.style =
    "position: fixed; top: 20px; right: 20px; z-index: 9999; background: white; padding: 15px; border: 2px solid #333; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); display: none; width: 450px; font-family: sans-serif; max-height: 90vh; overflow-y: auto;";

  container.innerHTML = `
        <h4 style="margin:0 0 10px 0">Bulk Data Importer</h4>

        <label style="font-weight:bold; display:block; margin-bottom:5px;">FAQ Input</label>
        <textarea id="faq-raw-input" placeholder="Question?\nAnswer line..." style="width: 100%; height: 80px; margin-bottom: 10px; padding: 5px; box-sizing: border-box;"></textarea>
        <button id="faq-submit-btn" style="background: #28a745; color: white; border: none; padding: 8px 15px; cursor: pointer; border-radius: 4px; width:100%; margin-bottom:15px;">Fill FAQs</button>

        <hr>

        <label style="font-weight:bold; display:block; margin:10px 0 5px 0;">Specification Table (Tab Separated)</label>
        <textarea id="spec-raw-input" placeholder="General\nBrand\tLogitech\nModel\tG502" style="width: 100%; height: 120px; margin-bottom: 10px; padding: 5px; box-sizing: border-box;"></textarea>
        <button id="spec-submit-btn" style="background: #007bff; color: white; border: none; padding: 8px 15px; cursor: pointer; border-radius: 4px; width:100%; margin-bottom:15px;">Fill Specifications</button>

        <hr>

        <label style="font-weight:bold; display:block; margin:10px 0 5px 0;">Warranty Claims Search</label>
        <div style="display: flex; gap: 5px; margin-bottom: 10px;">
            <input type="text" id="warranty-keyword-input" placeholder="e.g. Laptop, RAM..." style="flex-grow: 1; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">
            <button id="warranty-select-btn" style="background: #17a2b8; color: white; border: none; padding: 5px 12px; cursor: pointer; border-radius: 4px;">Select</button>
            <button id="warranty-clear-btn" style="background: #6c757d; color: white; border: none; padding: 5px 12px; cursor: pointer; border-radius: 4px;">Clear All</button>
        </div>

        <div style="margin-top: 15px; text-align: right; border-top: 1px solid #eee; padding-top: 10px;">
            <button id="faq-close-btn" style="background: #dc3545; color: white; border: none; padding: 8px 20px; cursor: pointer; border-radius: 4px; font-weight: bold;">Close</button>
        </div>

              <div id="stats-panel" style="background: #f4f4f4; padding: 10px; border-radius: 5px; margin-bottom: 15px; font-size: 13px; border: 1px solid #ddd;">
            <div style="display:grid; grid-template-columns: 1fr auto; gap: 5px; align-items: center;">
                <span>FAQs: <b id="stat-faq">0</b></span> <button class="reset-small" data-type="faqs">Reset</button>
                <span>Spec Groups: <b id="stat-groups">0</b></span> <button class="reset-small" data-type="specGroups">Reset</button>
                <span>Spec Items: <b id="stat-items">0</b></span> <button class="reset-small" data-type="specItems">Reset</button>
                <span>Warranty Chips: <b id="stat-warranty">0</b></span> <button class="reset-small" data-type="warranties">Reset</button>
            </div>
            <div style="margin-top:10px; display:flex; gap:5px;">
                <button id="copy-stats-btn" style="flex:1; background:#6f42c1; color:white; border:none; padding:5px; border-radius:3px; cursor:pointer;">Copy Stats</button>
                <button id="reset-all-stats" style="flex:1; background:#e83e8c; color:white; border:none; padding:5px; border-radius:3px; cursor:pointer;">Reset All</button>
            </div>
        </div>

    `;
  document.body.appendChild(container);

  // CSS for the reset buttons
  const style = document.createElement("style");
  style.innerHTML = `
        .reset-small { background: #eee; border: 1px solid #ccc; padding: 2px 5px; font-size: 10px; cursor: pointer; border-radius: 3px; }
        .reset-small:hover { background: #ddd; }
    `;
  document.head.appendChild(style);

  const updateUI = () => {
    const stats = getStats();
    document.getElementById("stat-faq").innerText = stats.faqs;
    document.getElementById("stat-groups").innerText = stats.specGroups;
    document.getElementById("stat-items").innerText = stats.specItems;
    document.getElementById("stat-warranty").innerText = stats.warranties;
  };

  const togglePopup = () => {
    container.style.display =
      container.style.display === "none" ? "block" : "none";
    if (container.style.display === "block") updateUI();
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // --- Warranty Logic ---
  function processWarranty() {
    const input = document.getElementById("warranty-keyword-input");
    const keyword = input.value.trim().toLowerCase();
    if (!keyword) return;

    const $selectElement = $('select[name="warranty_claims[]"]');
    if ($selectElement.length === 0)
      return alert("Warranty dropdown not found!");

    let currentSelection = $selectElement.val() || [];
    let matchCount = 0;

    $selectElement.find("option").each(function () {
      const text = $(this).text().toLowerCase();
      const val = $(this).val();
      // Match based on category prefix (before the colon)
      if (val && text.split(":")[0].trim() === keyword) {
        if (!currentSelection.includes(val)) {
          currentSelection.push(val);
          matchCount++;
        }
      }
    });

    if (matchCount > 0) {
      $selectElement.val(currentSelection).trigger("change");

      // Update Stats
      const stats = getStats();
      stats.warranties += matchCount;
      saveStats(stats);

      alert(`Success: Added ${matchCount} items matching "${keyword}"`);
      input.value = "";
    } else {
      alert(`No new items found for "${keyword}"`);
    }
  }

  // --- Fill Functions ---
  async function processFAQOld() {
    const rawTextInput = document.getElementById("faq-raw-input");
    const faqs = generateFAQ(rawTextInput.value);
    if (faqs.length === 0) return alert("No valid FAQs found");

    const addFaqBtn = document.querySelector(
      "div.mb-3:nth-child(2) > div:nth-child(1) > div:nth-child(1) > h5:nth-child(1) > button:nth-child(1)",
    );

    for (let i = 0; i < faqs.length; i++) {
      const index = i + 1;
      let qInput = document.querySelector(
        `div.faqRow:nth-child(${index}) > div:nth-child(1) > div:nth-child(1) > input`,
      );
      let aInput = document.querySelector(
        `div.faqRow:nth-child(${index}) > div:nth-child(2) > div:nth-child(1) > input`,
      );

      if (qInput && aInput) {
        qInput.value = faqs[i].question;
        aInput.value = faqs[i].answer;
        [qInput, aInput].forEach((el) =>
          el.dispatchEvent(new Event("input", { bubbles: true })),
        );
      }
      if (index < faqs.length) {
        if (addFaqBtn) addFaqBtn.click();
        await sleep(250);
      }
    }

    // Update Stats
    const stats = getStats();
    stats.faqs += faqs.length;
    saveStats(stats);

    alert("FAQ Added");
    rawTextInput.value = "";
  }

  async function processFAQ() {
    const rawTextInput = document.getElementById("faq-raw-input");
    const faqs = generateFAQ(rawTextInput.value);
    if (faqs.length === 0) return alert("No valid FAQs found");

    // Refined button selector; falls back to your original path if needed
    const addFaqBtn =
      document.querySelector("button[onclick*='addFaq']") ||
      document.querySelector(
        "div.mb-3:nth-child(2) > div:nth-child(1) > div:nth-child(1) > h5:nth-child(1) > button:nth-child(1)",
      );

    for (let i = 0; i < faqs.length; i++) {
      // 1. Fetch rows inside the loop so it sees newly added ones
      let rows = document.querySelectorAll(".faqRow");

      // 2. If we need a new row, click 'Add' and wait for it to appear
      if (i >= rows.length) {
        if (addFaqBtn) {
          addFaqBtn.click();
          await sleep(400); // Buffer for DOM rendering
          rows = document.querySelectorAll(".faqRow");
        }
      }

      const currentRow = rows[i];
      if (currentRow) {
        // 3. FIX: Select by name attribute instead of child index
        const qInput = currentRow.querySelector('input[name="question[]"]');
        const aInput = currentRow.querySelector('input[name="answer[]"]');

        if (qInput && aInput) {
          qInput.value = faqs[i].question;
          aInput.value = faqs[i].answer;

          // 4. Trigger both 'input' and 'change' for better framework compatibility
          [qInput, aInput].forEach((el) => {
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
          });
        }
      }
    }

    // Update Stats
    const stats = getStats();
    stats.faqs += faqs.length;
    saveStats(stats);

    alert(`${faqs.length} FAQs successfully added.`);
    rawTextInput.value = "";
  }

  async function processSpecsOld() {
    const rawTextInput = document.getElementById("spec-raw-input");
    const specs = generateSpecificationTable(rawTextInput.value);
    if (specs.length === 0) return alert("No valid Specs found");

    const addGroupBtn = document.querySelector("button.btn-secondary");
    let currentGroupIdx = 0;
    let fieldIdxInGroup = 0;
    let lastGroupName = "";
    let groupCount = 0;

    for (let i = 0; i < specs.length; i++) {
      const item = specs[i];
      if (item.groupName !== lastGroupName) {
        currentGroupIdx++;
        groupCount++;
        fieldIdxInGroup = 1;
        lastGroupName = item.groupName;
        if (currentGroupIdx > 1) {
          if (addGroupBtn) addGroupBtn.click();
          await sleep(500);
        }
        let groupEl = document.querySelector(
          `div.specGroup:nth-child(${currentGroupIdx})`,
        );
        if (groupEl) {
          let groupNameInput = groupEl.querySelector(
            "div:nth-child(1) > div:nth-child(1) > input:nth-child(2)",
          );
          if (groupNameInput) {
            groupNameInput.value = item.groupName;
            groupNameInput.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }
      } else {
        fieldIdxInGroup++;
        let groupEl = document.querySelector(
          `div.specGroup:nth-child(${currentGroupIdx})`,
        );
        if (groupEl) {
          let addFieldBtn = groupEl.querySelector(
            "button.btn-success, button.btn-primary, div:nth-child(3) > button",
          );
          if (addFieldBtn) {
            addFieldBtn.click();
            await sleep(350);
          }
        }
      }
      let groupEl = document.querySelector(
        `div.specGroup:nth-child(${currentGroupIdx})`,
      );
      if (groupEl) {
        let fieldsContainer = groupEl.querySelector(
          "div:nth-child(1) > div:nth-child(2)",
        );
        if (
          fieldsContainer &&
          fieldsContainer.children.length >= fieldIdxInGroup
        ) {
          let targetRow = fieldsContainer.children[fieldIdxInGroup - 1];
          if (targetRow) {
            let nameInput = targetRow.querySelectorAll("input")[0];
            let titleInput = targetRow.querySelectorAll("input")[1];
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
    }

    // Update Stats
    const stats = getStats();
    stats.specGroups += groupCount;
    stats.specItems += specs.length;
    saveStats(stats);

    alert("Specification Import Complete!");
    rawTextInput.value = "";
  }

  async function processSpecs() {
    const rawTextInput = document.getElementById("spec-raw-input");
    const specs = generateSpecificationTable(rawTextInput.value);
    if (specs.length === 0) return alert("No valid Specs found");

    const addGroupBtn = document.querySelector("button.btn-secondary");
    let currentGroupIdx = -1;
    let lastGroupName = "";
    let groupCount = 0;

    for (let i = 0; i < specs.length; i++) {
      const item = specs[i];

      // 1. Check if we need to start a NEW Group
      if (item.groupName !== lastGroupName) {
        currentGroupIdx++;
        groupCount++;
        lastGroupName = item.groupName;

        // Click "Add Group" if it's not the first one
        if (currentGroupIdx > 0) {
          if (addGroupBtn) addGroupBtn.click();
          await sleep(500);
        }

        // Find the group we just added/targeted
        let groups = document.querySelectorAll(".specGroup");
        let groupEl = groups[currentGroupIdx];

        if (groupEl) {
          // FIX: Target the group name input by its partial name attribute
          let groupNameInput = groupEl.querySelector(
            'input[name*="[group_name]"]',
          );
          if (groupNameInput) {
            groupNameInput.value = item.groupName;
            groupNameInput.dispatchEvent(new Event("input", { bubbles: true }));
            groupNameInput.dispatchEvent(
              new Event("change", { bubbles: true }),
            );
          }
        }
      }

      // 2. Target the current Group and add the Item
      let groups = document.querySelectorAll(".specGroup");
      let groupEl = groups[currentGroupIdx];

      if (groupEl) {
        // Check current rows in this group
        let rows = groupEl.querySelectorAll(".specRow");

        // If we need a new row for this item, click "Add Field"
        // (Note: Usually the first row exists by default in a new group)
        if (
          rows.length === 0 ||
          (i > 0 && specs[i].groupName === specs[i - 1].groupName)
        ) {
          // We only click 'Add' if we aren't on the very first row of a freshly created group
          let addFieldBtn = groupEl.querySelector(
            "button.btn-success, button.btn-primary",
          );
          if (addFieldBtn) {
            addFieldBtn.click();
            await sleep(350);
            rows = groupEl.querySelectorAll(".specRow"); // Refresh row list
          }
        }

        // Fill the last available row in this group
        let targetRow = rows[rows.length - 1];
        if (targetRow) {
          // Use broad attribute selectors for Name and Value/Title
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

    // Update Stats
    const stats = getStats();
    stats.specGroups += groupCount;
    stats.specItems += specs.length;
    saveStats(stats);

    alert("Specification Import Complete!");
    rawTextInput.value = "";
  }

  // --- Parsing Functions ---
  function generateFAQ(rawText) {
    const lines = rawText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const faqArray = [];
    let currentQuestion = null;
    lines.forEach((line) => {
      if (line.endsWith("?")) {
        currentQuestion = line;
      } else if (currentQuestion) {
        faqArray.push({ question: currentQuestion, answer: line });
        currentQuestion = null;
      }
    });
    return faqArray;
  }

  function generateSpecificationTable(rawText) {
    const lines = rawText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const specTable = [];
    let currentGroup = null;
    lines.forEach((line) => {
      const [col1, col2] = line.split("\t");
      if (
        typeof col2 === "undefined" ||
        col2.toLowerCase() === "details" ||
        col2.toLowerCase() === "—"
      ) {
        currentGroup = col1;
      } else {
        specTable.push({
          groupName: currentGroup || "General",
          name: col1,
          title: col2,
        });
      }
    });
    return specTable;
  }

  // --- UI Event Listeners ---
  document.getElementById("faq-submit-btn").onclick = processFAQ;
  document.getElementById("spec-submit-btn").onclick = processSpecs;
  document.getElementById("warranty-select-btn").onclick = processWarranty;
  document.getElementById("warranty-clear-btn").onclick = () => {
    if (confirm("Clear all selections?"))
      $('select[name="warranty_claims[]"]').val(null).trigger("change");
  };
  document.getElementById("faq-close-btn").onclick = togglePopup;

  // Stats Listeners
  document.querySelectorAll(".reset-small").forEach((btn) => {
    btn.onclick = (e) => {
      const type = e.target.getAttribute("data-type");
      const stats = getStats();
      stats[type] = 0;
      saveStats(stats);
    };
  });

  document.getElementById("reset-all-stats").onclick = () => {
    if (confirm("Reset ALL counters?"))
      saveStats({ faqs: 0, specGroups: 0, specItems: 0, warranties: 0 });
  };

  document.getElementById("copy-stats-btn").onclick = () => {
    const s = getStats();
    const text = `FAQs: ${s.faqs}\nSpec Groups: ${s.specGroups}\nSpec Items: ${s.specItems}\nWarranty Chips: ${s.warranties}`;
    navigator.clipboard
      .writeText(text)
      .then(() => alert("Stats copied to clipboard!"));
  };

  document.getElementById("warranty-keyword-input").onkeydown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      processWarranty();
    }
  };

  window.addEventListener("keydown", (e) => {
    if (e.altKey && e.key.toLowerCase() === SHORTCUT_KEY) togglePopup();
  });

  // Init UI
  updateUI();
})();
