// Run this in your browser console to clear the cached form data

// Clear localStorage
localStorage.removeItem("pcb_automation_report_form");

// Also clear all pcb-related items
Object.keys(localStorage).forEach((key) => {
  if (key.includes("pcb")) {
    localStorage.removeItem(key);
    console.log("Removed:", key);
  }
});

console.log("✅ LocalStorage cleared! Please refresh the page.");
