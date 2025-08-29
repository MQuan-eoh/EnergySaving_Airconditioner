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
   * Update AC data
   */
  updateACData(acId, newData) {
    if (this.acData[acId]) {
      this.acData[acId] = { ...this.acData[acId], ...newData };
      console.log("AC data updated:", acId, this.acData[acId]);
    }
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
}

// Initialize AC SPA Manager when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.acSpaManager = new ACSpaManager();
  window.acSpaManager.init();
  console.log("AC SPA Manager ready!");
});
