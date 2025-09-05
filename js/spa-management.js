/**
 * Smart AC SPA Management
 * Handles AC selection, data loading, and SPA navigation
 */
class ACSpaManager {
  constructor() {
    this.selectedAC = null;
    this.acData = {
      "AC-001": {
        id: "AC-001",
        location: "Living Room",
        status: "online",
        currentTemp: 24,
        targetTemp: 22,
        mode: "auto",
        power: true, // FIX: Set power to true to match status online
        fanSpeed: 0,
        current: 5,
        voltage: 220,
      },
    };
  }

  /**
   * Initialize AC SPA Manager
   */
  init() {
    console.log("AC SPA Manager initialized");
    this.setupACTableHandlers();
    this.setupDashboardAutoRefresh();
    this.subscribeToGlobalDeviceData();
    this.initializeDashboardWithDefaultData();

    // Delay stats update to ensure DOM is fully ready
    setTimeout(() => {
      this.updateDashboardStats();
      console.log("Dashboard stats updated after DOM ready");
    }, 100);
  }

  /**
   * Subscribe to global device data updates
   */
  subscribeToGlobalDeviceData() {
    if (window.globalDeviceDataManager) {
      window.globalDeviceDataManager.subscribe((deviceData) => {
        console.log("ACSpaManager received global device data:", deviceData);

        const acDataUpdate = {
          currentTemp: deviceData.currentTemp,
          targetTemp: deviceData.targetTemp,
          mode: this.mapDeviceValueToMode(deviceData.mode),
          power: deviceData.power, // Use direct power property
          status: deviceData.power ? "online" : "offline", // Status based on power
          lastUpdated: deviceData.timestamp,
          current: deviceData.current,
          voltage: deviceData.voltage,
          fanSpeed: deviceData.fanSpeed,
        };
        this.updateACDataRealtime("AC-001", acDataUpdate);
        console.log("Dashboard updated with real-time device data");
      });

      console.log("ACSpaManager subscribed to global device data updates");
    } else {
      console.warn("Global Device Data Manager not available for subscription");
    }
  }

  /**
   * Initialize dashboard with default data
   */
  initializeDashboardWithDefaultData() {
    console.log("Initializing dashboard with default AC data...");
    this.updateDashboardTable();
    this.updateDashboardStats();
    console.log(
      "Dashboard initialized with default data - ready for real-time updates"
    );
  }

  /**
   * Map device value to mode string
   */
  mapDeviceValueToMode(value) {
    const modeMap = {
      0: "auto",
      1: "cool",
      2: "dry",
      3: "fan",
    };
    return modeMap[value] || "auto";
  }

  /**
   * Setup dashboard auto-refresh using event system
   */
  setupDashboardAutoRefresh() {
    if (window.acEventSystem) {
      window.acEventSystem.on("ac-data-updated", (eventData) => {
        const { acId, data, changes } = eventData;

        console.log("Dashboard received AC update:", acId, changes);

        if (window.spaApp?.getCurrentPage() === "dashboard") {
          this.updateDashboardTableRow(acId, data);
          this.updateDashboardStats();
        }

        this.addUpdateIndicator(acId);
      });

      console.log("Dashboard auto-refresh event listeners setup complete");
    } else {
      console.error("Event system not available for dashboard auto-refresh");
    }
  }

  /**
   * Trigger real-time dashboard update
   */
  triggerDashboardUpdate(acId, acData) {
    const isOnDashboard = window.spaApp?.getCurrentPage() === "dashboard";

    if (isOnDashboard) {
      this.updateDashboardTableRow(acId, acData);
      this.updateDashboardStats();
      this.addUpdateIndicator(acId);
      console.log(`Dashboard updated for ${acId} with real-time data`);
    } else {
      console.log(
        `Dashboard update deferred - not currently viewing dashboard`
      );
    }
  }

  /**
   * Setup click handlers for AC table rows
   */
  setupACTableHandlers() {
    const acTableBody = document.getElementById("spa-ac-table-body");
    if (acTableBody) {
      acTableBody.addEventListener("click", (e) => {
        const row = e.target.closest("tr");
        if (row) {
          const acId = row.cells[0].textContent.trim();
          console.log("AC row clicked:", acId);
          this.selectAC(acId);
        }
      });
    }
  }

  /**
   * Select an AC and navigate to control page
   */
  selectAC(acId) {
    if (!this.acData[acId]) {
      console.error("AC not found:", acId);
      return;
    }

    this.selectedAC = acId;
    console.log("Selected AC:", this.selectedAC);

    // Navigate to control page
    if (window.spaApp) {
      window.spaApp.navigateToControlPage(acId);
    }
  }

  /**
   * Get selected AC data
   */
  getSelectedAC() {
    return this.selectedAC ? this.acData[this.selectedAC] : null;
  }

  /**
   * Get AC data by ID
   */
  getACData(acId) {
    return this.acData[acId] || null;
  }

