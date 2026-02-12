// ==UserScript==
// @name         ServiceNow Time Entry Automation - Enhanced
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Enhanced ServiceNow time entry automation with better field detection and auto-fill
// @author       You
// @match        https://sentineld.service-now.com/x_st_sti_tab_daily_time*
// @match        https://sentinel.service-now.com/x_st_sti_tab_daily_time*
// @grant        none
// ==/UserScript==

(() => {
  let timeEntries = [];
  let currentIndex = 0;
  let isProcessing = false;
  let autoFillEnabled = false;
  let panelCreated = false;

  if (window.timeEntryScriptLoaded && window.timeEntryScriptInitialized) {
    console.log(
      "[v0] Script already loaded and initialized, preventing duplicate execution",
    );
    return;
  }

  console.log("[v0] Starting ServiceNow Time Entry Automation script");
  window.timeEntryScriptLoaded = true;

  function saveDataToStorage() {
    try {
      localStorage.setItem(
        "serviceNowTimeEntries",
        JSON.stringify(timeEntries),
      );
      localStorage.setItem("serviceNowCurrentIndex", currentIndex.toString());
      localStorage.setItem(
        "serviceNowAutoFillEnabled",
        autoFillEnabled.toString(),
      );
      console.log("[v0] Data saved to localStorage");
    } catch (error) {
      console.error("[v0] Error saving to localStorage:", error);
    }
  }

  function loadDataFromStorage() {
    try {
      const savedData = localStorage.getItem("serviceNowTimeEntries");
      const savedIndex = localStorage.getItem("serviceNowCurrentIndex");

      if (savedData) {
        timeEntries = JSON.parse(savedData);
        currentIndex = savedIndex ? Number.parseInt(savedIndex) : 0;

        // Ensure currentIndex is valid
        if (currentIndex >= timeEntries.length) {
          currentIndex = 0;
        }

        console.log(
          "[v0] Loaded data from storage:",
          timeEntries.length,
          "entries, current index:",
          currentIndex,
        );

        setTimeout(() => {
          updateEntryCount();
          updateEntryPreview();
          if (timeEntries.length > 0) {
            document.getElementById("entryControls").style.display = "block";
          }
        }, 100);
      }
    } catch (error) {
      console.error("[v0] Error loading data from storage:", error);
    }
  }

  function detectPageType() {
    const url = window.location.href;
    const isListPage = url.includes("_list.do") || url.includes("dashboard");
    const isFormPage =
      url.includes(".do") &&
      !url.includes("_list.do") &&
      (document.querySelector('input[name*="workdate"]') ||
        document.querySelector('select[name*="showtimeas"]'));

    console.log(
      `[v0] Page detection - URL: ${url}, isListPage: ${isListPage}, isFormPage: ${isFormPage}`,
    );

    return { isListPage, isFormPage };
  }

  function checkForAutoFill() {
    const { isFormPage } = detectPageType();

    if (
      isFormPage &&
      autoFillEnabled &&
      timeEntries.length > 0 &&
      !isProcessing
    ) {
      console.log(
        "[v0] Form page detected with auto-fill enabled, triggering automatic form fill",
      );
      updateStatus("Auto-filling form...", "info");

      // Small delay to ensure page is fully loaded
      setTimeout(() => {
        processEntry(currentIndex);
      }, 2000);
    }
  }

  function advanceToNextEntry() {
    if (timeEntries.length === 0) return;

    // Remove current entry
    timeEntries.splice(currentIndex, 1);

    // Adjust current index if needed
    if (currentIndex >= timeEntries.length) {
      currentIndex = 0;
    }

    updateEntryCount();
    updateEntryPreview(); // Added call to update preview
    saveDataToStorage();

    if (timeEntries.length === 0) {
      document.getElementById("entryControls").style.display = "none";
      updateStatus("All entries completed!", "success");
    } else {
      updateStatus(`Advanced to entry ${currentIndex + 1}`, "info");
    }
  }

  function updateEntryCount() {
    document.getElementById("totalEntries").textContent = timeEntries.length;
    document.getElementById("currentEntry").textContent =
      timeEntries.length > 0 ? currentIndex + 1 : 0;
  }

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
    console.log("[v0] Creating control panel...");

    if (window.serviceNowPanelCreated) {
      console.log("[v0] Panel already exists, skipping creation");
      return;
    }

    console.log("[v0] Creating control panel...");

    // Remove any existing panels first
    const existingPanels = document.querySelectorAll('[id^="serviceNowPanel"]');
    existingPanels.forEach((panel) => panel.remove());

    window.serviceNowPanelCreated = true;
    panelCreated = true;

    loadDataFromStorage();

    const panel = document.createElement("div");
    panel.id = "serviceNowPanel";

    panel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 350px;
      background: white;
      border: 2px solid #007bff;
      border-radius: 10px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      z-index: 2147483647;
      font-family: Arial, sans-serif;
      font-size: 14px;
      user-select: none;
      cursor: move;
      display: block;
      visibility: visible;
    `;

    panel.innerHTML = `
      <div style="background: white; padding: 15px; border-radius: 10px; margin-bottom: 10px;">
        <!-- Added drag handle header -->
        <div id="dragHandle" style="background: #007bff; color: white; margin: -15px -15px 10px -15px; padding: 10px 15px; border-radius: 8px 8px 0 0; cursor: move; user-select: none;">
          <h3 style="margin: 0; font-size: 16px;">ServiceNow Time Entry Automation v2.0</h3>
          <div style="font-size: 11px; opacity: 0.8;">Click and drag to move</div>
        </div>

        <!-- Auto-fill Toggle -->
        <div style="margin-bottom: 10px;">
          <label style="display: flex; align-items: center; gap: 8px; font-size: 14px;">
            <input type="checkbox" id="autoFillToggle" ${
              autoFillEnabled ? "checked" : ""
            }>
            Auto-fill forms when page loads
          </label>
        </div>

        <!-- CSV Input -->
        <div style="margin-bottom: 10px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 14px;">CSV Data:</label>
          <textarea id="csvData" placeholder="Paste your CSV data here..."
            style="width: 100%; height: 80px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 12px; resize: vertical;"></textarea>
        </div>

        <!-- Control Buttons -->
        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;">
          <button id="parseBtn" style="padding: 8px 12px; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Parse Data</button>
        </div>

        <!-- Entry Controls -->
        <div id="entryControls" style="display: ${
          timeEntries.length > 0 ? "block" : "none"
        }; background: #e9ecef; padding: 10px; border-radius: 4px; margin-bottom: 10px;">
          <div style="margin-bottom: 8px; font-size: 14px; font-weight: bold;">
            Entry <span id="currentEntry">${
              currentIndex + 1
            }</span> of <span id="totalEntries">${timeEntries.length}</span>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
            <button id="newEntryBtn" style="padding: 6px 10px; background: #6f42c1; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">New Entry</button>
            <button id="fillBtn" style="padding: 6px 10px; background: #fd7e14; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Fill Form</button>
            <button id="saveBtn" style="padding: 6px 10px; background: #20c997; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Save Entry</button>
            <button id="markCompleteBtn" style="padding: 6px 10px; background: #ff0202; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Remove Entry</button>
          </div>
          <div id="entryPreview" style="font-size: 12px; color: #333; background: white; padding: 8px; border-radius: 4px; border: 1px solid #ddd; max-height: 120px; overflow-y: auto; line-height: 1.4;"></div>
        </div>

        <!-- Status -->
        <div id="status" style="padding: 8px; border-radius: 4px; font-size: 12px; min-height: 20px;"></div>
      </div>
    `;

    document.body.appendChild(panel);
    console.log("[v0] Control panel created and added to DOM");
    disableSaveButton();

    makeDraggable(panel);

    document
      .getElementById("autoFillToggle")
      .addEventListener("change", (e) => {
        autoFillEnabled = e.target.checked;
        saveDataToStorage();
        updateStatus(
          `Auto-fill ${autoFillEnabled ? "enabled" : "disabled"}`,
          "info",
        );
      });

    // Setup event listeners for the control panel
    document.getElementById("parseBtn").addEventListener("click", parseCSVData);
    document
      .getElementById("newEntryBtn")
      .addEventListener("click", clickNewEntry);
    document
      .getElementById("fillBtn")
      .addEventListener("click", () => processEntry(currentIndex));
    document
      .getElementById("saveBtn")
      .addEventListener("click", clickSaveEntry);
    document.getElementById("markCompleteBtn").addEventListener("click", () => {
      advanceToNextEntry();
      updateStatus("Entry marked as complete", "success");
    });
  }

  // Parse CSV data
  function parseCSVData() {
    const csvText = document.getElementById("csvData").value.trim();
    if (!csvText) {
      updateStatus("Please paste CSV data first", "error");
      return;
    }

    try {
      timeEntries = parseCSV(csvText);
      currentIndex = 0;

      if (timeEntries.length === 0) {
        updateStatus("No valid entries found in CSV", "error");
        return;
      }

      updateStatus(
        `Parsed ${timeEntries.length} entries successfully`,
        "success",
      );
      updateEntryCount();
      updateEntryPreview(); // Added call to update preview

      document.getElementById("entryControls").style.display = "block";
      saveDataToStorage();
    } catch (error) {
      updateStatus(`Error parsing CSV: ${error.message}`, "error");
    }
  }

  // Fill form field with value
  function fillField(element, value) {
    if (!element || !value) return false;

    try {
      // Handle different input types
      if (element.tagName === "SELECT") {
        // Try to find option by text content first
        const options = Array.from(element.options);
        let option = options.find(
          (opt) => opt.value.toLowerCase() === value.toLowerCase(),
        );

        if (!option) {
          // Try by value
          option = options.find((opt) =>
            opt.text.toLowerCase().match(value.toLowerCase()),
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

        if (
          !option &&
          element.name &&
          (element.name.includes("regularstart") ||
            element.name.includes("regularstop"))
        ) {
          console.log(
            `[v0] Handling time field: ${element.name} with value: ${value}`,
          );

          // Convert decimal hours to "X hr Y min" format if needed
          if (!isNaN(value)) {
            const hours = Math.floor(Number.parseFloat(value));
            const minutes = Math.round((Number.parseFloat(value) - hours) * 60);
            const formattedTime = `${hours} hr ${minutes
              .toString()
              .padStart(2, "0")} min`;
            console.log(`[v0] Converted ${value} to ${formattedTime}`);
            option = options.find((opt) => opt.text.trim() === formattedTime);
          }

          // Try partial matching for time values
          if (!option) {
            const numericValue = Number.parseFloat(value);
            if (!isNaN(numericValue)) {
              option = options.find((opt) => {
                const optText = opt.text.toLowerCase();
                const hourMatch = optText.match(/(\d+)\s*hr/);
                if (hourMatch) {
                  const optHours = Number.parseInt(hourMatch[1]);
                  return Math.abs(optHours - numericValue) < 0.5;
                }
                return false;
              });
            }
          }
        }

        if (option) {
          console.log(
            `[v0] Setting select field to: ${option.text} (value: ${option.value})`,
          );
          element.value = option.value;
          element.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        } else {
          console.log(`[v0] No matching option found for value: ${value}`);
          console.log(
            `[v0] Available options:`,
            options.map((opt) => `"${opt.text}" (${opt.value})`),
          );
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
                opt.textContent.toLowerCase().includes(value.toLowerCase()),
              );
              if (matchingOption) {
                matchingOption.click();
                console.log(
                  `[v0] Selected autocomplete option: ${matchingOption.textContent}`,
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

    const processingOrder = [
      { key: "date", field: "Date", fieldType: "date", step: 1 },
      {
        key: "showTimeAs",
        field: "Show Time As",
        fieldType: "showTimeAs",
        step: 2,
        pauseAfter: false,
      },
      { key: "location", field: "Location", fieldType: "location", step: 3 },
      {
        key: "company",
        field: "Company",
        fieldType: "company",
        step: 4,
        pauseAfter: false,
      },
      {
        key: "projectName",
        field: "Project Name",
        fieldType: "projectName",
        step: 5,
        pauseAfter: true,
      },
      {
        key: "projectActivity",
        field: "Project Activity",
        fieldType: "projectActivity",
        step: 6,
        retryDependent: false,
      },
      {
        key: "shortDescription",
        field: "Short Description",
        fieldType: "shortDescription",
        step: 7,
      },
      {
        key: "detailedDescription",
        field: "Detailed Description",
        fieldType: "detailedDescription",
        step: 8,
      },
      {
        key: "startTime",
        field: "Start Time",
        fieldType: "startTime",
        step: 9,
        switchToEmployeeHours: true,
      },
      {
        key: "endTime",
        field: "End Time",
        fieldType: "endTime",
        step: 10,
      },
    ];

    console.log("[v0] Verifying we are on the Details tab...");
    ensureOnDetailsTab(() => {
      console.log("[v0] Starting field processing in specified order...");
      processFieldsInOrder(entry, processingOrder, 0);
    });
  }

  function ensureOnDetailsTab(callback) {
    const detailsTabs = Array.from(
      document.querySelectorAll("span.tab_caption_text"),
    ).filter((tab) => tab.textContent.trim() === "Details");

    if (detailsTabs.length > 0) {
      // Click the first Details tab to ensure we're on it
      const firstDetailsTab = detailsTabs[0];
      const tabElement = firstDetailsTab.closest(
        '[role="tab"], .tab_header, .tab',
      );
      if (tabElement) {
        console.log("[v0] Clicking Details tab to ensure we're on it");
        tabElement.click();
        setTimeout(callback, 1000); // Wait for tab to load
        return;
      }
    }

    console.log("[v0] Details tab not found or already active, proceeding...");
    callback();
  }

  function processFieldsInOrder(entry, processingOrder, currentStep) {
    if (currentStep >= processingOrder.length) {
      console.log("[v0] All fields processed in order");
      enableSaveButton();
      return;
    }

    const item = processingOrder[currentStep];
    const value = entry[item.field];

    console.log(`[v0] Step ${item.step}: Processing ${item.field}`);

    if (item.switchToEmployeeHours) {
      console.log(
        `[v0] Switching to Employee Hours tab before processing ${item.field}`,
      );
      switchToEmployeeHoursTab();

      setTimeout(() => {
        processCurrentField(item, value, () => {
          processFieldsInOrder(entry, processingOrder, currentStep + 1);
        });
      }, 1); // Wait for tab switch
      return;
    }

    processCurrentField(item, value, () => {
      if (item.pauseAfter) {
        const pauseTime =
          item.field === "Show Time As"
            ? 3000
            : item.field === "Company"
              ? 2000
              : item.field === "Project Name"
                ? 2000
                : 1000;

        console.log(
          `[v0] Pausing ${pauseTime}ms after ${item.field} for dependent fields to load...`,
        );
        setTimeout(() => {
          console.log(`[v0] Resuming after ${item.field} pause`);
          scanPageForFields(); // Re-scan for new fields
          processFieldsInOrder(entry, processingOrder, currentStep + 1);
        }, pauseTime);
      } else {
        // Continue immediately to next field
        setTimeout(() => {
          processFieldsInOrder(entry, processingOrder, currentStep + 1);
        }, 500);
      }
    });
  }

  function enableSaveButton() {
    let saveButton = document.getElementById("saveBtn");
    if (saveButton) {
      console.log("[v0] Enabling Save button after field fill");
      saveButton.disabled = false;
      saveButton.style.opacity = "1.0";
      saveButton.style.cursor = "pointer";
    } else {
      console.log("[v0] Save button not found to enable");
    }
  }

  function disableSaveButton() {
    let saveButton = document.getElementById("saveBtn");
    if (saveButton) {
      console.log("[v0] Disabling Save button to prevent premature submission");
      saveButton.disabled = true;
      saveButton.style.opacity = "0.5";
      saveButton.style.cursor = "not-allowed";
    } else {
      console.log("[v0] Save button not found to disable");
    }
  }

  function processCurrentField(item, value, callback) {
    if (value) {
      const element = findField(item.fieldType);
      if (element) {
        const success = fillField(element, value);
        if (success) {
          console.log(
            `[v0] ✓ Step ${item.step} - Filled ${item.field}: ${value}`,
          );
          updateStatus(`Filled ${item.field}`, "success");
        } else {
          console.log(
            `[v0] ✗ Step ${item.step} - Failed to fill ${item.field}: ${value}`,
          );
        }
      } else {
        console.log(
          `[v0] ✗ Step ${item.step} - Field not found: ${item.field}`,
        );
      }
    } else {
      console.log(`[v0] - Step ${item.step} - No value for ${item.field}`);
    }
    callback();
  }

  function switchToEmployeeHoursTab() {
    console.log("[v0] Looking for Employee Hours tab...");

    const tabSelectors = [
      ".tab_caption_text",
      ".tab-caption",
      ".nav-tab",
      '[role="tab"]',
      ".ui-tabs-tab",
      ".tab_header",
    ];

    let employeeHoursTab = null;

    tabSelectors.forEach((selector) => {
      if (!employeeHoursTab) {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          if (el.textContent.trim().toLowerCase().includes("employee hours")) {
            employeeHoursTab = el;
            console.log(
              `[v0] Found Employee Hours tab: "${el.textContent.trim()}"`,
            );
          }
        });
      }
    });

    if (employeeHoursTab) {
      console.log("[v0] Clicking Employee Hours tab...");
      employeeHoursTab.click();

      // Wait for tab content to load
      setTimeout(() => {
        console.log(
          "[v0] Employee Hours tab loaded, scanning for time fields...",
        );
        // Re-scan for fields after tab switch
        // testFieldDetection();
      }, 1);
    } else {
      console.log("[v0] Employee Hours tab not found");
    }
  }

  // Click "New Entry" button
  function clickNewEntry() {
    if (window.location.href.includes("x_st_sti_tab_daily_time_list.do")) {
      const newButton =
        document.querySelector('button#sysverb_new[value="sysverb_new"]') ||
        document.querySelector(
          'button[table="x_st_sti_tab_daily_time"][data-action-label="New"]',
        ) ||
        document.querySelector('button.btn-primary:contains("New")');

      if (newButton && newButton.offsetParent !== null) {
        newButton.click();
        updateStatus("Clicked ServiceNow New button", "info");
        return;
      }
    }

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
      document.querySelectorAll('button, a, input[type="button"]'),
    );
    const newButton = buttons.find(
      (btn) =>
        btn.textContent.toLowerCase().includes("new") ||
        btn.title.toLowerCase().includes("new") ||
        btn.getAttribute("aria-label")?.toLowerCase().includes("new"),
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
    disableSaveButton();
    advanceToNextEntry();
    updateStatus("Entry marked as complete", "success");

    const submitButton = document.querySelector(
      '#sysverb_insert_bottom, button[value="sysverb_insert"]',
    );

    if (submitButton && submitButton.offsetParent !== null) {
      console.log("[v0] Clicking ServiceNow submit button");
      submitButton.click();
      updateStatus("Clicked Submit button", "success");
      return;
    }

    // Fallback to original save button logic
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
        'button, input[type="button"], input[type="submit"]',
      ),
    );
    const saveButton = buttons.find(
      (btn) =>
        btn.textContent.toLowerCase().includes("save") ||
        btn.title.toLowerCase().includes("save") ||
        btn.getAttribute("aria-label")?.toLowerCase().includes("save"),
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
    const status = document.getElementById("status");
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

  function makeDraggable(element) {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    const dragHandle = element.querySelector("#dragHandle") || element;

    dragHandle.addEventListener("mousedown", dragStart);
    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", dragEnd);

    function dragStart(e) {
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.tagName === "BUTTON"
      ) {
        return;
      }

      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;

      if (e.target === dragHandle || dragHandle.contains(e.target)) {
        isDragging = true;
        element.style.cursor = "grabbing";
        element.style.zIndex = "9999999";
      }
    }

    function drag(e) {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        const rect = element.getBoundingClientRect();
        const minX = -rect.width + 50; // Allow mostly off-screen but keep 50px visible
        const maxX = window.innerWidth - 50;
        const minY = 0; // Keep top edge visible
        const maxY = window.innerHeight - 50; // Keep some part visible at bottom

        currentX = Math.max(minX, Math.min(currentX, maxX));
        currentY = Math.max(minY, Math.min(currentY, maxY));

        xOffset = currentX;
        yOffset = currentY;

        element.style.transform = `translate(${currentX}px, ${currentY}px)`;
      }
    }

    function dragEnd() {
      if (isDragging) {
        isDragging = false;
        element.style.cursor = "move";

        // Save position to localStorage
        localStorage.setItem(
          "serviceNowPanelPosition",
          JSON.stringify({
            x: currentX,
            y: currentY,
          }),
        );
      }
    }

    const savedPosition = localStorage.getItem("serviceNowPanelPosition");
    if (savedPosition) {
      try {
        const position = JSON.parse(savedPosition);
        // Ensure saved position is within current viewport with relaxed constraints
        const maxX = window.innerWidth - 50;
        const maxY = window.innerHeight - 50;

        xOffset = Math.max(-300, Math.min(position.x, maxX)); // Allow more off-screen movement
        yOffset = Math.max(0, Math.min(position.y, maxY));

        element.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
      } catch (e) {
        console.log("[v0] Error restoring position:", e);
      }
    }
  }

  // Scan page for fields
  function scanPageForFields() {
    console.log("[v0] === ENHANCED PAGE SCAN ===");
    updateStatus("Scanning page for fields...", "info");

    // Scan main document
    console.log("[v0] Scanning main document...");
    const mainInputs = document.querySelectorAll("input, select, textarea");
    console.log(
      `[v0] Found ${mainInputs.length} form elements in main document`,
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
            "input, select, textarea",
          );
          console.log(
            `[v0] Iframe ${iframeIndex} has ${iframeInputs.length} form elements`,
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

  // Test field detection
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
      foundCount > 0 ? "success" : "error",
    );
  }

  function findField(fieldType) {
    return findFieldInAllFrames(fieldSelectors[fieldType]);
  }

  // Update entry preview
  function updateEntryPreview() {
    if (timeEntries.length === 0) return;

    const entry = timeEntries[currentIndex];
    const preview = document.getElementById("entryPreview");
    if (!preview) return;

    let html = `<div style="font-weight: bold; color: #007bff; margin-bottom: 6px;">Entry ${
      currentIndex + 1
    } Details:</div>`;

    // Show key fields first
    const keyFields = [
      "Date",
      "Start Time",
      "End Time",
      "Company",
      "Project Name",
    ];
    keyFields.forEach((key) => {
      if (entry[key]) {
        html += `<div style="margin-bottom: 3px;"><strong>${key}:</strong> ${entry[key]}</div>`;
      }
    });

    // Show remaining fields
    Object.entries(entry).forEach(([key, value]) => {
      if (!keyFields.includes(key) && value) {
        html += `<div style="margin-bottom: 3px;"><strong>${key}:</strong> ${value}</div>`;
      }
    });

    preview.innerHTML = html;
  }

  function initializeScript() {
    console.log("[v0] Initializing script...");
    if (window.timeEntryScriptInitialized) {
      console.log(
        "[v0] Script already initialized, cleaning up and reinitializing",
      );
      const existing = document.getElementById("serviceNowPanel");
      if (existing) {
        existing.remove();
        console.log("[v0] Cleaned up existing panel during reinit");
      }
      window.serviceNowPanelCreated = false;
      panelCreated = false;
    }

    window.timeEntryScriptInitialized = true;

    const createPanel = () => {
      console.log("[v0] DOM ready, creating control panel...");
      setTimeout(() => {
        try {
          createControlPanel();
          console.log("[v0] Control panel creation completed");
        } catch (error) {
          console.error("[v0] Error creating control panel:", error);
        }
      }, 300);
    };

    if (document.readyState === "loading") {
      console.log("[v0] DOM still loading, waiting for DOMContentLoaded");
      document.addEventListener("DOMContentLoaded", createPanel);
    } else {
      console.log("[v0] DOM already ready");
      createPanel();
    }
  }

  function parseCSV(csvText) {
    const lines = csvText.split("\n").filter((line) => line.trim());
    if (lines.length < 2) {
      throw new Error("CSV must have header and at least one data row.");
    }

    const headers = parseCSVLine(lines[0]);
    const entries = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const entry = {};

      headers.forEach((header, index) => {
        // Clean header names and map to our expected format
        const cleanHeader = header.replace(/^\*+/, "").trim();
        if (cleanHeader.toLowerCase() === "date") {
          console.log("[v0] Converting Date to MM/DD/YYYY format");
          entry[cleanHeader] = values[index].replaceAll("/", "-");
        } else {
          entry[cleanHeader] = values[index] ? values[index].trim() : "";
        }
      });

      entries.push(entry);
    }

    return entries;
  }

  function parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    // Don't forget to push the last cell
    result.push(current.trim());

    return result;
  }
  try {
    initializeScript();
  } catch (error) {
    console.error("[v0] Error during script initialization:", error);
  }
})();
