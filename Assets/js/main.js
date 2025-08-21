// Main JavaScript - Core functionality and UI interactions
// This file focuses on UI initialization and basic interactions

class SmartACDashboard {
  constructor() {
    this.isInitialized = false;
    this.currentMode = "auto";
    this.currentTemp = 24;
    this.targetTemp = 22;
    this.isAIEnabled = true;
    this.isPoweredOn = false;

    this.init();
  }

  init() {
    if (this.isInitialized) return;

    this.initializeElements();
    this.setupEventListeners();
    this.updateUI();
    this.startDataRefresh();

    this.isInitialized = true;
    console.log("Smart AC Dashboard initialized successfully");
  }

  initializeElements() {
    // Cache DOM elements for better performance
    this.elements = {
      // Power control
      powerBtn: document.getElementById("power-btn"),
      statusIndicator: document.getElementById("status-indicator"),
      statusText: document.getElementById("status-text"),

      // Temperature control
      currentTempDisplay: document.getElementById("current-temp"),
      targetTempDisplay: document.getElementById("target-temp"),
      tempUpBtn: document.getElementById("temp-up"),
      tempDownBtn: document.getElementById("temp-down"),

      // Mode control
      modeButtons: document.querySelectorAll(".mode-btn"),
      autoModeBtn: document.getElementById("mode-auto"),
      coolModeBtn: document.getElementById("mode-cool"),
      dryModeBtn: document.getElementById("mode-dry"),
      fanModeBtn: document.getElementById("mode-fan"),

      // AI control
      aiToggle: document.getElementById("ai-control-toggle"),

      // Weather and environment
      outdoorTemp: document.getElementById("outdoor-temp"),
      humidityValue: document.getElementById("humidity-value"),
      humidityProgress: document.getElementById("humidity-progress"),
      weatherIcon: document.getElementById("weather-icon"),

      // Energy and carbon
      savingsPercentage: document.getElementById("savings-percentage"),
      kwhSaved: document.getElementById("kwh-saved"),
      carbonReduced: document.getElementById("carbon-reduced"),
      treesEquivalent: document.getElementById("trees-equivalent"),

      // Statistics
      totalConsumption: document.getElementById("total-consumption"),
      totalCost: document.getElementById("total-cost"),
      efficiencyScore: document.getElementById("efficiency-score"),

      // Chart controls
      chartButtons: document.querySelectorAll(".chart-btn"),

      // Device controls
      deviceToggles: document.querySelectorAll(
        '[id^="device-"][id$="-toggle"]'
      ),
      deviceCount: document.getElementById("device-count"),

      // Navigation
      navLinks: document.querySelectorAll(".nav-link"),

      // Responsive elements
      sidebar: document.querySelector(".nav-sidebar"),
    };

    // Validate critical elements
    this.validateElements();
  }

  validateElements() {
    const criticalElements = [
      "powerBtn",
      "currentTempDisplay",
      "targetTempDisplay",
    ];

    criticalElements.forEach((elementKey) => {
      if (!this.elements[elementKey]) {
        console.warn(`Critical element missing: ${elementKey}`);
      }
    });
  }

  setupEventListeners() {
    // Power control
    if (this.elements.powerBtn) {
      this.elements.powerBtn.addEventListener(
        "click",
        this.handlePowerToggle.bind(this)
      );
    }

    // Temperature controls
    if (this.elements.tempUpBtn) {
      this.elements.tempUpBtn.addEventListener(
        "click",
        this.handleTempUp.bind(this)
      );
    }

    if (this.elements.tempDownBtn) {
      this.elements.tempDownBtn.addEventListener(
        "click",
        this.handleTempDown.bind(this)
      );
    }

    // Mode controls
    this.elements.modeButtons.forEach((btn) => {
      btn.addEventListener("click", this.handleModeChange.bind(this));
    });

    // AI toggle
    if (this.elements.aiToggle) {
      this.elements.aiToggle.addEventListener(
        "change",
        this.handleAIToggle.bind(this)
      );
    }

    // Chart period controls
    this.elements.chartButtons.forEach((btn) => {
      btn.addEventListener("click", this.handleChartPeriodChange.bind(this));
    });

    // Device toggles
    this.elements.deviceToggles.forEach((toggle) => {
      toggle.addEventListener("change", this.handleDeviceToggle.bind(this));
    });

    // Navigation
    this.elements.navLinks.forEach((link) => {
      link.addEventListener("click", this.handleNavigation.bind(this));
    });

    // Responsive handlers
    this.setupResponsiveHandlers();

    // Global event listeners
    this.setupGlobalListeners();
  }

