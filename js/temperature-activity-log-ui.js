/**
 * TEMPERATURE ACTIVITY LOG UI MANAGER
 * Manages UI components for viewing and interacting with temperature activity logs
 * Provides modal interface, filtering, and export functionality
 *
 * FEATURES:
 * - Glass effect modal with activity log table
 * - Real-time filtering and search
 * - Export to Excel/JSON functionality
 * - Statistics dashboard
 * - Timeline view option
 * - Responsive design
 */

class TemperatureActivityLogUI {
  constructor() {
    this.initialized = false;
    this.activityLogger = null;
    this.currentView = "table"; // 'table' or 'timeline'
    this.currentFilters = {
      acId: null,
      type: null,
      startDate: null,
      endDate: null,
      search: "",
    };
    this.currentPage = 0;
    this.pageSize = 50;
    this.isLoading = false;
    this.exportInProgress = false;

    // Cache for performance
    this.cachedLogs = [];
    this.cachedStats = {};

    console.log("Temperature Activity Log UI Manager initialized");
  }

  /**
   * INITIALIZE UI MANAGER
   * Setup dependencies and create header button
   */
  async init() {
    try {
      // Get activity logger instance
      if (window.temperatureActivityLogger) {
        this.activityLogger = window.temperatureActivityLogger;
      } else {
        console.warn("Temperature Activity Logger not found");
        return false;
      }

      // Create header button
      this.createHeaderButton();

      // Create modal
      this.createModal();

      // Setup event listeners
      this.setupEventListeners();

      // Load initial data
      await this.loadInitialData();

      this.initialized = true;
      console.log("✅ Temperature Activity Log UI ready");

      return true;
    } catch (error) {
      console.error("Activity Log UI initialization failed:", error);
      return false;
    }
  }

  /**
   * CREATE HEADER BUTTON
   * Setup existing activity log button in header
   */
  createHeaderButton() {
    try {
      // Find existing button
      const button = document.getElementById("activity-log-btn");

      if (!button) {
        console.warn("Activity log button not found in header");
        return;
      }

      // Ensure proper onclick handler
      button.onclick = () => this.openModal();

      console.log("Activity log button configured");
    } catch (error) {
      console.error("Error configuring header button:", error);
    }
  }

  /**
   * CREATE MODAL
   * Create the main activity log modal
   */
  createModal() {
    try {
      // Remove existing modal if any
      const existingModal = document.getElementById("activity-log-modal");
      if (existingModal) {
        existingModal.remove();
      }

      // Create modal HTML
      const modal = document.createElement("div");
      modal.className = "activity-log-modal";
      modal.id = "activity-log-modal";

      modal.innerHTML = `
        <div class="activity-log-modal-content">
          <div class="activity-log-header">
            <h2 class="activity-log-title">
              <i class="fas fa-chart-line"></i>
              Temperature Activity Log
            </h2>
            <button class="activity-log-close" onclick="window.tempActivityLogUI.closeModal()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="activity-log-body">
            <!-- Controls Section -->
            <div class="activity-log-controls">
              <div class="activity-log-filter">
                <label>AC Unit:</label>
                <select class="activity-log-select" id="filter-ac">
                  <option value="">All AC Units</option>
                </select>
              </div>
              
              <div class="activity-log-filter">
                <label>Activity Type:</label>
                <select class="activity-log-select" id="filter-type">
                  <option value="">All Types</option>
                  <option value="recommendation_applied">Recommendations Applied</option>
                  <option value="manual_adjustment">Manual Adjustments</option>
                  <option value="successful_recommendation">Successful Recommendations</option>
                </select>
              </div>
              
              <div class="activity-log-filter">
                <label>Date Range:</label>
                <div class="activity-log-date-range">
                  <input type="date" class="activity-log-date-input" id="filter-start-date">
                  <span style="color: #9ca3af;">to</span>
                  <input type="date" class="activity-log-date-input" id="filter-end-date">
                </div>
              </div>
              
              <div class="activity-log-actions">
                <button class="activity-log-btn-action" onclick="window.tempActivityLogUI.refreshData()">
                  <i class="fas fa-sync-alt"></i>
                  Refresh
                </button>
                
                <button class="activity-log-btn-action export" onclick="window.tempActivityLogUI.exportData('excel')">
                  <i class="fas fa-file-excel"></i>
                  Export Excel
                </button>
                
                <button class="activity-log-btn-action export" onclick="window.tempActivityLogUI.exportData('json')">
                  <i class="fas fa-file-code"></i>
                  Export JSON
                </button>
                
                <button class="activity-log-btn-action clear" onclick="window.tempActivityLogUI.clearOldData()">
                  <i class="fas fa-trash"></i>
                  Clear Old
                </button>
              </div>
            </div>
            
            <!-- View Toggle -->
            <div class="view-toggle" style="margin-bottom: 24px;">
              <button class="view-toggle-btn active" onclick="window.tempActivityLogUI.switchView('table')">
                <i class="fas fa-table"></i> Table View
              </button>
              <button class="view-toggle-btn" onclick="window.tempActivityLogUI.switchView('timeline')">
                <i class="fas fa-stream"></i> Timeline View
              </button>
            </div>
            
            <!-- Statistics Section -->
            <div class="activity-log-stats" id="activity-stats">
              <!-- Statistics cards will be populated here -->
            </div>
            
            <!-- Messages Section -->
            <div id="activity-messages"></div>
            
            <!-- Energy Consumption Statistics Section -->
            <div class="activity-energy-stats-section" id="activity-energy-stats">
              <!-- Energy consumption statistics table will be populated here -->
            </div>
            
            <!-- Content Section -->
            <div id="activity-content">
              <!-- Table or timeline will be populated here -->
            </div>
            
            <!-- Pagination -->
            <div class="activity-log-pagination" id="activity-pagination" style="display: none;">
              <button class="pagination-btn" id="prev-btn" onclick="window.tempActivityLogUI.previousPage()">
                <i class="fas fa-chevron-left"></i> Previous
              </button>
              <span class="pagination-info" id="pagination-info">Page 1 of 1</span>
              <button class="pagination-btn" id="next-btn" onclick="window.tempActivityLogUI.nextPage()">
                Next <i class="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      `;

      // Add modal to body
      document.body.appendChild(modal);

      console.log("Activity log modal created");
    } catch (error) {
      console.error("Error creating modal:", error);
    }
  }

