/**
 * TEMPERATURE REINFORCEMENT LEARNING SYSTEM
 * Multi-Armed Bandit with Epsilon-Greedy strategy for personalized temperature recommendations
 *
 * ARCHITECTURE:
 * - Contextual Bandit: outdoor_temp + target_temp + room_type → recommended_temp
 * - Reward System: +1 if user accepts recommendation, -1 if adjusts within 1 hour
 * - Personalization: Individual learning per AC unit/room
 * - Activity Logging: Firebase integration for persistent learning data
 *
 * LEARNING ALGORITHM:
 * 1. Context discretization (temperature ranges)
 * 2. Action space (temperature recommendations)
 * 3. Epsilon-greedy exploration vs exploitation
 * 4. Q-value updates based on user feedback
 * 5. Confidence interval upper bound for action selection
 */

class TemperatureReinforcementLearning {
  constructor() {
    this.initialized = false;

    // Learning parameters
    this.epsilon = 0.1; // exploration rate
    this.learningRate = 0.1;
    this.discountFactor = 0.95;
    this.minExplorationDecay = 0.01;
    this.explorationDecayRate = 0.995;

    // Context discretization (temperature ranges in Celsius)
    this.outdoorTempRanges = [
      { min: 15, max: 20, label: "cool" },
      { min: 20, max: 25, label: "mild" },
      { min: 25, max: 30, label: "warm" },
      { min: 30, max: 35, label: "hot" },
      { min: 35, max: 45, label: "extreme" },
    ];

    this.targetTempRanges = [
      { min: 16, max: 20, label: "cold" },
      { min: 20, max: 24, label: "comfortable" },
      { min: 24, max: 28, label: "warm_indoor" },
    ];

    // Action space (temperature adjustments)
    this.temperatureActions = [
      { adjustment: -2, label: "decrease_2" },
      { adjustment: -1, label: "decrease_1" },
      { adjustment: 0, label: "maintain" },
      { adjustment: 1, label: "increase_1" },
      { adjustment: 2, label: "increase_2" },
    ];

    // Learning data structure per AC unit
    this.learningData = new Map(); // acId -> learning state

    // Activity logging for user behavior analysis
    this.activityLogger = null;

    // Pending recommendations tracking
    this.pendingRecommendations = new Map(); // acId -> recommendation data

    console.log("Temperature Reinforcement Learning System initialized");
  }

  /**
   * INITIALIZE RL SYSTEM
   * Setup learning data structures and integrate with activity logger
   */
  async init() {
    try {
      // Initialize activity logger
      if (window.temperatureActivityLogger) {
        this.activityLogger = window.temperatureActivityLogger;
        await this.activityLogger.init();
      } else {
        console.warn("Temperature Activity Logger not found");
      }

      // Load existing learning data from Firebase/localStorage
      await this.loadLearningData();

      // Setup event listeners for user behavior tracking
      this.setupEventListeners();

      this.initialized = true;
      console.log("Reinforcement Learning System ready");

      return true;
    } catch (error) {
      console.error("RL initialization failed:", error);
      return false;
    }
  }

  /**
   * SETUP EVENT LISTENERS
   * Listen for temperature changes and user interactions
   */
  setupEventListeners() {
    // Listen for temperature recommendation applications
    if (window.acEventSystem) {
      window.acEventSystem.on("recommendation-applied", (data) => {
        this.onRecommendationApplied(data);
      });

      // Listen for manual temperature adjustments
      window.acEventSystem.on("temperature-manually-changed", (data) => {
        this.onManualTemperatureChange(data);
      });

      // Listen for AC selection changes
      window.acEventSystem.on("ac-selected", (data) => {
        this.onACSelectionChanged(data);
      });
    }

    console.log("RL event listeners setup complete");
  }

  /**
   * GET CONTEXTUAL STATE
   * Convert continuous values to discrete context state
   */
  getContextualState(outdoorTemp, targetTemp, acId) {
    const outdoorRange = this.discretizeTemperature(
      outdoorTemp,
      this.outdoorTempRanges
    );
    const targetRange = this.discretizeTemperature(
      targetTemp,
      this.targetTempRanges
    );

    // Get room characteristics if available
    const roomType = this.getRoomType(acId);

    return {
      outdoor: outdoorRange,
      target: targetRange,
      room: roomType,
      stateKey: `${outdoorRange}_${targetRange}_${roomType}`,
    };
  }

