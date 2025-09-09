/**
 * Energy Efficiency Manager
 * Calculates and visualizes energy efficiency based on temperature settings and power consumption
 *
 * EFFICIENCY CALCULATION LOGIC:
 * - Optimal temperature range: 22-25°C
 * - Power efficiency depends on target vs outdoor temperature difference
 * - Lower temperature difference = higher efficiency
 * - Extreme temperatures (< 20°C or > 28°C) = very inefficient
 */

class EnergyEfficiencyManager {
  constructor() {
    this.optimalTempRange = { min: 22, max: 25 };
    this.outdoorTemp = 30; // Default outdoor temperature
    this.efficiencyThresholds = {
      excellent: 80,
      good: 60,
      average: 40,
      poor: 0,
    };

    // DEPRECATED: Legacy baseline values - replaced by AC-specific configurations
    this.baselinePowerPerDegree = 15; // Will be overridden by AC configurations
    this.minimumPower = 180; // Will be overridden by AC configurations

    // NEW: AC-specific configurations from AC Configuration Manager
    this.acConfigurations = {}; // Stores per-unit specifications

    // AC Specifications Database - from ENERGY-EFFICIENCY-FORMULA.md
    this.acSpecifications = {
      "1HP": { nominalPower: 800, maxPower: 1000, minPower: 200 },
      "1.5HP": { nominalPower: 1200, maxPower: 1500, minPower: 300 },
      "2HP": { nominalPower: 1600, maxPower: 2000, minPower: 400 },
      "2.5HP": { nominalPower: 2000, maxPower: 2500, minPower: 500 },
    };

    // Technology Multipliers - from ENERGY-EFFICIENCY-FORMULA.md
    this.technologyMultipliers = {
      "non-inverter": { efficiency: 0.7, powerPerDegree: 25 },
      inverter: { efficiency: 0.85, powerPerDegree: 18 },
      "dual-inverter": { efficiency: 0.95, powerPerDegree: 15 },
    };

    // Room Size Factors - from ENERGY-EFFICIENCY-FORMULA.md
    this.roomSizeFactors = {
      small: { area: "10-20m²", multiplier: 0.8 }, // Bedroom
      medium: { area: "20-35m²", multiplier: 1.0 }, // Living Room
      large: { area: "35-50m²", multiplier: 1.3 }, // Open Space
      xlarge: { area: "50+m²", multiplier: 1.6 }, // Commercial
    };

    // Global energy cost setting
    this.globalEnergyCostPerKWh = 0.12;
  }

  /**
   * CONFIGURE AC UNIT - NEW METHOD
   * Configure specifications for a specific AC unit
   * Called by AC Configuration Manager
   */
  configureACUnit(acId, configuration) {
    const { type, technology, roomSize, energyCostPerKWh } = configuration;

    // Validate configuration
    if (!this.acSpecifications[type]) {
      throw new Error(`Invalid AC type: ${type}`);
    }
    if (!this.technologyMultipliers[technology]) {
      throw new Error(`Invalid technology: ${technology}`);
    }
    if (!this.roomSizeFactors[roomSize]) {
      throw new Error(`Invalid room size: ${roomSize}`);
    }

    // Store AC-specific configuration
    this.acConfigurations[acId] = {
      type: type,
      technology: technology,
      roomSize: roomSize,
      energyCostPerKWh: energyCostPerKWh || this.globalEnergyCostPerKWh,

      // Pre-calculate power specifications for efficiency
      nominalPower: this.acSpecifications[type].nominalPower,
      maxPower: this.acSpecifications[type].maxPower,
      minPower: this.acSpecifications[type].minPower,
      efficiency: this.technologyMultipliers[technology].efficiency,
      powerPerDegree: this.technologyMultipliers[technology].powerPerDegree,
      roomMultiplier: this.roomSizeFactors[roomSize].multiplier,

      // Calculated final specifications
      adjustedMinPower:
        this.acSpecifications[type].minPower *
        this.roomSizeFactors[roomSize].multiplier,
      adjustedMaxPower:
        this.acSpecifications[type].maxPower *
        this.roomSizeFactors[roomSize].multiplier,
      adjustedNominalPower:
        this.acSpecifications[type].nominalPower *
        this.roomSizeFactors[roomSize].multiplier,
      adjustedPowerPerDegree:
        this.technologyMultipliers[technology].powerPerDegree *
        this.roomSizeFactors[roomSize].multiplier,

      configuredAt: new Date().toISOString(),
    };

    console.log(
      `AC ${acId} configured with realistic specifications:`,
      this.acConfigurations[acId]
    );
  }

