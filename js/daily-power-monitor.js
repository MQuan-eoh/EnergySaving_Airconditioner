/**
 * DAILY POWER MONITORING SYSTEM
 * Real-time kWh tracking based on AC power button state changes
 *
 * CORE FUNCTIONALITY:
 * - Track actual AC operating hours when power-btn is active
 * - Calculate real kWh consumption using spa-power-value data
 * - Store daily power consumption data to Firebase
 * - Integrate with existing powerConsumptionMonitoring system
 *
 * ARCHITECTURE:
 * - Observer Pattern for power state changes
 * - Real-time data capture from spa-power-value element
 * - Firebase Realtime Database for daily data storage
 * - Event-driven monitoring system
 */

class DailyPowerMonitor {
  constructor() {
    if (DailyPowerMonitor.instance) {
      return DailyPowerMonitor.instance;
    }

    this.isInitialized = false;
    this.isMonitoringEnabled = false;
    this.currentDayData = null;
    this.monitoringSession = null;
    this.storageManager = null;

    // Power tracking configuration
    this.powerTrackingConfig = {
      samplingInterval: 10000, // 10 seconds for accurate power sampling
      minimumSessionDuration: 30000, // 30 seconds minimum session
      powerValueElement: "spa-power-value",
      powerButtonElement: "spa-power-btn",
    };

    // Daily data structure
    this.dailyDataTemplate = {
      date: null,
      totalOperatingHours: 0,
      totalKwh: 0,
      sessions: [],
      averagePower: 0,
      peakPower: 0,
      lastUpdated: null,
      deviceUserId: null,
    };

    DailyPowerMonitor.instance = this;
    console.log("Daily Power Monitor initialized");

    // Auto-initialize when DOM is ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        // Add delay to ensure all scripts are loaded
        setTimeout(() => {
          console.log("Daily Power Monitor - DOM ready, initializing...");
          console.log(
            "Firebase storage manager available:",
            !!window.firebaseStorageManager
          );

          if (window.firebaseStorageManager) {
            console.log(
              "Storage manager methods:",
              Object.getOwnPropertyNames(
                Object.getPrototypeOf(window.firebaseStorageManager)
              )
            );
          }

          window.dailyPowerMonitor.init();
        }, 1000); // 1 second delay
      });
    } else {
      // DOM already loaded - add delay for script loading
      setTimeout(() => {
        console.log(
          "Daily Power Monitor - DOM already loaded, initializing..."
        );
        console.log(
          "Firebase storage manager available:",
          !!window.firebaseStorageManager
        );

        if (window.firebaseStorageManager) {
          console.log(
            "Storage manager methods:",
            Object.getOwnPropertyNames(
              Object.getPrototypeOf(window.firebaseStorageManager)
            )
          );
        }

        window.dailyPowerMonitor.init();
      }, 1000); // 1 second delay
    }
  }

  /**
   * INITIALIZE SYSTEM
   * Setup Firebase integration and event listeners
   */
  async init() {
    if (this.isInitialized) {
      console.warn("Daily Power Monitor already initialized");
      return;
    }

    try {
      // Initialize Firebase storage
      await this.initializeFirebaseIntegration();

      // Setup power button state monitoring
      this.setupPowerButtonMonitoring();

      // Initialize today's data
      await this.initializeTodayData();

      // Setup power sampling timer
      this.setupPowerSampling();

      this.isInitialized = true;
      console.log("Daily Power Monitor ready - tracking enabled");

      // Show initialization success
      this.showNotification("Daily Power Monitoring System ACTIVE", "success");
    } catch (error) {
      console.error("Daily Power Monitor initialization failed:", error);
      this.showNotification(
        "Daily Power Monitor initialization failed",
        "error"
      );
    }
  }

  /**
   * FIREBASE INTEGRATION SETUP
   * Connect with existing Firebase configuration
   */
  async initializeFirebaseIntegration() {
    try {
      // Wait for Firebase storage manager to be available
      let retryCount = 0;
      const maxRetries = 10;

      while (!window.firebaseStorageManager && retryCount < maxRetries) {
        console.log(
          `Waiting for Firebase storage manager... attempt ${retryCount + 1}`
        );
        await new Promise((resolve) => setTimeout(resolve, 500)); // Wait 500ms
        retryCount++;
      }

      // Get Firebase storage manager instance
      this.storageManager = window.firebaseStorageManager;

      if (!this.storageManager) {
        console.warn(
          "Firebase storage manager not available - continuing without Firebase integration"
        );
        return; // Continue without Firebase instead of throwing error
      }

      // Verify required methods exist
      if (
        typeof this.storageManager.saveData !== "function" ||
        typeof this.storageManager.loadData !== "function"
      ) {
        console.warn(
          "Firebase storage manager missing required methods - continuing without Firebase"
        );
        this.storageManager = null;
        return;
      }

      // Subscribe to storage events if method exists
      if (typeof this.storageManager.subscribe === "function") {
        this.storageManager.subscribe((event, data) => {
          this.handleFirebaseEvent(event, data);
        });
      }

      console.log("Daily Power Monitor - Firebase integration ready");
    } catch (error) {
      console.error("Firebase integration setup failed:", error);
      console.warn("Continuing without Firebase integration");
      this.storageManager = null; // Set to null instead of throwing error
    }
  }

  /**
   * SETUP POWER BUTTON MONITORING
   * Monitor power button state changes for monitoring control
   */
  setupPowerButtonMonitoring() {
    // Hook into existing power button events by overriding the handlePowerToggle method
    // This is already handled in eRaServices-controls.js via direct call to handlePowerStateChange()

    // Add fallback direct monitoring as backup
    const powerBtn = document.getElementById(
      this.powerTrackingConfig.powerButtonElement
    );

    if (powerBtn) {
      // Add click event listener as backup
      powerBtn.addEventListener("click", () => {
        // Add delay to let power state update first
        setTimeout(() => {
          this.handlePowerStateChange();
        }, 200);
      });

      console.log("Power button direct monitoring setup as backup");
    } else {
      console.warn("Power button element not found - will retry in 2 seconds");

      // Retry after DOM is fully loaded
      setTimeout(() => {
        this.setupPowerButtonMonitoring();
      }, 2000);
    }
  }

  /**
   * HANDLE POWER STATE CHANGE
   * Main handler for power button state changes
   */
  handlePowerStateChange() {
    const powerBtn = document.getElementById(
      this.powerTrackingConfig.powerButtonElement
    );
    const isACOnline = powerBtn && powerBtn.classList.contains("active");

    console.log(`Power state changed: AC ${isACOnline ? "ONLINE" : "OFFLINE"}`);

    if (isACOnline) {
      this.startDailyMonitoring();
    } else {
      this.stopDailyMonitoring();
    }
  }

  /**
   * START DAILY MONITORING
   * Begin tracking when AC comes online
   */
  async startDailyMonitoring() {
    if (this.isMonitoringEnabled) {
      console.log("Daily monitoring already active");
      return;
    }

    try {
      const currentPower = this.getCurrentPowerValue();

      if (currentPower <= 0) {
        console.warn("No power data available - monitoring delayed");
        return;
      }

      // Create new monitoring session
      this.monitoringSession = {
        startTime: new Date(),
        endTime: null,
        startPower: currentPower,
        endPower: null,
        peakPower: currentPower,
        averagePower: currentPower,
        powerSamples: [currentPower],
        totalKwh: 0,
      };

      this.isMonitoringEnabled = true;

      console.log(`Daily monitoring STARTED - Power: ${currentPower}W`);
      this.showNotification(
        `AC Online - Monitoring Started (${currentPower}W)`,
        "info"
      );

      // Update UI indicator
      this.updateMonitoringIndicator(true);
    } catch (error) {
      console.error("Failed to start daily monitoring:", error);
      this.showNotification("Failed to start power monitoring", "error");
    }
  }

  /**
   * STOP DAILY MONITORING
   * End tracking and save session data
   */
  async stopDailyMonitoring() {
    if (!this.isMonitoringEnabled || !this.monitoringSession) {
      console.log("No active monitoring session to stop");
      return;
    }

    try {
      const currentPower = this.getCurrentPowerValue();
      const sessionEndTime = new Date();

      // Complete monitoring session
      this.monitoringSession.endTime = sessionEndTime;
      this.monitoringSession.endPower = currentPower;

      // Calculate session statistics
      const sessionDuration = sessionEndTime - this.monitoringSession.startTime;
      const operatingHours = sessionDuration / (1000 * 60 * 60); // Convert to hours

      // Calculate kWh for this session
      const sessionKwh = this.calculateSessionKwh(this.monitoringSession);
      this.monitoringSession.totalKwh = sessionKwh;

      // Only save sessions longer than minimum duration
      if (sessionDuration >= this.powerTrackingConfig.minimumSessionDuration) {
        // Add session to today's data
        this.currentDayData.sessions.push({ ...this.monitoringSession });

        // Update daily totals
        this.updateDailyTotals();

        // Save to Firebase
        await this.saveDailyDataToFirebase();

        console.log(
          `Monitoring session saved: ${operatingHours.toFixed(
            2
          )}h, ${sessionKwh.toFixed(3)}kWh`
        );
        this.showNotification(
          `AC Offline - Session: ${operatingHours.toFixed(
            1
          )}h, ${sessionKwh.toFixed(3)}kWh`,
          "success"
        );
      } else {
        console.log("Session too short - not recorded");
        this.showNotification("AC session too short - not recorded", "warning");
      }

      // Reset monitoring state
      this.isMonitoringEnabled = false;
      this.monitoringSession = null;

      // Update UI indicator
      this.updateMonitoringIndicator(false);
    } catch (error) {
      console.error("Failed to stop daily monitoring:", error);
      this.showNotification("Error saving monitoring session", "error");
    }
  }

  /**
   * SETUP POWER SAMPLING
   * Regular power value sampling during monitoring
   */
  setupPowerSampling() {
    setInterval(() => {
      if (this.isMonitoringEnabled && this.monitoringSession) {
        this.sampleCurrentPower();
      }
    }, this.powerTrackingConfig.samplingInterval);

    console.log(
      `Power sampling setup - interval: ${this.powerTrackingConfig.samplingInterval}ms`
    );
  }

  /**
   * SAMPLE CURRENT POWER
   * Record power value sample during active monitoring
   */
  sampleCurrentPower() {
    try {
      const currentPower = this.getCurrentPowerValue();

      if (currentPower > 0 && this.monitoringSession) {
        // Add power sample
        this.monitoringSession.powerSamples.push(currentPower);

        // Update peak power
        if (currentPower > this.monitoringSession.peakPower) {
          this.monitoringSession.peakPower = currentPower;
        }

        // Calculate running average
        const samples = this.monitoringSession.powerSamples;
        this.monitoringSession.averagePower =
          samples.reduce((sum, p) => sum + p, 0) / samples.length;

        console.log(
          `Power sample: ${currentPower}W (avg: ${this.monitoringSession.averagePower.toFixed(
            1
          )}W)`
        );
      }
    } catch (error) {
      console.error("Power sampling error:", error);
    }
  }

  /**
   * GET CURRENT POWER VALUE
   * Extract current power consumption from DOM element
   */
  getCurrentPowerValue() {
    const powerElement = document.getElementById(
      this.powerTrackingConfig.powerValueElement
    );

    if (!powerElement) {
      console.warn("Power value element not found");
      return 0;
    }

    const powerValue = parseFloat(powerElement.textContent) || 0;
    return powerValue;
  }

  /**
   * CALCULATE SESSION KWH
   * Calculate kWh consumption for a monitoring session
   */
  calculateSessionKwh(session) {
    if (
      !session ||
      !session.powerSamples ||
      session.powerSamples.length === 0
    ) {
      return 0;
    }

    // Use average power and actual duration for accurate calculation
    const avgPowerKw = session.averagePower / 1000; // Convert W to kW
    const durationHours =
      (session.endTime - session.startTime) / (1000 * 60 * 60);

    const sessionKwh = avgPowerKw * durationHours;

    console.log(
      `Session kWh calculation: ${avgPowerKw.toFixed(
        3
      )}kW × ${durationHours.toFixed(2)}h = ${sessionKwh.toFixed(3)}kWh`
    );

    return sessionKwh;
  }

  /**
   * INITIALIZE TODAY DATA
   * Setup or load existing data for current day
   */
  async initializeTodayData() {
    const today = new Date();
    const dateKey = this.formatDateKey(today);

    try {
      // Try to load existing data for today
      const existingData = await this.loadDailyDataFromFirebase(dateKey);

      if (existingData) {
        this.currentDayData = existingData;
        console.log(
          `Loaded existing data for ${dateKey}: ${existingData.totalKwh.toFixed(
            3
          )}kWh`
        );
      } else {
        // Create new daily data structure
        this.currentDayData = {
          ...this.dailyDataTemplate,
          date: dateKey,
          deviceUserId: await this.getCurrentUserId(),
        };

        console.log(`Created new daily data for ${dateKey}`);
      }
    } catch (error) {
      console.error("Failed to initialize today's data:", error);

      // Fallback to new data structure
      this.currentDayData = {
        ...this.dailyDataTemplate,
        date: dateKey,
        deviceUserId: "fallback_user",
      };
    }
  }

  /**
   * UPDATE DAILY TOTALS
   * Recalculate daily statistics from all sessions
   */
  updateDailyTotals() {
    if (!this.currentDayData || !this.currentDayData.sessions) {
      return;
    }

    const sessions = this.currentDayData.sessions;

    // Calculate total operating hours
    let totalHours = 0;
    let totalKwh = 0;
    let allPowerSamples = [];
    let maxPeak = 0;

    sessions.forEach((session) => {
      const sessionHours =
        (session.endTime - session.startTime) / (1000 * 60 * 60);
      totalHours += sessionHours;
      totalKwh += session.totalKwh || 0;

      if (session.powerSamples) {
        allPowerSamples = allPowerSamples.concat(session.powerSamples);
      }

      if (session.peakPower > maxPeak) {
        maxPeak = session.peakPower;
      }
    });

    // Update daily totals
    this.currentDayData.totalOperatingHours = totalHours;
    this.currentDayData.totalKwh = totalKwh;
    this.currentDayData.peakPower = maxPeak;
    this.currentDayData.averagePower =
      allPowerSamples.length > 0
        ? allPowerSamples.reduce((sum, p) => sum + p, 0) /
          allPowerSamples.length
        : 0;
    this.currentDayData.lastUpdated = new Date();

    console.log(
      `Daily totals updated: ${totalHours.toFixed(2)}h, ${totalKwh.toFixed(
        3
      )}kWh`
    );
  }

  /**
   * SAVE DAILY DATA TO FIREBASE
   * Store daily power consumption data to Firebase
   */
  async saveDailyDataToFirebase() {
    if (!this.storageManager || !this.currentDayData) {
      console.warn(
        "Cannot save to Firebase - storage manager or data not available"
      );
      return;
    }

    try {
      const userId = this.currentDayData.deviceUserId;
      const dateKey = this.currentDayData.date;

      // Firebase path: Air_Conditioner/{userId}/Daily_power_consumption/{date}
      const firebasePath = `Air_Conditioner/${userId}/Daily_power_consumption/${dateKey}`;

      // Prepare data for Firebase (remove functions and non-serializable objects)
      const firebaseData = {
        date: this.currentDayData.date,
        totalOperatingHours: this.currentDayData.totalOperatingHours,
        totalKwh: this.currentDayData.totalKwh,
        averagePower: this.currentDayData.averagePower,
        peakPower: this.currentDayData.peakPower,
        sessionsCount: this.currentDayData.sessions.length,
        lastUpdated: this.currentDayData.lastUpdated.toISOString(),
        deviceUserId: userId,
        // Store simplified session data
        sessions: this.currentDayData.sessions.map((session) => ({
          startTime: session.startTime.toISOString(),
          endTime: session.endTime.toISOString(),
          duration: session.endTime - session.startTime,
          startPower: session.startPower,
          endPower: session.endPower,
          averagePower: session.averagePower,
          peakPower: session.peakPower,
          totalKwh: session.totalKwh,
          samplesCount: session.powerSamples ? session.powerSamples.length : 0,
        })),
      };

      await this.storageManager.saveData(firebasePath, firebaseData);

      console.log(`Daily data saved to Firebase: ${firebasePath}`);
      console.log(
        `Data summary: ${firebaseData.totalKwh.toFixed(
          3
        )}kWh in ${firebaseData.totalOperatingHours.toFixed(2)}h`
      );
    } catch (error) {
      console.error("Failed to save daily data to Firebase:", error);
      throw error;
    }
  }

  /**
   * LOAD DAILY DATA FROM FIREBASE
   * Load existing daily data for specific date
   */
  async loadDailyDataFromFirebase(dateKey) {
    if (!this.storageManager) {
      return null;
    }

    try {
      const userId = await this.getCurrentUserId();
      const firebasePath = `Air_Conditioner/${userId}/Daily_power_consumption/${dateKey}`;

      const data = await this.storageManager.loadData(firebasePath);

      if (data) {
        // Reconstruct Date objects from ISO strings
        const reconstructedData = {
          ...data,
          lastUpdated: new Date(data.lastUpdated),
          sessions: data.sessions.map((session) => ({
            ...session,
            startTime: new Date(session.startTime),
            endTime: new Date(session.endTime),
            powerSamples: [], // Don't load all samples to save memory
          })),
        };

        console.log(`Loaded daily data from Firebase: ${dateKey}`);
        return reconstructedData;
      }

      return null;
    } catch (error) {
      console.error("Failed to load daily data from Firebase:", error);
      return null;
    }
  }

  /**
   * UTILITY METHODS
   */

  // Format date as YYYY-MM-DD key
  formatDateKey(date) {
    return date.toISOString().split("T")[0];
  }

  // Get current user ID
  async getCurrentUserId() {
    if (this.storageManager && this.storageManager.getCurrentUserId) {
      return await this.storageManager.getCurrentUserId();
    }
    return "default_user";
  }

  // Handle Firebase events
  handleFirebaseEvent(event, data) {
    console.log(`Daily Power Monitor - Firebase event: ${event}`, data);
  }

  // Update monitoring indicator UI
  updateMonitoringIndicator(isActive) {
    // Add visual indicator for active monitoring
    const indicator = document.getElementById("daily-power-monitor-indicator");
    if (indicator) {
      if (isActive) {
        indicator.classList.add("monitoring-active");
        indicator.textContent = "Daily Monitoring ON";
      } else {
        indicator.classList.remove("monitoring-active");
        indicator.textContent = "Daily Monitoring OFF";
      }
    }
  }

  // Show notification to user
  showNotification(message, type = "info") {
    console.log(`Daily Power Monitor - ${type.toUpperCase()}: ${message}`);

    // Try to use existing notification system
    if (window.showNotification) {
      window.showNotification(message, type);
    }
  }

  /**
   * PUBLIC API METHODS
   */

  // Show Daily Power Dashboard
  async showDashboard() {
    try {
      // Get current day stats
      const currentStats = this.getCurrentDayStats();

      // Get last 7 days historical data
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);
      const historicalData = await this.getHistoricalData(startDate, endDate);

      // Create dashboard UI
      this.createDashboardUI(currentStats, historicalData);
    } catch (error) {
      console.error("Failed to show dashboard:", error);
      this.showNotification("Không thể hiển thị dashboard", "error");
    }
  }

  // Create Dashboard UI
  createDashboardUI(currentStats, historicalData) {
    // Remove existing dashboard
    const existingDashboard = document.getElementById("daily-power-dashboard");
    if (existingDashboard) {
      existingDashboard.remove();
    }

    // Create dashboard HTML
    const dashboardHTML = `
      <div id="daily-power-dashboard" class="modal-overlay">
        <div class="modal-container daily-power-modal">
          <div class="modal-header">
            <h2><i class="fas fa-clock"></i> Daily Power Monitoring</h2>
            <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="modal-body">
            <!-- Current Day Stats -->
            <div class="current-day-section">
              <h3>Hôm Nay - ${
                currentStats
                  ? currentStats.date
                  : new Date().toISOString().split("T")[0]
              }</h3>
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-icon"><i class="fas fa-power-off"></i></div>
                  <div class="stat-content">
                    <div class="stat-value">${
                      currentStats
                        ? currentStats.totalOperatingHours.toFixed(1)
                        : "0.0"
                    }</div>
                    <div class="stat-label">Giờ Hoạt Động</div>
                  </div>
                </div>
                
                <div class="stat-card">
                  <div class="stat-icon"><i class="fas fa-bolt"></i></div>
                  <div class="stat-content">
                    <div class="stat-value">${
                      currentStats ? currentStats.totalKwh.toFixed(3) : "0.000"
                    }</div>
                    <div class="stat-label">kWh Tiêu Thụ</div>
                  </div>
                </div>
                
                <div class="stat-card">
                  <div class="stat-icon"><i class="fas fa-tachometer-alt"></i></div>
                  <div class="stat-content">
                    <div class="stat-value">${
                      currentStats ? Math.round(currentStats.averagePower) : "0"
                    }</div>
                    <div class="stat-label">Công Suất TB (W)</div>
                  </div>
                </div>
                
                <div class="stat-card">
                  <div class="stat-icon"><i class="fas fa-chart-line"></i></div>
                  <div class="stat-content">
                    <div class="stat-value">${
                      currentStats ? Math.round(currentStats.peakPower) : "0"
                    }</div>
                    <div class="stat-label">Công Suất Peak (W)</div>
                  </div>
                </div>
                
                <div class="stat-card">
                  <div class="stat-icon"><i class="fas fa-play"></i></div>
                  <div class="stat-content">
                    <div class="stat-value">${
                      currentStats ? currentStats.sessionsCount : "0"
                    }</div>
                    <div class="stat-label">Số Lần Bật</div>
                  </div>
                </div>
                
                <div class="stat-card monitoring-status">
                  <div class="stat-icon">
                    <i class="fas ${
                      currentStats && currentStats.isMonitoring
                        ? "fa-circle"
                        : "fa-circle-o"
                    }"></i>
                  </div>
                  <div class="stat-content">
                    <div class="stat-value">${
                      currentStats && currentStats.isMonitoring
                        ? "ACTIVE"
                        : "STOPPED"
                    }</div>
                    <div class="stat-label">Trạng Thái Monitor</div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Historical Data -->
            <div class="historical-section">
              <h3>7 Ngày Qua</h3>
              <div class="historical-chart" id="daily-power-historical-chart">
                ${this.createHistoricalChartHTML(historicalData)}
              </div>
            </div>
            
            <!-- Actions -->
            <div class="dashboard-actions">
              <button class="action-btn primary" onclick="window.dailyPowerMonitor.forceSave()">
                <i class="fas fa-save"></i>
                Lưu Dữ Liệu
              </button>
              <button class="action-btn secondary" onclick="window.dailyPowerMonitor.exportDailyData()">
                <i class="fas fa-download"></i>
                Xuất Excel
              </button>
              <button class="action-btn secondary" onclick="location.reload()">
                <i class="fas fa-sync"></i>
                Tải Lại
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add dashboard to DOM
    document.body.insertAdjacentHTML("beforeend", dashboardHTML);

    // Add event listeners
    this.setupDashboardEvents();

    console.log("Daily Power Dashboard displayed");
  }

  // Create historical chart HTML
  createHistoricalChartHTML(historicalData) {
    if (!historicalData || historicalData.length === 0) {
      return '<div class="no-data">Chưa có dữ liệu lịch sử</div>';
    }

    // Generate chart bars
    const maxKwh = Math.max(...historicalData.map((d) => d.totalKwh));
    const chartBars = historicalData
      .map((dayData) => {
        const heightPercent =
          maxKwh > 0 ? (dayData.totalKwh / maxKwh) * 100 : 0;
        const date = new Date(dayData.date);
        const dayName = date.toLocaleDateString("vi-VN", {
          weekday: "short",
        });

        return `
        <div class="chart-bar-container">
          <div class="chart-bar" style="height: ${heightPercent}%;" 
               title="${dayData.date}: ${dayData.totalKwh.toFixed(
          3
        )}kWh, ${dayData.totalOperatingHours.toFixed(1)}h">
            <div class="bar-fill"></div>
          </div>
          <div class="chart-label">
            <div class="day-name">${dayName}</div>
            <div class="kwh-value">${dayData.totalKwh.toFixed(2)}</div>
          </div>
        </div>
      `;
      })
      .join("");

    return `
      <div class="historical-chart-container">
        <div class="chart-title">kWh Tiêu Thụ Hàng Ngày</div>
        <div class="chart-bars">
          ${chartBars}
        </div>
        <div class="chart-summary">
          <div class="summary-item">
            <span class="summary-label">Tổng 7 ngày:</span>
            <span class="summary-value">${historicalData
              .reduce((sum, d) => sum + d.totalKwh, 0)
              .toFixed(3)} kWh</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Trung bình/ngày:</span>
            <span class="summary-value">${(
              historicalData.reduce((sum, d) => sum + d.totalKwh, 0) /
              historicalData.length
            ).toFixed(3)} kWh</span>
          </div>
        </div>
      </div>
    `;
  }

  // Setup dashboard event listeners
  setupDashboardEvents() {
    // Close on background click
    const dashboard = document.getElementById("daily-power-dashboard");
    if (dashboard) {
      dashboard.addEventListener("click", (e) => {
        if (e.target === dashboard) {
          dashboard.remove();
        }
      });
    }
  }

  // Export daily data to Excel (placeholder)
  async exportDailyData() {
    this.showNotification("Chức năng xuất Excel đang được phát triển", "info");
  }

  // Get current daily statistics
  getCurrentDayStats() {
    return this.currentDayData
      ? {
          date: this.currentDayData.date,
          totalOperatingHours: this.currentDayData.totalOperatingHours,
          totalKwh: this.currentDayData.totalKwh,
          averagePower: this.currentDayData.averagePower,
          peakPower: this.currentDayData.peakPower,
          sessionsCount: this.currentDayData.sessions.length,
          isMonitoring: this.isMonitoringEnabled,
        }
      : null;
  }

  // Get historical data for date range
  async getHistoricalData(startDate, endDate) {
    const results = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateKey = this.formatDateKey(current);
      const dayData = await this.loadDailyDataFromFirebase(dateKey);

      if (dayData) {
        results.push(dayData);
      }

      current.setDate(current.getDate() + 1);
    }

    return results;
  }

  // Force save current data
  async forceSave() {
    if (this.currentDayData) {
      await this.saveDailyDataToFirebase();
      return true;
    }
    return false;
  }
}

// Initialize global instance
window.dailyPowerMonitor = new DailyPowerMonitor();

console.log("Daily Power Monitor module loaded");