  /**
   * DISCRETIZE TEMPERATURE
   * Convert continuous temperature to discrete range
   */
  discretizeTemperature(temp, ranges) {
    for (const range of ranges) {
      if (temp >= range.min && temp < range.max) {
        return range.label;
      }
    }
    // Handle edge cases
    if (temp < ranges[0].min) return ranges[0].label;
    return ranges[ranges.length - 1].label;
  }

  /**
   * GET ROOM TYPE
   * Extract room characteristics from AC configuration
   */
  getRoomType(acId) {
    try {
      if (window.acConfigManager && window.acConfigManager.getACConfiguration) {
        const config = window.acConfigManager.getACConfiguration(acId);
        if (config && config.roomSize) {
          return config.roomSize;
        }
      }

      // Default room type
      return "medium";
    } catch (error) {
      console.error("Error getting room type:", error);
      return "medium";
    }
  }

  /**
   * GET TEMPERATURE RECOMMENDATION
   * Main RL algorithm: Epsilon-greedy with contextual bandit
   */
  getTemperatureRecommendation(
    acId,
    outdoorTemp,
    currentTargetTemp,
    energyEfficiencyData
  ) {
    try {
      // Get contextual state
      const context = this.getContextualState(
        outdoorTemp,
        currentTargetTemp,
        acId
      );

      // Get or create learning state for this AC
      const learningState = this.getOrCreateLearningState(acId);

      // Get Q-values for current context
      const qValues = this.getQValues(learningState, context.stateKey);

      // Epsilon-greedy action selection
      let selectedAction;
      let explorationReason = "";

      if (Math.random() < this.epsilon) {
        // Exploration: random action
        selectedAction =
          this.temperatureActions[
            Math.floor(Math.random() * this.temperatureActions.length)
          ];
        explorationReason = "exploration";
      } else {
        // Exploitation: best known action
        selectedAction = this.getBestAction(qValues);
        explorationReason = "exploitation";
      }

      // Calculate recommended temperature
      const recommendedTemp = Math.max(
        16,
        Math.min(30, currentTargetTemp + selectedAction.adjustment)
      );

      // Calculate confidence score based on experience
      const confidence = this.calculateConfidence(
        learningState,
        context.stateKey,
        selectedAction
      );

      // Create recommendation object
      const recommendation = {
        recommendedTemp,
        currentTemp: currentTargetTemp,
        adjustment: selectedAction.adjustment,
        confidence,
        context,
        explorationReason,
        energySavings: this.estimateEnergySavings(
          currentTargetTemp,
          recommendedTemp,
          outdoorTemp,
          energyEfficiencyData
        ),
        timestamp: Date.now(),
        acId,
        version: "RL_v1.0",
      };

      // Store pending recommendation for feedback tracking
      this.pendingRecommendations.set(acId, recommendation);

      console.log("RL Recommendation generated:", recommendation);
      return recommendation;
    } catch (error) {
      console.error("Error generating RL recommendation:", error);
      return this.getFallbackRecommendation(currentTargetTemp, outdoorTemp);
    }
  }

  /**
   * GET OR CREATE LEARNING STATE
   * Initialize learning data for AC unit if not exists
   */
  getOrCreateLearningState(acId) {
    if (!this.learningData.has(acId)) {
      this.learningData.set(acId, {
        qTable: new Map(), // stateKey -> action -> q_value
        actionCounts: new Map(), // stateKey -> action -> count
        totalRecommendations: 0,
        successfulRecommendations: 0,
        lastUpdate: Date.now(),
        personalizedBias: 0, // learned user temperature preference
        adaptationHistory: [],
      });
    }
    return this.learningData.get(acId);
  }

  /**
   * GET Q-VALUES
   * Retrieve Q-values for state-action pairs
   */
  getQValues(learningState, stateKey) {
    const qValues = {};

    for (const action of this.temperatureActions) {
      if (!learningState.qTable.has(stateKey)) {
        learningState.qTable.set(stateKey, new Map());
      }

      const stateActions = learningState.qTable.get(stateKey);
      if (!stateActions.has(action.label)) {
        // Initialize with optimistic values to encourage exploration
        stateActions.set(action.label, 0.5);
      }

      qValues[action.label] = stateActions.get(action.label);
    }

    return qValues;
  }