  /**
   * SETUP EVENT LISTENERS
   * Setup all event listeners for the UI
   */
  setupEventListeners() {
    try {
      // Filter change events
      const filterAC = document.getElementById("filter-ac");
      const filterType = document.getElementById("filter-type");
      const filterStartDate = document.getElementById("filter-start-date");
      const filterEndDate = document.getElementById("filter-end-date");

      if (filterAC)
        filterAC.addEventListener("change", () => this.onFilterChange());
      if (filterType)
        filterType.addEventListener("change", () => this.onFilterChange());
      if (filterStartDate)
        filterStartDate.addEventListener("change", () => this.onFilterChange());
      if (filterEndDate)
        filterEndDate.addEventListener("change", () => this.onFilterChange());

      // Modal click outside to close
      const modal = document.getElementById("activity-log-modal");
      if (modal) {
        modal.addEventListener("click", (e) => {
          if (e.target === modal) {
            this.closeModal();
          }
        });
      }

      // Keyboard shortcuts
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && this.isModalOpen()) {
          this.closeModal();
        }
      });

      // Listen for new activity events
      if (window.acEventSystem) {
        window.acEventSystem.on("activity-logged", () => {
          this.updateBadge();
          if (this.isModalOpen()) {
            this.refreshData();
          }
        });
      }

      console.log("Event listeners setup complete");
    } catch (error) {
      console.error("Error setting up event listeners:", error);
    }
  }

  /**
   * LOAD INITIAL DATA
   * Load AC units for filter and set default dates
   */
  async loadInitialData() {
    try {
      // Populate AC units filter
      await this.populateACUnitsFilter();

      // Set default date range (last 30 days)
      this.setDefaultDateRange();

      // Update badge
      await this.updateBadge();
    } catch (error) {
      console.error("Error loading initial data:", error);
    }
  }

  /**
   * POPULATE AC UNITS FILTER
   * Get AC units from AC SPA Manager and populate filter
   */
  async populateACUnitsFilter() {
    try {
      const filterAC = document.getElementById("filter-ac");
      if (!filterAC) return;

      // Clear existing options (except "All AC Units")
      while (filterAC.children.length > 1) {
        filterAC.removeChild(filterAC.lastChild);
      }

      // Get AC units from SPA Manager
      if (window.acSpaManager && window.acSpaManager.getACList) {
        const acList = window.acSpaManager.getACList();

        for (const acId of acList) {
          const option = document.createElement("option");
          option.value = acId;
          option.textContent = `AC ${acId}`;
          filterAC.appendChild(option);
        }
      }
    } catch (error) {
      console.error("Error populating AC units filter:", error);
    }
  }

  /**
   * SET DEFAULT DATE RANGE
   * Set default date range to last 30 days
   */
  setDefaultDateRange() {
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date(
        today.getTime() - 30 * 24 * 60 * 60 * 1000
      );

      const startDateInput = document.getElementById("filter-start-date");
      const endDateInput = document.getElementById("filter-end-date");

      if (startDateInput) {
        startDateInput.value = thirtyDaysAgo.toISOString().split("T")[0];
      }
      if (endDateInput) {
        endDateInput.value = today.toISOString().split("T")[0];
      }
    } catch (error) {
      console.error("Error setting default date range:", error);
    }
  }

  /**
   * OPEN MODAL
   * Open the activity log modal
   */
  async openModal() {
    try {
      const modal = document.getElementById("activity-log-modal");
      if (!modal) return;

      // Show modal
      modal.classList.add("show");

      // Load data
      await this.loadData();

      // Focus trap
      this.setupFocusTrap();
    } catch (error) {
      console.error("Error opening modal:", error);
    }
  }

  /**
   * CLOSE MODAL
   * Close the activity log modal
   */
  closeModal() {
    try {
      const modal = document.getElementById("activity-log-modal");
      if (!modal) return;

      // Hide modal
      modal.classList.remove("show");

      // Remove focus trap
      this.removeFocusTrap();
    } catch (error) {
      console.error("Error closing modal:", error);
    }
  }

  /**
   * IS MODAL OPEN
   * Check if modal is currently open
   */
  isModalOpen() {
    const modal = document.getElementById("activity-log-modal");
    return modal && modal.classList.contains("show");
  }

  /**
   * ON FILTER CHANGE
   * Handle filter changes
   */
  async onFilterChange() {
    try {
      // Get filter values
      this.currentFilters = {
        acId: document.getElementById("filter-ac")?.value || null,
        type: document.getElementById("filter-type")?.value || null,
        startDate: document.getElementById("filter-start-date")?.value
          ? new Date(
              document.getElementById("filter-start-date").value
            ).getTime()
          : null,
        endDate: document.getElementById("filter-end-date")?.value
          ? new Date(
              document.getElementById("filter-end-date").value
            ).getTime() +
            (24 * 60 * 60 * 1000 - 1)
          : null,
      };

      // Reset pagination
      this.currentPage = 0;

      // Reload data
      await this.loadData();
    } catch (error) {
      console.error("Error handling filter change:", error);
    }
  }

  /**
   * SWITCH VIEW
   * Switch between table and timeline view
   */
  async switchView(view) {
    try {
      this.currentView = view;

      // Update toggle buttons
      const toggleButtons = document.querySelectorAll(".view-toggle-btn");
      toggleButtons.forEach((btn) => btn.classList.remove("active"));

      const activeButton = document.querySelector(
        `.view-toggle-btn[onclick*="${view}"]`
      );
      if (activeButton) {
        activeButton.classList.add("active");
      }

      // Reload content
      await this.renderContent();
    } catch (error) {
      console.error("Error switching view:", error);
    }
  }

  /**
   * LOAD DATA
   * Load activity logs and statistics
   */
  async loadData() {
    try {
      this.setLoading(true);

      if (!this.activityLogger) {
        this.showMessage("Activity logger not available", "error");
        return;
      }

      // Load activity logs
      const logsResult = await this.activityLogger.getActivityLogs(
        this.currentFilters.acId,
        {
          startDate: this.currentFilters.startDate,
          endDate: this.currentFilters.endDate,
          types: this.currentFilters.type ? [this.currentFilters.type] : null,
          limit: this.pageSize,
          offset: this.currentPage * this.pageSize,
        }
      );

      this.cachedLogs = logsResult.logs || [];

      // Load statistics
      if (this.currentFilters.acId) {
        const stats = await this.activityLogger.getDailyStatistics(
          this.currentFilters.acId,
          30
        );
        this.cachedStats = this.calculateAggregatedStats(stats);
      } else {
        this.cachedStats = this.calculateOverallStats(this.cachedLogs);
      }

      // Render content
      await this.renderStatistics();
      await this.renderEnergyConsumptionStats();
      await this.renderContent();
      this.updatePagination(logsResult);

      this.setLoading(false);
    } catch (error) {
      console.error("Error loading data:", error);
      this.showMessage("Error loading activity data", "error");
      this.setLoading(false);
    }
  }

  /**
   * REFRESH DATA
   * Refresh current data
   */
  async refreshData() {
    await this.loadData();
    this.showMessage("Data refreshed successfully", "success", 2000);
  }

  /**
   * RENDER ENERGY CONSUMPTION STATISTICS
   * Render daily energy consumption statistics table
   */
  async renderEnergyConsumptionStats() {
    try {
      const statsContainer = document.getElementById("activity-energy-stats");
      if (!statsContainer) return;

      // Get daily energy consumption data
      const dailyEnergyData = await this.generateDailyEnergyStats();

      if (dailyEnergyData.length === 0) {
        statsContainer.innerHTML = `
          <div class="energy-stats-empty">
            <i class="fas fa-chart-bar"></i>
            <p>No energy consumption data available for the selected period</p>
          </div>
        `;
        return;
      }

      const tableHTML = `
        <div class="energy-stats-container">
          <div class="energy-stats-header">
            <h3 class="energy-stats-title">
              <i class="fas fa-chart-bar"></i>
              Daily Energy Consumption Analysis
            </h3>
            <div class="energy-stats-legend">
              <span class="legend-item recommended">
                <i class="fas fa-circle"></i> AI Recommended
              </span>
              <span class="legend-item manual">
                <i class="fas fa-circle"></i> Manual Control
              </span>
            </div>
          </div>
          
          <div class="energy-stats-table-container">
            <table class="energy-stats-table">
              <thead>
                <tr>
                  <th class="col-date">Date</th>
                  <th class="col-temp">Temperature Levels</th>
                  <th class="col-hours">Operating Hours</th>
                  <th class="col-kwh">Total kWh</th>
                  <th class="col-mode">Usage Mode</th>
                  <th class="col-savings">Energy Savings</th>
                </tr>
              </thead>
              <tbody>
                ${dailyEnergyData
                  .map((day) => this.renderEnergyStatsRow(day))
                  .join("")}
              </tbody>
            </table>
          </div>
          
          <div class="energy-stats-summary">
            <div class="summary-item">
              <span class="summary-label">Average Daily Consumption:</span>
              <span class="summary-value">${this.calculateAverageConsumption(
                dailyEnergyData
              )} kWh</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Total Energy Saved:</span>
              <span class="summary-value savings-positive">${this.calculateTotalSavings(
                dailyEnergyData
              )}%</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">AI Recommendation Usage:</span>
              <span class="summary-value">${this.calculateRecommendationUsage(
                dailyEnergyData
              )}%</span>
            </div>
          </div>
        </div>
      `;

      statsContainer.innerHTML = tableHTML;
    } catch (error) {
      console.error("Error rendering energy consumption statistics:", error);
    }
  }

  /**
   * GENERATE DAILY ENERGY STATS
   * Process activity logs to generate daily energy consumption statistics
   */
  async generateDailyEnergyStats() {
    try {
      if (!this.cachedLogs || this.cachedLogs.length === 0) {
        return [];
      }

      // Group logs by date
      const dailyGroups = {};

      for (const log of this.cachedLogs) {
        const date = new Date(log.timestamp);
        const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD format

        if (!dailyGroups[dateKey]) {
          dailyGroups[dateKey] = {
            date: dateKey,
            logs: [],
            temperatureLevels: new Set(),
            hasRecommendations: false,
            operatingHours: 0,
            totalKwh: 0,
            energySavings: 0,
            recommendations: 0,
            adjustments: 0,
          };
        }

        dailyGroups[dateKey].logs.push(log);

        // Track temperature levels used
        if (log.originalTemp)
          dailyGroups[dateKey].temperatureLevels.add(log.originalTemp);
        if (log.recommendedTemp)
          dailyGroups[dateKey].temperatureLevels.add(log.recommendedTemp);
        if (log.newTemp)
          dailyGroups[dateKey].temperatureLevels.add(log.newTemp);
        if (log.sustainedTemp)
          dailyGroups[dateKey].temperatureLevels.add(log.sustainedTemp);

        // Track recommendation usage
        if (log.type === "recommendation_applied") {
          dailyGroups[dateKey].hasRecommendations = true;
          dailyGroups[dateKey].recommendations++;
          dailyGroups[dateKey].energySavings += log.energySavings || 0;
        }

        if (log.type === "manual_adjustment") {
          dailyGroups[dateKey].adjustments++;
        }
      }

      // Calculate detailed statistics for each day
      const dailyStats = [];

      for (const [dateKey, dayData] of Object.entries(dailyGroups)) {
        const stats = await this.calculateDayEnergyStats(dayData);
        dailyStats.push(stats);
      }

      // Sort by date (newest first)
      return dailyStats.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
      console.error("Error generating daily energy stats:", error);
      return [];
    }
  }

  /**
   * CALCULATE DAY ENERGY STATS
   * Calculate comprehensive energy statistics for a single day
   */
  async calculateDayEnergyStats(dayData) {
    try {
      console.log("Calculating energy stats for day:", dayData.date, dayData);

      // Get AC configuration for power calculations
      const acConfig = await this.getACConfiguration(this.currentFilters.acId);
      console.log("AC Configuration:", acConfig);

      // Calculate operating hours (estimate based on log frequency)
      const operatingHours = this.estimateOperatingHours(dayData.logs);
      console.log("Operating hours:", operatingHours);

      // Calculate total kWh based on temperature levels and AC specifications
      const totalKwh = this.calculateDailyKwh(
        dayData.temperatureLevels,
        operatingHours,
        acConfig
      );
      console.log("Total kWh:", totalKwh);

      // Calculate baseline kWh (what would be consumed without AI recommendations)
      const baselineKwh = this.calculateBaselineKwh(
        dayData.temperatureLevels,
        operatingHours,
        acConfig
      );
      console.log("Baseline kWh:", baselineKwh);

      // Calculate energy savings percentage
      const energySavingsPercent =
        baselineKwh > 0
          ? Math.round(((baselineKwh - totalKwh) / baselineKwh) * 100)
          : 0;

      // Determine usage mode
      const usageMode = dayData.hasRecommendations
        ? "ai-recommended"
        : "manual-control";

      const result = {
        date: dayData.date,
        temperatureLevels: Array.from(dayData.temperatureLevels).sort(
          (a, b) => a - b
        ),
        operatingHours: Math.round(operatingHours * 10) / 10, // Round to 1 decimal
        totalKwh: Math.round(totalKwh * 100) / 100, // Round to 2 decimals
        baselineKwh: Math.round(baselineKwh * 100) / 100,
        energySavingsPercent: energySavingsPercent,
        usageMode: usageMode,
        hasRecommendations: dayData.hasRecommendations,
        recommendations: dayData.recommendations,
        adjustments: dayData.adjustments,
        rawEnergyVN: dayData.energySavings || 0,
      };

      console.log("Final energy stats result:", result);
      return result;
    } catch (error) {
      console.error("Error calculating day energy stats:", error);
      return {
        date: dayData.date,
        temperatureLevels: [],
        operatingHours: 0,
        totalKwh: 0,
        energySavingsPercent: 0,
        usageMode: "unknown",
        hasRecommendations: false,
      };
    }
  }

  /**
   * GET AC CONFIGURATION
   * Get AC unit configuration for power calculations
   */
  async getACConfiguration(acId) {
    try {
      // Try to get from AC Configuration Manager
      if (window.acConfigManager && window.acConfigManager.getACConfiguration) {
        const config = window.acConfigManager.getACConfiguration(acId);
        if (config) return config;
      }

      // Try to get from Energy Efficiency Manager
      if (
        window.energyEfficiencyManager &&
        window.energyEfficiencyManager.acConfigurations
      ) {
        const config = window.energyEfficiencyManager.acConfigurations[acId];
        if (config) return config;
      }

      // Return default configuration if not found
      return {
        type: "1.5HP",
        technology: "inverter",
        roomType: "medium",
        nominalPower: 1200, // Watts
        maxPower: 1500,
        minPower: 300,
      };
    } catch (error) {
      console.error("Error getting AC configuration:", error);
      return {
        type: "1.5HP",
        technology: "inverter",
        roomType: "medium",
        nominalPower: 1200,
        maxPower: 1500,
        minPower: 300,
      };
    }
  }

  /**
   * ESTIMATE OPERATING HOURS
   * Estimate daily operating hours based on activity logs
   */
  estimateOperatingHours(logs) {
    if (logs.length === 0) return 0;

    // Sort logs by timestamp
    const sortedLogs = logs.sort((a, b) => a.timestamp - b.timestamp);

    // Estimate operating period from first to last log + buffer
    const firstLog = sortedLogs[0].timestamp;
    const lastLog = sortedLogs[sortedLogs.length - 1].timestamp;
    const operatingPeriod = (lastLog - firstLog) / (1000 * 60 * 60); // Convert to hours

    // Add minimum operating time for each log event (estimate 2 hours per event)
    const minimumHours = logs.length * 2;

    // Return the maximum of calculated period and minimum hours, capped at 24 hours
    return Math.min(Math.max(operatingPeriod, minimumHours), 24);
  }

  /**
   * CALCULATE DAILY KWH
   * Calculate actual kWh consumption based on temperature levels and AC specs
   */
  calculateDailyKwh(temperatureLevels, operatingHours, acConfig) {
    try {
      // Validate input parameters
      if (!temperatureLevels || temperatureLevels.length === 0) {
        console.warn("No temperature levels provided for kWh calculation");
        return 0;
      }

      if (!operatingHours || operatingHours <= 0 || isNaN(operatingHours)) {
        console.warn(
          "Invalid operating hours for kWh calculation:",
          operatingHours
        );
        return 0;
      }

      if (!acConfig || typeof acConfig !== "object") {
        console.warn("Invalid AC configuration for kWh calculation:", acConfig);
        return 0;
      }

      // Convert Set to Array if needed and filter out invalid temperatures
      const tempArray = Array.from(temperatureLevels).filter(
        (temp) =>
          typeof temp === "number" && !isNaN(temp) && temp > 0 && temp < 50
      );

      if (tempArray.length === 0) {
        console.warn(
          "No valid temperature levels after filtering:",
          temperatureLevels
        );
        return 0;
      }

      // Get average temperature used
      const avgTemp =
        tempArray.reduce((sum, temp) => sum + temp, 0) / tempArray.length;

      if (isNaN(avgTemp)) {
        console.warn(
          "Average temperature calculation resulted in NaN:",
          tempArray
        );
        return 0;
      }

      // Calculate power consumption based on temperature efficiency
      // Lower temperatures = higher power consumption
      const outdoorTemp = 30; // Estimate - in real app, get from weather API
      const tempDifference = Math.abs(outdoorTemp - avgTemp);

      // Base power consumption (from AC specs)
      const basePower = acConfig.nominalPower || 1200; // Watts

      if (isNaN(basePower) || basePower <= 0) {
        console.warn("Invalid base power:", basePower);
        return 0;
      }

      // Power factor based on temperature difference
      // More cooling needed = higher power consumption
      const powerFactor = 0.5 + tempDifference / 20; // Range: 0.5 to 1.0+

      // Technology efficiency factor
      const techFactors = {
        "non-inverter": 1.0,
        inverter: 0.85,
        "dual-inverter": 0.75,
      };
      const techFactor = techFactors[acConfig.technology] || 0.85;

      // Calculate power consumption (Watts)
      const actualPower = basePower * powerFactor * techFactor;

      if (isNaN(actualPower)) {
        console.warn("Actual power calculation resulted in NaN:", {
          basePower,
          powerFactor,
          techFactor,
          avgTemp,
          tempDifference,
        });
        return 0;
      }

      // Convert to kWh (Watts * Hours / 1000)
      const kwhConsumed = (actualPower * operatingHours) / 1000;

      if (isNaN(kwhConsumed)) {
        console.warn("kWh calculation resulted in NaN:", {
          actualPower,
          operatingHours,
          result: kwhConsumed,
        });
        return 0;
      }

      console.log("kWh calculation successful:", {
        tempArray,
        avgTemp,
        operatingHours,
        actualPower,
        kwhConsumed: kwhConsumed.toFixed(3),
      });

      return kwhConsumed;
    } catch (error) {
      console.error("Error in calculateDailyKwh:", error);
      return 0;
    }
  }

  /**
   * CALCULATE BASELINE KWH
   * Calculate what kWh would be consumed without AI optimization
   */
  calculateBaselineKwh(temperatureLevels, operatingHours, acConfig) {
    try {
      // Validate input parameters
      if (!temperatureLevels || temperatureLevels.length === 0) {
        console.warn(
          "No temperature levels provided for baseline kWh calculation"
        );
        return 0;
      }

      if (!operatingHours || operatingHours <= 0 || isNaN(operatingHours)) {
        console.warn(
          "Invalid operating hours for baseline kWh calculation:",
          operatingHours
        );
        return 0;
      }

      if (!acConfig || typeof acConfig !== "object") {
        console.warn(
          "Invalid AC configuration for baseline kWh calculation:",
          acConfig
        );
        return 0;
      }

      // Convert Set to Array if needed and filter out invalid temperatures
      const tempArray = Array.from(temperatureLevels).filter(
        (temp) =>
          typeof temp === "number" && !isNaN(temp) && temp > 0 && temp < 50
      );

      if (tempArray.length === 0) {
        console.warn(
          "No valid temperature levels for baseline calculation:",
          temperatureLevels
        );
        return 0;
      }

      // Assume baseline would use less optimal temperatures (typically 2-3 degrees lower)
      const avgTemp =
        tempArray.reduce((sum, temp) => sum + temp, 0) / tempArray.length;

      if (isNaN(avgTemp)) {
        console.warn(
          "Baseline average temperature calculation resulted in NaN:",
          tempArray
        );
        return 0;
      }

      const baselineTemp = avgTemp - 2.5; // Less efficient baseline

      const outdoorTemp = 30;
      const tempDifference = Math.abs(outdoorTemp - baselineTemp);

      const basePower = acConfig.nominalPower || 1200;

      if (isNaN(basePower) || basePower <= 0) {
        console.warn("Invalid base power for baseline calculation:", basePower);
        return 0;
      }

      const powerFactor = 0.5 + tempDifference / 20;

      // Baseline assumes less efficient operation (no smart optimization)
      const baselineEfficiency = 1.0; // No optimization
      const actualPower = basePower * powerFactor * baselineEfficiency;

      if (isNaN(actualPower)) {
        console.warn("Baseline actual power calculation resulted in NaN:", {
          basePower,
          powerFactor,
          baselineEfficiency,
          avgTemp,
          baselineTemp,
          tempDifference,
        });
        return 0;
      }

      const baselineKwh = (actualPower * operatingHours) / 1000;

      if (isNaN(baselineKwh)) {
        console.warn("Baseline kWh calculation resulted in NaN:", {
          actualPower,
          operatingHours,
          result: baselineKwh,
        });
        return 0;
      }

      return baselineKwh;
    } catch (error) {
      console.error("Error in calculateBaselineKwh:", error);
      return 0;
    }
  }

  /**
   * RENDER ENERGY STATS ROW
   * Render a single row in the energy statistics table
   */
  renderEnergyStatsRow(dayStats) {
    try {
      const date = new Date(dayStats.date);
      const formattedDate = date.toLocaleDateString("vi-VN");

      const tempLevelsDisplay =
        dayStats.temperatureLevels && dayStats.temperatureLevels.length > 0
          ? dayStats.temperatureLevels.map((temp) => `${temp}°C`).join(", ")
          : "No data";

      const modeClass =
        dayStats.usageMode === "ai-recommended" ? "recommended" : "manual";
      const modeText =
        dayStats.usageMode === "ai-recommended"
          ? "AI Recommended"
          : "Manual Control";
      const modeIcon =
        dayStats.usageMode === "ai-recommended"
          ? "fas fa-robot"
          : "fas fa-user";

      // Validate and format operating hours
      const operatingHours =
        typeof dayStats.operatingHours === "number" &&
        !isNaN(dayStats.operatingHours)
          ? dayStats.operatingHours.toFixed(1)
          : "0.0";

      // Validate and format kWh
      const totalKwh =
        typeof dayStats.totalKwh === "number" && !isNaN(dayStats.totalKwh)
          ? dayStats.totalKwh.toFixed(2)
          : "0.00";

      // Validate and format energy savings
      const energySavingsPercent =
        typeof dayStats.energySavingsPercent === "number" &&
        !isNaN(dayStats.energySavingsPercent)
          ? dayStats.energySavingsPercent
          : 0;

      const savingsClass =
        energySavingsPercent > 0
          ? "savings-positive"
          : energySavingsPercent < 0
          ? "savings-negative"
          : "savings-neutral";

      return `
        <tr class="energy-stats-row ${modeClass}">
          <td class="col-date">${formattedDate}</td>
          <td class="col-temp">
            <div class="temp-levels-display">
              ${tempLevelsDisplay}
            </div>
          </td>
          <td class="col-hours">${operatingHours}h</td>
          <td class="col-kwh">
            <div class="kwh-display">
              <span class="kwh-value">${totalKwh}</span>
              <span class="kwh-unit">kWh</span>
            </div>
          </td>
          <td class="col-mode">
            <span class="usage-mode-badge ${modeClass}">
              <i class="${modeIcon}"></i>
              ${modeText}
            </span>
          </td>
          <td class="col-savings">
            <span class="savings-value ${savingsClass}">
              ${energySavingsPercent >= 0 ? "+" : ""}${energySavingsPercent}%
            </span>
          </td>
        </tr>
      `;
    } catch (error) {
      console.error("Error rendering energy stats row:", error, dayStats);
      return '<tr><td colspan="6">Error rendering data</td></tr>';
    }
  }

  /**
   * UTILITY METHODS FOR ENERGY STATISTICS
   */

  calculateAverageConsumption(dailyData) {
    try {
      if (!dailyData || dailyData.length === 0) {
        console.warn("No daily data for average consumption calculation");
        return "0.0";
      }

      // Filter out invalid kWh values
      const validData = dailyData.filter(
        (day) =>
          day &&
          typeof day.totalKwh === "number" &&
          !isNaN(day.totalKwh) &&
          day.totalKwh >= 0
      );

      if (validData.length === 0) {
        console.warn("No valid kWh data for average consumption calculation");
        return "0.0";
      }

      const totalKwh = validData.reduce((sum, day) => sum + day.totalKwh, 0);
      const average = totalKwh / validData.length;

      if (isNaN(average)) {
        console.warn("Average consumption calculation resulted in NaN:", {
          totalKwh,
          count: validData.length,
        });
        return "0.0";
      }

      return average.toFixed(1);
    } catch (error) {
      console.error("Error calculating average consumption:", error);
      return "0.0";
    }
  }

  calculateTotalSavings(dailyData) {
    try {
      if (!dailyData || dailyData.length === 0) {
        console.warn("No daily data for total savings calculation");
        return "0.0";
      }

      // Filter out invalid savings values
      const validData = dailyData.filter(
        (day) =>
          day &&
          typeof day.energySavingsPercent === "number" &&
          !isNaN(day.energySavingsPercent)
      );

      if (validData.length === 0) {
        console.warn("No valid savings data for total savings calculation");
        return "0.0";
      }

      const avgSavings =
        validData.reduce((sum, day) => sum + day.energySavingsPercent, 0) /
        validData.length;

      if (isNaN(avgSavings)) {
        console.warn("Total savings calculation resulted in NaN");
        return "0.0";
      }

      return avgSavings.toFixed(1);
    } catch (error) {
      console.error("Error calculating total savings:", error);
      return "0.0";
    }
  }

  calculateRecommendationUsage(dailyData) {
    try {
      if (!dailyData || dailyData.length === 0) {
        console.warn("No daily data for recommendation usage calculation");
        return "0";
      }

      const recommendedDays = dailyData.filter(
        (day) =>
          day &&
          typeof day.hasRecommendations === "boolean" &&
          day.hasRecommendations
      ).length;

      const usage = Math.round((recommendedDays / dailyData.length) * 100);

      if (isNaN(usage)) {
        console.warn("Recommendation usage calculation resulted in NaN");
        return "0";
      }

      return usage.toString();
    } catch (error) {
      console.error("Error calculating recommendation usage:", error);
      return "0";
    }
  }
  async renderStatistics() {
    try {
      const statsContainer = document.getElementById("activity-stats");
      if (!statsContainer) return;

      const stats = this.cachedStats;

      statsContainer.innerHTML = `
        <div class="activity-log-stat-card recommendations">
          <div class="activity-log-stat-number">${
            stats.totalRecommendations || 0
          }</div>
          <div class="activity-log-stat-label">Recommendations Applied</div>
        </div>
        
        <div class="activity-log-stat-card adjustments">
          <div class="activity-log-stat-number">${
            stats.totalAdjustments || 0
          }</div>
          <div class="activity-log-stat-label">Manual Adjustments</div>
        </div>
        
        <div class="activity-log-stat-card success-rate">
          <div class="activity-log-stat-number">${stats.successRate || 0}%</div>
          <div class="activity-log-stat-label">Success Rate</div>
        </div>
        
        <div class="activity-log-stat-card energy-saved">
          <div class="activity-log-stat-number">${
            stats.totalEnergySaved || 0
          }%</div>
          <div class="activity-log-stat-label">Energy Saved</div>
        </div>
      `;
    } catch (error) {
      console.error("Error rendering statistics:", error);
    }
  }

  /**
   * RENDER CONTENT
   * Render main content based on current view
   */
  async renderContent() {
    try {
      const contentContainer = document.getElementById("activity-content");
      if (!contentContainer) return;

      if (this.cachedLogs.length === 0) {
        this.renderEmptyState(contentContainer);
        return;
      }

      if (this.currentView === "table") {
        this.renderTableView(contentContainer);
      } else {
        this.renderTimelineView(contentContainer);
      }
    } catch (error) {
      console.error("Error rendering content:", error);
    }
  }

  /**
   * RENDER TABLE VIEW
   * Render activity logs in table format
   */
  renderTableView(container) {
    try {
      const tableHTML = `
        <div class="activity-log-table-container">
          <table class="activity-log-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>AC ID</th>
                <th>Type</th>
                <th>Temperature Change</th>
                <th class="hide-mobile">Power Delta (W)</th>
                <th class="hide-mobile">Confidence</th>
                <th class="hide-mobile">Energy Savings</th>
                <th class="hide-mobile">Context</th>
              </tr>
            </thead>
            <tbody>
              ${this.cachedLogs.map((log) => this.renderTableRow(log)).join("")}
            </tbody>
          </table>
        </div>
      `;

      container.innerHTML = tableHTML;
    } catch (error) {
      console.error("Error rendering table view:", error);
    }
  }

  /**
   * RENDER TABLE ROW
   * Render a single table row for a log entry with power consumption delta
   */
  renderTableRow(log) {
    try {
      const time = new Date(log.timestamp).toLocaleString("vi-VN");
      const tempChange = this.formatTemperatureChange(log);
      const confidence = this.formatConfidence(log.confidence);
      const energySavings = log.energySavings ? `${log.energySavings}%` : "-";
      const context = this.formatContext(log.context);

      // Format power consumption delta if available
      const powerDelta = this.formatPowerConsumptionDelta(log);

      return `
        <tr class="log-entry">
          <td>${time}</td>
          <td>${log.acId}</td>
          <td><span class="activity-type-badge ${log.type.replace(
            "_",
            "-"
          )}">${this.formatActivityType(log.type)}</span></td>
          <td>${tempChange}</td>
          <td class="hide-mobile">${powerDelta}</td>
          <td class="hide-mobile">${confidence}</td>
          <td class="hide-mobile">${energySavings}</td>
          <td class="hide-mobile">${context}</td>
        </tr>
      `;
    } catch (error) {
      console.error("Error rendering table row:", error);
      return '<tr><td colspan="8">Error rendering row</td></tr>';
    }
  }

  /**
   * RENDER TIMELINE VIEW
   * Render activity logs in timeline format
   */
  renderTimelineView(container) {
    try {
      const timelineHTML = `
        <div class="activity-log-timeline">
          ${this.cachedLogs.map((log) => this.renderTimelineItem(log)).join("")}
        </div>
      `;

      container.innerHTML = timelineHTML;
    } catch (error) {
      console.error("Error rendering timeline view:", error);
    }
  }

  /**
   * RENDER TIMELINE ITEM
   * Render a single timeline item for a log entry
   */
  renderTimelineItem(log) {
    try {
      const time = new Date(log.timestamp).toLocaleString("vi-VN");
      const typeClass = this.getTimelineItemClass(log.type);
      const content = this.formatTimelineContent(log);

      return `
        <div class="timeline-item ${typeClass}">
          <div class="timeline-header">
            <span class="activity-type-badge ${log.type.replace(
              "_",
              "-"
            )}">${this.formatActivityType(log.type)}</span>
            <span class="timeline-time">${time}</span>
          </div>
          <div class="timeline-content">
            ${content}
          </div>
        </div>
      `;
    } catch (error) {
      console.error("Error rendering timeline item:", error);
      return '<div class="timeline-item">Error rendering item</div>';
    }
  }

  /**
   * RENDER EMPTY STATE
   * Render empty state when no logs available
   */
  renderEmptyState(container) {
    container.innerHTML = `
      <div class="activity-log-empty">
        <i class="fas fa-chart-line"></i>
        <h3>No Activity Data</h3>
        <p>No temperature activity logs found for the selected filters.<br>
        Try adjusting your filter criteria or date range.</p>
      </div>
    `;
  }

  /**
   * EXPORT DATA
   * Export activity data in specified format
   */
  async exportData(format = "excel") {
    try {
      if (this.exportInProgress) {
        this.showMessage("Export already in progress", "info");
        return;
      }

      this.exportInProgress = true;
      this.showExportProgress("Preparing export...");

      if (!this.activityLogger) {
        this.showMessage("Activity logger not available", "error");
        return;
      }

      // Export all data matching current filters
      const success = await this.activityLogger.exportActivityData(
        this.currentFilters.acId,
        format
      );

      if (success) {
        this.showMessage(
          `Data exported successfully as ${format.toUpperCase()}`,
          "success"
        );
      } else {
        this.showMessage("Export failed", "error");
      }
    } catch (error) {
      console.error("Error exporting data:", error);
      this.showMessage("Export failed: " + error.message, "error");
    } finally {
      this.exportInProgress = false;
      this.hideExportProgress();
    }
  }

  /**
   * CLEAR OLD DATA
   * Clear old activity data
   */
  async clearOldData() {
    try {
      const confirmed = confirm(
        "Are you sure you want to clear activity data older than 90 days? This action cannot be undone."
      );

      if (!confirmed) return;

      if (!this.activityLogger) {
        this.showMessage("Activity logger not available", "error");
        return;
      }

      await this.activityLogger.clearOldLogs(90);
      await this.refreshData();

      this.showMessage("Old data cleared successfully", "success");
    } catch (error) {
      console.error("Error clearing old data:", error);
      this.showMessage("Failed to clear old data", "error");
    }
  }

  /**
   * UPDATE BADGE
   * Update notification badge on header button
   */
  async updateBadge() {
    try {
      const badge = document.getElementById("activity-badge");
      if (!badge || !this.activityLogger) return;

      // Get recent activity count (last 24 hours)
      const yesterday = Date.now() - 24 * 60 * 60 * 1000;
      const recentLogs = await this.activityLogger.getActivityLogs(null, {
        startDate: yesterday,
        limit: 1000,
      });

      const count = recentLogs.totalCount || 0;

      if (count > 0) {
        badge.textContent = count > 99 ? "99+" : count;
        badge.style.display = "flex";
      } else {
        badge.style.display = "none";
      }
    } catch (error) {
      console.error("Error updating badge:", error);
    }
  }

  /**
   * PAGINATION METHODS
   */

  updatePagination(logsResult) {
    try {
      const pagination = document.getElementById("activity-pagination");
      const prevBtn = document.getElementById("prev-btn");
      const nextBtn = document.getElementById("next-btn");
      const pageInfo = document.getElementById("pagination-info");

      if (!pagination || !logsResult) return;

      const totalPages = Math.ceil(logsResult.totalCount / this.pageSize);
      const currentPage = this.currentPage + 1;

      if (totalPages <= 1) {
        pagination.style.display = "none";
        return;
      }

      pagination.style.display = "flex";

      if (prevBtn) prevBtn.disabled = this.currentPage === 0;
      if (nextBtn) nextBtn.disabled = !logsResult.hasMore;
      if (pageInfo)
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    } catch (error) {
      console.error("Error updating pagination:", error);
    }
  }

  async previousPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      await this.loadData();
    }
  }

  async nextPage() {
    this.currentPage++;
    await this.loadData();
  }

  /**
   * UTILITY METHODS
   */

  formatTemperatureChange(log) {
    try {
      let html = "";

      if (log.type === "recommendation_applied") {
        const change = log.recommendedTemp - log.originalTemp;
        const direction =
          change > 0 ? "increase" : change < 0 ? "decrease" : "maintain";
        const arrow = change > 0 ? "↑" : change < 0 ? "↓" : "=";

        html = `
          <div class="temp-change ${direction}">
            <span class="temp-display">${log.originalTemp}°C</span>
            <span class="arrow">${arrow}</span>
            <span class="temp-display">${log.recommendedTemp}°C</span>
          </div>
        `;
      } else if (log.type === "manual_adjustment") {
        const change = log.newTemp - log.previousTemp;
        const direction =
          change > 0 ? "increase" : change < 0 ? "decrease" : "maintain";
        const arrow = change > 0 ? "↑" : change < 0 ? "↓" : "=";

        html = `
          <div class="temp-change ${direction}">
            <span class="temp-display">${log.previousTemp}°C</span>
            <span class="arrow">${arrow}</span>
            <span class="temp-display">${log.newTemp}°C</span>
          </div>
        `;
      } else {
        html = `<span class="temp-display">${
          log.sustainedTemp || "-"
        }°C</span>`;
      }

      return html;
    } catch (error) {
      return "-";
    }
  }

  formatConfidence(confidence) {
    if (!confidence) return "-";

    const percentage = Math.round(confidence * 100);
    let level = "low";
    if (percentage >= 70) level = "high";
    else if (percentage >= 40) level = "medium";

    return `
      <div class="confidence-indicator">
        <div class="confidence-bar">
          <div class="confidence-fill ${level}" style="width: ${percentage}%"></div>
        </div>
        <span class="confidence-text">${percentage}%</span>
      </div>
    `;
  }

  formatContext(context) {
    if (!context || typeof context !== "object") return "-";

    const items = [];
    if (context.outdoor) items.push(`Outdoor: ${context.outdoor}`);
    if (context.target) items.push(`Target: ${context.target}`);
    if (context.room) items.push(`Room: ${context.room}`);

    return `<div class="context-details">${items.join("<br>")}</div>`;
  }

  formatActivityType(type) {
    const typeMap = {
      recommendation_applied: "Recommendation",
      manual_adjustment: "Adjustment",
      successful_recommendation: "Success",
      power_control: "Power Control",
    };
    return typeMap[type] || type;
  }

  /**
   * FORMAT POWER CONSUMPTION DELTA
   * Format power consumption delta for display
   */
  formatPowerConsumptionDelta(log) {
    try {
      // Check if power consumption delta data exists
      if (
        log.powerConsumptionDelta !== undefined &&
        log.powerConsumptionDelta !== null
      ) {
        const delta = parseFloat(log.powerConsumptionDelta);

        // Format delta with appropriate color coding
        if (delta > 0) {
          return `<span class="power-delta-increase">+${delta.toFixed(
            1
          )}W</span>`;
        } else if (delta < 0) {
          return `<span class="power-delta-decrease">${delta.toFixed(
            1
          )}W</span>`;
        } else {
          return `<span class="power-delta-neutral">0W</span>`;
        }
      }

      // Check if power monitoring data exists
      if (
        log.powerMonitoringData &&
        log.powerMonitoringData.currentDelta !== undefined
      ) {
        const delta = parseFloat(log.powerMonitoringData.currentDelta);

        if (delta > 0) {
          return `<span class="power-delta-increase">+${delta.toFixed(
            1
          )}W</span>`;
        } else if (delta < 0) {
          return `<span class="power-delta-decrease">${delta.toFixed(
            1
          )}W</span>`;
        } else {
          return `<span class="power-delta-neutral">0W</span>`;
        }
      }

      // Check context for power monitoring information
      if (log.context && log.context.powerMonitoringActive) {
        return `<span class="power-monitoring-active">Monitoring</span>`;
      }

      // Default case - no power data
      return `<span class="power-delta-na">-</span>`;
    } catch (error) {
      console.error("Error formatting power consumption delta:", error);
      return `<span class="power-delta-error">Error</span>`;
    }
  }

  getTimelineItemClass(type) {
    const classMap = {
      recommendation_applied: "recommendation",
      manual_adjustment: "adjustment",
      successful_recommendation: "success",
    };
    return classMap[type] || "";
  }

  formatTimelineContent(log) {
    try {
      // Ensure log properties have default values to prevent undefined
      const acId = log.acId || "Unknown";
      const appliedBy = log.appliedBy || "user";
      const originalTemp =
        log.originalTemp !== undefined ? log.originalTemp : "N/A";
      const recommendedTemp =
        log.recommendedTemp !== undefined ? log.recommendedTemp : "N/A";
      const previousTemp =
        log.previousTemp !== undefined ? log.previousTemp : "N/A";
      const newTemp = log.newTemp !== undefined ? log.newTemp : "N/A";
      const confidence =
        log.confidence !== undefined ? Math.round(log.confidence * 100) : 50;
      const energySavings =
        log.energySavings !== undefined ? log.energySavings : 0;
      const changedBy = log.changedBy || "user";
      const sustainedTemp =
        log.sustainedTemp !== undefined ? log.sustainedTemp : "N/A";

      switch (log.type) {
        case "recommendation_applied":
          return `
            <strong>AC ${acId}</strong> - Recommendation applied by ${appliedBy}<br>
            Temperature changed from ${originalTemp}°C to ${recommendedTemp}°C<br>
            <small>Confidence: ${confidence}% | Energy savings: ${energySavings}%</small>
          `;

        case "manual_adjustment":
          return `
            <strong>AC ${acId}</strong> - Manual adjustment by ${changedBy}<br>
            Temperature changed from ${previousTemp}°C to ${newTemp}°C<br>
            <small>Adjustment time: ${this.formatDuration(
              log.adjustmentTime
            )}</small>
          `;

        case "successful_recommendation":
          return `
            <strong>AC ${acId}</strong> - Recommendation successful<br>
            Temperature sustained at ${sustainedTemp}°C for ${this.formatDuration(
            log.sustainedDuration
          )}<br>
            <small>Energy saved: ${log.energySavingsActual || 0}%</small>
          `;

        default:
          return `<strong>AC ${acId}</strong> - ${log.type}`;
      }
    } catch (error) {
      console.error("Error formatting timeline content:", error, log);
      return `<strong>AC ${log.acId || "Unknown"}</strong> - Activity logged`;
    }
  }

  formatDuration(ms) {
    if (!ms || ms < 0) return "0 min";

    const minutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else {
      return `${minutes}m`;
    }
  }

  calculateAggregatedStats(dailyStats) {
    const stats = {
      totalRecommendations: 0,
      totalAdjustments: 0,
      totalEnergySaved: 0,
      successRate: 0,
    };

    for (const day of dailyStats) {
      stats.totalRecommendations += day.recommendationsApplied || 0;
      stats.totalAdjustments += day.adjustmentsMade || 0;
      stats.totalEnergySaved += day.energySaved || 0;
    }

    if (stats.totalRecommendations > 0) {
      stats.successRate = Math.round(
        ((stats.totalRecommendations - stats.totalAdjustments) /
          stats.totalRecommendations) *
          100
      );
    }

    stats.totalEnergySaved = Math.round(stats.totalEnergySaved * 10) / 10;

    return stats;
  }

  calculateOverallStats(logs) {
    const stats = {
      totalRecommendations: 0,
      totalAdjustments: 0,
      totalSuccessful: 0,
      totalEnergySaved: 0,
      successRate: 0,
    };

    for (const log of logs) {
      switch (log.type) {
        case "recommendation_applied":
          stats.totalRecommendations++;
          stats.totalEnergySaved += log.energySavings || 0;
          break;
        case "manual_adjustment":
          stats.totalAdjustments++;
          break;
        case "successful_recommendation":
          stats.totalSuccessful++;
          stats.totalEnergySaved += log.energySavingsActual || 0;
          break;
      }
    }

    if (stats.totalRecommendations > 0) {
      stats.successRate = Math.round(
        ((stats.totalRecommendations - stats.totalAdjustments) /
          stats.totalRecommendations) *
          100
      );
    }

    stats.totalEnergySaved = Math.round(stats.totalEnergySaved * 10) / 10;

    return stats;
  }

  /**
   * UI STATE METHODS
   */

  setLoading(loading) {
    this.isLoading = loading;

    const contentContainer = document.getElementById("activity-content");
    if (!contentContainer) return;

    if (loading) {
      contentContainer.innerHTML = `
        <div class="activity-log-loading">
          <div class="activity-log-spinner"></div>
          Loading activity data...
        </div>
      `;
    }
  }

  showMessage(message, type = "info", duration = 5000) {
    const messagesContainer = document.getElementById("activity-messages");
    if (!messagesContainer) return;

    const messageEl = document.createElement("div");
    messageEl.className = `activity-log-message ${type}`;
    messageEl.textContent = message;

    messagesContainer.appendChild(messageEl);

    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.parentNode.removeChild(messageEl);
      }
    }, duration);
  }

  showExportProgress(message) {
    const messagesContainer = document.getElementById("activity-messages");
    if (!messagesContainer) return;

    const progressEl = document.createElement("div");
    progressEl.className = "export-progress";
    progressEl.id = "export-progress";
    progressEl.innerHTML = `
      <div class="spinner"></div>
      ${message}
    `;

    messagesContainer.appendChild(progressEl);
  }

  hideExportProgress() {
    const progressEl = document.getElementById("export-progress");
    if (progressEl && progressEl.parentNode) {
      progressEl.parentNode.removeChild(progressEl);
    }
  }

  setupFocusTrap() {
    // Simple focus trap implementation
    const modal = document.getElementById("activity-log-modal");
    if (!modal) return;

    const focusableElements = modal.querySelectorAll(
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    this.focusTrapHandler = (e) => {
      if (e.key === "Tab") {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    modal.addEventListener("keydown", this.focusTrapHandler);
    firstElement.focus();
  }

  removeFocusTrap() {
    const modal = document.getElementById("activity-log-modal");
    if (modal && this.focusTrapHandler) {
      modal.removeEventListener("keydown", this.focusTrapHandler);
      this.focusTrapHandler = null;
    }
  }

  /**
   * PUBLIC API
   */

  isInitialized() {
    return this.initialized;
  }

  getStatus() {
    return {
      initialized: this.initialized,
      modalOpen: this.isModalOpen(),
      currentView: this.currentView,
      currentFilters: this.currentFilters,
      currentPage: this.currentPage,
      isLoading: this.isLoading,
      exportInProgress: this.exportInProgress,
    };
  }
}

// Initialize global instance
document.addEventListener("DOMContentLoaded", () => {
  window.tempActivityLogUI = new TemperatureActivityLogUI();

  // Initialize when other systems are ready
  setTimeout(async () => {
    await window.tempActivityLogUI.init();
  }, 2000);

  console.log("Temperature Activity Log UI global instance created");
});

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = TemperatureActivityLogUI;
}
