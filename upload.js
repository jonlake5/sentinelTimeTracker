// ==UserScript==
// @name         ServiceNow Time Entry Automation
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Automate time entry from CSV data into ServiceNow
// @author       You
// @match        https://*.service-now.com/*
// @match        https://*.servicenow.com/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  let timeEntries = [];
  let currentIndex = 0;
  let isProcessing = false;

  // Create the control panel UI
  function createControlPanel() {
    const panel = document.createElement("div");
    panel.id = "timeEntryPanel";
    panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 350px;
            background: #f8f9fa;
            border: 2px solid #007bff;
            border-radius: 8px;
            padding: 15px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        `;

    panel.innerHTML = `
            <div style="margin-bottom: 10px;">
                <strong>ServiceNow Time Entry Automation</strong>
                <button id="togglePanel" style="float: right; font-size: 10px;">−</button>
            </div>
            <div id="panelContent">
                <textarea id="csvData" placeholder="Paste your CSV data here..." 
                          style="width: 100%; height: 100px; margin-bottom: 10px; font-size: 11px;"></textarea>
                <div style="margin-bottom: 10px;">
                    <button id="parseData" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Parse Data</button>
                    <span id="dataStatus" style="margin-left: 10px; font-weight: bold;"></span>
                </div>
                <div id="entryControls" style="display: none;">
                    <div style="margin-bottom: 10px;">
                        <span>Entry: </span>
                        <span id="currentEntry">0</span>
                        <span> of </span>
                        <span id="totalEntries">0</span>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <button id="newEntry" style="background: #17a2b8; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">New Entry</button>
                        <button id="processEntry" style="background: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Fill Form</button>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <button id="saveEntry" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Save Entry</button>
                        <button id="processAll" style="background: #fd7e14; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Process All</button>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <button id="prevEntry" style="background: #6c757d; color: white; border: none; padding: 3px 8px; border-radius: 4px; cursor: pointer;">‹ Prev</button>
                        <button id="nextEntry" style="background: #6c757d; color: white; border: none; padding: 3px 8px; border-radius: 4px; cursor: pointer;">Next ›</button>
                    </div>
                    <div id="currentEntryPreview" style="background: #e9ecef; padding: 8px; border-radius: 4px; font-size: 10px; max-height: 100px; overflow-y: auto;"></div>
                </div>
                <div id="processingStatus" style="margin-top: 10px; padding: 8px; border-radius: 4px; display: none;"></div>
            </div>
        `;

    document.body.appendChild(panel);
    setupEventListeners();
  }

  // Setup event listeners for the control panel
  function setupEventListeners() {
    document.getElementById("togglePanel").addEventListener("click", () => {
      const content = document.getElementById("panelContent");
      const toggle = document.getElementById("togglePanel");
      if (content.style.display === "none") {
        content.style.display = "block";
        toggle.textContent = "−";
      } else {
        content.style.display = "none";
        toggle.textContent = "+";
      }
    });

    document
      .getElementById("parseData")
      .addEventListener("click", parseCSVData);
    document
      .getElementById("newEntry")
      .addEventListener("click", clickNewEntry);
    document
      .getElementById("processEntry")
      .addEventListener("click", () => processEntry(currentIndex));
    document
      .getElementById("saveEntry")
      .addEventListener("click", clickSaveEntry);
    document
      .getElementById("processAll")
      .addEventListener("click", processAllEntries);
    document
      .getElementById("prevEntry")
      .addEventListener("click", () => navigateEntry(-1));
    document
      .getElementById("nextEntry")
      .addEventListener("click", () => navigateEntry(1));
  }

  // The rest of your functions go here (parseCSVData, parseCSVLine, navigateEntry, updateEntryPreview, processEntry, etc.)
  // Make sure each function is properly indented like above.

  // Initialize the script when page loads
  function init() {
    if (
      window.location.href.includes("service-now.com") ||
      window.location.href.includes("servicenow.com")
    ) {
      setTimeout(createControlPanel, 2000);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