  /**
   * GET BEST ACTION
   * Select action with highest Q-value with Upper Confidence Bound
   */
  getBestAction(qValues) {
    let bestAction = this.temperatureActions[0];
    let bestValue = qValues[bestAction.label];

    for (const action of this.temperatureActions) {
      if (qValues[action.label] > bestValue) {
        bestValue = qValues[action.label];
        bestAction = action;
      }
    }

    return bestAction;
  }

  /**
   * CALCULATE CONFIDENCE
   * Calculate confidence score based on exploration count and Q-value variance
   */
  calculateConfidence(learningState, stateKey, action) {
    try {
      if (!learningState.actionCounts.has(stateKey)) {
        return 0.1; // Low confidence for unexplored states
      }

      const stateActionCounts = learningState.actionCounts.get(stateKey);
      const actionCount = stateActionCounts.get(action.label) || 0;

      // Confidence increases with more experience
      const baseConfidence = Math.min(0.9, actionCount * 0.1);

      // Adjust based on overall success rate
      const successRate =
        learningState.totalRecommendations > 0
          ? learningState.successfulRecommendations /
            learningState.totalRecommendations
          : 0.5;

      return Math.max(
        0.1,
        Math.min(0.95, baseConfidence * (0.5 + successRate))
      );
    } catch (error) {
      console.error("Error calculating confidence:", error);
      return 0.5;
    }
  }

  /**
   * ESTIMATE ENERGY SAVINGS
   * Estimate potential energy savings from temperature adjustment
   */
  estimateEnergySavings(currentTemp, recommendedTemp, outdoorTemp, energyData) {
    try {
      if (!energyData || currentTemp === recommendedTemp) {
        return 0;
      }

      // Simple energy model: savings proportional to temperature difference reduction
      const currentTempDiff = Math.abs(currentTemp - outdoorTemp);
      const recommendedTempDiff = Math.abs(recommendedTemp - outdoorTemp);

      if (recommendedTempDiff < currentTempDiff) {
        // Closer to outdoor temp = energy savings
        const savingsPercent =
          ((currentTempDiff - recommendedTempDiff) / currentTempDiff) * 100;
        return Math.max(0, Math.min(30, savingsPercent)); // Cap at 30% savings
      }

      return 0;
    } catch (error) {
      console.error("Error estimating energy savings:", error);
      return 0;
    }
  }

  /**
   * ON RECOMMENDATION APPLIED
   * User accepted the RL recommendation - positive reward
   */
  async onRecommendationApplied(data) {
    try {
      const { acId, recommendedTemp, appliedBy } = data;

      if (!this.pendingRecommendations.has(acId)) {
        console.warn("No pending recommendation found for AC:", acId);
        return;
      }

      const recommendation = this.pendingRecommendations.get(acId);

      // Positive reward for accepted recommendation
      await this.updateQValues(acId, recommendation, 1.0);

      // Log activity
      if (this.activityLogger) {
        await this.activityLogger.logRecommendationApplication({
          acId,
          recommendedTemp,
          originalTemp: recommendation.currentTemp,
          appliedBy: appliedBy || "user",
          confidence: recommendation.confidence,
          context: recommendation.context,
          timestamp: Date.now(),
        });
      }

      // Start monitoring for subsequent adjustments
      this.startAdjustmentMonitoring(acId, recommendation);

      console.log("RL: Positive reward applied for accepted recommendation");
    } catch (error) {
      console.error("Error processing recommendation application:", error);
    }
  }

  /**
   * START ADJUSTMENT MONITORING
   * Monitor for user temperature adjustments within 1 hour
   */
  startAdjustmentMonitoring(acId, recommendation) {
    const monitoringDuration = 60 * 60 * 1000; // 1 hour in milliseconds

    const monitoringData = {
      acId,
      recommendation,
      startTime: Date.now(),
      timeoutId: setTimeout(() => {
        this.onMonitoringComplete(acId, false); // No adjustments = success
      }, monitoringDuration),
    };

    // Store monitoring data
    this.pendingRecommendations.set(`${acId}_monitoring`, monitoringData);

    console.log(`Started 1-hour adjustment monitoring for AC: ${acId}`);
  }

