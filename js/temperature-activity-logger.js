/**
 * TEMPERATURE ACTIVITY LOGGER
 * Comprehensive logging system for user temperature adjustment behavior
 * Integrates with Firebase Realtime Database for persistent data storage
 *
 * FIREBASE DATA STRUCTURE:
 * Air_Conditioner/
 *   $userId/
 *     activity_log_temp/
 *       $acId/
 *         recommendations/
 *           $timestampId/
 *             originalTemp: number
 *             recommendedTemp: number
 *             appliedTemp: number
 *             appliedBy: string (user/system)
 *             confidence: number
 *             context: object (outdoor, target, room)
 *             timestamp: number
 *             energySavings: number
 *         adjustments/
 *           $timestampId/
 *             previousTemp: number
 *             newTemp: number
 *             adjustmentTime: number (ms after recommendation)
 *             changedBy: string
 *             relatedRecommendation: string (timestampId)
 *             context: object
 *             timestamp: number
 *         learning_data/
 *           qTable: object
 *           actionCounts: object
 *           personalizedBias: number
 *           totalRecommendations: number
 *           successfulRecommendations: number
 *           lastUpdate: number
 *         statistics/
 *           daily_stats/
 *             $date/
 *               recommendationsApplied: number
 *               adjustmentsMade: number
 *               energySaved: number
 *               avgConfidence: number
 */

class TemperatureActivityLogger {
  constructor() {
    this.initialized = false;
    this.database = null;
    this.currentUser = null;
    this.isOnline = navigator.onLine;

    // Local cache for offline operations
    this.localCache = new Map();
    this.syncQueue = [];

    // Data structure keys
    this.CACHE_KEY = "temp_activity_cache";
    this.SYNC_QUEUE_KEY = "temp_activity_sync_queue";

    // Activity types
    this.ACTIVITY_TYPES = {
      RECOMMENDATION_APPLIED: "recommendation_applied",
      MANUAL_ADJUSTMENT: "manual_adjustment",
      SUCCESSFUL_RECOMMENDATION: "successful_recommendation",
      LEARNING_UPDATE: "learning_update",
    };

    console.log("Temperature Activity Logger initialized");
  }

  /**
   * INITIALIZE LOGGER
   * Setup Firebase connection and restore cached data
   */
  async init() {
    try {
      // Get Firebase instance from global storage manager
      if (window.firebaseStorageManager) {
        this.database = window.firebaseStorageManager.database;
        this.currentUser = window.firebaseStorageManager.getCurrentUser();
        this.isOnline = window.firebaseStorageManager.isOnline;
      }

      // Load cached data
      this.loadFromLocalCache();

      // Setup network listeners
      this.setupNetworkListeners();

      // Process any pending sync operations
      if (this.isOnline && this.currentUser) {
        await this.processSyncQueue();
      }

      this.initialized = true;
      console.log("✅ Temperature Activity Logger ready");

      return true;
    } catch (error) {
      console.error("Activity Logger initialization failed:", error);
      this.initialized = true; // Still work in offline mode
      return false;
    }
  }

  /**
   * LOG RECOMMENDATION APPLICATION
   * Log when user applies an RL recommendation
   */
  async logRecommendationApplication(data) {
    try {
      const logEntry = {
        type: this.ACTIVITY_TYPES.RECOMMENDATION_APPLIED,
        acId: data.acId,
        originalTemp: data.originalTemp || data.currentTemp,
        recommendedTemp: data.recommendedTemp,
        appliedTemp: data.recommendedTemp, // Same as recommended when applied
        appliedBy: data.appliedBy || "user",
        confidence: data.confidence || 0.5,
        context: data.context || {},
        energySavings: data.energySavings || 0,
        timestamp: data.timestamp || Date.now(),
        sessionId: this.getSessionId(),
        metadata: {
          explorationReason: data.explorationReason,
          version: data.version || "RL_v1.0",
          userAgent: navigator.userAgent.substr(0, 100),
        },
      };

      // Generate unique ID for this log entry
      const logId = this.generateLogId(logEntry.timestamp);

      // Store locally first
      await this.storeLocally("recommendations", data.acId, logId, logEntry);

      // Queue for Firebase sync
      if (this.shouldSyncToFirebase()) {
        await this.syncToFirebase(
          "recommendations",
          data.acId,
          logId,
          logEntry
        );
      } else {
        this.addToSyncQueue("save_recommendation", {
          acId: data.acId,
          logId,
          logEntry,
        });
      }

      // Update daily statistics
      await this.updateDailyStats(
        data.acId,
        "recommendation_applied",
        logEntry
      );

      console.log(`📝 Recommendation application logged for AC: ${data.acId}`);
      return logId;
    } catch (error) {
      console.error("Error logging recommendation application:", error);
      return null;
    }
  }

