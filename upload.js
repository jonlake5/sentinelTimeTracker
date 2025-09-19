// ==UserScript==
// @name         ServiceNow Time Entry Automation - Enhanced
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Enhanced ServiceNow time entry automation with better field detection
// @author       You
// @match        https://sentineld.service-now.com/*
// @match        https://sentinel.service-now.com/*
// @grant        none
// ==/UserScript==

(() => {
  let timeEntries = [];
  let currentIndex = 0;
  let isProcessing = false;

  function findFieldInAllFrames(selectors) {
    console.log(`[v0] Searching for field with selectors:`, selectors);

    // Check main document first
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        if (element && element.offsetParent !== null) {
          console.log(`[v0] Found field in main document: ${selector}`);
          return element;
        }
      }
    }

    // Check all iframes
    const iframes = document.querySelectorAll("iframe");
    console.log(`[v0] Checking ${iframes.length} iframes...`);

    for (let i = 0; i < iframes.length; i++) {
      const iframe = iframes[i];
      try {
        const iframeDoc =
          iframe.contentDocument || iframe.contentWindow.document;
        if (iframeDoc) {
          for (const selector of selectors) {
            const elements = iframeDoc.querySelectorAll(selector);
            for (const element of elements) {
              if (element && element.offsetParent !== null) {
                console.log(`[v0] Found field in iframe ${i}: ${selector}`);
                return element;
              }
            }
          }
        }
      } catch (e) {
        console.log(`[v0] Cannot access iframe ${i}: ${e.message}`);
      }
    }

    return null;
  }

  const fieldSelectors = {
    date: [
      'input[name="x_st_sti_tab_daily_time.workdate"]',
      'input[id="x_st_sti_tab_daily_time.workdate"]',
      'input[name*="workdate"]',
      'input[id*="workdate"]',
      'input[name*="date"]',
      'input[aria-label*="Date"]',
      'input[placeholder*="Date"]',
      '.form-control[data-type="glide_element_date"]',
      'input[data-ref*="workdate"]',
    ],
    showTimeAs: [
      'select[name="x_st_sti_tab_daily_time.showtimeas"]',
      'select[id="x_st_sti_tab_daily_time.showtimeas"]',
      'select[name*="showtimeas"]',
      'select[id*="showtimeas"]',
      'select[name*="show_time"]',
      'select[aria-label*="Show Time"]',
    ],
    location: [
      'select[name="x_st_sti_tab_daily_time.location"]',
      'input[name="x_st_sti_tab_daily_time.location"]',
      'select[id="x_st_sti_tab_daily_time.location"]',
      'input[id="x_st_sti_tab_daily_time.location"]',
      'select[name*="location"]',
      'input[name*="location"]',
      'select[aria-label*="Location"]',
      'input[aria-label*="Location"]',
    ],
    company: [
      'select[name="x_st_sti_tab_daily_time.company"]',
      'input[name="x_st_sti_tab_daily_time.company"]',
      'select[id="x_st_sti_tab_daily_time.company"]',
      'input[id="x_st_sti_tab_daily_time.company"]',
      'select[name*="company"]',
      'input[name*="company"]',
      'select[aria-label*="Company"]',
      'input[aria-label*="Company"]',
    ],
    projectName: [
      'input[name="sys_display.x_st_sti_tab_daily_time.projectnumber"]',
      'input[id="sys_display.x_st_sti_tab_daily_time.projectnumber"]',
      'select[name="x_st_sti_tab_daily_time.projectname"]',
      'input[name="x_st_sti_tab_daily_time.projectname"]',
      'select[id="x_st_sti_tab_daily_time.projectname"]',
      'input[id="x_st_sti_tab_daily_time.projectname"]',
      'select[name*="project"]',
      'input[name*="project"]',
      'select[aria-label*="Project"]',
      'input[aria-label*="Project"]',
      'input[data-dependent="company"]',
      'input[data-type="ac_reference_input"]',
    ],
    projectActivity: [
      'select[name="x_st_sti_tab_daily_time.projectactivity"]',
      'input[name="x_st_sti_tab_daily_time.projectactivity"]',
      'select[id="x_st_sti_tab_daily_time.projectactivity"]',
      'input[id="x_st_sti_tab_daily_time.projectactivity"]',
      'select[name*="activity"]',
      'input[name*="activity"]',
      'select[aria-label*="Activity"]',
      'input[aria-label*="Activity"]',
    ],
    shortDescription: [
      'input[name="x_st_sti_tab_daily_time.shortdescription"]',
      'textarea[name="x_st_sti_tab_daily_time.shortdescription"]',
      'input[id="x_st_sti_tab_daily_time.shortdescription"]',
      'textarea[id="x_st_sti_tab_daily_time.shortdescription"]',
      'input[name*="shortdescription"]',
      'input[name*="short_description"]',
      'input[aria-label*="Short"]',
      'textarea[aria-label*="Short"]',
    ],
    detailedDescription: [
      'textarea[name="x_st_sti_tab_daily_time.detaileddescription"]',
      'input[name="x_st_sti_tab_daily_time.detaileddescription"]',
      'textarea[id="x_st_sti_tab_daily_time.detaileddescription"]',
      'input[id="x_st_sti_tab_daily_time.detaileddescription"]',
      'textarea[name*="detaileddescription"]',
      'textarea[name*="detailed_description"]',
      'textarea[aria-label*="Detail"]',
      'input[aria-label*="Detail"]',
    ],
    startTime: [
      'select[name="x_st_sti_tab_daily_time.regularstart"]',
      'select[id="x_st_sti_tab_daily_time.regularstart"]',
      'input[name="x_st_sti_tab_daily_time.starttime"]',
      'input[id="x_st_sti_tab_daily_time.starttime"]',
      'input[name*="starttime"]',
      'input[name*="start_time"]',
      'select[name*="regularstart"]',
      'input[aria-label*="Start"]',
      'input[placeholder*="Start"]',
    ],
    endTime: [
      'select[name="x_st_sti_tab_daily_time.regularstop"]',
      'select[id="x_st_sti_tab_daily_time.regularstop"]',
      'input[name="x_st_sti_tab_daily_time.endtime"]',
      'input[id="x_st_sti_tab_daily_time.endtime"]',
      'input[name*="endtime"]',
      'input[name*="end_time"]',
      'select[name*="regularstop"]',
      'input[aria-label*="End"]',
      'input[placeholder*="End"]',
    ],
  };

  // Create the control panel UI
  function createControlPanel() {
    if (document.getElementById("timeEntryPanel")) {
      console.log("[v0] Control panel already exists, skipping creation");
      return;
    }

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
                <strong>ServiceNow Time Entry Automation v2.0</strong>
                <button id="togglePanel" style="float: right; font-size: 10px;">−</button>
            </div>
            <div id="panelContent">
                <div style="margin-bottom: 10px;">
                    <button id="scanPage" style="background: #e83e8c; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Scan Page</button>
                    <button id="testFields" style="background: #6f42c1; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Test Fields</button>
                </div>
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
                    <div id="currentEntryPreview" style="background: #e9ecef; padding: 8px; border-radius: 4px; font-size: 10px; max-height: 120px; overflow-y: auto;"></div>
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
      .getElementById("scanPage")
      .addEventListener("click", scanPageForFields);
    document
      .getElementById("testFields")
      .addEventListener("click", testFieldDetection);
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

  // Parse CSV data
  function parseCSVData() {
    const csvText = document.getElementById("csvData").value.trim();
    if (!csvText) {
      updateStatus("Please paste CSV data first.", "error");
      return;
    }

    try {
      const lines = csvText.split("\n").filter((line) => line.trim());
      if (lines.length < 2) {
        updateStatus(
          "CSV must have header and at least one data row.",
          "error"
        );
        return;
      }

      const headers = parseCSVLine(lines[0]);
      timeEntries = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const entry = {};

        headers.forEach((header, index) => {
          // Clean header names and map to our expected format
          const cleanHeader = header.replace(/^\*+/, "").trim();
          entry[cleanHeader] = values[index] ? values[index].trim() : "";
        });

        timeEntries.push(entry);
      }

      currentIndex = 0;
      updateStatus(
        `Parsed ${timeEntries.length} entries successfully.`,
        "success"
      );
      document.getElementById("entryControls").style.display = "block";
      document.getElementById("totalEntries").textContent = timeEntries.length;
      updateEntryPreview();
    } catch (error) {
      updateStatus(`Error parsing CSV: ${error.message}`, "error");
    }
  }

  // Debug function to find form fields
  function debugFormFields() {
    console.log("=== DEBUGGING FORM FIELDS ===");
    updateStatus("Debugging form fields - check console", "info");

    // Log all input, select, and textarea elements
    const inputs = document.querySelectorAll("input, select, textarea");
    console.log(`Found ${inputs.length} form elements:`);

    inputs.forEach((element, index) => {
      const info = {
        index: index,
        tag: element.tagName,
        type: element.type,
        name: element.name,
        id: element.id,
        className: element.className,
        placeholder: element.placeholder,
        ariaLabel: element.getAttribute("aria-label"),
        visible: element.offsetParent !== null,
      };
      console.log(`Element ${index}:`, info);
    });

    // Try to match our field types
    Object.keys(fieldSelectors).forEach((fieldType) => {
      console.log(`\n--- Checking ${fieldType} ---`);
      const element = findField(fieldType);
      if (element) {
        console.log(`✓ Found ${fieldType}:`, {
          tag: element.tagName,
          name: element.name,
          id: element.id,
          className: element.className,
        });
      } else {
        console.log(`✗ NOT FOUND: ${fieldType}`);
        // Try each selector individually
        fieldSelectors[fieldType].forEach((selector) => {
          const matches = document.querySelectorAll(selector);
          if (matches.length > 0) {
            console.log(
              `  Selector "${selector}" found ${matches.length} matches (but may be hidden)`
            );
          }
        });
      }
    });
  }

  function scanPageForFields() {
    console.log("[v0] === ENHANCED PAGE SCAN ===");
    updateStatus("Scanning page for fields...", "info");

    // Scan main document
    console.log("[v0] Scanning main document...");
    const mainInputs = document.querySelectorAll("input, select, textarea");
    console.log(
      `[v0] Found ${mainInputs.length} form elements in main document`
    );

    mainInputs.forEach((element, index) => {
      if (element.offsetParent !== null) {
        console.log(`[v0] Main Element ${index}:`, {
          tag: element.tagName,
          type: element.type,
          name: element.name,
          id: element.id,
          ariaLabel: element.getAttribute("aria-label"),
          placeholder: element.placeholder,
          className: element.className,
          dataRef: element.getAttribute("data-ref"),
          dataType: element.getAttribute("data-type"),
        });
      }
    });

    // Scan iframes
    const iframes = document.querySelectorAll("iframe");
    console.log(`[v0] Found ${iframes.length} iframes`);

    iframes.forEach((iframe, iframeIndex) => {
      try {
        const iframeDoc =
          iframe.contentDocument || iframe.contentWindow.document;
        if (iframeDoc) {
          const iframeInputs = iframeDoc.querySelectorAll(
            "input, select, textarea"
          );
          console.log(
            `[v0] Iframe ${iframeIndex} has ${iframeInputs.length} form elements`
          );

          iframeInputs.forEach((element, index) => {
            if (element.offsetParent !== null) {
              console.log(`[v0] Iframe ${iframeIndex} Element ${index}:`, {
                tag: element.tagName,
                type: element.type,
                name: element.name,
                id: element.id,
                ariaLabel: element.getAttribute("aria-label"),
                placeholder: element.placeholder,
                className: element.className,
                dataRef: element.getAttribute("data-ref"),
                dataType: element.getAttribute("data-type"),
              });
            }
          });
        }
      } catch (e) {
        console.log(`[v0] Cannot access iframe ${iframeIndex}: ${e.message}`);
      }
    });

    // Test field detection
    console.log("[v0] Testing field detection...");
    Object.keys(fieldSelectors).forEach((fieldType) => {
      const element = findFieldInAllFrames(fieldSelectors[fieldType]);
      if (element) {
        console.log(`[v0] ✓ Found ${fieldType}:`, {
          tag: element.tagName,
          name: element.name,
          id: element.id,
        });
      } else {
        console.log(`[v0] ✗ NOT FOUND: ${fieldType}`);
      }
    });

    updateStatus("Page scan complete - check console", "success");
  }

  function testFieldDetection() {
    console.log("[v0] Testing field detection...");
    updateStatus("Testing field detection...", "info");

    let foundCount = 0;
    Object.keys(fieldSelectors).forEach((fieldType) => {
      const element = findFieldInAllFrames(fieldSelectors[fieldType]);
      if (element) {
        foundCount++;
        console.log(`[v0] ✓ ${fieldType}: Found`);
        const originalBorder = element.style.border;
        element.style.border = "3px solid red";
        setTimeout(() => {
          element.style.border = originalBorder;
        }, 2000);
      } else {
        console.log(`[v0] ✗ ${fieldType}: NOT FOUND`);
      }
    });

    updateStatus(
      `Field detection test complete: ${foundCount}/${
        Object.keys(fieldSelectors).length
      } fields found`,
      foundCount > 0 ? "success" : "error"
    );
  }

  // Navigate between entries
  function navigateEntry(direction) {
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < timeEntries.length) {
      currentIndex = newIndex;
      updateEntryPreview();
    }
  }

  // Update entry preview
  function updateEntryPreview() {
    if (timeEntries.length === 0) return;

    document.getElementById("currentEntry").textContent = currentIndex + 1;

    const entry = timeEntries[currentIndex];
    const preview = document.getElementById("currentEntryPreview");

    let html = "<strong>Current Entry:</strong><br>";
    Object.entries(entry).forEach(([key, value]) => {
      html += `<strong>${key}:</strong> ${value}<br>`;
    });

    preview.innerHTML = html;
  }

  function findField(fieldType) {
    return findFieldInAllFrames(fieldSelectors[fieldType]);
  }

  // Fill form field with value
  function fillField(element, value) {
    if (!element || !value) return false;

    try {
      // Handle different input types
      if (element.tagName === "SELECT") {
        // Try to find option by text content first
        const options = Array.from(element.options);
        let option = options.find((opt) =>
          opt.text.toLowerCase().includes(value.toLowerCase())
        );

        if (!option) {
          // Try by value
          option = options.find((opt) =>
            opt.value.toLowerCase().includes(value.toLowerCase())
          );
        }

        if (!option && (value.includes("hr") || value.includes("min"))) {
          // For time fields like "9 hr 00 min", try to match exactly
          option = options.find((opt) => opt.text.trim() === value.trim());

          if (!option) {
            // Try to extract numeric value for time dropdowns
            const timeMatch = value.match(/(\d+(?:\.\d+)?)\s*hr/);
            if (timeMatch) {
              const numericValue = timeMatch[1];
              option = options.find((opt) => opt.value === numericValue);
            }
          }
        }

        if (option) {
          element.value = option.value;
          element.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        }
      } else {
        // Handle input/textarea and autocomplete fields
        element.value = value;
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));

        if (element.getAttribute("data-type") === "ac_reference_input") {
          console.log(`[v0] Handling autocomplete field: ${element.name}`);

          // Trigger focus to initialize autocomplete
          element.focus();

          // Dispatch additional events for ServiceNow autocomplete
          element.dispatchEvent(new Event("keyup", { bubbles: true }));
          element.dispatchEvent(new Event("blur", { bubbles: true }));

          // Wait a moment then try to select from dropdown if it appears
          setTimeout(() => {
            const dropdown = document.querySelector(".ac_dropdown");
            if (dropdown) {
              const options = dropdown.querySelectorAll(".ac_option");
              const matchingOption = Array.from(options).find((opt) =>
                opt.textContent.toLowerCase().includes(value.toLowerCase())
              );
              if (matchingOption) {
                matchingOption.click();
                console.log(
                  `[v0] Selected autocomplete option: ${matchingOption.textContent}`
                );
              }
            }
          }, 1000);
        }

        return true;
      }
    } catch (error) {
      console.error(`Error filling field:`, error);
    }
    return false;
  }

  // Process single entry - fills fields in specified order
  function processEntry(index) {
    if (index >= timeEntries.length || isProcessing) return;

    const entry = timeEntries[index];
    updateStatus("Processing entry...", "info");

    let fieldsProcessed = 0;
    let fieldsSuccessful = 0;

    const processingOrder = [
      {
        key: "showTimeAs",
        field: "Show Time As",
        fieldType: "showTimeAs",
        pauseAfter: true,
      },
      { key: "date", field: "Date", fieldType: "date" },
      { key: "location", field: "Location", fieldType: "location" },
      {
        key: "company",
        field: "Company",
        fieldType: "company",
        pauseAfter: true,
      },
      { key: "projectName", field: "Project Name", fieldType: "projectName" },
      {
        key: "projectActivity",
        field: "Project Activity",
        fieldType: "projectActivity",
      },
      {
        key: "shortDescription",
        field: "Short Description",
        fieldType: "shortDescription",
      },
      {
        key: "detailedDescription",
        field: "Detailed Description",
        fieldType: "detailedDescription",
      },
      { key: "startTime", field: "Start Time", fieldType: "startTime" },
      { key: "endTime", field: "End Time", fieldType: "endTime" },
    ];

    processingOrder.forEach((item, i) => {
      setTimeout(
        () => {
          const value = entry[item.field];
          if (value) {
            const element = findField(item.fieldType);
            if (element) {
              const success = fillField(element, value);
              if (success) {
                fieldsSuccessful++;
                console.log(`✓ Filled ${item.field}: ${value}`);

                if (item.pauseAfter) {
                  console.log(
                    `[v0] Pausing after ${item.field} for dependent fields to load...`
                  );
                  setTimeout(() => {
                    console.log(`[v0] Resuming after ${item.field} pause`);
                    // Re-scan for fields after dependent field loading
                    scanPageForFields();
                  }, 2000);
                }
              } else {
                console.log(`✗ Failed to fill ${item.field}: ${value}`);
              }
            } else {
              console.log(`✗ Field not found: ${item.field}`);
            }
          }
          fieldsProcessed++;

          // Update status when all fields are processed
          if (fieldsProcessed === processingOrder.length) {
            updateStatus(
              `Processed entry ${index + 1}: ${fieldsSuccessful}/${
                processingOrder.length
              } fields filled successfully.`,
              fieldsSuccessful > 0 ? "success" : "warning"
            );
          }
        },
        i === 0 ? 0 : i === 1 ? 4000 : i === 4 ? 3000 : i * 500
      );
    });
  }

  // Click "New Entry" button
  function clickNewEntry() {
    // Look for various "New" or "Add" buttons
    const newButtons = [
      'button[aria-label*="New"]',
      'button[title*="New"]',
      'button:contains("New")',
      'a[aria-label*="New"]',
      'input[value*="New"]',
      '[data-action="new"]',
      '.btn:contains("New")',
    ];

    for (const selector of newButtons) {
      const button = document.querySelector(selector);
      if (button && button.offsetParent !== null) {
        button.click();
        updateStatus("Clicked New Entry button", "info");
        return;
      }
    }

    // Try a more generic approach
    const buttons = Array.from(
      document.querySelectorAll('button, a, input[type="button"]')
    );
    const newButton = buttons.find(
      (btn) =>
        btn.textContent.toLowerCase().includes("new") ||
        btn.title.toLowerCase().includes("new") ||
        btn.getAttribute("aria-label")?.toLowerCase().includes("new")
    );

    if (newButton) {
      newButton.click();
      updateStatus("Clicked New Entry button", "info");
    } else {
      updateStatus("New Entry button not found", "warning");
    }
  }

  // Click "Save" button
  function clickSaveEntry() {
    const saveButtons = [
      'button[aria-label*="Save"]',
      'button[title*="Save"]',
      'input[value*="Save"]',
      '[data-action="save"]',
      'button:contains("Save")',
      '.btn:contains("Save")',
    ];

    for (const selector of saveButtons) {
      const button = document.querySelector(selector);
      if (button && button.offsetParent !== null) {
        button.click();
        updateStatus("Clicked Save button", "info");
        return;
      }
    }

    // Try a more generic approach
    const buttons = Array.from(
      document.querySelectorAll(
        'button, input[type="button"], input[type="submit"]'
      )
    );
    const saveButton = buttons.find(
      (btn) =>
        btn.textContent.toLowerCase().includes("save") ||
        btn.title.toLowerCase().includes("save") ||
        btn.getAttribute("aria-label")?.toLowerCase().includes("save")
    );

    if (saveButton) {
      saveButton.click();
      updateStatus("Clicked Save button", "info");
    } else {
      updateStatus("Save button not found", "warning");
    }
  }

  // Process all entries
  async function processAllEntries() {
    if (isProcessing || timeEntries.length === 0) return;

    isProcessing = true;
    updateStatus("Processing all entries...", "info");

    for (let i = 0; i < timeEntries.length; i++) {
      currentIndex = i;
      updateEntryPreview();

      if (i > 0) {
        // Click "New Entry" for subsequent entries
        clickNewEntry();
        await delay(2000); // Wait for new form to load
      }

      processEntry(i);
      await delay(3000); // Wait for form to be filled

      clickSaveEntry();
      await delay(2000); // Wait for save to complete
    }

    isProcessing = false;
    updateStatus("All entries processed!", "success");
  }

  // Utility function for delays
  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Update status display
  function updateStatus(message, type) {
    const status = document.getElementById("processingStatus");
    status.textContent = message;
    status.style.display = "block";

    // Color coding
    switch (type) {
      case "success":
        status.style.backgroundColor = "#d4edda";
        status.style.color = "#155724";
        break;
      case "error":
        status.style.backgroundColor = "#f8d7da";
        status.style.color = "#721c24";
        break;
      case "warning":
        status.style.backgroundColor = "#fff3cd";
        status.style.color = "#856404";
        break;
      default:
        status.style.backgroundColor = "#d1ecf1";
        status.style.color = "#0c5460";
    }
  }

  async function init() {
    console.log("[v0] Initializing ServiceNow Time Entry Automation...");

    if (window.timeEntryAutomationInitialized) {
      console.log("[v0] Already initialized, skipping");
      return;
    }
    window.timeEntryAutomationInitialized = true;

    // Wait for ServiceNow to load
    await waitForServiceNowLoad();

    // Wait additional time for dynamic content
    await new Promise((resolve) => setTimeout(resolve, 3000));

    createControlPanel();
    console.log("[v0] Control panel created");

    // Auto-scan on startup
    setTimeout(() => {
      console.log("[v0] Running initial field scan...");
      scanPageForFields();
    }, 1000);
  }

  function waitForServiceNowLoad() {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 50;

      const checkLoad = () => {
        attempts++;
        console.log(`[v0] Load check attempt ${attempts}`);

        const indicators = [
          document.querySelector('input[name*="workdate"]'),
          document.querySelector('select[name*="showtimeas"]'),
          document.querySelector(".form-control"),
          document.querySelector('[data-type="glide_element_date"]'),
          document.querySelector("iframe"),
        ];

        const foundIndicators = indicators.filter((el) => el !== null);

        if (foundIndicators.length > 0 || attempts >= maxAttempts) {
          console.log(
            `[v0] ServiceNow loaded with ${foundIndicators.length} indicators found`
          );
          resolve();
        } else {
          setTimeout(checkLoad, 500);
        }
      };

      checkLoad();
    });
  }

  // Parse CSV line
  function parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