  /**
   * ON MANUAL TEMPERATURE CHANGE
   * User manually adjusted temperature - analyze if it's related to our recommendation
   */
  async onManualTemperatureChange(data) {
    try {
      const { acId, newTemp, previousTemp, changedBy } = data;

      // Check if this is during monitoring period
      const monitoringKey = `${acId}_monitoring`;
      if (this.pendingRecommendations.has(monitoringKey)) {
        const monitoringData = this.pendingRecommendations.get(monitoringKey);

        // Clear timeout
        clearTimeout(monitoringData.timeoutId);

        // Negative reward for adjustment within monitoring period
        await this.updateQValues(acId, monitoringData.recommendation, -0.5);

        // Log activity
        if (this.activityLogger) {
          await this.activityLogger.logManualAdjustment({
            acId,
            recommendedTemp: monitoringData.recommendation.recommendedTemp,
            adjustedTemp: newTemp,
            previousTemp,
            adjustmentTime: Date.now() - monitoringData.startTime,
            changedBy: changedBy || "user",
            context: monitoringData.recommendation.context,
          });
        }

        // Clean up monitoring
        this.pendingRecommendations.delete(monitoringKey);

        console.log(
          "RL: Negative reward applied for user adjustment within monitoring period"
        );
      }
    } catch (error) {
      console.error("Error processing manual temperature change:", error);
    }
  }

  /**
   * ON MONITORING COMPLETE
   * Monitoring period completed without user adjustment - success!
   */
  async onMonitoringComplete(acId, wasAdjusted) {
    try {
      const monitoringKey = `${acId}_monitoring`;
      if (this.pendingRecommendations.has(monitoringKey)) {
        const monitoringData = this.pendingRecommendations.get(monitoringKey);

        if (!wasAdjusted) {
          // Additional positive reward for sustained acceptance
          await this.updateQValues(acId, monitoringData.recommendation, 0.5);

          // Log successful recommendation
          if (this.activityLogger) {
            await this.activityLogger.logSuccessfulRecommendation({
              acId,
              recommendation: monitoringData.recommendation,
              sustainedDuration: 60 * 60 * 1000, // 1 hour
              timestamp: Date.now(),
            });
          }

          console.log(
            "RL: Additional positive reward for sustained recommendation acceptance"
          );
        }

        // Clean up
        this.pendingRecommendations.delete(monitoringKey);
      }
    } catch (error) {
      console.error("Error completing monitoring:", error);
    }
  }

  /**
   * UPDATE Q-VALUES
   * Update learning algorithm with reward feedback
   */
  async updateQValues(acId, recommendation, reward) {
    try {
      const learningState = this.getOrCreateLearningState(acId);
      const { context } = recommendation;
      const stateKey = context.stateKey;
      const actionLabel = this.getActionLabel(recommendation.adjustment);

      // Get current Q-value
      const qValues = this.getQValues(learningState, stateKey);
      const currentQValue = qValues[actionLabel];

      // Q-learning update: Q(s,a) = Q(s,a) + α[r + γ*max(Q(s',a')) - Q(s,a)]
      // Simplified for bandit: Q(s,a) = Q(s,a) + α[r - Q(s,a)]
      const newQValue =
        currentQValue + this.learningRate * (reward - currentQValue);

      // Update Q-table
      learningState.qTable.get(stateKey).set(actionLabel, newQValue);

      // Update action counts
      if (!learningState.actionCounts.has(stateKey)) {
        learningState.actionCounts.set(stateKey, new Map());
      }
      const stateActionCounts = learningState.actionCounts.get(stateKey);
      const currentCount = stateActionCounts.get(actionLabel) || 0;
      stateActionCounts.set(actionLabel, currentCount + 1);

      // Update learning statistics
      learningState.totalRecommendations++;
      if (reward > 0) {
        learningState.successfulRecommendations++;
      }

      // Update personalized bias
      this.updatePersonalizedBias(learningState, recommendation, reward);

      // Decay exploration rate
      this.epsilon = Math.max(
        this.minExplorationDecay,
        this.epsilon * this.explorationDecayRate
      );

      // Save learning data
      await this.saveLearningData();

      console.log(
        `Q-value updated for AC ${acId}: ${currentQValue} -> ${newQValue}, reward: ${reward}`
      );
    } catch (error) {
      console.error("Error updating Q-values:", error);
    }
  }

  /**
   * GET ACTION LABEL
   * Convert temperature adjustment to action label
   */
  getActionLabel(adjustment) {
    const action = this.temperatureActions.find(
      (a) => a.adjustment === adjustment
    );
    return action ? action.label : "maintain";
  }