  /**
   * REMOVE AC CONFIGURATION
   * Remove configuration for specific AC unit
   */
  removeACConfiguration(acId) {
    if (this.acConfigurations[acId]) {
      delete this.acConfigurations[acId];
      console.log(`Configuration removed for AC ${acId}`);
    }
  }

  /**
   * UPDATE GLOBAL SETTINGS
   * Update global settings from AC Configuration Manager
   */
  updateGlobalSettings(settings) {
    if (settings.outdoorTemp) {
      this.outdoorTemp = settings.outdoorTemp;
    }
    if (settings.energyCostPerKWh) {
      this.globalEnergyCostPerKWh = settings.energyCostPerKWh;
    }
    if (settings.optimalTempRange) {
      this.optimalTempRange = settings.optimalTempRange;
    }

    console.log("Global settings updated:", settings);
  }

  /**
   * CALCULATE EFFICIENCY FOR SPECIFIC AC - ENHANCED METHOD
   * Calculate energy efficiency using AC-specific configurations
   * Fallback to legacy calculation if AC not configured
   */
  calculateEfficiencyForAC(
    acId,
    targetTemp,
    currentPower,
    outdoorTemp = this.outdoorTemp
  ) {
    const acConfig = this.acConfigurations[acId];

    if (acConfig) {
      // Use AC-specific realistic calculation
      return this.calculateRealisticEfficiency(
        acConfig,
        targetTemp,
        currentPower,
        outdoorTemp
      );
    } else {
      // Fallback to legacy calculation
      console.warn(
        `AC ${acId} not configured. Using legacy calculation. Please configure AC specifications in Settings.`
      );
      return this.calculateEfficiency(targetTemp, currentPower, outdoorTemp);
    }
  }