  /**
   * LOG MANUAL ADJUSTMENT
   * Log when user manually adjusts temperature after recommendation
   */
  async logManualAdjustment(data) {
    try {
      const logEntry = {
        type: this.ACTIVITY_TYPES.MANUAL_ADJUSTMENT,
        acId: data.acId,
        previousTemp: data.previousTemp,
        newTemp: data.adjustedTemp || data.newTemp,
        adjustmentTime: data.adjustmentTime || 0, // Time since recommendation
        changedBy: data.changedBy || "user",
        relatedRecommendation: data.relatedRecommendationId || null,
        context: data.context || {},
        adjustmentDirection: this.getAdjustmentDirection(
          data.previousTemp,
          data.adjustedTemp
        ),
        adjustmentMagnitude: Math.abs(
          (data.adjustedTemp || data.newTemp) - data.previousTemp
        ),
        timestamp: data.timestamp || Date.now(),
        sessionId: this.getSessionId(),
        metadata: {
          withinMonitoringPeriod: data.adjustmentTime < 60 * 60 * 1000, // Within 1 hour
          deviceType: this.getDeviceType(),
        },
      };

      const logId = this.generateLogId(logEntry.timestamp);

      // Store locally
      await this.storeLocally("adjustments", data.acId, logId, logEntry);

      // Sync to Firebase
      if (this.shouldSyncToFirebase()) {
        await this.syncToFirebase("adjustments", data.acId, logId, logEntry);
      } else {
        this.addToSyncQueue("save_adjustment", {
          acId: data.acId,
          logId,
          logEntry,
        });
      }

      // Update daily statistics
      await this.updateDailyStats(data.acId, "adjustment_made", logEntry);

      console.log(
        `📝 Manual adjustment logged for AC: ${data.acId}, direction: ${logEntry.adjustmentDirection}`
      );
      return logId;
    } catch (error) {
      console.error("Error logging manual adjustment:", error);
      return null;
    }
  }

  /**
   * LOG SUCCESSFUL RECOMMENDATION
   * Log when recommendation is sustained without user adjustment
   */
  async logSuccessfulRecommendation(data) {
    try {
      const logEntry = {
        type: this.ACTIVITY_TYPES.SUCCESSFUL_RECOMMENDATION,
        acId: data.acId,
        recommendation: data.recommendation,
        sustainedDuration: data.sustainedDuration || 60 * 60 * 1000, // 1 hour default
        sustainedTemp: data.recommendation.recommendedTemp,
        energySavingsActual:
          data.energySavingsActual || data.recommendation.energySavings,
        userSatisfaction: "high", // Implied by sustained acceptance
        timestamp: data.timestamp || Date.now(),
        sessionId: this.getSessionId(),
        metadata: {
          originalRecommendationId: data.recommendation.timestamp,
          monitoringDuration: data.sustainedDuration,
          contextStability: this.calculateContextStability(
            data.recommendation.context
          ),
        },
      };

      const logId = this.generateLogId(logEntry.timestamp);

      // Store locally
      await this.storeLocally(
        "successful_recommendations",
        data.acId,
        logId,
        logEntry
      );

      // Sync to Firebase
      if (this.shouldSyncToFirebase()) {
        await this.syncToFirebase(
          "successful_recommendations",
          data.acId,
          logId,
          logEntry
        );
      } else {
        this.addToSyncQueue("save_success", {
          acId: data.acId,
          logId,
          logEntry,
        });
      }

      // Update daily statistics with energy savings
      await this.updateDailyStats(
        data.acId,
        "successful_recommendation",
        logEntry
      );

      console.log(`✅ Successful recommendation logged for AC: ${data.acId}`);
      return logId;
    } catch (error) {
      console.error("Error logging successful recommendation:", error);
      return null;
    }
  }