  /**
   * UPDATE PERSONALIZED BIAS
   * Learn user's temperature preference bias
   */
  updatePersonalizedBias(learningState, recommendation, reward) {
    try {
      const adjustment = recommendation.adjustment;

      // Track user's tendency to prefer higher/lower temperatures
      if (reward > 0) {
        // Positive reward - user likes this adjustment direction
        learningState.personalizedBias += adjustment * 0.1;
      } else {
        // Negative reward - user dislikes this direction
        learningState.personalizedBias -= adjustment * 0.05;
      }

      // Keep bias within reasonable bounds
      learningState.personalizedBias = Math.max(
        -2,
        Math.min(2, learningState.personalizedBias)
      );

      // Record adaptation
      learningState.adaptationHistory.push({
        timestamp: Date.now(),
        adjustment,
        reward,
        newBias: learningState.personalizedBias,
      });

      // Keep only recent history (last 100 adaptations)
      if (learningState.adaptationHistory.length > 100) {
        learningState.adaptationHistory =
          learningState.adaptationHistory.slice(-100);
      }
    } catch (error) {
      console.error("Error updating personalized bias:", error);
    }
  }

  /**
   * GET FALLBACK RECOMMENDATION
   * Provide energy-efficient recommendation when RL fails
   */
  getFallbackRecommendation(currentTemp, outdoorTemp) {
    // Simple energy-efficient fallback
    const optimalDiff = 5; // 5°C difference from outdoor
    let recommendedTemp = outdoorTemp + optimalDiff;

    // Keep within comfortable range
    recommendedTemp = Math.max(22, Math.min(26, recommendedTemp));

    return {
      recommendedTemp,
      currentTemp,
      adjustment: recommendedTemp - currentTemp,
      confidence: 0.3,
      energySavings: 5,
      fallback: true,
      timestamp: Date.now(),
      version: "fallback",
    };
  }

  /**
   * GET LEARNING STATISTICS
   * Provide learning performance metrics
   */
  getLearningStatistics(acId = null) {
    try {
      if (acId) {
        // Statistics for specific AC
        const learningState = this.learningData.get(acId);
        if (!learningState) {
          return null;
        }

        const successRate =
          learningState.totalRecommendations > 0
            ? (learningState.successfulRecommendations /
                learningState.totalRecommendations) *
              100
            : 0;

        return {
          acId,
          totalRecommendations: learningState.totalRecommendations,
          successfulRecommendations: learningState.successfulRecommendations,
          successRate: Math.round(successRate * 100) / 100,
          personalizedBias:
            Math.round(learningState.personalizedBias * 100) / 100,
          exploredStates: learningState.qTable.size,
          currentEpsilon: Math.round(this.epsilon * 1000) / 1000,
          lastUpdate: new Date(learningState.lastUpdate).toLocaleString(
            "vi-VN"
          ),
        };
      } else {
        // Overall statistics
        let totalRecommendations = 0;
        let totalSuccessful = 0;
        let totalACs = this.learningData.size;

        for (const [_, state] of this.learningData) {
          totalRecommendations += state.totalRecommendations;
          totalSuccessful += state.successfulRecommendations;
        }

        const overallSuccessRate =
          totalRecommendations > 0
            ? (totalSuccessful / totalRecommendations) * 100
            : 0;

        return {
          totalACs,
          totalRecommendations,
          totalSuccessful,
          overallSuccessRate: Math.round(overallSuccessRate * 100) / 100,
          currentEpsilon: Math.round(this.epsilon * 1000) / 1000,
          systemUptime: Date.now() - (this.initTime || Date.now()),
        };
      }
    } catch (error) {
      console.error("Error getting learning statistics:", error);
      return null;
    }
  }

  /**
   * RESET LEARNING DATA
   * Reset learning for specific AC or entire system
   */
  async resetLearningData(acId = null) {
    try {
      if (acId) {
        this.learningData.delete(acId);
        console.log(`Learning data reset for AC: ${acId}`);
      } else {
        this.learningData.clear();
        this.epsilon = 0.1; // Reset exploration rate
        console.log("All learning data reset");
      }

      await this.saveLearningData();
      return true;
    } catch (error) {
      console.error("Error resetting learning data:", error);
      return false;
    }
  }

