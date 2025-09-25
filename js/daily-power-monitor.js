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
    this.dashboardUpdateInterval = null; // Add dashboard update interval
    this.powerStateDebounceTimer = null; // Add debounce timer for power state changes
    this.devicePowerDebounceTimer = null; // Add debounce timer for device power changes

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

          window.dailyPowerMonitor.init().then(() => {
            this.integratePowerButtonMonitoring();
          });
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

        window.dailyPowerMonitor.init().then(() => {
          this.integratePowerButtonMonitoring();
        });
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
   * FIXED: Avoid interference with E-RA device synchronization
   */
  setupPowerButtonMonitoring() {
    // PRIMARY: Let eRaServices-controls.js handle power button events
    // Daily Monitor will receive notifications via handlePowerStateChange() calls
    console.log(
      "Power monitoring integrated with E-RA services - no direct button monitoring needed"
    );

    // BACKUP: Monitor global device data changes instead of button clicks
    if (window.globalDeviceDataManager) {
      window.globalDeviceDataManager.subscribe((deviceData) => {
        if (
          deviceData &&
          deviceData.power !== null &&
          deviceData.power !== undefined
        ) {
          console.log(
            `Daily Monitor received device power update: ${deviceData.power}`
          );
          // Use device data change instead of button clicks
          this.handleDevicePowerChange(deviceData.power);
        }
      });
      console.log(
        "Daily Monitor subscribed to device data updates for power monitoring"
      );
    }

    // FALLBACK: Only setup direct monitoring if E-RA integration fails
    this.setupFallbackPowerMonitoring();
  }

  /**
   * HANDLE DEVICE POWER CHANGE FROM E-RA DATA
   * Handles power state changes from actual device data (more reliable)
   */
  handleDevicePowerChange(powerState) {
    console.log(
      `Device power changed via E-RA data: ${powerState ? "ONLINE" : "OFFLINE"}`
    );

    // Add small debounce for device data changes
    if (this.devicePowerDebounceTimer) {
      clearTimeout(this.devicePowerDebounceTimer);
    }

    this.devicePowerDebounceTimer = setTimeout(() => {
      if (powerState) {
        this.startDailyMonitoring();
      } else {
        this.stopDailyMonitoring();
      }
    }, 100); // Shorter debounce for device data (100ms)
  }

  /**
   * SETUP FALLBACK POWER MONITORING
   * Only used when E-RA integration is not available
   */
  setupFallbackPowerMonitoring() {
    const powerBtn = document.getElementById("spa-power-btn");

    if (powerBtn) {
      // Only add event listener if E-RA integration is not working
      setTimeout(() => {
        if (!window.globalDeviceDataManager || !window.deviceDataReceived) {
          console.log(
            "E-RA integration not available - setting up fallback power monitoring"
          );

          powerBtn.addEventListener("click", () => {
            // Add delay to let E-RA services handle the update first
            setTimeout(() => {
              this.handlePowerStateChange();
            }, 300);
          });
        } else {
          console.log(
            "E-RA integration working - fallback power monitoring not needed"
          );
        }
      }, 2000);
    } else {
      console.warn(
        "Power button element (spa-power-btn) not found for fallback monitoring"
      );
    }
  }

  /**
   * HANDLE POWER STATE CHANGE
   * Main handler for power button state changes
   * FIXED: Add device data priority and debounced state checking
   */
  handlePowerStateChange() {
    // PRIORITY 1: Check E-RA device data first (most reliable source)
    const devicePowerState = this.getDevicePowerState();

    // PRIORITY 2: Check UI button state as fallback
    const powerBtn = document.getElementById("spa-power-btn");
    const uiPowerState = powerBtn && powerBtn.classList.contains("active");

    // Use device data if available, otherwise fallback to UI state
    const isACOnline =
      devicePowerState !== null ? devicePowerState : uiPowerState;

    console.log(`Power state changed: AC ${isACOnline ? "ONLINE" : "OFFLINE"}`);
    console.log(
      `- Device state: ${devicePowerState !== null ? devicePowerState : "N/A"}`
    );
    console.log(`- UI state: ${uiPowerState}`);
    console.log(`- Selected state: ${isACOnline}`);

    // Add debounce to prevent rapid state changes during system initialization
    if (this.powerStateDebounceTimer) {
      clearTimeout(this.powerStateDebounceTimer);
    }

    this.powerStateDebounceTimer = setTimeout(() => {
      if (isACOnline) {
        this.startDailyMonitoring();
      } else {
        this.stopDailyMonitoring();
      }
    }, 500); // 500ms debounce delay
  }

  /**
   * GET DEVICE POWER STATE FROM E-RA DATA
   * Prioritize actual device data over UI state
   */
  getDevicePowerState() {
    // Check global device data manager first (E-RA source)
    if (
      window.globalDeviceDataManager &&
      window.globalDeviceDataManager.getDeviceData
    ) {
      const deviceData = window.globalDeviceDataManager.getDeviceData();
      if (
        deviceData &&
        deviceData.power !== null &&
        deviceData.power !== undefined
      ) {
        console.log(`Device power state from E-RA: ${deviceData.power}`);
        return deviceData.power;
      }
    }

    // Check latest device values as fallback
    if (window.latestDeviceValues && window.latestDeviceValues.power !== null) {
      console.log(
        `Device power state from latest values: ${window.latestDeviceValues.power}`
      );
      return window.latestDeviceValues.power;
    }

    // Check temperature controller state
    if (window.tempController && window.tempController.isPowerOn !== null) {
      console.log(
        `Device power state from temp controller: ${window.tempController.isPowerOn}`
      );
      return window.tempController.isPowerOn;
    }

    console.log("No reliable device power state found - will use UI state");
    return null; // No reliable device state found
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
    // Use correct element ID from spa_app.html
    const powerElement = document.getElementById("spa-power-value");

    if (!powerElement) {
      console.warn("Power value element (spa-power-value) not found");
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
      // Validate session data before processing
      if (!session || !session.startTime || !session.endTime) {
        console.warn("Invalid session data found, skipping session");
        return; // Skip this session
      }

      const sessionHours =
        (session.endTime - session.startTime) / (1000 * 60 * 60);
      totalHours += sessionHours;
      totalKwh += session.totalKwh || 0;

      if (session.powerSamples && Array.isArray(session.powerSamples)) {
        allPowerSamples = allPowerSamples.concat(session.powerSamples);
      }

      if (session.peakPower && session.peakPower > maxPeak) {
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
   * Store daily power consumption data to Firebase with Temperature Storage integration
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

      // Validate required data before saving
      if (!userId || !dateKey) {
        console.warn("Cannot save to Firebase - missing userId or dateKey");
        return;
      }

      // Ensure lastUpdated is set
      if (!this.currentDayData.lastUpdated) {
        this.currentDayData.lastUpdated = new Date();
      }

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
        lastUpdated: this.currentDayData.lastUpdated
          ? this.currentDayData.lastUpdated.toISOString()
          : new Date().toISOString(),
        deviceUserId: userId,
        // Store simplified session data - filter out invalid sessions
        sessions: this.processSessions(),
      };

      await this.storageManager.saveData(firebasePath, firebaseData);

      // Also integrate with Temperature Adjustment Storage for cross-reference
      if (
        window.temperatureAdjustmentStorage &&
        window.temperatureAdjustmentStorage.logTemperatureAdjustment
      ) {
        try {
          await window.temperatureAdjustmentStorage.logTemperatureAdjustment({
            targetTemp: 22, // Default temp for power monitoring log
            adjustmentType: "power_monitoring",
            adjustedBy: "daily_power_monitor",
            kwh: this.currentDayData.totalKwh,
            powerDelta: this.getCurrentPowerValue(),
            notes: `Daily power monitoring data: ${firebaseData.totalKwh.toFixed(
              3
            )}kWh, ${firebaseData.totalOperatingHours.toFixed(2)}h`,
          });

          console.log(
            "Daily power data also logged to Temperature Adjustment Storage"
          );
        } catch (tempStorageError) {
          console.warn(
            "Failed to log to Temperature Adjustment Storage:",
            tempStorageError
          );
        }
      }

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
        // Validate data structure before processing
        const validatedSessions = Array.isArray(data.sessions)
          ? data.sessions
          : [];

        // Reconstruct Date objects from ISO strings
        const reconstructedData = {
          ...data,
          lastUpdated: data.lastUpdated
            ? new Date(data.lastUpdated)
            : new Date(),
          sessions: validatedSessions.map((session) => ({
            ...session,
            startTime: session.startTime ? new Date(session.startTime) : null,
            endTime: session.endTime ? new Date(session.endTime) : null,
            powerSamples: [], // Don't load all samples to save memory
          })),
        };

        console.log(
          `Loaded daily data from Firebase: ${dateKey}. Sessions count: ${validatedSessions.length}`
        );
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

  // Create Dashboard UI with proper IDs and real-time data
  createDashboardUI(currentStats, historicalData) {
    // Remove existing dashboard
    const existingDashboard = document.getElementById("daily-power-dashboard");
    if (existingDashboard) {
      existingDashboard.remove();
    }

    // Create dashboard HTML with unique IDs for each element
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
              <h3 id="daily-power-current-date">Hôm Nay - ${
                currentStats
                  ? currentStats.date
                  : new Date().toISOString().split("T")[0]
              }</h3>
              <div class="stats-grid">
                <div class="stat-card" id="operating-hours-card">
                  <div class="stat-icon"><i class="fas fa-clock"></i></div>
                  <div class="stat-content">
                    <div class="stat-value" id="daily-operating-hours">${
                      currentStats
                        ? currentStats.totalOperatingHours.toFixed(1)
                        : "0.0"
                    }</div>
                    <div class="stat-label">Giờ Hoạt Động</div>
                  </div>
                </div>
                
                <div class="stat-card" id="kwh-consumption-card">
                  <div class="stat-icon"><i class="fas fa-bolt"></i></div>
                  <div class="stat-content">
                    <div class="stat-value" id="daily-kwh-consumption">${
                      currentStats ? currentStats.totalKwh.toFixed(3) : "0.000"
                    }</div>
                    <div class="stat-label">kWh Tiêu Thụ</div>
                  </div>
                </div>
                
                <div class="stat-card" id="average-power-card">
                  <div class="stat-icon"><i class="fas fa-tachometer-alt"></i></div>
                  <div class="stat-content">
                    <div class="stat-value" id="daily-average-power">${
                      currentStats ? Math.round(currentStats.averagePower) : "0"
                    }</div>
                    <div class="stat-label">Công Suất TB (W)</div>
                  </div>
                </div>
                
                <div class="stat-card" id="peak-power-card">
                  <div class="stat-icon"><i class="fas fa-chart-line"></i></div>
                  <div class="stat-content">
                    <div class="stat-value" id="daily-peak-power">${
                      currentStats ? Math.round(currentStats.peakPower) : "0"
                    }</div>
                    <div class="stat-label">Công Suất Peak (W)</div>
                  </div>
                </div>
                
                <div class="stat-card" id="sessions-count-card">
                  <div class="stat-icon"><i class="fas fa-play"></i></div>
                  <div class="stat-content">
                    <div class="stat-value" id="daily-sessions-count">${
                      currentStats ? currentStats.sessionsCount : "0"
                    }</div>
                    <div class="stat-label">Số Lần Bật</div>
                  </div>
                </div>
                
                <div class="stat-card monitoring-status" id="monitoring-status-card">
                  <div class="stat-icon">
                    <i class="fas ${
                      currentStats && currentStats.isMonitoring
                        ? "fa-circle text-success"
                        : "fa-circle-o text-muted"
                    }" id="monitoring-status-icon"></i>
                  </div>
                  <div class="stat-content">
                    <div class="stat-value" id="monitoring-status-text">${
                      currentStats && currentStats.isMonitoring
                        ? "HOẠT ĐỘNG"
                        : "TẮT"
                    }</div>
                    <div class="stat-label">Trạng Thái Monitor</div>
                  </div>
                </div>
              </div>
              
              <!-- Real-time Electrical Values -->
              <div class="real-time-section" id="real-time-section">
                <h4>Giá Trị Thời Gian Thực</h4>
                <div class="real-time-grid">
                  <div class="real-time-card" id="current-power-card">
                    <div class="real-time-icon"><i class="fas fa-bolt"></i></div>
                    <div class="real-time-content">
                      <div class="real-time-value" id="current-power-value">${
                        currentStats
                          ? Math.round(currentStats.currentPower)
                          : "0"
                      }</div>
                      <div class="real-time-label">Công Suất (W)</div>
                    </div>
                  </div>
                  
                  <div class="real-time-card" id="current-amperage-card">
                    <div class="real-time-icon"><i class="fas fa-wave-square"></i></div>
                    <div class="real-time-content">
                      <div class="real-time-value" id="current-amperage-value">${
                        currentStats
                          ? currentStats.currentAmperage.toFixed(2)
                          : "0.00"
                      }</div>
                      <div class="real-time-label">Dòng Điện (A)</div>
                    </div>
                  </div>
                  
                  <div class="real-time-card" id="current-voltage-card">
                    <div class="real-time-icon"><i class="fas fa-zap"></i></div>
                    <div class="real-time-content">
                      <div class="real-time-value" id="current-voltage-value">${
                        currentStats
                          ? Math.round(currentStats.currentVoltage)
                          : "0"
                      }</div>
                      <div class="real-time-label">Điện Áp (V)</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Historical Data -->
            <div class="historical-section" id="historical-section">
              <h3>7 Ngày Qua</h3>
              <div class="historical-chart" id="daily-power-historical-chart">
                ${this.createHistoricalChartHTML(historicalData)}
              </div>
            </div>
            
            <!-- Actions -->
            <div class="dashboard-actions" id="dashboard-actions">
              <button class="action-btn primary" id="force-save-btn" onclick="window.dailyPowerMonitor.forceSave()">
                <i class="fas fa-save"></i>
                Lưu Dữ Liệu
              </button>
              <button class="action-btn secondary" id="export-data-btn" onclick="window.dailyPowerMonitor.exportDailyData()">
                <i class="fas fa-download"></i>
                Xuất Excel
              </button>
              <button class="action-btn info" id="refresh-data-btn" onclick="window.dailyPowerMonitor.refreshDashboardData()">
                <i class="fas fa-sync"></i>
                Cập Nhật
              </button>
              <button class="action-btn secondary" id="reload-page-btn" onclick="location.reload()">
                <i class="fas fa-redo"></i>
                Tải Lại
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add dashboard to DOM
    document.body.insertAdjacentHTML("beforeend", dashboardHTML);

    // Add event listeners and setup real-time updates
    this.setupDashboardEvents();
    this.startRealTimeUpdates();

    console.log(
      "Daily Power Dashboard displayed with real-time data integration"
    );
  }

  /**
   * REFRESH DASHBOARD DATA
   * Update dashboard with latest real-time data
   */
  async refreshDashboardData() {
    try {
      const currentStats = this.getCurrentDayStats();

      // Update stat values
      const elements = {
        operatingHours: document.getElementById("daily-operating-hours"),
        kwhConsumption: document.getElementById("daily-kwh-consumption"),
        averagePower: document.getElementById("daily-average-power"),
        peakPower: document.getElementById("daily-peak-power"),
        sessionsCount: document.getElementById("daily-sessions-count"),
        monitoringStatus: document.getElementById("monitoring-status-text"),
        monitoringIcon: document.getElementById("monitoring-status-icon"),
        currentPower: document.getElementById("current-power-value"),
        currentAmperage: document.getElementById("current-amperage-value"),
        currentVoltage: document.getElementById("current-voltage-value"),
      };

      // Update each element if it exists
      if (elements.operatingHours) {
        elements.operatingHours.textContent =
          currentStats.totalOperatingHours.toFixed(1);
      }
      if (elements.kwhConsumption) {
        elements.kwhConsumption.textContent = currentStats.totalKwh.toFixed(3);
      }
      if (elements.averagePower) {
        elements.averagePower.textContent = Math.round(
          currentStats.averagePower
        );
      }
      if (elements.peakPower) {
        elements.peakPower.textContent = Math.round(currentStats.peakPower);
      }
      if (elements.sessionsCount) {
        elements.sessionsCount.textContent = currentStats.sessionsCount;
      }
      if (elements.monitoringStatus) {
        elements.monitoringStatus.textContent = currentStats.isMonitoring
          ? "HOẠT ĐỘNG"
          : "TẮT";
      }
      if (elements.monitoringIcon) {
        elements.monitoringIcon.className = `fas ${
          currentStats.isMonitoring
            ? "fa-circle text-success"
            : "fa-circle-o text-muted"
        }`;
      }

      // Update real-time values
      if (elements.currentPower) {
        elements.currentPower.textContent = Math.round(
          currentStats.currentPower
        );
      }
      if (elements.currentAmperage) {
        elements.currentAmperage.textContent =
          currentStats.currentAmperage.toFixed(2);
      }
      if (elements.currentVoltage) {
        elements.currentVoltage.textContent = Math.round(
          currentStats.currentVoltage
        );
      }

      // Update timestamp
      const timestampElement = document.getElementById(
        "daily-power-current-date"
      );
      if (timestampElement) {
        timestampElement.textContent = `Hôm Nay - ${
          currentStats.date
        } (Cập nhật: ${new Date().toLocaleTimeString("vi-VN")})`;
      }

      console.log("Dashboard data refreshed successfully");
    } catch (error) {
      console.error("Error refreshing dashboard data:", error);
      this.showNotification("Lỗi cập nhật dữ liệu dashboard", "error");
    }
  }

  /**
   * START REAL-TIME UPDATES
   * Begin periodic updates of dashboard data
   */
  startRealTimeUpdates() {
    // Update every 5 seconds when dashboard is visible
    if (this.dashboardUpdateInterval) {
      clearInterval(this.dashboardUpdateInterval);
    }

    this.dashboardUpdateInterval = setInterval(() => {
      const dashboard = document.getElementById("daily-power-dashboard");
      if (dashboard && dashboard.style.display !== "none") {
        this.refreshDashboardData();
      } else {
        // Stop updating if dashboard is not visible
        this.stopRealTimeUpdates();
      }
    }, 5000); // Update every 5 seconds

    console.log("Real-time dashboard updates started");
  }

  /**
   * STOP REAL-TIME UPDATES
   * Stop periodic updates
   */
  stopRealTimeUpdates() {
    if (this.dashboardUpdateInterval) {
      clearInterval(this.dashboardUpdateInterval);
      this.dashboardUpdateInterval = null;
      console.log("Real-time dashboard updates stopped");
    }
  }

  // Create historical chart HTML
  createHistoricalChartHTML(historicalData) {
    if (
      !historicalData ||
      !Array.isArray(historicalData) ||
      historicalData.length === 0
    ) {
      return '<div class="no-data">Chưa có dữ liệu lịch sử</div>';
    }

    // Filter valid data and generate chart bars
    const validData = historicalData.filter(
      (d) => d && typeof d.totalKwh === "number"
    );

    if (validData.length === 0) {
      return '<div class="no-data">Chưa có dữ liệu lịch sử hợp lệ</div>';
    }

    const maxKwh = Math.max(...validData.map((d) => d.totalKwh || 0));
    const chartBars = validData
      .map((dayData) => {
        const heightPercent =
          maxKwh > 0 ? ((dayData.totalKwh || 0) / maxKwh) * 100 : 0;
        const date = new Date(dayData.date);
        const dayName = date.toLocaleDateString("vi-VN", {
          weekday: "short",
        });

        return `
        <div class="chart-bar-container">
          <div class="chart-bar" style="height: ${heightPercent}%;" 
               title="${dayData.date}: ${(dayData.totalKwh || 0).toFixed(
          3
        )}kWh, ${(dayData.totalOperatingHours || 0).toFixed(1)}h">
            <div class="bar-fill"></div>
          </div>
          <div class="chart-label">
            <div class="day-name">${dayName}</div>
            <div class="kwh-value">${(dayData.totalKwh || 0).toFixed(2)}</div>
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
            <span class="summary-value">${validData
              .reduce((sum, d) => sum + (d.totalKwh || 0), 0)
              .toFixed(3)} kWh</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Trung bình/ngày:</span>
            <span class="summary-value">${(
              validData.reduce((sum, d) => sum + (d.totalKwh || 0), 0) /
              validData.length
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

  // Get current daily statistics with real-time data integration
  getCurrentDayStats() {
    try {
      const today = new Date().toISOString().split("T")[0];
      const powerBtn = document.getElementById("spa-power-btn");
      const isMonitoring = powerBtn && powerBtn.classList.contains("active");

      // Get real-time power values from DOM
      const currentPowerElement = document.getElementById("spa-power-value");
      const currentElement = document.getElementById("spa-current-value");
      const voltageElement = document.getElementById("spa-voltage-value");

      const currentPower = currentPowerElement
        ? parseFloat(currentPowerElement.textContent) || 0
        : 0;
      const current = currentElement
        ? parseFloat(currentElement.textContent) || 0
        : 0;
      const voltage = voltageElement
        ? parseFloat(voltageElement.textContent) || 0
        : 0;

      // Get power button click count from temperature adjustment storage
      let sessionsCount = 0;
      if (
        window.temperatureAdjustmentStorage &&
        window.temperatureAdjustmentStorage.adjustmentData
      ) {
        const todayKey = `${new Date().getFullYear()}-${String(
          new Date().getMonth() + 1
        ).padStart(2, "0")}`;
        const todayAdjustments =
          window.temperatureAdjustmentStorage.adjustmentData.get(todayKey) ||
          [];

        // Filter adjustments for today and count power-related events
        const todayDate = new Date().toDateString();
        sessionsCount = todayAdjustments.filter((adj) => {
          return new Date(adj.timestamp).toDateString() === todayDate;
        }).length;
      }

      // Use current day data if available, otherwise create from real-time values
      const stats = {
        date: today,
        totalOperatingHours: this.currentDayData
          ? this.currentDayData.totalOperatingHours
          : 0,
        totalKwh: this.currentDayData
          ? this.currentDayData.totalKwh
          : currentPower * 0.001, // Convert W to kW
        averagePower: this.currentDayData
          ? this.currentDayData.averagePower
          : currentPower,
        peakPower: this.currentDayData
          ? Math.max(this.currentDayData.peakPower, currentPower)
          : currentPower,
        sessionsCount:
          this.currentDayData && this.currentDayData.sessions
            ? this.currentDayData.sessions.length
            : Math.max(sessionsCount, isMonitoring ? 1 : 0),
        isMonitoring: isMonitoring,
        currentPower: currentPower,
        currentAmperage: current,
        currentVoltage: voltage,
        lastUpdated: new Date(),
      };

      return stats;
    } catch (error) {
      console.error("Error getting current day stats:", error);
      return {
        date: new Date().toISOString().split("T")[0],
        totalOperatingHours: 0,
        totalKwh: 0,
        averagePower: 0,
        peakPower: 0,
        sessionsCount: 0,
        isMonitoring: false,
        currentPower: 0,
        currentAmperage: 0,
        currentVoltage: 0,
        lastUpdated: new Date(),
      };
    }
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
      // Ensure lastUpdated is set before saving
      if (!this.currentDayData.lastUpdated) {
        this.currentDayData.lastUpdated = new Date();
      }
      await this.saveDailyDataToFirebase();
      return true;
    }
    return false;
  }

  /**
   * Validate session data to prevent null reference errors
   */
  validateSessionData(session) {
    if (!session) return false;

    // Check if session has valid dates or at least startTime
    const hasValidStartTime =
      session.startTime && session.startTime instanceof Date;
    const hasValidEndTime =
      session.endTime === null || session.endTime instanceof Date;

    return hasValidStartTime && hasValidEndTime;
  }

  /**
   * Process sessions safely for Firebase storage
   */
  processSessions() {
    try {
      if (
        !this.currentDayData.sessions ||
        !Array.isArray(this.currentDayData.sessions)
      ) {
        return [];
      }

      return this.currentDayData.sessions
        .filter((session) => {
          try {
            return this.validateSessionData(session);
          } catch (error) {
            console.warn(
              "Invalid session data found, skipping:",
              error.message
            );
            return false;
          }
        })
        .map((session) => {
          try {
            return {
              startTime: session.startTime
                ? session.startTime.toISOString()
                : null,
              endTime: session.endTime ? session.endTime.toISOString() : null,
              duration:
                session.endTime && session.startTime
                  ? session.endTime - session.startTime
                  : 0,
              startPower: session.startPower || 0,
              endPower: session.endPower || 0,
              averagePower: session.averagePower || 0,
              peakPower: session.peakPower || 0,
              totalKwh: session.totalKwh || 0,
              samplesCount: session.powerSamples
                ? session.powerSamples.length
                : 0,
            };
          } catch (error) {
            console.warn(
              "Error processing session, using safe defaults:",
              error.message
            );
            return {
              startTime: null,
              endTime: null,
              duration: 0,
              startPower: 0,
              endPower: 0,
              averagePower: 0,
              peakPower: 0,
              totalKwh: 0,
              samplesCount: 0,
            };
          }
        });
    } catch (error) {
      console.error("Error processing sessions:", error);
      return [];
    }
  }

  /**
   * INTEGRATE POWER BUTTON MONITORING
   * FIXED: Use E-RA device data subscription instead of direct button monitoring
   */
  integratePowerButtonMonitoring() {
    console.log("Integrating Daily Power Monitor with E-RA power system...");

    // PRIORITY 1: Subscribe to E-RA device data changes (most reliable)
    if (window.globalDeviceDataManager) {
      window.globalDeviceDataManager.subscribe((deviceData) => {
        if (
          deviceData &&
          deviceData.power !== null &&
          deviceData.power !== undefined
        ) {
          console.log(
            `Daily Monitor: E-RA power state = ${
              deviceData.power ? "ON" : "OFF"
            }`
          );
          this.handleDevicePowerChange(deviceData.power);
        }
      });
      console.log("Daily Monitor integrated with E-RA global device data");
    }

    // PRIORITY 2: Hook into temperature controller power updates
    if (window.tempController) {
      const originalUpdatePowerDisplay =
        window.tempController.updatePowerDisplay;

      window.tempController.updatePowerDisplay = function () {
        // Call original method first
        originalUpdatePowerDisplay.call(this);

        // Then notify Daily Monitor
        setTimeout(() => {
          if (window.dailyPowerMonitor) {
            window.dailyPowerMonitor.handleDevicePowerChange(this.isPowerOn);
          }
        }, 100);
      };
      console.log(
        "Daily Monitor hooked into temperature controller power updates"
      );
    }

    // PRIORITY 3: Fallback to button monitoring only if needed
    setTimeout(() => {
      if (!window.globalDeviceDataManager || !window.deviceDataReceived) {
        console.log(
          "E-RA integration not available - using fallback button monitoring"
        );
        this.setupFallbackPowerMonitoring();
      } else {
        console.log(
          "E-RA integration active - no fallback button monitoring needed"
        );
      }
    }, 3000); // Wait 3 seconds to ensure E-RA is fully initialized
  }
}

// Initialize global instance
window.dailyPowerMonitor = new DailyPowerMonitor();

console.log("Daily Power Monitor module loaded");
