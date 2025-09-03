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
        power: false,
      },
    };
  }

  /**
   * Initialize AC SPA Manager
   */
  init() {
    console.log("AC SPA Manager initialized");
    this.setupACTableHandlers();
    this.updateDashboardStats();
    this.setupDashboardAutoRefresh(); // Add event-driven auto refresh
  }

  /**
   * Setup dashboard auto-refresh using Event-Driven Architecture
   */
  setupDashboardAutoRefresh() {
    if (window.acEventSystem) {
      // Subscribe to AC data change events
      window.acEventSystem.on("ac-data-updated", (eventData) => {
        const { acId, data, changes } = eventData;

        console.log("Dashboard received AC update:", acId, changes);

        // Update specific table row if on dashboard
        if (window.spaApp?.getCurrentPage() === "dashboard") {
          this.updateDashboardTableRow(acId, data);
          this.updateDashboardStats();
        }

        // Show visual feedback
        this.addUpdateIndicator(acId);
      });

      console.log("Dashboard auto-refresh event listeners setup complete");
    } else {
      console.error("Event system not available for dashboard auto-refresh");
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
   * Enhanced version with Event-Driven Architecture
   */
  updateACDataRealtime(acId, newData) {
    if (this.acData[acId]) {
      // Store old data for comparison
      const oldData = { ...this.acData[acId] };

      // Merge new data with existing data using spread operator
      this.acData[acId] = {
        ...this.acData[acId],
        ...newData,
        lastUpdated: new Date().toISOString(), // Add timestamp
      };

      console.log("AC data updated:", acId, this.acData[acId]);

      // Emit event for real-time updates using Event System
      if (window.acEventSystem) {
        window.acEventSystem.emit("ac-data-updated", {
          acId: acId,
          data: this.acData[acId],
          oldData: oldData,
          changes: newData,
        });
      }

      // Update dashboard if currently on dashboard page
      if (window.spaApp?.getCurrentPage() === "dashboard") {
        this.updateDashboardTable();
        this.updateDashboardStats();
      }

      // Add visual indicator for real-time feedback
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
    const onlineCount = allACs.filter((ac) => ac.status === "online").length;
    const offlineCount = allACs.filter((ac) => ac.status === "offline").length;
    const totalCount = allACs.length;

    // Update dashboard counters
    const onlineEl = document.getElementById("spa-dashboard-online");
    const offlineEl = document.getElementById("spa-dashboard-offline");
    const totalEl = document.getElementById("spa-dashboard-total");

    if (onlineEl) onlineEl.textContent = onlineCount;
    if (offlineEl) offlineEl.textContent = offlineCount;
    if (totalEl) totalEl.textContent = totalCount;
  }

  /**
   * Update dashboard table with real-time data
   * Regenerates the entire table with current data
   */
  updateDashboardTable() {
    const tableBody = document.getElementById("spa-ac-table-body");
    if (!tableBody) {
      console.warn("Dashboard table body not found");
      return;
    }

    // Clear existing rows
    tableBody.innerHTML = "";

    // Generate new rows with current data
    const allACs = this.getAllACData();
    allACs.forEach((acData) => {
      const row = this.createTableRow(acData);
      tableBody.appendChild(row);
    });

    console.log("Dashboard table updated with latest data");
  }

  /**
   * Update specific dashboard table row
   * More efficient than updating entire table
   */
  updateDashboardTableRow(acId, acData) {
    const row = document.querySelector(`tr[data-ac-id="${acId}"]`);

    if (row) {
      // Update temperature values
      const currentTempCell = row.querySelector(".current-temp-cell");
      const targetTempCell = row.querySelector(".target-temp-cell");

      if (currentTempCell) {
        currentTempCell.textContent = `${acData.currentTemp}°C`;
      }

      if (targetTempCell) {
        targetTempCell.textContent = `${acData.targetTemp}°C`;
      }

      // Update status badge
      const statusBadge = row.querySelector(".status-badge");
      if (statusBadge) {
        statusBadge.classList.remove("online", "offline");
        statusBadge.classList.add(acData.status);
        statusBadge.textContent = acData.status.toUpperCase();
      }

      // Update mode badge
      const modeBadge = row.querySelector(".mode-badge");
      if (modeBadge) {
        modeBadge.className = `mode-badge ${acData.mode}`;
        modeBadge.textContent = acData.mode.toUpperCase();
      }

      // Update power toggle
      const powerToggle = row.querySelector(".iphone-toggle input");
      if (powerToggle) {
        powerToggle.checked = acData.power;
      }

      console.log(`Updated table row for ${acId}`);
    } else {
      console.warn(`Table row not found for AC: ${acId}`);
      // If row doesn't exist, rebuild entire table
      this.updateDashboardTable();
    }
  }

  /**
   * Create table row element for AC data
   * Helper method for table generation
   */
  createTableRow(acData) {
    const row = document.createElement("tr");
    row.setAttribute("data-ac-id", acData.id);

    row.innerHTML = `
      <td>${acData.id}</td>
      <td>${acData.location}</td>
      <td class="current-temp-cell">${acData.currentTemp}°C</td>
      <td class="target-temp-cell">${acData.targetTemp}°C</td>
      <td>
        <span class="status-badge ${
          acData.status
        }">${acData.status.toUpperCase()}</span>
      </td>
      <td>
        <span class="mode-badge ${
          acData.mode
        }">${acData.mode.toUpperCase()}</span>
      </td>
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

    return row;
  }

  /**
   * Add visual indicator when AC data updates
   * Provides user feedback for real-time changes
   */
  addUpdateIndicator(acId) {
    const row = document.querySelector(`tr[data-ac-id="${acId}"]`);

    if (row) {
      // Add highlight effect
      row.classList.add("data-updated");

      // Remove highlight after 2 seconds
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
