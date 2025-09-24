/**
 * TEMPERATURE ADJUSTMENT STORAGE SYSTEM
 * Firebase Storage Management for Temperature Adjustments
 *
 * FIREBASE DATA STRUCTURE:
 * Air_Conditioner/
 *   $userId/
 *     Temperature_adjustments/
 *       $year/
 *         $month/
 *           $timestampId/
 *             targetTemp: number (16-30°C)
 *             previousTemp: number (previous target temperature)
 *             currentTemp: number (actual room temperature from sensor)
 *             adjustmentType: string (manual/auto/ai_recommendation)
 *             adjustedBy: string (user/system/ai)
 *             kwh: number (power consumption at this temperature level)
 *             powerDelta: number (change in power consumption)
 *             timestamp: number (Date.now())
 *             sessionId: string (user session identifier)
 *             deviceInfo: object (device metadata)
 *             environmentalData: object (outdoor temp, humidity, etc.)
 *             energyEfficiency: object (calculated efficiency metrics)
 *
 * FEATURES:
 * - Real-time temperature adjustment logging with power consumption data
 * - Offline-first approach with localStorage cache
 * - Auto-sync with Firebase when online
 * - Data analysis and statistics generation
 * - Export functionality for temperature usage reports
 * - Integration with existing Firebase storage manager
 */

class TemperatureAdjustmentStorage {
  constructor() {
    if (TemperatureAdjustmentStorage.instance) {
      return TemperatureAdjustmentStorage.instance;
    }

    this.initialized = false;
    this.database = null;
    this.currentUser = null;
    this.isOnline = navigator.onLine;

    // Local data storage
    this.adjustmentData = new Map(); // monthKey -> Array of adjustments
    this.sessionId = this.generateSessionId();
    this.syncQueue = [];
    this.observers = [];

    // Storage keys for localStorage
    this.CACHE_KEY = "temperature_adjustments_cache";
    this.SYNC_QUEUE_KEY = "temp_adjustment_sync_queue";
    this.SESSION_KEY = "temp_adjustment_session";

    // Temperature adjustment types
    this.ADJUSTMENT_TYPES = {
      MANUAL: "manual",
      AUTO: "auto",
      AI_RECOMMENDATION: "ai_recommendation",
      SYSTEM: "system",
      EXTERNAL: "external",
    };

    // Power monitoring integration
    this.powerMonitoring = null;

    TemperatureAdjustmentStorage.instance = this;
    console.log("Temperature Adjustment Storage initialized");
  }

  /**
   * INITIALIZE STORAGE SYSTEM
   * Setup Firebase integration and load cached data
   */
  async init() {
    try {
      // Get Firebase storage manager instance
      if (window.firebaseStorageManager) {
        this.database = window.firebaseStorageManager.database;
        this.currentUser = window.firebaseStorageManager.getCurrentUser();
        this.isOnline = window.firebaseStorageManager.isOnline;

        // Subscribe to storage manager events
        window.firebaseStorageManager.subscribe((event, data) => {
          this.handleStorageEvent(event, data);
        });

        console.log("Firebase integration enabled for temperature adjustments");
      } else {
        console.warn(
          "Firebase storage manager not available - using localStorage only"
        );
      }

      // Setup power monitoring integration
      if (window.powerConsumptionMonitoring) {
        this.powerMonitoring = window.powerConsumptionMonitoring;
        console.log("Power consumption monitoring integrated");
      }

      // Load cached data
      this.loadFromLocalStorage();

      // Load sync queue from localStorage
      this.loadSyncQueue();

      // Setup network listeners
      this.setupNetworkListeners();

      // Process sync queue if online
      if (this.isOnline && this.currentUser) {
        await this.processSyncQueue();
      }

      this.initialized = true;
      console.log("Temperature Adjustment Storage ready!");

      return true;
    } catch (error) {
      console.error(
        "Temperature Adjustment Storage initialization failed:",
        error
      );
      this.initialized = true; // Still work in offline mode
      return false;
    }
  }