  setupResponsiveHandlers() {
    // Handle mobile menu toggle
    const mobileMenuToggle = document.createElement("button");
    mobileMenuToggle.className = "mobile-menu-toggle glass-btn";
    mobileMenuToggle.innerHTML = '<i class="fas fa-bars"></i>';
    mobileMenuToggle.style.display = "none";

    // Add mobile menu toggle to header
    const header = document.querySelector(".top-header");
    if (header) {
      header.appendChild(mobileMenuToggle);
    }

    // Mobile menu toggle handler
    mobileMenuToggle.addEventListener(
      "click",
      this.toggleMobileMenu.bind(this)
    );

    // Handle window resize
    window.addEventListener("resize", this.handleResize.bind(this));

    // Initial responsive check
    this.handleResize();
  }

  setupGlobalListeners() {
    // Handle keyboard shortcuts
    document.addEventListener(
      "keydown",
      this.handleKeyboardShortcuts.bind(this)
    );

    // Handle visibility change for performance
    document.addEventListener(
      "visibilitychange",
      this.handleVisibilityChange.bind(this)
    );

    // Handle online/offline status
    window.addEventListener("online", this.handleOnlineStatus.bind(this));
    window.addEventListener("offline", this.handleOfflineStatus.bind(this));
  }

  // Event Handlers
  handlePowerToggle() {
    this.isPoweredOn = !this.isPoweredOn;
    this.updatePowerStatus();
    this.logAction("power_toggle", { powered_on: this.isPoweredOn });
  }

  handleTempUp() {
    if (this.targetTemp < 30) {
      this.targetTemp++;
      this.updateTemperatureDisplay();
      this.logAction("temp_increase", { target_temp: this.targetTemp });
    }
  }

  handleTempDown() {
    if (this.targetTemp > 16) {
      this.targetTemp--;
      this.updateTemperatureDisplay();
      this.logAction("temp_decrease", { target_temp: this.targetTemp });
    }
  }

  handleModeChange(event) {
    const modeBtn = event.currentTarget;
    const newMode = modeBtn.dataset.mode;

    if (newMode && newMode !== this.currentMode) {
      this.currentMode = newMode;
      this.updateModeButtons();
      this.logAction("mode_change", { mode: this.currentMode });
    }
  }

  handleAIToggle(event) {
    this.isAIEnabled = event.target.checked;
    this.updateAIStatus();
    this.logAction("ai_toggle", { ai_enabled: this.isAIEnabled });
  }

  handleChartPeriodChange(event) {
    const period = event.currentTarget.dataset.period;

    // Remove active class from all chart buttons
    this.elements.chartButtons.forEach((btn) => btn.classList.remove("active"));

    // Add active class to clicked button
    event.currentTarget.classList.add("active");

    // Update chart (this will be handled by chart.js)
    this.updateChartPeriod(period);
    this.logAction("chart_period_change", { period });
  }

  handleDeviceToggle(event) {
    const deviceId = event.target.id;
    const isEnabled = event.target.checked;

    this.updateDeviceStatus(deviceId, isEnabled);
    this.logAction("device_toggle", {
      device_id: deviceId,
      enabled: isEnabled,
    });
  }