  /**
   * SAVE LEARNING DATA
   * Save RL learning data to Firebase
   */
  async saveLearningData(learningData) {
    try {
      if (!this.shouldSyncToFirebase()) {
        // Store locally if offline
        localStorage.setItem(
          "rl_learning_data_firebase",
          JSON.stringify({
            data: learningData,
            timestamp: Date.now(),
          })
        );
        this.addToSyncQueue("save_learning_data", learningData);
        return;
      }

      const userRef = this.database.ref(
        `Air_Conditioner/${this.currentUser.uid}/activity_log_temp/learning_data`
      );

      const firebaseData = {
        ...learningData,
        lastSyncTimestamp: this.database.ServerValue
          ? firebase.database.ServerValue.TIMESTAMP
          : Date.now(),
      };

      await userRef.set(firebaseData);
      console.log("Learning data saved to Firebase");
    } catch (error) {
      console.error("Error saving learning data to Firebase:", error);
      // Fallback to local storage
      localStorage.setItem(
        "rl_learning_data_firebase",
        JSON.stringify({
          data: learningData,
          timestamp: Date.now(),
        })
      );
    }
  }

  /**
   * LOAD LEARNING DATA
   * Load RL learning data from Firebase
   */
  async loadLearningData() {
    try {
      if (!this.shouldSyncToFirebase()) {
        // Load from local storage
        const localData = localStorage.getItem("rl_learning_data_firebase");
        if (localData) {
          const parsed = JSON.parse(localData);
          return parsed.data;
        }
        return null;
      }

      const userRef = this.database.ref(
        `Air_Conditioner/${this.currentUser.uid}/activity_log_temp/learning_data`
      );

      const snapshot = await userRef.once("value");
      if (snapshot.exists()) {
        const data = snapshot.val();
        console.log("Learning data loaded from Firebase");
        return data;
      }

      return null;
    } catch (error) {
      console.error("Error loading learning data from Firebase:", error);
      return null;
    }
  }

  /**
   * GET ACTIVITY LOGS
   * Retrieve activity logs for specific AC or all ACs
   */
  async getActivityLogs(acId = null, options = {}) {
    try {
      const {
        startDate = null,
        endDate = null,
        types = null, // Filter by activity types
        limit = 100,
        offset = 0,
      } = options;

      let logs = [];

      // Load from Firebase if available
      if (this.shouldSyncToFirebase()) {
        logs = await this.loadFromFirebase(acId, options);
      }

      // Merge with local cache
      const localLogs = this.loadFromLocalCache(acId, options);
      logs = this.mergeLogs(logs, localLogs);

      // Apply filters
      if (startDate) {
        logs = logs.filter((log) => log.timestamp >= startDate);
      }
      if (endDate) {
        logs = logs.filter((log) => log.timestamp <= endDate);
      }
      if (types) {
        logs = logs.filter((log) => types.includes(log.type));
      }

      // Sort by timestamp (newest first)
      logs.sort((a, b) => b.timestamp - a.timestamp);

      // Apply pagination
      const paginatedLogs = logs.slice(offset, offset + limit);

      return {
        logs: paginatedLogs,
        totalCount: logs.length,
        hasMore: logs.length > offset + limit,
      };
    } catch (error) {
      console.error("Error getting activity logs:", error);
      return { logs: [], totalCount: 0, hasMore: false };
    }
  }