  /**
   * LOG TEMPERATURE ADJUSTMENT
   * Main method to log temperature changes with power consumption data
   */
  async logTemperatureAdjustment(adjustmentData) {
    try {
      // Validate input data
      if (!this.validateAdjustmentData(adjustmentData)) {
        console.error("Invalid adjustment data:", adjustmentData);
        return null;
      }

      // Enrich adjustment data with power consumption and environmental info
      const enrichedData = await this.enrichAdjustmentData(adjustmentData);

      // Generate unique timestamp ID
      const timestampId = this.generateTimestampId();
      const monthKey = this.getMonthKey(enrichedData.year, enrichedData.month);

      // Store locally first (offline-first approach)
      await this.storeLocally(monthKey, timestampId, enrichedData);

      // Sync to Firebase if online
      if (this.shouldSyncToFirebase()) {
        await this.syncToFirebase(
          enrichedData.year,
          enrichedData.month + 1, // Firebase uses 1-based months
          timestampId,
          enrichedData
        );
      } else {
        // Queue for later sync
        this.addToSyncQueue("save_adjustment", {
          year: enrichedData.year,
          month: enrichedData.month + 1,
          timestampId,
          data: enrichedData,
        });
      }

      // Notify observers
      this.notifyObservers("adjustment_logged", {
        timestampId,
        monthKey,
        data: enrichedData,
      });

      console.log(
        `Temperature adjustment logged: ${enrichedData.previousTemp}°C -> ${enrichedData.targetTemp}°C (${enrichedData.adjustmentType})`
      );

      // Debug Firebase sync status
      console.log("Firebase sync status:", {
        shouldSync: this.shouldSyncToFirebase(),
        syncResult: this.shouldSyncToFirebase()
          ? "Attempted"
          : "Skipped - added to queue",
      });

      return timestampId;
    } catch (error) {
      console.error("Error logging temperature adjustment:", error);
      return null;
    }
  }

  /**
   * VALIDATE ADJUSTMENT DATA
   * Ensure required fields are present and valid
   */
  validateAdjustmentData(data) {
    const required = ["targetTemp", "adjustmentType"];

    for (const field of required) {
      if (data[field] === undefined || data[field] === null) {
        console.error(`Missing required field: ${field}`);
        return false;
      }
    }

    // Validate temperature range
    if (data.targetTemp < 16 || data.targetTemp > 30) {
      console.error(`Target temperature out of range: ${data.targetTemp}°C`);
      return false;
    }

    // Validate adjustment type
    if (!Object.values(this.ADJUSTMENT_TYPES).includes(data.adjustmentType)) {
      console.error(`Invalid adjustment type: ${data.adjustmentType}`);
      return false;
    }

    return true;
  }

  /**
   * ENRICH ADJUSTMENT DATA
   * Add power consumption, environmental data, and calculated metrics
   */
  async enrichAdjustmentData(data) {
    const now = new Date();

    // Base enriched data structure
    const enriched = {
      // Core temperature data
      targetTemp: data.targetTemp,
      previousTemp: data.previousTemp || data.targetTemp,
      currentTemp: data.currentTemp || this.getCurrentRoomTemperature(),

      // Adjustment metadata
      adjustmentType: data.adjustmentType,
      adjustedBy: data.adjustedBy || "user",
      timestamp: data.timestamp || Date.now(),

      // Date components for Firebase storage structure
      year: now.getFullYear(),
      month: now.getMonth(), // 0-based for internal use
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),

      // Session and device info
      sessionId: this.sessionId,
      deviceInfo: this.getDeviceInfo(),

      // Power consumption data
      kwh: 0,
      powerDelta: 0,
      powerMonitoringData: null,

      // Environmental data
      environmentalData: await this.getEnvironmentalData(),

      // Energy efficiency metrics
      energyEfficiency: null,

      // Additional metadata
      notes: data.notes || "",
      source: data.source || "temperature_control",
    };

    // Get power consumption data if monitoring is active
    if (this.powerMonitoring && this.powerMonitoring.isMonitoring) {
      const powerData = this.capturePowerConsumptionData();
      enriched.kwh = powerData.currentKwh;
      enriched.powerDelta = powerData.deltaConsumption;
      enriched.powerMonitoringData = powerData;

      console.log(
        `Power data captured: ${powerData.currentKwh} kWh (Delta: ${powerData.deltaConsumption})`
      );
    }

    // Calculate energy efficiency if energy manager available
    if (window.energyEfficiencyManager) {
      enriched.energyEfficiency = await this.calculateEnergyEfficiency(
        enriched
      );
    }

