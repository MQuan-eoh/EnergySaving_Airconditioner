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
    this.currentPage = page;

    console.log(`Navigated to page: ${page}`);
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
    // TODO: Implement save AC functionality
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

    // Update current page tracker
    this.currentPage = "control";

    // Update page title for specific AC
    this.updatePageTitleForAC(acId);

    // Load AC data to control interface via ACSpaManager
    if (window.acSpaManager) {
      window.acSpaManager.loadACDataToInterface(acId);
    }
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
}

// ====== GLOBAL FUNCTIONS ======

/**
 * Handle AC Power Toggle (placeholder for toggle switch functionality)
 * @param {HTMLElement} toggleElement - Toggle input element
 */
function handleACPowerToggle(toggleElement) {
  const acId = toggleElement.getAttribute("data-ac-id");
  const isOn = toggleElement.checked;

  console.log(`AC ${acId} power toggle: ${isOn ? "ON" : "OFF"}`);

  // Update status indicator
  const container = toggleElement.closest(".toggle-container");
  const statusElement = container.querySelector(".power-status");
  const statusText = container.querySelector(".power-status span:last-child");

  if (statusElement && statusText) {
    statusElement.className = `power-status ${isOn ? "on" : "off"}`;
    statusText.textContent = isOn ? "ON" : "OFF";
  }

  // TODO: Integrate with device control system
  // This is where you would connect to your AC control system

  // Update AC data in SPA manager if available
  if (window.acSpaManager) {
    window.acSpaManager.updateACData(acId, {
      power: isOn,
      status: isOn ? "online" : "offline",
    });
  }
}

// ====== INITIALIZATION ======

// Initialize SPA when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.spaApp = new SmartACSPA();
  console.log("SPA Navigation System initialized!");
});