  /**
   * REALISTIC EFFICIENCY CALCULATION - NEW METHOD
   * Implements the advanced formula from ENERGY-EFFICIENCY-FORMULA.md
   */
  calculateRealisticEfficiency(
    acConfig,
    targetTemp,
    currentPower,
    outdoorTemp = this.outdoorTemp
  ) {
    // Calculate temperature difference
    const tempDifference = Math.abs(outdoorTemp - targetTemp);

    // Calculate optimal power using AC-specific specifications
    const optimalPower =
      acConfig.adjustedMinPower +
      tempDifference * acConfig.adjustedPowerPerDegree;

    // Ensure optimal power doesn't exceed AC capacity
    const finalOptimalPower = Math.min(optimalPower, acConfig.adjustedMaxPower);

    // Calculate efficiency score (0-100)
    let efficiencyScore = 100;

    // Temperature penalties (adjusted for realistic ranges)
    if (targetTemp < 18) {
      efficiencyScore -= (18 - targetTemp) * 12; // Extreme cold penalty
    } else if (targetTemp < 20) {
      efficiencyScore -= (20 - targetTemp) * 8; // Very cold penalty
    }

    if (targetTemp > 28) {
      efficiencyScore -= (targetTemp - 28) * 6; // Too hot penalty
    } else if (targetTemp > 30) {
      efficiencyScore -= (targetTemp - 30) * 10; // Extreme hot penalty
    }

    // Power consumption penalty (relative to AC capacity)
    if (currentPower > finalOptimalPower) {
      const powerWasteRatio =
        (currentPower - finalOptimalPower) / finalOptimalPower;
      const powerPenalty = Math.min(powerWasteRatio * 60, 40); // Max 40 point penalty
      efficiencyScore -= powerPenalty;
    }

    // Technology efficiency bonus
    const technologyBonus = (acConfig.efficiency - 0.7) * 20; // Up to 5 points for dual-inverter
    efficiencyScore += technologyBonus;

    // Optimal temperature range bonus
    if (
      targetTemp >= this.optimalTempRange.min &&
      targetTemp <= this.optimalTempRange.max
    ) {
      efficiencyScore += 10;
    }

    // Capacity utilization penalty
    const capacityUtilization = currentPower / acConfig.adjustedNominalPower;
    if (capacityUtilization > 1.2) {
      const capacityPenalty = (capacityUtilization - 1.2) * 15;
      efficiencyScore -= capacityPenalty;
    }

    // Ensure score is between 0-100
    efficiencyScore = Math.max(0, Math.min(100, efficiencyScore));

    // Calculate potential savings using AC-specific energy cost
    const potentialSavings =
      currentPower > finalOptimalPower
        ? (((currentPower - finalOptimalPower) / currentPower) * 100).toFixed(1)
        : 0;

    // Determine efficiency level
    const level = this.getEfficiencyLevel(efficiencyScore);

    // Generate realistic recommendations
    const recommendations = this.getRealisticRecommendations(
      acConfig,
      targetTemp,
      currentPower,
      finalOptimalPower,
      outdoorTemp
    );

    return {
      score: Math.round(efficiencyScore),
      level: level,
      potentialSavings: potentialSavings,
      optimalPower: Math.round(finalOptimalPower),
      currentPower: currentPower,
      tempDifference: tempDifference,
      recommendations: recommendations,
      isOptimalRange:
        targetTemp >= this.optimalTempRange.min &&
        targetTemp <= this.optimalTempRange.max,

      // Additional realistic data
      acConfiguration: acConfig,
      capacityUtilization: Math.round(capacityUtilization * 100),
      technologyEfficiency: Math.round(acConfig.efficiency * 100),
      hourlyCost: ((currentPower / 1000) * acConfig.energyCostPerKWh).toFixed(
        3
      ),
      optimalHourlyCost: (
        (finalOptimalPower / 1000) *
        acConfig.energyCostPerKWh
      ).toFixed(3),
    };
  }

  /**
   * REALISTIC RECOMMENDATIONS - NEW METHOD
   * Generate recommendations based on AC specifications and capacity
   */
  getRealisticRecommendations(
    acConfig,
    targetTemp,
    currentPower,
    optimalPower,
    outdoorTemp
  ) {
    const recommendations = [];

    // Temperature recommendations based on AC capacity
    if (targetTemp < this.optimalTempRange.min) {
      const suggestedTemp = this.optimalTempRange.min;
      const savings = this.calculateSavingsForACTemp(
        acConfig,
        targetTemp,
        suggestedTemp,
        outdoorTemp
      );

      recommendations.push({
        type: "temperature",
        action: "increase",
        message: `Increase temperature to ${suggestedTemp}°C for ${savings}% energy savings`,
        suggestedTemp: suggestedTemp,
        estimatedSavings: savings,
        priority: "high",
      });
    } else if (targetTemp > this.optimalTempRange.max) {
      const suggestedTemp = this.optimalTempRange.max;
      const savings = this.calculateSavingsForACTemp(
        acConfig,
        targetTemp,
        suggestedTemp,
        outdoorTemp
      );

      recommendations.push({
        type: "temperature",
        action: "decrease",
        message: `Decrease temperature to ${suggestedTemp}°C for ${savings}% energy savings`,
        suggestedTemp: suggestedTemp,
        estimatedSavings: savings,
        priority: "medium",
      });
    }

    // Capacity utilization recommendations
    const capacityUtilization = currentPower / acConfig.adjustedNominalPower;
    if (capacityUtilization > 1.1) {
      recommendations.push({
        type: "capacity",
        action: "upgrade",
        message: `Your ${acConfig.type} AC is running at ${Math.round(
          capacityUtilization * 100
        )}% capacity. Consider upgrading to a higher HP unit.`,
        currentCapacity: Math.round(capacityUtilization * 100),
        suggestedUpgrade: this.suggestACUpgrade(acConfig.type),
        priority: "medium",
      });
    }

    // Technology recommendations
    if (
      acConfig.technology === "non-inverter" &&
      (currentPower - optimalPower) / optimalPower > 0.2
    ) {
      recommendations.push({
        type: "technology",
        action: "upgrade",
        message: "Consider upgrading to inverter AC for 15-30% energy savings",
        currentTechnology: acConfig.technology,
        suggestedTechnology: "inverter",
        estimatedSavings: "15-30",
        priority: "low",
      });
    }

    // Power consumption recommendations
    if (currentPower > optimalPower * 1.2) {
      recommendations.push({
        type: "maintenance",
        action: "service",
        message:
          "AC consuming excessive power. Check filters and schedule maintenance.",
        excessConsumption: Math.round(
          ((currentPower - optimalPower) / optimalPower) * 100
        ),
        priority: "high",
      });
    }

    return recommendations;
  }