  handleNavigation(event) {
    event.preventDefault();

    const navItem = event.currentTarget.closest(".nav-item");

    // Remove active class from all nav items
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.remove("active");
    });

    // Add active class to clicked item
    navItem.classList.add("active");

    const navId = event.currentTarget.id;
    this.logAction("navigation", { nav_id: navId });
  }

  handleKeyboardShortcuts(event) {
    // Only handle shortcuts when not typing in inputs
    if (
      event.target.tagName === "INPUT" ||
      event.target.tagName === "TEXTAREA"
    ) {
      return;
    }

    switch (event.key) {
      case " ": // Spacebar for power toggle
        event.preventDefault();
        this.handlePowerToggle();
        break;
      case "ArrowUp":
        event.preventDefault();
        this.handleTempUp();
        break;
      case "ArrowDown":
        event.preventDefault();
        this.handleTempDown();
        break;
      case "1":
        this.setMode("auto");
        break;
      case "2":
        this.setMode("cool");
        break;
      case "3":
        this.setMode("dry");
        break;
      case "4":
        this.setMode("fan");
        break;
    }
  }

  handleResize() {
    const isMobile = window.innerWidth <= 991.98;
    const mobileToggle = document.querySelector(".mobile-menu-toggle");

    if (mobileToggle) {
      mobileToggle.style.display = isMobile ? "block" : "none";
    }

    // Close mobile menu on resize to desktop
    if (!isMobile && this.elements.sidebar) {
      this.elements.sidebar.classList.remove("mobile-open");
    }
  }

  handleVisibilityChange() {
    if (document.hidden) {
      // Pause updates when tab is not visible
      this.pauseDataRefresh();
    } else {
      // Resume updates when tab becomes visible
      this.resumeDataRefresh();
    }
  }

  handleOnlineStatus() {
    console.log("Connection restored");
    this.showNotification("Connection restored", "success");
    this.resumeDataRefresh();
  }

  handleOfflineStatus() {
    console.log("Connection lost");
    this.showNotification("Connection lost. Working offline.", "warning");
    this.pauseDataRefresh();
  }

  toggleMobileMenu() {
    if (this.elements.sidebar) {
      this.elements.sidebar.classList.toggle("mobile-open");
    }
  }

  // UI Update Methods
  updateUI() {
    this.updatePowerStatus();
    this.updateTemperatureDisplay();
    this.updateModeButtons();
    this.updateAIStatus();
    this.updateEnvironmentData();
    this.updateEnergyData();
    this.updateDeviceList();
    this.updateStatistics();
  }

  updatePowerStatus() {
    if (this.elements.powerBtn) {
      if (this.isPoweredOn) {
        this.elements.powerBtn.classList.add("active");
      } else {
        this.elements.powerBtn.classList.remove("active");
      }
    }

    if (this.elements.statusIndicator) {
      if (this.isPoweredOn) {
        this.elements.statusIndicator.classList.add("on");
        this.elements.statusIndicator.classList.remove("off");
      } else {
        this.elements.statusIndicator.classList.add("off");
        this.elements.statusIndicator.classList.remove("on");
      }
    }

    if (this.elements.statusText) {
      this.elements.statusText.textContent = this.isPoweredOn
        ? "Online"
        : "Offline";
    }
  }

  updateTemperatureDisplay() {
    if (this.elements.currentTempDisplay) {
      this.elements.currentTempDisplay.textContent = this.currentTemp;
    }

    if (this.elements.targetTempDisplay) {
      this.elements.targetTempDisplay.textContent = this.targetTemp;
    }
  }

  updateModeButtons() {
    this.elements.modeButtons.forEach((btn) => {
      const mode = btn.dataset.mode;
      if (mode === this.currentMode) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  updateAIStatus() {
    if (this.elements.aiToggle) {
      this.elements.aiToggle.checked = this.isAIEnabled;
    }
  }

  updateEnvironmentData() {
    // Simulate environment data updates
    const outdoorTemp = 28 + Math.random() * 6; // 28-34°C
    const humidity = 60 + Math.random() * 20; // 60-80%

    if (this.elements.outdoorTemp) {
      this.elements.outdoorTemp.textContent = Math.round(outdoorTemp);
    }

    if (this.elements.humidityValue) {
      this.elements.humidityValue.textContent = Math.round(humidity);
    }

    if (this.elements.humidityProgress) {
      // Update humidity circle progress
      const degrees = (humidity / 100) * 360;
      this.elements.humidityProgress.style.background = `conic-gradient(var(--accent-blue) 0deg, var(--accent-blue) ${degrees}deg, rgba(255, 255, 255, 0.1) ${degrees}deg)`;
    }
  }

  updateEnergyData() {
    // Simulate energy data
    const savingsPercentage = 15 + Math.random() * 15; // 15-30%
    const kwhSaved = 40 + Math.random() * 20; // 40-60 kWh
    const carbonReduced = kwhSaved * 0.4; // Approximate carbon factor
    const treesEquivalent = carbonReduced / 8; // Approximate trees factor

    if (this.elements.savingsPercentage) {
      this.elements.savingsPercentage.textContent =
        Math.round(savingsPercentage);
    }

    if (this.elements.kwhSaved) {
      this.elements.kwhSaved.textContent = kwhSaved.toFixed(1);
    }

    if (this.elements.carbonReduced) {
      this.elements.carbonReduced.textContent = carbonReduced.toFixed(1);
    }

    if (this.elements.treesEquivalent) {
      this.elements.treesEquivalent.textContent = treesEquivalent.toFixed(1);
    }

    // Update savings circle
    const savingsCircle = document.querySelector(".savings-circle");
    if (savingsCircle) {
      const degrees = (savingsPercentage / 100) * 360;
      savingsCircle.style.background = `conic-gradient(var(--accent-green) 0deg, var(--accent-green) ${degrees}deg, rgba(255, 255, 255, 0.1) ${degrees}deg)`;
    }
  }

  updateDeviceList() {
    // Update device count
    const onlineDevices = document.querySelectorAll(
      '[id^="device-"][id$="-toggle"]:checked'
    ).length;
    const totalDevices = document.querySelectorAll(
      '[id^="device-"][id$="-toggle"]'
    ).length;

    if (this.elements.deviceCount) {
      this.elements.deviceCount.textContent = `${onlineDevices}/${totalDevices} Online`;
    }
  }

  updateStatistics() {
    // Simulate statistics updates
    const consumption = 200 + Math.random() * 100; // 200-300 kWh
    const cost = consumption * 3.6; // VND per kWh
    const efficiency = 80 + Math.random() * 15; // 80-95%

    if (this.elements.totalConsumption) {
      this.elements.totalConsumption.textContent = consumption.toFixed(1);
    }

    if (this.elements.totalCost) {
      this.elements.totalCost.textContent = Math.round(cost);
    }

    if (this.elements.efficiencyScore) {
      this.elements.efficiencyScore.textContent = Math.round(efficiency);
    }
  }

  updateDeviceStatus(deviceId, isEnabled) {
    // Update device status display
    const deviceItem = document
      .querySelector(`#${deviceId}`)
      .closest(".device-item");
    const statusText = deviceItem.querySelector(".device-status");

    if (statusText) {
      if (isEnabled) {
        statusText.textContent = statusText.textContent.replace(
          "Standby",
          "Active"
        );
      } else {
        statusText.textContent = statusText.textContent.replace(
          "Active",
          "Standby"
        );
      }
    }

    this.updateDeviceList();
  }

  updateChartPeriod(period) {
    // This method will be called by chart.js
    const event = new CustomEvent("chartPeriodChange", { detail: { period } });
    document.dispatchEvent(event);
  }

  // Data Management
  startDataRefresh() {
    this.dataRefreshInterval = setInterval(() => {
      this.updateEnvironmentData();
      this.updateEnergyData();
    }, 5000); // Update every 5 seconds
  }

  pauseDataRefresh() {
    if (this.dataRefreshInterval) {
      clearInterval(this.dataRefreshInterval);
    }
  }

  resumeDataRefresh() {
    this.pauseDataRefresh();
    this.startDataRefresh();
  }

  // Utility Methods
  setMode(mode) {
    if (["auto", "cool", "dry", "fan"].includes(mode)) {
      this.currentMode = mode;
      this.updateModeButtons();
    }
  }

  showNotification(message, type = "info") {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `alert-glass alert-${type}-glass`;
    notification.innerHTML = `
            <div class="alert-icon-glass">
                <i class="fas fa-${this.getIconForType(type)}"></i>
            </div>
            <div class="alert-content-glass">
                <p class="alert-message-glass">${message}</p>
            </div>
        `;

    // Add to page
    document.body.appendChild(notification);

    // Position notification
    notification.style.position = "fixed";
    notification.style.top = "20px";
    notification.style.right = "20px";
    notification.style.zIndex = "9999";
    notification.style.maxWidth = "300px";

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  getIconForType(type) {
    const icons = {
      success: "check-circle",
      warning: "exclamation-triangle",
      error: "times-circle",
      info: "info-circle",
    };
    return icons[type] || "info-circle";
  }

  logAction(action, data = {}) {
    // Log user actions for analytics
    const logData = {
      timestamp: new Date().toISOString(),
      action,
      data,
      user_agent: navigator.userAgent,
      url: window.location.href,
    };

    console.log("Action logged:", logData);

    // In a real application, you would send this to your analytics service
    // analytics.track(action, logData);
  }

  // Cleanup
  destroy() {
    this.pauseDataRefresh();

    // Remove event listeners
    window.removeEventListener("resize", this.handleResize);
    document.removeEventListener("keydown", this.handleKeyboardShortcuts);
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange
    );
    window.removeEventListener("online", this.handleOnlineStatus);
    window.removeEventListener("offline", this.handleOfflineStatus);

    this.isInitialized = false;
    console.log("Smart AC Dashboard destroyed");
  }
}

// Initialize the dashboard when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.smartACDashboard = new SmartACDashboard();
});

// Handle page unload
window.addEventListener("beforeunload", () => {
  if (window.smartACDashboard) {
    window.smartACDashboard.destroy();
  }
});
