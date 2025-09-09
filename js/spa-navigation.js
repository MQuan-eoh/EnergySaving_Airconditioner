/**
 * Smart AC SPA Navigation System
 * Handles page transitions, navigation, and UI management
 */
class SmartACSPA {
  constructor() {
    this.currentPage = "dashboard";
    this.init();
  }

  init() {
    this.setupNavigation();
    this.setupModalHandlers();
    this.setupFixedBackButton();
    this.setupFullscreenToggle();
    this.showDefaultPage();
    console.log("Smart AC SPA initialized successfully");
  }

  /**
   * Show default page on initial load
   */
  showDefaultPage() {
    // Hide all pages first to ensure clean state
    document.querySelectorAll(".page").forEach((page) => {
      page.classList.remove("active");
    });

    // Remove active class from all nav items
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.remove("active");
    });

    // Show dashboard page by default
    const dashboardPage = document.getElementById("dashboard-page");
    if (dashboardPage) {
      dashboardPage.classList.add("active");
      console.log("Dashboard page activated as default");
    }

    // Set dashboard nav item as active
    const dashboardNavItem = document.querySelector('[data-page="dashboard"]');
    if (dashboardNavItem) {
      const navItem = dashboardNavItem.closest(".nav-item");
      if (navItem) {
        navItem.classList.add("active");
        console.log("Dashboard nav item activated");
      }
    }

    // Update page title
    this.updatePageTitle("dashboard");
  }

  /**
   * Setup fixed back button functionality with scroll detection
   */
  setupFixedBackButton() {
    this.fixedBackBtn = document.getElementById("fixed-back-btn");
    this.isFixedBackVisible = false;
    this.scrollTimer = null;

    // Create debounced scroll handler for better performance
    const debouncedScrollHandler = () => {
      if (this.scrollTimer) {
        clearTimeout(this.scrollTimer);
      }
      this.scrollTimer = setTimeout(() => {
        this.handleScroll();
      }, 16); // ~60fps
    };

    // Add scroll listener for main content area
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.addEventListener("scroll", debouncedScrollHandler, {
        passive: true,
      });
    }

    // Also listen to window scroll as fallback
    window.addEventListener("scroll", debouncedScrollHandler, {
      passive: true,
    });

    console.log("Fixed back button functionality initialized");
  }

  /**
   * Handle scroll events to show/hide fixed back button
   */
  handleScroll() {
    if (!this.fixedBackBtn) return;

    // Only show on non-dashboard pages
    if (this.currentPage === "dashboard") {
      this.hideFixedBackButton();
      return;
    }

    // TECH LEAD SOLUTION: Keep button always visible on non-dashboard pages
    // The button should be shown immediately when page loads, not just on scroll
    if (!this.isFixedBackVisible) {
      this.showFixedBackButton();
    }

    // No need to hide timer since user wants button always visible
  }

  /**
   * Show fixed back button with animation
   */
  showFixedBackButton() {
    if (!this.fixedBackBtn || this.isFixedBackVisible) return;

    // Remove hidden class and prepare for animation
    this.fixedBackBtn.classList.remove("hidden");
    this.fixedBackBtn.style.opacity = "0";
    this.fixedBackBtn.style.transform = "translateY(20px) scale(0.8)";

    // Force reflow
    this.fixedBackBtn.offsetHeight;

    // Animate in
    this.fixedBackBtn.style.transition =
      "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
    this.fixedBackBtn.style.opacity = "1";
    this.fixedBackBtn.style.transform = "translateY(0) scale(1)";

    this.isFixedBackVisible = true;

    // Hide header back button to avoid duplication
    this.hideHeaderBackButton();

    console.log("Fixed back button shown");
  }

  /**
   * Hide fixed back button with animation
   */
  hideFixedBackButton() {
    if (!this.fixedBackBtn || !this.isFixedBackVisible) return;

    this.fixedBackBtn.style.transition =
      "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
    this.fixedBackBtn.style.opacity = "0";
    this.fixedBackBtn.style.transform = "translateY(20px) scale(0.8)";

    setTimeout(() => {
      this.fixedBackBtn.classList.add("hidden");
      // Reset styles
      this.fixedBackBtn.style.opacity = "";
      this.fixedBackBtn.style.transform = "";
      this.fixedBackBtn.style.transition = "";
    }, 300);

    this.isFixedBackVisible = false;

    // Show header back button again
    this.showHeaderBackButton();

    console.log("Fixed back button hidden");
  }

  /**
   * Hide header back button
   */
  hideHeaderBackButton() {
    const headerRight = document.querySelector(".header-right");
    if (headerRight) {
      headerRight.classList.add("header-back-hidden");
    }
  }

  /**
   * Show header back button
   */
  showHeaderBackButton() {
    const headerRight = document.querySelector(".header-right");
    if (headerRight) {
      headerRight.classList.remove("header-back-hidden");
    }
  }

  /**
   * Setup modal event handlers
   */
  setupModalHandlers() {
    // Close modal when clicking outside
    document.addEventListener("click", (e) => {
      const modal = document.getElementById("spa-add-modal");
      if (e.target === modal) {
        this.closeAddModal();
      }
    });

    // AC table handlers are now managed by ACSpaManager
  }

  /**
   * Setup navigation event listeners
   */
  setupNavigation() {
    const navLinks = document.querySelectorAll(".spa-nav-link");
    navLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const page = link.getAttribute("data-page");
        this.navigateToPage(page);
      });
    });
  }

  /**
   * Navigate to specified page
   * @param {string} page - Page name to navigate to
   */
  navigateToPage(page) {
    if (this.currentPage === page) return;

    // Hide current page
    const currentPageEl = document.getElementById(`${this.currentPage}-page`);
    if (currentPageEl) {
      currentPageEl.classList.remove("active");
    }

    // Show new page
    const newPageEl = document.getElementById(`${page}-page`);
    if (newPageEl) {
      newPageEl.classList.add("active");
    }

    // Update navigation
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.remove("active");
    });

    const activeNavItem = document
      .querySelector(`[data-page="${page}"]`)
      .closest(".nav-item");
    if (activeNavItem) {
      activeNavItem.classList.add("active");
    }

    // Update page title
    this.updatePageTitle(page);

    // Update previous page
    this.previousPage = this.currentPage;
    this.currentPage = page;

    // Initialize page-specific functionality
    this.initializePageFunctionality(page);

    // Manage fixed back button based on page
    this.manageFixedBackButtonForPage(page);

    console.log(`Navigated to page: ${page}`);
  }

  /**
   * Initialize page-specific functionality
   * @param {string} page - Page name
   */
  initializePageFunctionality(page) {
    switch (page) {
      case "settings":
        // Initialize AC Configuration Manager for settings page
        this.initializeSettingsPage();
        break;
      case "control":
        // Initialize temperature chart if needed
        if (
          window.temperatureUsageChart &&
          !window.temperatureUsageChart.isInitialized
        ) {
          setTimeout(() => {
            window.temperatureUsageChart.initializeChart();
          }, 500);
        }
        break;
      case "energy":
        // Initialize energy management components
        this.initializeEnergyPage();
        break;
      case "analytics":
        // Initialize analytics components
        this.initializeAnalyticsPage();
        break;
    }
  }

  /**
   * Initialize settings page functionality
   */
  initializeSettingsPage() {
    console.log("Initializing settings page functionality");

    // Initialize AC Configuration Manager if available
    if (window.ACConfigurationManager) {
      setTimeout(() => {
        if (!window.acConfigManager) {
          window.acConfigManager = new window.ACConfigurationManager();
          console.log("AC Configuration Manager initialized for settings page");
        } else {
          // Refresh the configuration table if manager already exists
          window.acConfigManager.loadACConfigurations();
          console.log("AC Configuration Manager refreshed");
        }
      }, 100);
    } else {
      console.warn("AC Configuration Manager not available");
    }
  }

  /**
   * Initialize energy page functionality
   */
  initializeEnergyPage() {
    console.log("Initializing energy page functionality");
    // Energy page specific initialization can be added here
  }

  /**
   * Initialize analytics page functionality
   */
  initializeAnalyticsPage() {
    console.log("Initializing analytics page functionality");
    // Analytics page specific initialization can be added here
  }

  /**
   * Manage fixed back button visibility based on current page
   * @param {string} page - Current page name
   */
  manageFixedBackButtonForPage(page) {
    if (page === "dashboard") {
      // Always hide on dashboard
      this.hideFixedBackButton();
      this.showHeaderBackButton();
    } else {
      // On other pages, always show the fixed back button immediately and keep it visible
      this.showFixedBackButton();
      // Set flag to keep it always visible on non-dashboard pages
      this.isFixedBackVisible = true;
    }
  }

  /**
   * Update page title and subtitle
   * @param {string} page - Page name
   */
  updatePageTitle(page) {
    const titles = {
      control: {
        title: "Air Conditioner Control",
        subtitle: "Smart Energy Management System",
      },
      dashboard: {
        title: "AC Dashboard",
        subtitle: "Manage all air conditioning units",
      },
      energy: {
        title: "Energy Management",
        subtitle: "Monitor and optimize energy consumption",
      },
      devices: {
        title: "Device Management",
        subtitle: "Control connected IoT devices",
      },
      analytics: {
        title: "Analytics",
        subtitle: "Advanced reporting and insights",
      },
      settings: {
        title: "Settings",
        subtitle: "System configuration and preferences",
      },
    };

    const pageInfo = titles[page] || titles.control;

    const titleEl = document.getElementById("spa-page-title");
    const subtitleEl = document.getElementById("spa-page-subtitle");

    if (titleEl) titleEl.textContent = pageInfo.title;
    if (subtitleEl) subtitleEl.textContent = pageInfo.subtitle;
  }

  /**
   * Toggle mobile menu
   */
  toggleMobileMenu() {
    const sidebar = document.querySelector(".nav-sidebar");
    if (sidebar) {
      sidebar.classList.toggle("mobile-open");
    }
  }

  // ====== MODAL MANAGEMENT ======

  /**
   * Open Add AC Modal
   */
  openAddModal() {
    const modal = document.getElementById("spa-add-modal");
    if (modal) {
      modal.classList.add("show");
    }
  }

  /**
   * Close Add AC Modal
   */
  closeAddModal() {
    const modal = document.getElementById("spa-add-modal");
    if (modal) {
      modal.classList.remove("show");
    }
  }

  // ====== BUTTON ACTION HANDLERS ======

  /**
   * Export Excel functionality
   */
  exportExcel() {
    console.log("Export Excel clicked - implement in external JS");
    // TODO: Implement Excel export functionality
  }

  /**
   * Update Filter functionality
   */
  updateFilter() {
    console.log("Update Filter clicked - implement in external JS");
    // TODO: Implement filter functionality
  }

  /**
   * Open Settings page
   */
  openSettings() {
    this.navigateToPage("settings");
  }

  /**
   * Save AC functionality
   */
  saveAC() {
    console.log("Save AC clicked - implement in external JS");
    this.closeAddModal();
  }

  /**
   * Navigate back to dashboard from control page
   */
  backToDashboard() {
    console.log("Back to dashboard clicked");
    this.navigateToPage("dashboard");
  }

  /**
   * Edit AC functionality - Navigate to control page
   * @param {string} acId - AC unit ID
   */
  editAC(acId) {
    console.log(`Edit AC clicked: ${acId} - navigating to control page`);
    this.navigateToControlPage(acId);
  }

  // ====== SPECIFIC NAVIGATION METHODS ======

  /**
   * Navigate to control page for specific AC
   * @param {string} acId - AC unit ID
   */
  navigateToControlPage(acId) {
    console.log(`Navigating to control page for AC: ${acId}`);

    // Hide current page
    const currentPageEl = document.getElementById(`${this.currentPage}-page`);
    if (currentPageEl) {
      currentPageEl.classList.remove("active");
    }

    // Show control page
    const controlPageEl = document.getElementById("control-page");
    if (controlPageEl) {
      controlPageEl.classList.add("active");
    }

    // Update navigation active state
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.remove("active");
    });

    // Find and activate control nav item
    const controlNavItem = document.querySelector('[data-page="control"]');
    if (controlNavItem) {
      const navItem = controlNavItem.closest(".nav-item");
      if (navItem) {
        navItem.classList.add("active");
      }
    }

    // Update previous and current page
    this.previousPage = this.currentPage;
    this.currentPage = "control";

    // Initialize temperature usage chart when entering control page
    if (
      window.temperatureUsageChart &&
      !window.temperatureUsageChart.isInitialized
    ) {
      setTimeout(() => {
        window.temperatureUsageChart.initializeChart();
      }, 500); // Small delay to ensure DOM is ready
    }

    // Update page title for specific AC
    this.updatePageTitleForAC(acId);

    // Load AC data to control interface via ACSpaManager
    if (window.acSpaManager) {
      window.acSpaManager.loadACDataToInterface(acId);
    }

    // Manage fixed back button for control page
    this.manageFixedBackButtonForPage("control");
  }

  /**
   * Update page title for specific AC
   * @param {string} acId - AC unit ID
   */
  updatePageTitleForAC(acId) {
    const titles = {
      title: `Air Conditioner Control - ${acId}`,
      subtitle: `Managing ${acId} - Smart Energy System`,
    };

    const titleEl = document.getElementById("spa-page-title");
    const subtitleEl = document.getElementById("spa-page-subtitle");

    if (titleEl) titleEl.textContent = titles.title;
    if (subtitleEl) subtitleEl.textContent = titles.subtitle;
  }

  // ====== UTILITY METHODS ======

  /**
   * Get current page
   * @returns {string} Current page name
   */
  getCurrentPage() {
    return this.currentPage;
  }

  /**
   * Check if page exists
   * @param {string} page - Page name to check
   * @returns {boolean} True if page exists
   */
  pageExists(page) {
    return !!document.getElementById(`${page}-page`);
  }

  /**
   * Setup fullscreen toggle functionality
   */
  setupFullscreenToggle() {
    const fullscreenButton = document.getElementById("fullscreenToggle");
    const fullscreenIcon = document.getElementById("fullscreenIcon");

    if (!fullscreenButton || !fullscreenIcon) {
      console.warn("Fullscreen elements not found");
      return;
    }

    fullscreenButton.addEventListener("click", () => {
      this.toggleFullscreen();
    });

    // Listen for fullscreen change events
    document.addEventListener("fullscreenchange", () => {
      this.handleFullscreenChange();
    });

    document.addEventListener("webkitfullscreenchange", () => {
      this.handleFullscreenChange();
    });

    document.addEventListener("mozfullscreenchange", () => {
      this.handleFullscreenChange();
    });

    document.addEventListener("MSFullscreenChange", () => {
      this.handleFullscreenChange();
    });

    console.log("Fullscreen toggle setup completed");
  }

  /**
   * Toggle fullscreen mode
   */
  toggleFullscreen() {
    if (
      !document.fullscreenElement &&
      !document.webkitFullscreenElement &&
      !document.mozFullScreenElement &&
      !document.msFullscreenElement
    ) {
      // Enter fullscreen
      this.enterFullscreen();
    } else {
      // Exit fullscreen
      this.exitFullscreen();
    }
  }

  /**
   * Enter fullscreen mode
   */
  enterFullscreen() {
    const element = document.documentElement;

    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.mozRequestFullScreen) {
      element.mozRequestFullScreen();
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }
  }

  /**
   * Exit fullscreen mode
   */
  exitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }

  /**
   * Handle fullscreen state changes
   */
  handleFullscreenChange() {
    const fullscreenIcon = document.getElementById("fullscreenIcon");
    const body = document.body;

    if (
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    ) {
      // Entered fullscreen
      body.classList.add("fullscreen-mode");
      if (fullscreenIcon) {
        fullscreenIcon.className = "fas fa-compress";
      }
      console.log("Entered fullscreen mode");
    } else {
      // Exited fullscreen
      body.classList.remove("fullscreen-mode");
      if (fullscreenIcon) {
        fullscreenIcon.className = "fas fa-expand";
      }
      console.log("Exited fullscreen mode");
    }
  }
}