  /**
   * CALCULATE SAVINGS FOR AC TEMPERATURE CHANGE
   * Calculate realistic savings based on AC specifications
   */
  calculateSavingsForACTemp(acConfig, currentTemp, suggestedTemp, outdoorTemp) {
    const currentDiff = Math.abs(outdoorTemp - currentTemp);
    const suggestedDiff = Math.abs(outdoorTemp - suggestedTemp);

    const currentEstimatedPower =
      acConfig.adjustedMinPower + currentDiff * acConfig.adjustedPowerPerDegree;
    const suggestedEstimatedPower =
      acConfig.adjustedMinPower +
      suggestedDiff * acConfig.adjustedPowerPerDegree;

    const savings =
      ((currentEstimatedPower - suggestedEstimatedPower) /
        currentEstimatedPower) *
      100;
    return Math.max(0, Math.round(savings));
  }

  /**
   * SUGGEST AC UPGRADE
   * Suggest next HP capacity for upgrade
   */
  suggestACUpgrade(currentType) {
    const upgradeMap = {
      "1HP": "1.5HP",
      "1.5HP": "2HP",
      "2HP": "2.5HP",
      "2.5HP": "3HP",
    };
    return upgradeMap[currentType] || "Higher capacity unit";
  }

  /**
   * Calculate energy efficiency score based on target temperature and power consumption
   * LEGACY METHOD - Enhanced to detect AC configurations
   * @param {number} targetTemp - Target temperature setting
   * @param {number} currentPower - Current power consumption in watts
   * @param {number} outdoorTemp - Outdoor temperature (optional)
   * @returns {object} Efficiency data with score, level, savings, and recommendations
   */
  calculateEfficiency(
    targetTemp,
    currentPower,
    outdoorTemp = this.outdoorTemp
  ) {
    // NEW: Try to determine which AC this calculation is for
    // Check if we're in control page context and have a selected AC
    let acId = null;
    if (window.acSpaManager && window.acSpaManager.selectedAC) {
      acId = window.acSpaManager.selectedAC;
    }

    // NEW: Use AC-specific calculation if configuration exists
    if (acId && this.acConfigurations[acId]) {
      console.log(`Using realistic calculation for configured AC: ${acId}`);
      return this.calculateRealisticEfficiency(
        this.acConfigurations[acId],
        targetTemp,
        currentPower,
        outdoorTemp
      );
    }

    // LEGACY: Fall back to original calculation for unconfigured ACs
    console.log(
      "Using legacy calculation - AC not configured or not identified"
    );

    // Calculate temperature difference from outdoor
    const tempDifference = Math.abs(outdoorTemp - targetTemp);

    // Calculate optimal power consumption for this temperature difference
    const optimalPower =
      this.minimumPower + tempDifference * this.baselinePowerPerDegree;

    // Calculate efficiency score (0-100)
    let efficiencyScore = 100;

    // Penalty for extreme temperatures
    if (targetTemp < 20) {
      efficiencyScore -= (20 - targetTemp) * 8; // Heavy penalty for too cold
    } else if (targetTemp > 28) {
      efficiencyScore -= (targetTemp - 28) * 6; // Penalty for too hot
    }

    // Penalty for excessive power consumption
    if (currentPower > optimalPower) {
      const powerWaste = ((currentPower - optimalPower) / optimalPower) * 100;
      efficiencyScore -= Math.min(powerWaste, 50); // Cap penalty at 50 points
    }

    // Bonus for operating in optimal range
    if (
      targetTemp >= this.optimalTempRange.min &&
      targetTemp <= this.optimalTempRange.max
    ) {
      efficiencyScore += 10;
    }

    // Ensure score is between 0-100
    efficiencyScore = Math.max(0, Math.min(100, efficiencyScore));

    // Calculate potential savings
    const potentialSavings =
      currentPower > optimalPower
        ? (((currentPower - optimalPower) / currentPower) * 100).toFixed(1)
        : 0;

    // Determine efficiency level
    const level = this.getEfficiencyLevel(efficiencyScore);

    // Generate recommendations
    const recommendations = this.getRecommendations(
      targetTemp,
      currentPower,
      optimalPower,
      outdoorTemp
    );

    return {
      score: Math.round(efficiencyScore),
      level: level,
      potentialSavings: potentialSavings,
      optimalPower: Math.round(optimalPower),
      currentPower: currentPower,
      tempDifference: tempDifference,
      recommendations: recommendations,
      isOptimalRange:
        targetTemp >= this.optimalTempRange.min &&
        targetTemp <= this.optimalTempRange.max,

      // NEW: Add configuration hint
      configurationHint: acId
        ? `Configure AC ${acId} in Settings for more accurate calculations`
        : "Configure your AC in Settings for more accurate calculations",
      isLegacyCalculation: true,
    };
  }