    return enriched;
  }

  /**
   * CAPTURE POWER CONSUMPTION DATA
   * Get current power consumption and delta from monitoring system
   */
  capturePowerConsumptionData() {
    try {
      const powerElement = document.getElementById("spa-power-value");
      const currentKwh = powerElement
        ? parseFloat(powerElement.textContent) || 0
        : 0;
      const deltaConsumption = this.powerMonitoring.getCurrentDelta();

      return {
        currentKwh,
        deltaConsumption,
        monitoringStartValue: this.powerMonitoring.monitoringStartValue,
        monitoringDuration: this.powerMonitoring.isMonitoring
          ? Date.now() - this.powerMonitoring.powerOnTimestamp
          : 0,
        timestamp: Date.now(),
        isMonitoring: this.powerMonitoring.isMonitoring,
      };
    } catch (error) {
      console.error("Error capturing power consumption data:", error);
      return {
        currentKwh: 0,
        deltaConsumption: 0,
        monitoringStartValue: 0,
        monitoringDuration: 0,
        timestamp: Date.now(),
        isMonitoring: false,
      };
    }
  }

  /**
   * GET CURRENT ROOM TEMPERATURE
   * Extract current temperature from temperature controller
   */
  getCurrentRoomTemperature() {
    try {
      if (window.tempController) {
        return window.tempController.currentTemp || 22;
      }

      // Fallback: get from global device data
      if (window.globalDeviceDataManager) {
        const deviceData = window.globalDeviceDataManager.getDeviceData();
        return deviceData?.currentTemp || 22;
      }

      return 22; // Default fallback
    } catch (error) {
      console.error("Error getting current room temperature:", error);
      return 22;
    }
  }

  /**
   * GET ENVIRONMENTAL DATA
   * Collect environmental context data
   */
  async getEnvironmentalData() {
    try {
      const environmentalData = {
        outdoorTemp: null,
        humidity: null,
        weather: null,
        timeOfDay: this.getTimeOfDayCategory(),
        season: this.getSeasonCategory(),
        timestamp: Date.now(),
      };

      // Get weather data if weather config available
      if (window.weatherConfig && window.weatherConfig.getCurrentWeather) {
        const weatherData = await window.weatherConfig.getCurrentWeather();
        if (weatherData) {
          environmentalData.outdoorTemp = weatherData.temperature;
          environmentalData.humidity = weatherData.humidity;
          environmentalData.weather = weatherData.condition;
        }
      }

      return environmentalData;
    } catch (error) {
      console.error("Error getting environmental data:", error);
      return {
        outdoorTemp: null,
        humidity: null,
        weather: null,
        timeOfDay: this.getTimeOfDayCategory(),
        season: this.getSeasonCategory(),
        timestamp: Date.now(),
      };
    }
  }

  /**
   * CALCULATE ENERGY EFFICIENCY
   * Calculate efficiency metrics for this temperature adjustment
   */
  async calculateEnergyEfficiency(adjustmentData) {
    try {
      if (!window.energyEfficiencyManager) {
        return null;
      }

      // Use energy efficiency manager to calculate metrics
      const efficiency =
        await window.energyEfficiencyManager.calculateEnergyEfficiency(
          "AC-001",
          {
            currentTemp: adjustmentData.currentTemp,
            targetTemp: adjustmentData.targetTemp,
            mode: window.tempController?.currentMode || "cool",
            power: window.tempController?.isPowerOn || true,
          }
        );

      return {
        efficiencyRating: efficiency?.efficiencyRating || 0,
        estimatedSavings: efficiency?.estimatedSavings || 0,
        optimalTemp: efficiency?.optimalTemp || adjustmentData.targetTemp,
        energyCost: efficiency?.energyCost || 0,
        calculatedAt: Date.now(),
      };
    } catch (error) {
      console.error("Error calculating energy efficiency:", error);
      return null;
    }
  }

  /**
   * GET DEVICE INFO
   * Collect device and browser information
   */
  getDeviceInfo() {
    return {
      userAgent: navigator.userAgent.substring(0, 100),
      language: navigator.language,
      platform: navigator.platform,
      deviceType: this.getDeviceType(),
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timestamp: Date.now(),
    };
  }

  /**
   * UTILITY METHODS
   */
  getDeviceType() {
    const ua = navigator.userAgent;
    if (/Mobile|Android|iPhone|iPad/.test(ua)) return "mobile";
    if (/Tablet/.test(ua)) return "tablet";
    return "desktop";
  }

  getTimeOfDayCategory() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return "morning";
    if (hour >= 12 && hour < 18) return "afternoon";
    if (hour >= 18 && hour < 22) return "evening";
    return "night";
  }

  getSeasonCategory() {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return "spring";
    if (month >= 6 && month <= 8) return "summer";
    if (month >= 9 && month <= 11) return "autumn";
    return "winter";
  }

  generateSessionId() {
    // Check for existing session
    let sessionId = sessionStorage.getItem(this.SESSION_KEY);

    if (!sessionId) {
      sessionId = `temp_session_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      sessionStorage.setItem(this.SESSION_KEY, sessionId);
    }

    return sessionId;
  }

  generateTimestampId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getMonthKey(year, month) {
    return `${year}-${String(month + 1).padStart(2, "0")}`;
  }

  /**
   * FIREBASE SYNC METHODS
   */
  async syncToFirebase(year, month, timestampId, adjustmentData) {
    try {
      if (!this.shouldSyncToFirebase()) {
        console.warn("Cannot sync to Firebase: Not authenticated or offline");
        console.log("Debug sync status:", {
          isOnline: this.isOnline,
          hasUser: !!this.currentUser,
          hasDatabase: !!this.database,
          userId: this.currentUser?.uid || "None",
        });
        return false;
      }

      const adjustmentRef = this.database.ref(
        `Air_Conditioner/${
          this.currentUser.uid
        }/Temperature_adjustments/${year}/${String(month).padStart(
          2,
          "0"
        )}/${timestampId}`
      );

      const firebaseData = {
        ...adjustmentData,
        firebaseSyncTimestamp: this.database.ServerValue
          ? firebase.database.ServerValue.TIMESTAMP
          : Date.now(),
      };

      await adjustmentRef.set(firebaseData);
      console.log(
        `Temperature adjustment synced to Firebase: ${year}/${month}/${timestampId}`
      );
      console.log("Firebase path:", adjustmentRef.toString());

      return true;
    } catch (error) {
      console.error("Firebase sync failed:", error);
      console.error("Sync details:", {
        year,
        month,
        timestampId,
        userId: this.currentUser?.uid,
        hasDatabase: !!this.database,
      });
      return false;
    }
  }

  async loadFromFirebase(year = null, month = null) {
    try {
      if (!this.shouldSyncToFirebase()) return new Map();

      const basePath = `Air_Conditioner/${this.currentUser.uid}/Temperature_adjustments`;
      let queryPath = basePath;

      if (year && month) {
        queryPath = `${basePath}/${year}/${String(month).padStart(2, "0")}`;
      } else if (year) {
        queryPath = `${basePath}/${year}`;
      }

      const snapshot = await this.database.ref(queryPath).once("value");

      if (!snapshot.exists()) return new Map();

      const data = snapshot.val();
      const adjustmentMap = new Map();

      // Process data structure based on query level
      if (year && month) {
        // Single month data
        const monthKey = this.getMonthKey(year, month - 1); // Convert back to 0-based
        adjustmentMap.set(monthKey, Object.values(data || {}));
      } else if (year) {
        // Single year data
        Object.entries(data || {}).forEach(([monthStr, monthData]) => {
          const monthKey = this.getMonthKey(year, parseInt(monthStr) - 1);
          adjustmentMap.set(monthKey, Object.values(monthData || {}));
        });
      } else {
        // All data
        Object.entries(data || {}).forEach(([yearStr, yearData]) => {
          Object.entries(yearData || {}).forEach(([monthStr, monthData]) => {
            const monthKey = this.getMonthKey(
              parseInt(yearStr),
              parseInt(monthStr) - 1
            );
            adjustmentMap.set(monthKey, Object.values(monthData || {}));
          });
        });
      }

      console.log(
        `Loaded ${adjustmentMap.size} months of temperature adjustment data from Firebase`
      );
      return adjustmentMap;
    } catch (error) {
      console.error("Error loading from Firebase:", error);
      return new Map();
    }
  }

  shouldSyncToFirebase() {
    const canSync = this.isOnline && this.currentUser && this.database;

    if (!canSync) {
      console.log("Cannot sync to Firebase - Debug info:", {
        isOnline: this.isOnline,
        hasCurrentUser: !!this.currentUser,
        hasDatabase: !!this.database,
        userId: this.currentUser?.uid || "No user",
      });
    }

    return canSync;
  }

  /**
   * LOCAL STORAGE METHODS
   */
  async storeLocally(monthKey, timestampId, adjustmentData) {
    try {
      if (!this.adjustmentData.has(monthKey)) {
        this.adjustmentData.set(monthKey, []);
      }

      const monthData = this.adjustmentData.get(monthKey);

      // Add or update adjustment data
      const existingIndex = monthData.findIndex(
        (adj) => adj.timestampId === timestampId
      );

      if (existingIndex >= 0) {
        monthData[existingIndex] = { ...adjustmentData, timestampId };
      } else {
        monthData.push({ ...adjustmentData, timestampId });
      }

      // Sort by timestamp (newest first)
      monthData.sort((a, b) => b.timestamp - a.timestamp);

      // Save to localStorage
      this.saveToLocalStorage();

      console.log(
        `Stored temperature adjustment locally: ${monthKey}/${timestampId}`
      );
    } catch (error) {
      console.error("Error storing locally:", error);
    }
  }

  saveToLocalStorage() {
    try {
      const cacheData = {
        adjustmentData: Array.from(this.adjustmentData.entries()),
        sessionId: this.sessionId,
        lastUpdate: Date.now(),
      };

      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }

  loadFromLocalStorage() {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        this.adjustmentData = new Map(parsed.adjustmentData || []);
        this.sessionId = parsed.sessionId || this.generateSessionId();

        console.log(
          `Loaded ${this.adjustmentData.size} months of cached temperature adjustments`
        );
      }
    } catch (error) {
      console.error("Error loading from localStorage:", error);
      this.adjustmentData = new Map();
    }
  }

  /**
   * SYNC QUEUE MANAGEMENT
   */
  addToSyncQueue(operation, data) {
    this.syncQueue.push({
      operation,
      data,
      timestamp: Date.now(),
      retries: 0,
    });

    this.saveSyncQueue();
    console.log(`Added to sync queue: ${operation}`);
  }

  async processSyncQueue() {
    if (!this.shouldSyncToFirebase() || this.syncQueue.length === 0) {
      return;
    }

    console.log(
      `Processing ${this.syncQueue.length} queued temperature adjustments...`
    );
    const processed = [];

    for (const item of this.syncQueue) {
      try {
        let success = false;

        if (item.operation === "save_adjustment") {
          success = await this.syncToFirebase(
            item.data.year,
            item.data.month,
            item.data.timestampId,
            item.data.data
          );
        }

        if (success) {
          processed.push(item);
        } else {
          item.retries++;
          if (item.retries >= 3) {
            console.warn(`Max retries reached for sync item, removing:`, item);
            processed.push(item);
          }
        }
      } catch (error) {
        console.error("Sync queue processing error:", error);
        item.retries++;
      }
    }

    // Remove processed items
    this.syncQueue = this.syncQueue.filter((item) => !processed.includes(item));
    this.saveSyncQueue();

    if (processed.length > 0) {
      console.log(
        `Synced ${processed.length} temperature adjustments to Firebase`
      );
    }
  }

  saveSyncQueue() {
    try {
      localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error("Error saving sync queue:", error);
    }
  }

  loadSyncQueue() {
    try {
      const cached = localStorage.getItem(this.SYNC_QUEUE_KEY);
      if (cached) {
        this.syncQueue = JSON.parse(cached);
      }
    } catch (error) {
      console.error("Error loading sync queue:", error);
      this.syncQueue = [];
    }
  }

  /**
   * DATA RETRIEVAL METHODS
   */
  async getTemperatureAdjustments(options = {}) {
    const {
      year = null,
      month = null,
      startDate = null,
      endDate = null,
      adjustmentType = null,
      limit = 100,
      offset = 0,
    } = options;

    try {
      let allData = [];

      // Load from Firebase if available
      if (this.shouldSyncToFirebase()) {
        const firebaseData = await this.loadFromFirebase(year, month);
        // Merge with local data
        for (const [monthKey, adjustments] of firebaseData) {
          if (!this.adjustmentData.has(monthKey)) {
            this.adjustmentData.set(monthKey, []);
          }

          // Merge avoiding duplicates
          const localData = this.adjustmentData.get(monthKey);
          adjustments.forEach((adj) => {
            if (
              !localData.find((local) => local.timestampId === adj.timestampId)
            ) {
              localData.push(adj);
            }
          });
        }
      }

      // Collect all adjustments
      for (const [monthKey, adjustments] of this.adjustmentData) {
        allData = allData.concat(adjustments);
      }

      // Apply filters
      if (startDate) {
        allData = allData.filter((adj) => adj.timestamp >= startDate);
      }
      if (endDate) {
        allData = allData.filter((adj) => adj.timestamp <= endDate);
      }
      if (adjustmentType) {
        allData = allData.filter(
          (adj) => adj.adjustmentType === adjustmentType
        );
      }

      // Sort by timestamp (newest first)
      allData.sort((a, b) => b.timestamp - a.timestamp);

      // Apply pagination
      const paginatedData = allData.slice(offset, offset + limit);

      return {
        adjustments: paginatedData,
        totalCount: allData.length,
        hasMore: allData.length > offset + limit,
      };
    } catch (error) {
      console.error("Error getting temperature adjustments:", error);
      return {
        adjustments: [],
        totalCount: 0,
        hasMore: false,
      };
    }
  }

  async getStatistics(options = {}) {
    try {
      const data = await this.getTemperatureAdjustments({ limit: 10000 });
      const adjustments = data.adjustments;

      if (adjustments.length === 0) {
        return null;
      }

      // Calculate statistics
      const stats = {
        totalAdjustments: adjustments.length,
        averageTargetTemp: 0,
        mostCommonTemp: 0,
        adjustmentsByType: {},
        adjustmentsByHour: Array(24).fill(0),
        temperatureDistribution: {},
        powerConsumptionData: {
          totalKwh: 0,
          averageKwh: 0,
          kwhByTemp: {},
        },
        trends: {
          dailyAverages: {},
          monthlyTotals: {},
          temperaturePreferences: {},
        },
      };

      // Process each adjustment
      let tempSum = 0;
      let kwhSum = 0;
      let kwhCount = 0;
      const tempCounts = {};

      adjustments.forEach((adj) => {
        // Temperature statistics
        tempSum += adj.targetTemp;
        if (tempCounts[adj.targetTemp]) {
          tempCounts[adj.targetTemp]++;
        } else {
          tempCounts[adj.targetTemp] = 1;
        }

        // Adjustment type statistics
        if (stats.adjustmentsByType[adj.adjustmentType]) {
          stats.adjustmentsByType[adj.adjustmentType]++;
        } else {
          stats.adjustmentsByType[adj.adjustmentType] = 1;
        }

        // Hour distribution
        const hour = new Date(adj.timestamp).getHours();
        stats.adjustmentsByHour[hour]++;

        // Power consumption statistics
        if (adj.kwh && adj.kwh > 0) {
          kwhSum += adj.kwh;
          kwhCount++;

          if (!stats.powerConsumptionData.kwhByTemp[adj.targetTemp]) {
            stats.powerConsumptionData.kwhByTemp[adj.targetTemp] = {
              total: 0,
              count: 0,
              average: 0,
            };
          }

          const tempKwh = stats.powerConsumptionData.kwhByTemp[adj.targetTemp];
          tempKwh.total += adj.kwh;
          tempKwh.count++;
          tempKwh.average = tempKwh.total / tempKwh.count;
        }

        // Daily and monthly trends
        const date = new Date(adj.timestamp);
        const dateKey = date.toISOString().split("T")[0];
        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;

        if (!stats.trends.dailyAverages[dateKey]) {
          stats.trends.dailyAverages[dateKey] = {
            total: 0,
            count: 0,
            average: 0,
          };
        }
        stats.trends.dailyAverages[dateKey].total += adj.targetTemp;
        stats.trends.dailyAverages[dateKey].count++;
        stats.trends.dailyAverages[dateKey].average =
          stats.trends.dailyAverages[dateKey].total /
          stats.trends.dailyAverages[dateKey].count;

        if (!stats.trends.monthlyTotals[monthKey]) {
          stats.trends.monthlyTotals[monthKey] = 0;
        }
        stats.trends.monthlyTotals[monthKey]++;
      });

      // Calculate final statistics
      stats.averageTargetTemp = tempSum / adjustments.length;
      stats.mostCommonTemp = Object.keys(tempCounts).reduce((a, b) =>
        tempCounts[a] > tempCounts[b] ? a : b
      );
      stats.temperatureDistribution = tempCounts;

      stats.powerConsumptionData.totalKwh = kwhSum;
      stats.powerConsumptionData.averageKwh =
        kwhCount > 0 ? kwhSum / kwhCount : 0;

      return stats;
    } catch (error) {
      console.error("Error calculating statistics:", error);
      return null;
    }
  }

  /**
   * EXPORT FUNCTIONALITY
   */
  async exportToExcel(options = {}) {
    try {
      const { startDate = null, endDate = null, format = "detailed" } = options;

      // Load SheetJS library if not available
      if (!window.XLSX) {
        await this.loadXLSXLibrary();
      }

      const data = await this.getTemperatureAdjustments({
        startDate,
        endDate,
        limit: 10000,
      });
      const statistics = await this.getStatistics();

      const workbook = XLSX.utils.book_new();

      // Detailed adjustments sheet
      const adjustmentsData = data.adjustments.map((adj) => ({
        "Thời gian": new Date(adj.timestamp).toLocaleString("vi-VN"),
        "Nhiệt độ cũ (°C)": adj.previousTemp,
        "Nhiệt độ mới (°C)": adj.targetTemp,
        "Nhiệt độ phòng (°C)": adj.currentTemp,
        "Loại điều chỉnh": adj.adjustmentType,
        "Người điều chỉnh": adj.adjustedBy,
        "Tiêu thụ điện (kWh)": adj.kwh || 0,
        "Thay đổi công suất (W)": adj.powerDelta || 0,
        "Nhiệt độ ngoài trời (°C)": adj.environmentalData?.outdoorTemp || "",
        "Độ ẩm (%)": adj.environmentalData?.humidity || "",
        "Thời điểm trong ngày": adj.environmentalData?.timeOfDay || "",
        "Hiệu suất năng lượng": adj.energyEfficiency?.efficiencyRating || "",
        "Chi phí năng lượng (VND)": adj.energyEfficiency?.energyCost || "",
        "Ghi chú": adj.notes || "",
      }));

      const adjustmentsSheet = XLSX.utils.json_to_sheet(adjustmentsData);
      XLSX.utils.book_append_sheet(
        workbook,
        adjustmentsSheet,
        "Chi tiết điều chỉnh"
      );

      // Statistics sheet
      if (statistics) {
        const statsData = [
          {
            "Thống kê": "Tổng số lần điều chỉnh",
            "Giá trị": statistics.totalAdjustments,
          },
          {
            "Thống kê": "Nhiệt độ trung bình (°C)",
            "Giá trị": statistics.averageTargetTemp.toFixed(1),
          },
          {
            "Thống kê": "Nhiệt độ phổ biến nhất (°C)",
            "Giá trị": statistics.mostCommonTemp,
          },
          {
            "Thống kê": "Tổng điện năng tiêu thụ (kWh)",
            "Giá trị": statistics.powerConsumptionData.totalKwh.toFixed(2),
          },
          {
            "Thống kê": "Trung bình tiêu thụ điện (kWh)",
            "Giá trị": statistics.powerConsumptionData.averageKwh.toFixed(2),
          },
        ];

        const statsSheet = XLSX.utils.json_to_sheet(statsData);
        XLSX.utils.book_append_sheet(workbook, statsSheet, "Thống kê");
      }

      // Save file
      const fileName = `Dieu_chinh_nhiet_do_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      XLSX.writeFile(workbook, fileName);

      console.log("Temperature adjustment data exported to Excel");
      return true;
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      return false;
    }
  }

  async loadXLSXLibrary() {
    if (window.XLSX) return window.XLSX;

    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    document.head.appendChild(script);

    return new Promise((resolve) => {
      script.onload = () => resolve(window.XLSX);
    });
  }

  /**
   * EVENT HANDLING
   */
  handleStorageEvent(event, data) {
    switch (event) {
      case "user_signed_in":
        this.currentUser = this.database
          ? window.firebaseStorageManager.getCurrentUser()
          : null;
        console.log(
          "Temperature Storage: User signed in, processing sync queue..."
        );
        this.processSyncQueue();
        break;

      case "user_signed_out":
        this.currentUser = null;
        console.log("Temperature Storage: User signed out");
        break;

      case "network_online":
        this.isOnline = true;
        console.log(
          "Temperature Storage: Network online, processing sync queue..."
        );
        this.processSyncQueue();
        break;

      case "network_offline":
        this.isOnline = false;
        console.log("Temperature Storage: Network offline");
        break;
    }
  }

  setupNetworkListeners() {
    window.addEventListener("online", () => {
      this.isOnline = true;
      this.processSyncQueue();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
    });
  }

  /**
   * OBSERVER PATTERN
   */
  subscribe(observer) {
    this.observers.push(observer);
  }

  unsubscribe(observer) {
    this.observers = this.observers.filter((obs) => obs !== observer);
  }

  notifyObservers(event, data) {
    this.observers.forEach((observer) => {
      if (typeof observer === "function") {
        observer(event, data);
      } else if (observer[event] && typeof observer[event] === "function") {
        observer[event](data);
      }
    });
  }

  /**
   * MANUAL SYNC TRIGGER
   * Force sync all queued data to Firebase
   */
  async forceSync() {
    console.log("Force syncing temperature adjustments to Firebase...");

    if (!this.shouldSyncToFirebase()) {
      console.warn("Cannot force sync - Firebase not available");
      return false;
    }

    await this.processSyncQueue();
    console.log("Force sync completed");
    return true;
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
      online: this.isOnline,
      firebase: !!this.database,
      user: !!this.currentUser,
      userId: this.currentUser?.uid || "None",
      localDataSize: this.adjustmentData.size,
      syncQueueSize: this.syncQueue.length,
      sessionId: this.sessionId,
      firebaseStorageManager: !!window.firebaseStorageManager,
      canSyncToFirebase: this.shouldSyncToFirebase(),
    };
  }

  /**
   * TEST TEMPERATURE ADJUSTMENT
   * Test method for development and debugging
   */
  async testTemperatureAdjustment() {
    console.log("Testing temperature adjustment logging...");

    const testData = {
      targetTemp: 24,
      previousTemp: 26,
      adjustmentType: "manual",
      adjustedBy: "test_user",
      notes: "Test temperature adjustment from development console",
    };

    const result = await this.logTemperatureAdjustment(testData);

    console.log("Test result:", {
      timestampId: result,
      status: this.getStatus(),
      syncQueue: this.syncQueue.length,
    });

    return result;
  }

  async clearOldData(daysToKeep = 90) {
    try {
      const cutoffDate = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
      let removedCount = 0;

      for (const [monthKey, adjustments] of this.adjustmentData) {
        const filteredAdjustments = adjustments.filter(
          (adj) => adj.timestamp >= cutoffDate
        );

        if (filteredAdjustments.length !== adjustments.length) {
          this.adjustmentData.set(monthKey, filteredAdjustments);
          removedCount += adjustments.length - filteredAdjustments.length;
        }

        // Remove empty months
        if (filteredAdjustments.length === 0) {
          this.adjustmentData.delete(monthKey);
        }
      }

      this.saveToLocalStorage();
      console.log(
        `Cleaned up ${removedCount} old temperature adjustment records`
      );

      return removedCount;
    } catch (error) {
      console.error("Error clearing old data:", error);
      return 0;
    }
  }
}

// Initialize global instance and AUTO-INIT when DOM ready
document.addEventListener("DOMContentLoaded", async () => {
  window.temperatureAdjustmentStorage = new TemperatureAdjustmentStorage();

  // Wait for Firebase Storage Manager to be ready
  const waitForFirebaseManager = () => {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (
          window.firebaseStorageManager &&
          window.firebaseStorageManager.initialized
        ) {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(false);
      }, 10000);
    });
  };

  // Wait for Firebase Storage Manager then initialize
  const firebaseReady = await waitForFirebaseManager();
  if (firebaseReady) {
    console.log(
      "Firebase Storage Manager detected, initializing Temperature Adjustment Storage..."
    );
    await window.temperatureAdjustmentStorage.init();
  } else {
    console.log(
      "Firebase Storage Manager not ready, initializing Temperature Adjustment Storage in offline mode..."
    );
    await window.temperatureAdjustmentStorage.init();
  }

  console.log(
    "Temperature Adjustment Storage global instance created and initialized"
  );
});

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = TemperatureAdjustmentStorage;
}