  /**
   * Update AC data with real-time event broadcasting
   */
  updateACDataRealtime(acId, newData) {
    if (this.acData[acId]) {
      const oldData = { ...this.acData[acId] };

      this.acData[acId] = {
        ...this.acData[acId],
        ...newData,
        lastUpdated: new Date().toISOString(),
      };

      console.log("AC data updated:", acId, this.acData[acId]);

      if (window.acEventSystem) {
        window.acEventSystem.emit("ac-data-updated", {
          acId: acId,
          data: this.acData[acId],
          oldData: oldData,
          changes: newData,
        });
      }

      if (window.spaApp?.getCurrentPage() === "dashboard") {
        this.updateDashboardTable();
        this.updateDashboardStats();
      }

      this.addUpdateIndicator(acId);
    } else {
      console.warn(`AC ${acId} not found in data store`);
    }
  }

  /**
   * Legacy method - kept for backward compatibility
   * @deprecated Use updateACDataRealtime instead
   */
  updateACData(acId, newData) {
    console.warn(
      "updateACData is deprecated. Use updateACDataRealtime instead."
    );
    this.updateACDataRealtime(acId, newData);
  }

  /**
   * Load AC data to control interface
   */
  loadACDataToInterface(acId) {
    const acData = this.getACData(acId);
    if (!acData) {
      console.error("No data found for AC:", acId);
      return;
    }

    console.log("Loading AC data to interface:", acData);

    // Initialize or update temperature controller for this AC
    if (!window.tempController || window.tempController.acId !== acId) {
      window.tempController = new TemperatureController(acId);
    }

    // Update current temperature
    const currentTempEl = document.getElementById("spa-current-temp");
    if (currentTempEl) {
      currentTempEl.textContent = acData.currentTemp || "--";
    }

    // Update target temperature
    const targetTempEl = document.getElementById("spa-target-temp");
    if (targetTempEl) {
      targetTempEl.textContent = acData.targetTemp || "--";
    }

    // Update mode
    this.updateModeDisplay(acData.mode);

    // Update power status
    this.updatePowerDisplay(acData.power, acData.status);

    // Update AC status
    const statusTextEl = document.getElementById("spa-status-text");
    if (statusTextEl) {
      statusTextEl.textContent =
        acData.status === "online" ? "Online" : "Offline";
    }

    // Update status indicator
    const statusIndicatorEl = document.getElementById("spa-status-indicator");
    if (statusIndicatorEl) {
      statusIndicatorEl.className = "status-indicator";
      statusIndicatorEl.classList.add(acData.power ? "on" : "off");
    }
  }

  /**
   * Update mode display
   */
  updateModeDisplay(mode) {
    // Remove active class from all mode buttons
    const modeButtons = document.querySelectorAll(".mode-btn");
    modeButtons.forEach((button) => {
      button.classList.remove("active");
    });

    // Add active class to current mode button
    if (mode) {
      const currentModeButton = document.getElementById(`spa-mode-${mode}`);
      if (currentModeButton) {
        currentModeButton.classList.add("active");
      }
    }
  }

  /**
   * Update power display
   */
  updatePowerDisplay(power, status) {
    const powerBtn = document.getElementById("spa-power-btn");
    const acImage = document.getElementById("spa-ac-image");

    if (powerBtn) {
      if (power && status === "online") {
        powerBtn.classList.add("active");
      } else {
        powerBtn.classList.remove("active");
      }
    }

    if (acImage) {
      const imagePath =
        power && status === "online"
          ? "Assets/Img_Design/AirConditioner_imgs/onAir.png"
          : "Assets/Img_Design/AirConditioner_imgs/offAir.png";
      acImage.src = imagePath;
    }
  }

  /**
   * Get all AC data for dashboard
   */
  getAllACData() {
    return Object.values(this.acData);
  }

  /**
   * Update dashboard statistics
   */
  updateDashboardStats() {
    const allACs = this.getAllACData();

    console.log("DEBUG: All AC Data:", allACs);

    // Base statistics on power status for more accurate representation
    const onlineCount = allACs.filter((ac) => Boolean(ac.power)).length;
    const offlineCount = allACs.filter((ac) => !Boolean(ac.power)).length;
    const totalCount = allACs.length;

    console.log(
      "DEBUG: Calculated counts - Online:",
      onlineCount,
      "Offline:",
      offlineCount,
      "Total:",
      totalCount
    );

    // Update dashboard counters
    const onlineEl = document.getElementById("spa-dashboard-online");
    const offlineEl = document.getElementById("spa-dashboard-offline");
    const totalEl = document.getElementById("spa-dashboard-total");

    console.log(
      "DEBUG: Elements found - Online:",
      !!onlineEl,
      "Offline:",
      !!offlineEl,
      "Total:",
      !!totalEl
    );

    if (onlineEl) {
      onlineEl.textContent = onlineCount;
      console.log("Updated online element with:", onlineCount);
    } else {
      console.error("Element spa-dashboard-online not found!");
    }

    if (offlineEl) {
      offlineEl.textContent = offlineCount;
      console.log("Updated offline element with:", offlineCount);
    } else {
      console.error("Element spa-dashboard-offline not found!");
    }

    if (totalEl) {
      totalEl.textContent = totalCount;
      console.log("Updated total element with:", totalCount);
    } else {
      console.error("Element spa-dashboard-total not found!");
    }

    console.log(
      "Dashboard stats updated - Online:",
      onlineCount,
      "Offline:",
      offlineCount
    );
  }