  /**
   * Get efficiency level based on score
   */
  getEfficiencyLevel(score) {
    if (score >= this.efficiencyThresholds.excellent) return "excellent";
    if (score >= this.efficiencyThresholds.good) return "good";
    if (score >= this.efficiencyThresholds.average) return "average";
    return "poor";
  }

  /**
   * Generate temperature and usage recommendations
   */
  getRecommendations(targetTemp, currentPower, optimalPower, outdoorTemp) {
    const recommendations = [];

    // Temperature recommendations
    if (targetTemp < this.optimalTempRange.min) {
      const suggestedTemp = this.optimalTempRange.min;
      const savings = this.calculateSavingsForTemp(
        targetTemp,
        suggestedTemp,
        outdoorTemp
      );
      recommendations.push({
        type: "temperature",
        action: "increase",
        suggestedTemp: suggestedTemp,
        currentTemp: targetTemp,
        estimatedSavings: savings,
        message: `Increase to ${suggestedTemp}°C for ${savings}% energy savings`,
      });
    } else if (targetTemp > this.optimalTempRange.max) {
      const suggestedTemp = this.optimalTempRange.max;
      const savings = this.calculateSavingsForTemp(
        targetTemp,
        suggestedTemp,
        outdoorTemp
      );
      recommendations.push({
        type: "temperature",
        action: "decrease",
        suggestedTemp: suggestedTemp,
        currentTemp: targetTemp,
        estimatedSavings: savings,
        message: `Decrease to ${suggestedTemp}°C for ${savings}% energy savings`,
      });
    }

    // Power consumption recommendations
    if (currentPower > optimalPower * 1.2) {
      recommendations.push({
        type: "maintenance",
        message: "Consider cleaning air filters or checking for air leaks",
        estimatedSavings: Math.round(
          ((currentPower - optimalPower) / currentPower) * 100
        ),
      });
    }

    return recommendations;
  }

