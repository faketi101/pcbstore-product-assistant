// ==UserScript==
// @name         Click Word → Insert Internal Link (Scoped)
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Double-click a word to turn it into an internal link (Only in specificationEditor)
// @author       faketi101
// @match        https://admin.pcbstore.net/admin/product/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // We still listen on document to handle cases where the div might be
  // loaded dynamically, but we filter the target immediately.
  document.addEventListener("dblclick", function (event) {
    // 1. Check if the double-click happened inside the specific ID
    const editor = event.target.closest("#specificationEditor");
    if (!editor) return;

    let selection = window.getSelection();
    let selectedText = selection.toString().trim();

    // 2. Ignore empty selections
    if (!selectedText) return;

    let url = prompt("Enter your internal link URL:", "/your-internal-link");

    if (!url) return;

    let range = selection.getRangeAt(0);

    // 3. Create the link element
    let link = document.createElement("a");
    link.href = url;
    link.textContent = selectedText;
    link.style.color = "#0073e6";
    link.style.textDecoration = "underline"; // Added for visual clarity

    // 4. Replace the text with the link
    range.deleteContents();
    range.insertNode(link);

    // Clear the selection after insertion
    selection.removeAllRanges();
  });
})();