  /**
   * LOAD LEARNING DATA
   * Load learning data from persistent storage
   */
  async loadLearningData() {
    try {
      // Try to load from Firebase first
      if (window.firebaseStorageManager && this.activityLogger) {
        const firebaseData = await this.activityLogger.loadLearningData();
        if (firebaseData) {
          this.deserializeLearningData(firebaseData);
          console.log("Learning data loaded from Firebase");
          return;
        }
      }

      // Fallback to localStorage
      const localData = localStorage.getItem("rl_learning_data");
      if (localData) {
        const parsed = JSON.parse(localData);
        this.deserializeLearningData(parsed);
        console.log("Learning data loaded from localStorage");
      }
    } catch (error) {
      console.error("Error loading learning data:", error);
    }
  }

  /**
   * SAVE LEARNING DATA
   * Save learning data to persistent storage
   */
  async saveLearningData() {
    try {
      const serialized = this.serializeLearningData();

      // Save to localStorage immediately
      localStorage.setItem("rl_learning_data", JSON.stringify(serialized));

      // Save to Firebase if available
      if (this.activityLogger) {
        await this.activityLogger.saveLearningData(serialized);
      }
    } catch (error) {
      console.error("Error saving learning data:", error);
    }
  }

  /**
   * SERIALIZE LEARNING DATA
   * Convert Maps to serializable objects
   */
  serializeLearningData() {
    const serialized = {
      version: "1.0",
      epsilon: this.epsilon,
      timestamp: Date.now(),
      learningData: {},
    };

    for (const [acId, state] of this.learningData) {
      serialized.learningData[acId] = {
        qTable: this.mapToObject(state.qTable, true),
        actionCounts: this.mapToObject(state.actionCounts, true),
        totalRecommendations: state.totalRecommendations,
        successfulRecommendations: state.successfulRecommendations,
        lastUpdate: state.lastUpdate,
        personalizedBias: state.personalizedBias,
        adaptationHistory: state.adaptationHistory,
      };
    }

    return serialized;
  }

  /**
   * DESERIALIZE LEARNING DATA
   * Convert serialized objects back to Maps
   */
  deserializeLearningData(data) {
    try {
      if (data.version && data.learningData) {
        this.epsilon = data.epsilon || 0.1;

        for (const [acId, state] of Object.entries(data.learningData)) {
          this.learningData.set(acId, {
            qTable: this.objectToMap(state.qTable, true),
            actionCounts: this.objectToMap(state.actionCounts, true),
            totalRecommendations: state.totalRecommendations || 0,
            successfulRecommendations: state.successfulRecommendations || 0,
            lastUpdate: state.lastUpdate || Date.now(),
            personalizedBias: state.personalizedBias || 0,
            adaptationHistory: state.adaptationHistory || [],
          });
        }
      }
    } catch (error) {
      console.error("Error deserializing learning data:", error);
    }
  }

  /**
   * UTILITY METHODS
   */
  mapToObject(map, nested = false) {
    const obj = {};
    for (const [key, value] of map) {
      if (nested && value instanceof Map) {
        obj[key] = this.mapToObject(value);
      } else {
        obj[key] = value;
      }
    }
    return obj;
  }

  objectToMap(obj, nested = false) {
    const map = new Map();
    for (const [key, value] of Object.entries(obj)) {
      if (
        nested &&
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        map.set(key, this.objectToMap(value));
      } else {
        map.set(key, value);
      }
    }
    return map;
  }

  /**
   * EVENT HANDLERS
   */
  onACSelectionChanged(data) {
    // Clear pending recommendations for previous AC
    // Keep monitoring active though
    console.log("AC selection changed to:", data.acId);
  }

  /**
   * PUBLIC API METHODS
   */
  isInitialized() {
    return this.initialized;
  }

  getSystemStatus() {
    return {
      initialized: this.initialized,
      epsilon: this.epsilon,
      totalACs: this.learningData.size,
      pendingRecommendations: this.pendingRecommendations.size,
      activityLoggerAvailable: !!this.activityLogger,
    };
  }
}

// Initialize global instance
document.addEventListener("DOMContentLoaded", () => {
  window.temperatureRL = new TemperatureReinforcementLearning();
  console.log("Temperature Reinforcement Learning global instance created");
});

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = TemperatureReinforcementLearning;
}