  /**
   * GET DAILY STATISTICS
   * Get aggregated daily statistics for analysis
   */
  async getDailyStatistics(acId, dateRange = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date(
        endDate.getTime() - dateRange * 24 * 60 * 60 * 1000
      );

      let stats = [];

      if (this.shouldSyncToFirebase()) {
        const userRef = this.database.ref(
          `Air_Conditioner/${this.currentUser.uid}/activity_log_temp/${acId}/statistics/daily_stats`
        );

        const snapshot = await userRef.once("value");
        if (snapshot.exists()) {
          const firebaseStats = snapshot.val();

          for (const [date, dailyData] of Object.entries(firebaseStats)) {
            const dateObj = new Date(date);
            if (dateObj >= startDate && dateObj <= endDate) {
              stats.push({
                date,
                ...dailyData,
              });
            }
          }
        }
      }

      // Sort by date
      stats.sort((a, b) => new Date(a.date) - new Date(b.date));

      return stats;
    } catch (error) {
      console.error("Error getting daily statistics:", error);
      return [];
    }
  }

  /**
   * EXPORT ACTIVITY DATA
   * Export activity logs in various formats
   */
  async exportActivityData(acId = null, format = "json") {
    try {
      const logs = await this.getActivityLogs(acId, { limit: 10000 });
      const statistics = acId ? await this.getDailyStatistics(acId, 90) : null;

      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          acId: acId || "all",
          totalLogs: logs.totalCount,
          format,
          version: "1.0",
        },
        activityLogs: logs.logs,
        dailyStatistics: statistics,
        summary: this.generateSummaryStats(logs.logs),
      };

      if (format === "excel") {
        return this.exportToExcel(exportData);
      } else {
        return this.exportToJSON(exportData);
      }
    } catch (error) {
      console.error("Error exporting activity data:", error);
      return null;
    }
  }

  /**
   * EXPORT TO EXCEL
   * Export data in Excel format using SheetJS
   */
  exportToExcel(data) {
    try {
      // Check if SheetJS is available
      if (typeof XLSX === "undefined") {
        console.error("SheetJS library not found. Loading from CDN...");
        return this.loadSheetJSAndExport(data);
      }

      const workbook = XLSX.utils.book_new();

      // Activity Logs sheet
      const logsSheet = XLSX.utils.json_to_sheet(
        data.activityLogs.map((log) => ({
          Timestamp: new Date(log.timestamp).toLocaleString("vi-VN"),
          "AC ID": log.acId,
          Type: log.type,
          "Previous Temp": log.previousTemp || log.originalTemp || "",
          "New Temp":
            log.newTemp || log.recommendedTemp || log.appliedTemp || "",
          "Applied By": log.appliedBy || log.changedBy || "",
          Confidence: log.confidence || "",
          "Energy Savings": log.energySavings || "",
          Context: JSON.stringify(log.context || {}),
          "Session ID": log.sessionId || "",
        }))
      );
      XLSX.utils.book_append_sheet(workbook, logsSheet, "Activity Logs");

      // Daily Statistics sheet
      if (data.dailyStatistics && data.dailyStatistics.length > 0) {
        const statsSheet = XLSX.utils.json_to_sheet(
          data.dailyStatistics.map((stat) => ({
            Date: stat.date,
            "Recommendations Applied": stat.recommendationsApplied || 0,
            "Adjustments Made": stat.adjustmentsMade || 0,
            "Energy Saved (%)": stat.energySaved || 0,
            "Average Confidence": stat.avgConfidence || 0,
            "Success Rate": stat.successRate || 0,
          }))
        );
        XLSX.utils.book_append_sheet(workbook, statsSheet, "Daily Statistics");
      }

      // Summary sheet
      const summarySheet = XLSX.utils.json_to_sheet([
        { Metric: "Total Logs", Value: data.metadata.totalLogs },
        { Metric: "Export Date", Value: data.metadata.exportDate },
        { Metric: "AC ID", Value: data.metadata.acId },
        {
          Metric: "Total Recommendations",
          Value: data.summary.totalRecommendations,
        },
        { Metric: "Total Adjustments", Value: data.summary.totalAdjustments },
        { Metric: "Success Rate (%)", Value: data.summary.successRate },
        { Metric: "Average Confidence", Value: data.summary.avgConfidence },
      ]);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

      // Generate file
      const fileName = `temperature-activity-${data.metadata.acId}-${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      XLSX.writeFile(workbook, fileName);

      console.log("✅ Excel export completed:", fileName);
      return true;
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      return false;
    }
  }

  /**
   * LOAD SHEETJS AND EXPORT
   * Dynamically load SheetJS library if not available
   */
  async loadSheetJSAndExport(data) {
    try {
      // Load SheetJS from CDN
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";

      return new Promise((resolve, reject) => {
        script.onload = () => {
          console.log("SheetJS loaded successfully");
          resolve(this.exportToExcel(data));
        };
        script.onerror = () => {
          console.error("Failed to load SheetJS");
          reject(false);
        };
        document.head.appendChild(script);
      });
    } catch (error) {
      console.error("Error loading SheetJS:", error);
      return false;
    }
  }

  /**
   * EXPORT TO JSON
   * Export data in JSON format
   */
  exportToJSON(data) {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `temperature-activity-${data.metadata.acId}-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log("✅ JSON export completed");
      return true;
    } catch (error) {
      console.error("Error exporting to JSON:", error);
      return false;
    }
  }

  /**
   * UTILITY METHODS
   */

  generateLogId(timestamp) {
    return `${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getSessionId() {
    // Generate or get session ID for tracking user sessions
    const SESSION_KEY = "temp_activity_session";
    let sessionId = sessionStorage.getItem(SESSION_KEY);

    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }

    return sessionId;
  }

  getAdjustmentDirection(prevTemp, newTemp) {
    if (newTemp > prevTemp) return "increase";
    if (newTemp < prevTemp) return "decrease";
    return "maintain";
  }

  getDeviceType() {
    const ua = navigator.userAgent;
    if (/Mobile|Android|iPhone|iPad/.test(ua)) return "mobile";
    if (/Tablet/.test(ua)) return "tablet";
    return "desktop";
  }

  calculateContextStability(context) {
    // Simple stability metric based on context consistency
    return "stable"; // Simplified for now
  }

  shouldSyncToFirebase() {
    return this.isOnline && this.currentUser && this.database;
  }

  /**
   * FIREBASE SYNC METHODS
   */

  async syncToFirebase(category, acId, logId, logEntry) {
    try {
      if (!this.shouldSyncToFirebase()) return false;

      const logRef = this.database.ref(
        `Air_Conditioner/${this.currentUser.uid}/activity_log_temp/${acId}/${category}/${logId}`
      );

      await logRef.set({
        ...logEntry,
        firebaseSyncTimestamp: firebase.database.ServerValue.TIMESTAMP,
      });

      return true;
    } catch (error) {
      console.error("Firebase sync failed:", error);
      return false;
    }
  }

  async loadFromFirebase(acId, options) {
    try {
      if (!this.shouldSyncToFirebase()) return [];

      const basePath = `Air_Conditioner/${this.currentUser.uid}/activity_log_temp`;
      const path = acId ? `${basePath}/${acId}` : basePath;

      const snapshot = await this.database.ref(path).once("value");

      if (!snapshot.exists()) return [];

      const data = snapshot.val();
      const logs = [];

      // Extract logs from all categories
      const categories = [
        "recommendations",
        "adjustments",
        "successful_recommendations",
      ];

      for (const [currentAcId, acData] of Object.entries(data)) {
        if (acId && currentAcId !== acId) continue;

        for (const category of categories) {
          if (acData[category]) {
            for (const [logId, logEntry] of Object.entries(acData[category])) {
              logs.push({
                ...logEntry,
                logId,
                category,
                acId: currentAcId,
              });
            }
          }
        }
      }

      return logs;
    } catch (error) {
      console.error("Error loading from Firebase:", error);
      return [];
    }
  }

  /**
   * LOCAL STORAGE METHODS
   */

  async storeLocally(category, acId, logId, logEntry) {
    try {
      if (!this.localCache.has(acId)) {
        this.localCache.set(acId, {
          recommendations: new Map(),
          adjustments: new Map(),
          successful_recommendations: new Map(),
        });
      }

      const acCache = this.localCache.get(acId);
      if (!acCache[category]) {
        acCache[category] = new Map();
      }

      acCache[category].set(logId, logEntry);

      // Save to localStorage
      this.saveLocalCache();
    } catch (error) {
      console.error("Error storing locally:", error);
    }
  }

  loadFromLocalCache(acId = null, options = {}) {
    try {
      const logs = [];

      if (acId) {
        const acCache = this.localCache.get(acId);
        if (acCache) {
          for (const [category, categoryLogs] of Object.entries(acCache)) {
            for (const [logId, logEntry] of categoryLogs) {
              logs.push({
                ...logEntry,
                logId,
                category,
                acId,
              });
            }
          }
        }
      } else {
        for (const [currentAcId, acCache] of this.localCache) {
          for (const [category, categoryLogs] of Object.entries(acCache)) {
            for (const [logId, logEntry] of categoryLogs) {
              logs.push({
                ...logEntry,
                logId,
                category,
                acId: currentAcId,
              });
            }
          }
        }
      }

      return logs;
    } catch (error) {
      console.error("Error loading from local cache:", error);
      return [];
    }
  }

  saveLocalCache() {
    try {
      const cacheData = {};

      for (const [acId, acCache] of this.localCache) {
        cacheData[acId] = {};
        for (const [category, categoryLogs] of Object.entries(acCache)) {
          cacheData[acId][category] = {};
          for (const [logId, logEntry] of categoryLogs) {
            cacheData[acId][category][logId] = logEntry;
          }
        }
      }

      localStorage.setItem(
        this.CACHE_KEY,
        JSON.stringify({
          data: cacheData,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error("Error saving local cache:", error);
    }
  }

  loadFromLocalStorage() {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const cacheData = parsed.data || {};

        for (const [acId, acCache] of Object.entries(cacheData)) {
          const acCacheMap = {
            recommendations: new Map(),
            adjustments: new Map(),
            successful_recommendations: new Map(),
          };

          for (const [category, categoryLogs] of Object.entries(acCache)) {
            for (const [logId, logEntry] of Object.entries(categoryLogs)) {
              acCacheMap[category].set(logId, logEntry);
            }
          }

          this.localCache.set(acId, acCacheMap);
        }
      }
    } catch (error) {
      console.error("Error loading from localStorage:", error);
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
  }

  async processSyncQueue() {
    if (!this.shouldSyncToFirebase() || this.syncQueue.length === 0) {
      return;
    }

    const processed = [];

    for (const item of this.syncQueue) {
      try {
        let success = false;

        switch (item.operation) {
          case "save_recommendation":
            success = await this.syncToFirebase(
              "recommendations",
              item.data.acId,
              item.data.logId,
              item.data.logEntry
            );
            break;
          case "save_adjustment":
            success = await this.syncToFirebase(
              "adjustments",
              item.data.acId,
              item.data.logId,
              item.data.logEntry
            );
            break;
          case "save_success":
            success = await this.syncToFirebase(
              "successful_recommendations",
              item.data.acId,
              item.data.logId,
              item.data.logEntry
            );
            break;
          case "save_learning_data":
            await this.saveLearningData(item.data);
            success = true;
            break;
        }

        if (success) {
          processed.push(item);
        } else {
          item.retries++;
          if (item.retries >= 3) {
            processed.push(item); // Remove after max retries
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
      console.log(`📤 Synced ${processed.length} activity logs to Firebase`);
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
   * STATISTICS AND ANALYSIS
   */

  async updateDailyStats(acId, eventType, logEntry) {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Update local stats first
      await this.updateLocalDailyStats(acId, today, eventType, logEntry);

      // Sync to Firebase
      if (this.shouldSyncToFirebase()) {
        await this.syncDailyStatsToFirebase(acId, today);
      }
    } catch (error) {
      console.error("Error updating daily stats:", error);
    }
  }

  async updateLocalDailyStats(acId, date, eventType, logEntry) {
    const statsKey = `daily_stats_${acId}_${date}`;
    let stats = JSON.parse(localStorage.getItem(statsKey) || "{}");

    // Initialize if empty
    if (!stats.date) {
      stats = {
        date,
        recommendationsApplied: 0,
        adjustmentsMade: 0,
        energySaved: 0,
        avgConfidence: 0,
        totalConfidenceSum: 0,
        successRate: 0,
      };
    }

    // Update based on event type
    switch (eventType) {
      case "recommendation_applied":
        stats.recommendationsApplied++;
        stats.totalConfidenceSum += logEntry.confidence || 0;
        stats.avgConfidence =
          stats.totalConfidenceSum / stats.recommendationsApplied;
        stats.energySaved += logEntry.energySavings || 0;
        break;
      case "adjustment_made":
        stats.adjustmentsMade++;
        break;
      case "successful_recommendation":
        stats.energySaved += logEntry.energySavingsActual || 0;
        break;
    }

    // Calculate success rate
    if (stats.recommendationsApplied > 0) {
      stats.successRate =
        ((stats.recommendationsApplied - stats.adjustmentsMade) /
          stats.recommendationsApplied) *
        100;
    }

    localStorage.setItem(statsKey, JSON.stringify(stats));
  }

  async syncDailyStatsToFirebase(acId, date) {
    try {
      const statsKey = `daily_stats_${acId}_${date}`;
      const stats = JSON.parse(localStorage.getItem(statsKey) || "{}");

      if (stats.date) {
        const statsRef = this.database.ref(
          `Air_Conditioner/${this.currentUser.uid}/activity_log_temp/${acId}/statistics/daily_stats/${date}`
        );

        await statsRef.set({
          ...stats,
          lastUpdated: firebase.database.ServerValue.TIMESTAMP,
        });
      }
    } catch (error) {
      console.error("Error syncing daily stats to Firebase:", error);
    }
  }

  generateSummaryStats(logs) {
    const summary = {
      totalLogs: logs.length,
      totalRecommendations: 0,
      totalAdjustments: 0,
      totalSuccessful: 0,
      avgConfidence: 0,
      successRate: 0,
      totalEnergySaved: 0,
    };

    let confidenceSum = 0;
    let confidenceCount = 0;

    for (const log of logs) {
      switch (log.type) {
        case this.ACTIVITY_TYPES.RECOMMENDATION_APPLIED:
          summary.totalRecommendations++;
          if (log.confidence) {
            confidenceSum += log.confidence;
            confidenceCount++;
          }
          if (log.energySavings) {
            summary.totalEnergySaved += log.energySavings;
          }
          break;
        case this.ACTIVITY_TYPES.MANUAL_ADJUSTMENT:
          summary.totalAdjustments++;
          break;
        case this.ACTIVITY_TYPES.SUCCESSFUL_RECOMMENDATION:
          summary.totalSuccessful++;
          if (log.energySavingsActual) {
            summary.totalEnergySaved += log.energySavingsActual;
          }
          break;
      }
    }

    if (confidenceCount > 0) {
      summary.avgConfidence =
        Math.round((confidenceSum / confidenceCount) * 100) / 100;
    }

    if (summary.totalRecommendations > 0) {
      summary.successRate =
        Math.round(
          ((summary.totalRecommendations - summary.totalAdjustments) /
            summary.totalRecommendations) *
            100 *
            100
        ) / 100;
    }

    summary.totalEnergySaved = Math.round(summary.totalEnergySaved * 100) / 100;

    return summary;
  }

  mergeLogs(firebaseLogs, localLogs) {
    const merged = new Map();

    // Add Firebase logs first
    for (const log of firebaseLogs) {
      merged.set(log.logId, log);
    }

    // Add local logs (avoid duplicates)
    for (const log of localLogs) {
      if (!merged.has(log.logId)) {
        merged.set(log.logId, log);
      }
    }

    return Array.from(merged.values());
  }

  /**
   * NETWORK EVENT HANDLERS
   */

  setupNetworkListeners() {
    window.addEventListener("online", () => {
      this.isOnline = true;
      console.log("Activity Logger: Online - processing sync queue");
      this.processSyncQueue();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      console.log("Activity Logger: Offline - queuing operations");
    });
  }

  /**
   * CLEANUP METHODS
   */

  async clearOldLogs(daysToKeep = 90) {
    try {
      const cutoffDate = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

      // Clear local cache
      for (const [acId, acCache] of this.localCache) {
        for (const [category, categoryLogs] of Object.entries(acCache)) {
          for (const [logId, logEntry] of categoryLogs) {
            if (logEntry.timestamp < cutoffDate) {
              categoryLogs.delete(logId);
            }
          }
        }
      }

      this.saveLocalCache();
      console.log(`Cleaned up logs older than ${daysToKeep} days`);
    } catch (error) {
      console.error("Error clearing old logs:", error);
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
      online: this.isOnline,
      firebase: !!this.database,
      user: !!this.currentUser,
      localCacheSize: this.localCache.size,
      syncQueueSize: this.syncQueue.length,
    };
  }
}

// Initialize global instance
document.addEventListener("DOMContentLoaded", () => {
  window.temperatureActivityLogger = new TemperatureActivityLogger();
  console.log("Temperature Activity Logger global instance created");
});

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = TemperatureActivityLogger;
}