  /**
   * Calculate potential savings for temperature change
   */
  calculateSavingsForTemp(currentTemp, suggestedTemp, outdoorTemp) {
    const currentDiff = Math.abs(outdoorTemp - currentTemp);
    const suggestedDiff = Math.abs(outdoorTemp - suggestedTemp);

    const currentEstimatedPower =
      this.minimumPower + currentDiff * this.baselinePowerPerDegree;
    const suggestedEstimatedPower =
      this.minimumPower + suggestedDiff * this.baselinePowerPerDegree;

    const savings =
      ((currentEstimatedPower - suggestedEstimatedPower) /
        currentEstimatedPower) *
      100;
    return Math.max(0, Math.round(savings));
  }

  /**
   * Get efficiency indicator icon and color
   */
  getEfficiencyIndicator(efficiencyData) {
    const { level, score, potentialSavings } = efficiencyData;

    const indicators = {
      excellent: {
        icon: "fas fa-leaf",
        color: "#10b981", // Green
        bgColor: "rgba(16, 185, 129, 0.1)",
        borderColor: "rgba(16, 185, 129, 0.3)",
        arrow: "up",
        text: "Excellent",
      },
      good: {
        icon: "fas fa-thumbs-up",
        color: "#22c55e", // Light green
        bgColor: "rgba(34, 197, 94, 0.1)",
        borderColor: "rgba(34, 197, 94, 0.3)",
        arrow: "up",
        text: "Good",
      },
      average: {
        icon: "fas fa-minus",
        color: "#f59e0b", // Yellow
        bgColor: "rgba(245, 158, 11, 0.1)",
        borderColor: "rgba(245, 158, 11, 0.3)",
        arrow: "right",
        text: "Average",
      },
      poor: {
        icon: "fas fa-exclamation-triangle",
        color: "#ef4444", // Red
        bgColor: "rgba(239, 68, 68, 0.1)",
        borderColor: "rgba(239, 68, 68, 0.3)",
        arrow: "down",
        text: "Poor",
      },
    };

    return indicators[level];
  }

  /**
   * Create efficiency badge HTML
   */
  createEfficiencyBadge(efficiencyData) {
    const indicator = this.getEfficiencyIndicator(efficiencyData);
    const { score, potentialSavings, recommendations, isOptimalRange } =
      efficiencyData;

    // Create tooltip content with recommendations
    let tooltipContent = `
      <div class="efficiency-tooltip-content">
        <div class="tooltip-header">
          <strong>Efficiency Score: ${score}%</strong>
        </div>
    `;

    if (potentialSavings > 0) {
      tooltipContent += `
        <div class="tooltip-savings">
          <i class="fas fa-piggy-bank"></i>
          Potential savings: ${potentialSavings}%
        </div>
      `;
    }

    if (recommendations.length > 0) {
      tooltipContent += `<div class="tooltip-recommendations">`;
      recommendations.forEach((rec) => {
        tooltipContent += `
          <div class="tooltip-recommendation">
            <i class="fas fa-lightbulb"></i>
            ${rec.message}
          </div>
        `;
      });
      tooltipContent += `</div>`;
    }

    if (isOptimalRange) {
      tooltipContent += `
        <div class="tooltip-optimal">
          <i class="fas fa-check-circle"></i>
          Operating in optimal temperature range
        </div>
      `;
    }

    tooltipContent += `</div>`;

    return `
      <div class="efficiency-badge" 
           title="Energy Efficiency Information"
           data-tooltip="${this.escapeHtml(tooltipContent)}"
           style="
        background: ${indicator.bgColor};
        border: 1px solid ${indicator.borderColor};
        color: ${indicator.color};
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        margin-left: 6px;
        cursor: pointer;
        transition: all 0.3s ease;
      "
           onmouseenter="this.style.transform='scale(1.05)'"
           onmouseleave="this.style.transform='scale(1)'">
        <i class="${indicator.icon}" style="font-size: 10px;"></i>
        <span>${score}%</span>
        ${
          potentialSavings > 0
            ? `
          <span style="margin-left: 2px; font-size: 10px; opacity: 0.8;">
            (-${potentialSavings}%)
          </span>
        `
            : ""
        }
      </div>
    `;
  }