// ====== GLOBAL FUNCTIONS ======

/**
 * Handle AC Power Toggle (syncs with device and updates all systems)
 * @param {HTMLElement} toggleElement - Toggle input element
 */
function handleACPowerToggle(toggleElement) {
  const acId = toggleElement.getAttribute("data-ac-id");
  const isOn = toggleElement.checked;

  console.log(`AC ${acId} power toggle: ${isOn ? "ON" : "OFF"}`);

  // Update visual indicators immediately for responsive UI
  const container = toggleElement.closest(".toggle-container");
  const statusElement = container.querySelector(".power-status");
  const statusText = container.querySelector(".power-status span:last-child");

  if (statusElement && statusText) {
    statusElement.className = `power-status ${isOn ? "on" : "off"}`;
    statusText.textContent = isOn ? "ON" : "OFF";
  }

  // Update AC data in SPA manager with power synchronization
  if (window.acSpaManager) {
    const updateData = {
      power: isOn,
      status: isOn ? "online" : "offline",
      lastUpdated: new Date().toISOString(),
    };

    console.log("Updating ACSpaManager with power change:", updateData);
    window.acSpaManager.updateACDataRealtime(acId, updateData);
  }

  // Send power command to E-RA device if power control actions are available
  if (
    window.configPowerAir1 &&
    window.onAirConditioner1 &&
    window.offAirConditioner1
  ) {
    const powerAction = isOn
      ? window.onAirConditioner1
      : window.offAirConditioner1;

    if (powerAction && typeof powerAction.execute === "function") {
      console.log("Sending power command to device:", isOn ? "ON" : "OFF");
      powerAction
        .execute()
        .then(() => {
          console.log("Device power command sent successfully");
        })
        .catch((error) => {
          console.error("Failed to send device power command:", error);
          // Revert toggle on failure
          toggleElement.checked = !isOn;
          if (statusElement && statusText) {
            statusElement.className = `power-status ${!isOn ? "on" : "off"}`;
            statusText.textContent = !isOn ? "ON" : "OFF";
          }
        });
    } else {
      console.warn("Power action not properly configured");
    }
  } else {
    console.warn("E-RA power control actions not available");
  }

  // Update global device data manager to sync across all components
  if (window.globalDeviceDataManager) {
    const currentData = window.globalDeviceDataManager.getDeviceData();
    if (currentData) {
      const updatedData = {
        ...currentData,
        power: isOn,
        timestamp: new Date().toISOString(),
      };
      console.log("Synchronizing power change across all systems");
      window.globalDeviceDataManager.updateDeviceData(updatedData);
    }
  }
}

/**
 * Handle back to dashboard button click
 * Global function to be called from HTML onclick
 */
function handleBackToDashboard() {
  if (window.spaApp) {
    window.spaApp.backToDashboard();
  } else {
    console.error("SPA App not available");
  }
}

// ====== INITIALIZATION ======

// Initialize SPA when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.spaApp = new SmartACSPA();
  console.log("SPA Navigation System initialized!");
});
