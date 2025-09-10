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
    this.loadAllACConfigurations();
    this.setupConfigurationEventListeners();
    this.loadAndApplyACConfiguration();

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

    // Load and apply AC configuration from Configuration Manager
    this.loadAndApplyACConfiguration(acId);

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

    // Update temperature recommendation widget (Vietnamese version)
    if (window.energyEfficiencyManager) {
      const recommendationWidget = document.getElementById(
        "spa-temp-recommendation-widget"
      );
      if (recommendationWidget) {
        recommendationWidget.innerHTML =
          window.energyEfficiencyManager.createTemperatureRecommendationWidgetVN(
            acData
          );
      }
    }

    // Update AC configuration display if exists
    this.updateACConfigurationDisplay(acId);
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

      // Update energy usage with efficiency indicator (7th column)
      const energyUsageCell = row.querySelector(".energy-usage-cell");
      if (energyUsageCell && acData.power && window.energyEfficiencyManager) {
        const currentPower = (acData.voltage || 220) * (acData.current || 5);
        const efficiencyData =
          window.energyEfficiencyManager.calculateEfficiency(
            acData.targetTemp,
            currentPower,
            30 // Default outdoor temp
          );
        const efficiencyArrow =
          window.energyEfficiencyManager.createEfficiencyArrow(efficiencyData);
        energyUsageCell.innerHTML = `${(currentPower / 1000).toFixed(
          1
        )} kW ${efficiencyArrow}`;
      }

      // Update efficiency badge in status column
      const statusColumn = row.querySelector("td:nth-child(3)");
      if (statusColumn && acData.power && window.energyEfficiencyManager) {
        const currentPower = (acData.voltage || 220) * (acData.current || 5);
        const configStatus = this.getACConfigurationStatus(acId);

        // Use configured AC calculation if available, otherwise use legacy method
        let efficiencyData;
        if (configStatus.configured) {
          efficiencyData =
            window.energyEfficiencyManager.calculateEfficiencyForAC(
              acId,
              acData.targetTemp,
              currentPower,
              30
            );
        } else {
          efficiencyData = window.energyEfficiencyManager.calculateEfficiency(
            acData.targetTemp,
            currentPower,
            30
          );
        }

        const efficiencyBadge =
          window.energyEfficiencyManager.createEfficiencyBadge(efficiencyData);

        // Remove old efficiency badge if exists
        const oldEfficiencyBadge =
          statusColumn.querySelector(".efficiency-badge");
        if (oldEfficiencyBadge) {
          oldEfficiencyBadge.remove();
        }

        // Add new efficiency badge
        statusColumn.insertAdjacentHTML("beforeend", efficiencyBadge);

        // Update config badge if needed
        const configBadge = statusColumn.querySelector(".config-badge");
        if (configBadge) {
          configBadge.className = `config-badge ${
            configStatus.configured ? "configured" : "not-configured"
          }`;
          configBadge.title = configStatus.message;
        }
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

    // Get AC configuration status
    const configStatus = this.getACConfigurationStatus(acData.id);
    const configBadge = configStatus.configured
      ? '<span class="config-badge configured" title="Configured with custom specifications"><i class="fas fa-cog"></i></span>'
      : '<span class="config-badge not-configured" title="Using default calculations"><i class="fas fa-exclamation-triangle"></i></span>';

    // Calculate energy efficiency for this AC
    let efficiencyData = null;
    let efficiencyBadge = "";
    let energyUsageWithIndicator = "1.2 kW";

    if (acData.power && window.energyEfficiencyManager) {
      const currentPower = (acData.voltage || 220) * (acData.current || 5);

      // Use configured AC calculation if available, otherwise use legacy method
      if (configStatus.configured) {
        efficiencyData =
          window.energyEfficiencyManager.calculateEfficiencyForAC(
            acData.id,
            acData.targetTemp,
            currentPower,
            30 // Default outdoor temp, can be dynamic later
          );
      } else {
        efficiencyData = window.energyEfficiencyManager.calculateEfficiency(
          acData.targetTemp,
          currentPower,
          30 // Default outdoor temp, can be dynamic later
        );
      }

      efficiencyBadge =
        window.energyEfficiencyManager.createEfficiencyBadge(efficiencyData);
      const efficiencyArrow =
        window.energyEfficiencyManager.createEfficiencyArrow(efficiencyData);
      energyUsageWithIndicator = `${(currentPower / 1000).toFixed(
        1
      )} kW ${efficiencyArrow}`;
    }

    row.innerHTML = `
      <td>${acData.id}</td>
      <td>${acData.location}</td>
      <td>
        <span class="status-badge ${statusDisplay}">${statusDisplay.toUpperCase()}</span>
        ${configBadge}
        ${efficiencyBadge}
      </td>
      <td class="current-temp-cell">${acData.currentTemp}°C</td>
      <td class="target-temp-cell">${acData.targetTemp}°C</td>
      <td>
        <span class="mode-badge ${
          acData.mode
        }">${acData.mode.toUpperCase()}</span>
      </td>
      <td class="energy-usage-cell">${energyUsageWithIndicator}</td>
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
      acData.power ? "ON" : "OFF",
      "configured:",
      configStatus.configured
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

  /**
   * Load and apply AC configuration from Configuration Manager
   */
  loadAndApplyACConfiguration(acId) {
    if (!window.acConfigManager || !window.energyEfficiencyManager) {
      console.warn(
        "AC Configuration Manager or Energy Efficiency Manager not available"
      );
      return;
    }

    // Get configuration from Configuration Manager
    const acConfig = window.acConfigManager.getACConfiguration(acId);

    if (acConfig) {
      console.log(`Loading configuration for AC ${acId}:`, acConfig);

      // Apply configuration to Energy Efficiency Manager
      try {
        window.energyEfficiencyManager.configureACUnit(acId, {
          type: acConfig.hpCapacity,
          technology: acConfig.technology,
          roomSize:
            acConfig.roomSizeCategory ||
            this.calculateRoomSizeCategory(acConfig.roomArea),
          energyCostPerKWh: acConfig.energyCostPerKWh || 0.12,
          brand: acConfig.brand,
          model: acConfig.model,
          roomArea: acConfig.roomArea,
          roomType: acConfig.roomType,
          defaultTempRange: acConfig.defaultTempRange,
        });

        console.log(
          `Configuration applied to Energy Efficiency Manager for ${acId}`
        );

        // Emit event for successful configuration load
        if (window.acEventSystem) {
          window.acEventSystem.emit("ac-configuration-loaded", {
            acId: acId,
            configuration: acConfig,
          });
        }
      } catch (error) {
        console.error(`Failed to apply configuration for ${acId}:`, error);
      }
    } else {
      console.log(
        `No configuration found for AC ${acId} - using default calculations`
      );
    }
  }

  /**
   * Calculate room size category based on area
   */
  calculateRoomSizeCategory(area) {
    if (area <= 20) return "small";
    if (area <= 35) return "medium";
    if (area <= 50) return "large";
    return "xlarge";
  }

  /**
   * Update AC configuration display in control interface
   */
  updateACConfigurationDisplay(acId) {
    if (!window.acConfigManager) {
      return;
    }

    const acConfig = window.acConfigManager.getACConfiguration(acId);
    const configDisplay = document.getElementById("spa-ac-config-display");

    if (configDisplay) {
      if (acConfig) {
        configDisplay.innerHTML = `
          <div class="ac-config-info">
            <div class="config-item">
              <span class="config-label">Capacity:</span>
              <span class="config-value">${acConfig.hpCapacity}</span>
            </div>
            <div class="config-item">
              <span class="config-label">Technology:</span>
              <span class="config-value">${acConfig.technology}</span>
            </div>
            <div class="config-item">
              <span class="config-label">Room:</span>
              <span class="config-value">${acConfig.roomArea}m² (${
          acConfig.roomType
        })</span>
            </div>
            <div class="config-item">
              <span class="config-label">Brand:</span>
              <span class="config-value">${acConfig.brand || "N/A"}</span>
            </div>
          </div>
        `;
        configDisplay.style.display = "block";
      } else {
        configDisplay.innerHTML = `
          <div class="ac-config-warning">
            <i class="fas fa-exclamation-triangle"></i>
            <span>AC not configured. Configure in Settings for accurate efficiency calculations.</span>
            <button onclick="window.spaApp.navigateTo('settings')" class="btn-configure">Configure Now</button>
          </div>
        `;
        configDisplay.style.display = "block";
      }
    }
  }

  /**
   * Get AC configuration status
   */
  getACConfigurationStatus(acId) {
    if (!window.acConfigManager) {
      return {
        configured: false,
        message: "Configuration Manager not available",
      };
    }

    const isConfigured = window.acConfigManager.isACConfigured(acId);
    return {
      configured: isConfigured,
      message: isConfigured
        ? "AC is configured with custom specifications"
        : "AC using default calculations - configure for better accuracy",
    };
  }

  /**
   * Load all AC configurations on initialization
   */
  loadAllACConfigurations() {
    if (!window.acConfigManager || !window.energyEfficiencyManager) {
      console.warn("Configuration managers not available - will retry later");
      // Retry after a delay
      setTimeout(() => {
        this.loadAllACConfigurations();
      }, 1000);
      return;
    }

    console.log("Loading all AC configurations...");

    // Get all configured AC IDs from Configuration Manager
    const configuredACIds = window.acConfigManager.getConfiguredACIds();

    configuredACIds.forEach((acId) => {
      this.loadAndApplyACConfiguration(acId);
    });

    console.log(`Loaded configurations for ${configuredACIds.length} AC units`);
  }

  /**
   * Setup configuration event listeners
   */
  setupConfigurationEventListeners() {
    if (!window.acEventSystem) {
      console.warn("Event system not available for configuration listeners");
      return;
    }

    // Listen for AC configuration saved events
    window.acEventSystem.on("ac-configuration-saved", (eventData) => {
      const { acId, configuration } = eventData;
      console.log(`Configuration saved for ${acId}, reloading...`);

      // Reload configuration for this AC
      this.loadAndApplyACConfiguration(acId);

      // Update dashboard if currently on dashboard
      if (window.spaApp?.getCurrentPage() === "dashboard") {
        this.updateDashboardTableRow(acId, this.getACData(acId));
      }

      // Update control interface if this AC is currently selected
      if (this.selectedAC === acId) {
        this.updateACConfigurationDisplay(acId);
      }
    });

    // Listen for configuration deletions
    window.acEventSystem.on("ac-configuration-deleted", (eventData) => {
      const { acId } = eventData;
      console.log(`Configuration deleted for ${acId}`);

      // Remove configuration from Energy Efficiency Manager
      if (window.energyEfficiencyManager?.removeACConfiguration) {
        window.energyEfficiencyManager.removeACConfiguration(acId);
      }

      // Update displays
      if (window.spaApp?.getCurrentPage() === "dashboard") {
        this.updateDashboardTableRow(acId, this.getACData(acId));
      }

      if (this.selectedAC === acId) {
        this.updateACConfigurationDisplay(acId);
      }
    });

    console.log("Configuration event listeners setup complete");
  }

  /**
   * Refresh AC configuration for specific AC
   */
  refreshACConfiguration(acId) {
    console.log(`Refreshing configuration for ${acId}`);
    this.loadAndApplyACConfiguration(acId);

    // Update relevant displays
    if (window.spaApp?.getCurrentPage() === "dashboard") {
      this.updateDashboardTableRow(acId, this.getACData(acId));
    }

    if (this.selectedAC === acId) {
      this.updateACConfigurationDisplay(acId);

      // Refresh recommendation widget
      if (window.energyEfficiencyManager) {
        const recommendationWidget = document.getElementById(
          "spa-temp-recommendation-widget"
        );
        if (recommendationWidget) {
          const acData = this.getACData(acId);
          recommendationWidget.innerHTML =
            window.energyEfficiencyManager.createTemperatureRecommendationWidgetVN(
              acData
            );
        }
      }
    }
  }
}

// Initialize AC SPA Manager when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Initialize Energy Efficiency Manager first
  if (typeof EnergyEfficiencyManager !== "undefined") {
    window.energyEfficiencyManager = new EnergyEfficiencyManager();
    console.log("Energy Efficiency Manager initialized");
  }

  // Initialize AC SPA Manager
  window.acSpaManager = new ACSpaManager();
  window.acSpaManager.init();
  console.log("AC SPA Manager ready!");
});