  /**
   * Update dashboard table with current data
   */
  updateDashboardTable() {
    const tableBody = document.getElementById("spa-ac-table-body");
    if (!tableBody) {
      console.warn("Dashboard table body not found");
      return;
    }

    tableBody.innerHTML = "";

    const allACs = this.getAllACData();
    allACs.forEach((acData) => {
      const row = this.createTableRow(acData);
      tableBody.appendChild(row);
    });

    console.log("Dashboard table updated with latest data");
  }

  /**
   * Update specific dashboard table row
   */
  updateDashboardTableRow(acId, acData) {
    const row = document.querySelector(`tr[data-ac-id="${acId}"]`);

    if (row) {
      // Update status badge (3rd column) - based on power status
      const statusBadge = row.querySelector(".status-badge");
      if (statusBadge) {
        statusBadge.classList.remove("online", "offline");
        const newStatus = acData.power ? "online" : "offline";
        statusBadge.classList.add(newStatus);
        statusBadge.textContent = newStatus.toUpperCase();
      }

      // Update current temperature (4th column)
      const currentTempCell = row.querySelector(".current-temp-cell");
      if (currentTempCell) {
        currentTempCell.textContent = `${acData.currentTemp}°C`;
      }

      // Update target temperature (5th column)
      const targetTempCell = row.querySelector(".target-temp-cell");
      if (targetTempCell) {
        targetTempCell.textContent = `${acData.targetTemp}°C`;
      }

      // Update mode badge (6th column)
      const modeBadge = row.querySelector(".mode-badge");
      if (modeBadge) {
        modeBadge.className = `mode-badge ${acData.mode}`;
        modeBadge.textContent = acData.mode.toUpperCase();
      }

      const powerToggle = row.querySelector(".iphone-toggle input");
      if (powerToggle) {
        powerToggle.checked = acData.power;
      }

      // Update power status text
      const powerStatus = row.querySelector(".power-status");
      if (powerStatus) {
        powerStatus.className = `power-status ${acData.power ? "on" : "off"}`;
        const powerText = powerStatus.querySelector("span:last-child");
        if (powerText) {
          powerText.textContent = acData.power ? "ON" : "OFF";
        }
      }
    } else {
      console.warn(`Table row not found for AC: ${acId}`);
      this.updateDashboardTable();
    }
  }

  /**
   * Create table row element for AC data
   */
  createTableRow(acData) {
    const row = document.createElement("tr");
    row.setAttribute("data-ac-id", acData.id);

    // Determine status display based on power state
    const statusDisplay = acData.power ? "online" : "offline";

    row.innerHTML = `
      <td>${acData.id}</td>
      <td>${acData.location}</td>
      <td>
        <span class="status-badge ${statusDisplay}">${statusDisplay.toUpperCase()}</span>
      </td>
      <td class="current-temp-cell">${acData.currentTemp}°C</td>
      <td class="target-temp-cell">${acData.targetTemp}°C</td>
      <td>
        <span class="mode-badge ${
          acData.mode
        }">${acData.mode.toUpperCase()}</span>
      </td>
      <td>1.2 kW</td>
      <td>Just now</td>
      <td>
        <div class="toggle-container">
          <label class="iphone-toggle">
            <input type="checkbox" ${acData.power ? "checked" : ""} 
                   data-ac-id="${acData.id}" 
                   onchange="handleACPowerToggle(this)">
            <span class="toggle-slider"></span>
          </label>
          <div class="power-status ${acData.power ? "on" : "off"}">
            <span class="power-indicator-dot"></span>
            <span>${acData.power ? "ON" : "OFF"}</span>
          </div>
        </div>
      </td>
    `;

    console.log(
      "Created table row for",
      acData.id,
      "with power status:",
      acData.power ? "ON" : "OFF"
    );

    return row;
  }

  /**
   * Add visual update indicator
   */
  addUpdateIndicator(acId) {
    const row = document.querySelector(`tr[data-ac-id="${acId}"]`);

    if (row) {
      row.classList.add("data-updated");

      setTimeout(() => {
        row.classList.remove("data-updated");
      }, 2000);

      console.log(`Update indicator added for ${acId}`);
    }
  }
}

// Initialize AC SPA Manager when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.acSpaManager = new ACSpaManager();
  window.acSpaManager.init();
  console.log("AC SPA Manager ready!");
});