  /**
   * Create efficiency arrow indicator
   */
  createEfficiencyArrow(efficiencyData) {
    const indicator = this.getEfficiencyIndicator(efficiencyData);

    const arrowIcons = {
      up: "fas fa-arrow-up",
      down: "fas fa-arrow-down",
      right: "fas fa-arrow-right",
    };

    return `
      <div class="efficiency-arrow" style="
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: ${indicator.bgColor};
        border: 1px solid ${indicator.borderColor};
        margin-left: 6px;
      ">
        <i class="${arrowIcons[indicator.arrow]}" style="
          font-size: 10px;
          color: ${indicator.color};
        "></i>
      </div>
    `;
  }

  /**
   * Update outdoor temperature (for dynamic calculations)
   */
  updateOutdoorTemperature(temp) {
    this.outdoorTemp = temp;
    console.log(`Outdoor temperature updated to ${temp}°C`);
  }

  /**
   * Get efficiency trends for charts
   */
  getEfficiencyTrend(acData, hours = 24) {
    // This would integrate with historical data
    // For now, return mock data structure
    return {
      timestamps: [],
      efficiencyScores: [],
      powerConsumption: [],
      targetTemperatures: [],
      potentialSavings: [],
    };
  }

  /**
   * Escape HTML for tooltip content
   */
  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Create smart temperature recommendation widget for control page
   */
  createTemperatureRecommendationWidget(acData) {
    if (!acData.power) {
      return '<div class="temp-recommendation hidden">AC is turned off</div>';
    }

    const currentPower = (acData.voltage || 220) * (acData.current || 5);
    const efficiencyData = this.calculateEfficiency(
      acData.targetTemp,
      currentPower,
      this.outdoorTemp
    );

    if (efficiencyData.recommendations.length === 0) {
      return `
        <div class="temp-recommendation optimal">
          <div class="recommendation-icon">
            <i class="fas fa-check-circle"></i>
          </div>
          <div class="recommendation-content">
            <div class="recommendation-title">Optimal Temperature</div>
            <div class="recommendation-message">Your AC is running efficiently at ${acData.targetTemp}°C</div>
            <div class="efficiency-score">Efficiency: ${efficiencyData.score}%</div>
          </div>
        </div>
      `;
    }

    const tempRecommendation = efficiencyData.recommendations.find(
      (r) => r.type === "temperature"
    );
    if (!tempRecommendation) {
      return `
        <div class="temp-recommendation maintenance">
          <div class="recommendation-icon">
            <i class="fas fa-tools"></i>
          </div>
          <div class="recommendation-content">
            <div class="recommendation-title">Maintenance Suggested</div>
            <div class="recommendation-message">${efficiencyData.recommendations[0].message}</div>
            <div class="potential-savings">Potential savings: ${efficiencyData.recommendations[0].estimatedSavings}%</div>
          </div>
        </div>
      `;
    }

    return `
      <div class="temp-recommendation ${tempRecommendation.action}">
        <div class="recommendation-icon">
          <i class="fas fa-${
            tempRecommendation.action === "increase" ? "arrow-up" : "arrow-down"
          }"></i>
        </div>
        <div class="recommendation-content">
          <div class="recommendation-title">Energy Saving Tip</div>
          <div class="recommendation-message">${
            tempRecommendation.message
          }</div>
          <div class="recommendation-action">
            <button class="apply-recommendation-btn" 
                    data-suggested-temp="${tempRecommendation.suggestedTemp}"
                    onclick="window.energyEfficiencyManager.applyTemperatureRecommendation(${
                      tempRecommendation.suggestedTemp
                    })">
              Apply ${tempRecommendation.suggestedTemp}°C
            </button>
            <span class="savings-preview">Save ${
              tempRecommendation.estimatedSavings
            }%</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Apply temperature recommendation (integrates with temperature controller and E-RA device)
   */
  applyTemperatureRecommendation(suggestedTemp) {
    console.log(`Applying recommended temperature: ${suggestedTemp}°C`);

    // Method 1: Use existing temperature controller workflow
    if (window.tempController) {
      const success = window.tempController.setTargetTemp(suggestedTemp);
      if (success) {
        // Send command to actual device using E-RA
        window.tempController.sendTemperatureToDevice();

        console.log(`Temperature recommendation applied: ${suggestedTemp}°C`);

        // Show feedback
        if (window.tempController.showFeedback) {
          window.tempController.showFeedback(
            "success",
            `Temperature optimized to ${suggestedTemp}°C for better energy efficiency`
          );
        }

        // Update the recommendation widget after a delay
        setTimeout(() => {
          this.updateRecommendationWidget();
        }, 1000);
      } else {
        console.error("Failed to set target temperature");
        if (window.tempController.showFeedback) {
          window.tempController.showFeedback(
            "error",
            "Failed to apply temperature recommendation"
          );
        }
      }
    }
    // Method 2: Direct E-RA command if temperature controller not available
    else if (window.eraWidget && window.tempControlAir1) {
      try {
        const value = parseFloat(suggestedTemp); // Convert to float as required
        window.eraWidget.triggerAction(window.tempControlAir1.action, null, {
          value: value,
        });

        console.log(`Direct E-RA command sent: ${value}°C`);

        // Update UI if SPA manager is available
        if (window.acSpaManager) {
          const currentAC = window.acSpaManager.getSelectedAC();
          if (currentAC) {
            window.acSpaManager.updateACDataRealtime(
              window.acSpaManager.selectedAC,
              {
                targetTemp: value,
              }
            );
          }
        }

        // Show success message
        this.showRecommendationFeedback(
          "success",
          `Temperature optimized to ${value}°C for better energy efficiency`
        );

        // Update widget after delay
        setTimeout(() => {
          this.updateRecommendationWidget();
        }, 1000);
      } catch (error) {
        console.error("Error sending E-RA command:", error);
        this.showRecommendationFeedback(
          "error",
          "Failed to apply temperature recommendation"
        );
      }
    } else {
      console.warn("Neither temperature controller nor E-RA widget available");
      this.showRecommendationFeedback(
        "error",
        "System not ready to apply temperature changes"
      );
    }
  }

  /**
   * Update recommendation widget on control page
   */
  updateRecommendationWidget() {
    const widget = document.getElementById("spa-temp-recommendation-widget");
    if (widget && window.acSpaManager && window.acSpaManager.selectedAC) {
      const acData = window.acSpaManager.getACData(
        window.acSpaManager.selectedAC
      );
      if (acData) {
        widget.innerHTML = this.createTemperatureRecommendationWidget(acData);
      }
    }
  }

  /**
   * Show feedback for recommendation actions
   */
  showRecommendationFeedback(type, message) {
    // Create feedback notification element
    const feedback = document.createElement("div");
    feedback.className = `recommendation-feedback ${type}`;
    feedback.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${
        type === "success"
          ? "rgba(16, 185, 129, 0.9)"
          : "rgba(239, 68, 68, 0.9)"
      };
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      z-index: 9999;
      font-weight: 600;
      font-size: 14px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      max-width: 300px;
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    // Add icon
    const icon = document.createElement("i");
    icon.className =
      type === "success"
        ? "fas fa-check-circle"
        : "fas fa-exclamation-triangle";
    feedback.appendChild(icon);

    // Add message
    const messageSpan = document.createElement("span");
    messageSpan.textContent = message;
    feedback.appendChild(messageSpan);

    // Add to page
    document.body.appendChild(feedback);

    // Animate in
    setTimeout(() => {
      feedback.style.transform = "translateX(0)";
    }, 100);

    // Auto remove after 3 seconds
    setTimeout(() => {
      feedback.style.transform = "translateX(100%)";
      setTimeout(() => {
        if (feedback.parentNode) {
          feedback.parentNode.removeChild(feedback);
        }
      }, 300);
    }, 3000);
  }
}

// Initialize global energy efficiency manager
window.energyEfficiencyManager = new EnergyEfficiencyManager();

console.log("Energy Efficiency Manager initialized");
