class EnergyEfficiencyManager {
  constructor() {
    this.optimalTempRange = { min: 22, max: 25 };
    this.outdoorTemp = 30; // Default outdoor temperature - will be updated dynamically
    this.outdoorTempSources = {
      manual: null, // User-provided temperature
      weather: null, // Weather API temperature
      sensor: null, // Local sensor temperature
      lastUpdated: null,
    };
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

    // Weather API settings
    this.weatherInfo = null;
    this.weatherUpdateInterval = null;
    this.defaultLocation = "Vạn Phúc City, Thủ Đức, Hồ Chí Minh, Vietnam";

    // NEW: Reinforcement Learning Integration
    this.rlMonitoringTimers = {}; // Stores monitoring timers for each AC
    this.lastRLRecommendation = {}; // Stores last RL recommendation for feedback
    this.rlInitialized = false;

    // Auto-start weather updates after 5 seconds (give time for page to load)
    setTimeout(() => {
      this.startAutoWeatherUpdates();
      this.initializeWeatherPanel();
    }, 5000);

    // Initialize RL components after 3 seconds
    setTimeout(() => {
      this.initializeReinforcementLearning();
    }, 3000);
  }

  /**
   * Initialize Reinforcement Learning components
   */
  async initializeReinforcementLearning() {
    try {
      console.log("🤖 Initializing Reinforcement Learning components...");

      // Wait for RL components to load
      const maxWaitTime = 10000; // 10 seconds
      const checkInterval = 500; // 0.5 seconds
      let waitTime = 0;

      const waitForRLComponents = () => {
        return new Promise((resolve, reject) => {
          const checkComponents = () => {
            if (waitTime >= maxWaitTime) {
              reject(new Error("Timeout waiting for RL components"));
              return;
            }

            const rlReady =
              window.temperatureRL && window.temperatureRL.isInitialized();
            const loggerReady =
              window.temperatureActivityLogger &&
              window.temperatureActivityLogger.isInitialized();
            const uiReady =
              window.tempActivityLogUI &&
              window.tempActivityLogUI.isInitialized();

            if (rlReady && loggerReady && uiReady) {
              resolve(true);
            } else {
              waitTime += checkInterval;
              setTimeout(checkComponents, checkInterval);
            }
          };

          checkComponents();
        });
      };

      try {
        await waitForRLComponents();
        console.log("All RL components loaded successfully");

        // Initialize RL for all configured ACs
        for (const acId in this.acConfigurations) {
          this.initializeRLIntegration(acId);
        }

        this.rlInitialized = true;

        // Emit event for other components
        if (window.acEventSystem) {
          window.acEventSystem.emit("rl-system-ready", {
            timestamp: new Date().toISOString(),
            components: [
              "temperatureRL",
              "temperatureActivityLogger",
              "tempActivityLogUI",
            ],
          });
        }

        console.log(
          "🎯 Reinforcement Learning system ready for temperature optimization"
        );
      } catch (error) {
        console.warn("Some RL components not available:", error.message);
        console.log("📝 Manual initialization required for missing components");
      }
    } catch (error) {
      console.error("❌ Error initializing Reinforcement Learning:", error);
    }
  }

  /**
   * Create Vietnamese temperature recommendation widget with detail view button
   * ENHANCED WITH REINFORCEMENT LEARNING ALGORITHM
   */
  createTemperatureRecommendationWidgetVN(acData) {
    if (!acData.power) {
      return '<div class="temp-recommendation hidden">Máy lạnh đang tắt</div>';
    }

    let vnPower = (acData.voltage || 220) * (acData.current || 5);
    let effVN = this.calculateEfficiency(
      acData.targetTemp,
      vnPower,
      this.outdoorTemp
    );

    // NEW: Get Reinforcement Learning recommendation
    let rlRecommendation = null;
    let rlConfidence = 0;
    let showRLWidget = false;

    if (window.temperatureRL && window.temperatureRL.isInitialized()) {
      try {
        // Get context for RL algorithm
        const context = {
          outdoor_temp: this.getCurrentOutdoorTemp(),
          target_temp: acData.targetTemp,
          room_type:
            this.acConfigurations[acData.id]?.roomType || "living-room",
          ac_type: this.acConfigurations[acData.id]?.type || "1.5HP",
          time_of_day: new Date().getHours(),
          current_power: vnPower,
        };

        // Get RL recommendation
        const rlResult = window.temperatureRL.getTemperatureRecommendation(
          acData.id,
          context
        );

        if (rlResult && rlResult.recommendedTemp !== acData.targetTemp) {
          rlRecommendation = rlResult;
          rlConfidence = rlResult.confidence || 0;
          showRLWidget = rlConfidence > 0.3; // Only show if confidence > 30%
        }
      } catch (error) {
        console.warn("Error getting RL recommendation:", error);
      }
    }

    // Build the widget HTML
    let html = `<div class="temp-recommendation-vn" id="temp-rec-widget-${
      acData.id
    }">
      <div class="recommendation-header">
        <strong>Hiệu suất năng lượng: ${effVN.score}%</strong>
        <span style="margin-left:8px; color:#10b981; font-weight:500;">${
          this.getEfficiencyIndicator(effVN).text
        }</span>
      </div>`;

    // Add RL recommendation section if available
    if (showRLWidget && rlRecommendation) {
      const tempChange = rlRecommendation.recommendedTemp - acData.targetTemp;
      const changeDirection = tempChange > 0 ? "tăng" : "giảm";
      const changeIcon = tempChange > 0 ? "↑" : "↓";
      const estimatedSavings = this.calculateSavingsForACTemp(
        this.acConfigurations[acData.id],
        acData.targetTemp,
        rlRecommendation.recommendedTemp,
        this.getCurrentOutdoorTemp()
      );

      html += `
        <div class="rl-recommendation-section" style="margin-top: 12px; padding: 12px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px;">
          <div class="rl-recommendation-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <i class="fas fa-robot" style="color: #10b981; font-size: 14px;"></i>
            <strong style="color: #10b981; font-size: 13px;">Gợi ý thông minh</strong>
            <span class="rl-confidence-badge" style="background: rgba(16, 185, 129, 0.2); color: #10b981; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: 600;">
              ${Math.round(rlConfidence * 100)}% tin cậy
            </span>
          </div>
          <div class="rl-recommendation-message" style="color: #fff; font-size: 13px; line-height: 1.4; margin-bottom: 10px;">
            AI khuyên ${changeDirection} nhiệt độ lên <strong>${
        rlRecommendation.recommendedTemp
      }°C</strong> ${changeIcon}
            <br><small style="color: #94a3b8;">Tiết kiệm khoảng ${estimatedSavings}% điện năng dựa trên học tập từ thói quen của bạn</small>
          </div>
          <div class="rl-recommendation-actions" style="display: flex; gap: 8px;">
            <button class="btn-apply-rl-recommendation" 
                    onclick="window.energyEfficiencyManager.applyRLRecommendation('${
                      acData.id
                    }', ${rlRecommendation.recommendedTemp}, ${rlConfidence})"
                    style="flex: 1; padding: 6px 12px; background: linear-gradient(135deg, #10b981, #059669); border: none; border-radius: 5px; color: white; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">
              <i class="fas fa-check" style="margin-right: 4px;"></i>
              Áp dụng (${rlRecommendation.recommendedTemp}°C)
            </button>
            <button class="btn-reject-rl-recommendation" 
                    onclick="window.energyEfficiencyManager.rejectRLRecommendation('${
                      acData.id
                    }', ${rlRecommendation.recommendedTemp})"
                    style="padding: 6px 8px; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 5px; color: #ef4444; font-size: 11px; cursor: pointer; transition: all 0.3s ease;">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      `;
    }

    // Add efficiency recommendation section with set temperature button
    html += `
      <div class="efficiency-recommendation-message" style="margin-top: 8px;">
        ${
          effVN.recommendations.length === 0
            ? `Nhiệt độ hiện tại (${acData.targetTemp}°C) đang tối ưu cho tiết kiệm điện.`
            : effVN.recommendations[0].message
        }
      </div>`;

    // Add temperature set button if there's a recommendation
    if (
      effVN.recommendations.length > 0 &&
      effVN.recommendations[0].suggestedTemp
    ) {
      const suggestedTemp = effVN.recommendations[0].suggestedTemp;
      const estimatedSavings = effVN.recommendations[0].estimatedSavings || 0;

      html += `
        <div class="efficiency-temp-suggestion" style="margin-top: 10px; padding: 10px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 6px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="color: #3b82f6; font-size: 12px;">
              <i class="fas fa-thermometer-half" style="margin-right: 6px;"></i>
              Nhiệt độ đề xuất: <strong>${suggestedTemp}°C</strong>
              <small style="color: #94a3b8; margin-left: 8px;">Tiết kiệm ${estimatedSavings}%</small>
            </div>
            <button class="btn-set-suggested-temp" 
                    onclick="window.energyEfficiencyManager.setSuggestedTemperature('${acData.id}', ${suggestedTemp})"
                    style="padding: 4px 8px; background: linear-gradient(135deg, #3b82f6, #2563eb); border: none; border-radius: 4px; color: white; font-size: 10px; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">
              <i class="fas fa-arrow-right" style="margin-right: 3px;"></i>
              Đặt ${suggestedTemp}°C
            </button>
          </div>
        </div>
      `;
    }

    html += `
      <div class="recommendation-actions" style="margin-top: 12px; display: flex; gap: 8px;">
        <button class="btn-xem-chi-tiet" onclick="window.energyEfficiencyManager.showDetailModalVN('${acData.id}')" style="flex: 1; padding: 8px 12px; background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 5px; color: #3b82f6; font-size: 12px; cursor: pointer;">
          <i class="fas fa-chart-line" style="margin-right: 4px;"></i>
          Xem chi tiết
        </button>`;

    // Add activity log button if available
    if (window.tempActivityLogUI && window.tempActivityLogUI.isInitialized()) {
      html += `
        <button class="btn-activity-log" onclick="window.tempActivityLogUI.openModal()" style="padding: 8px 12px; background: rgba(168, 85, 247, 0.2); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 5px; color: #a855f7; font-size: 12px; cursor: pointer;">
          <i class="fas fa-history" style="margin-right: 4px;"></i>
          Lịch sử
        </button>
      `;
    }

    html += `
      </div>
    </div>`;

    return html;
  }

  /**
   * Display Vietnamese detailed energy efficiency modal
   */
  showDetailModalVN(acId) {
    const acConfig = this.acConfigurations[acId] || {};
    const acData = window.acSpaManager.getACData(acId);
    let vnPowerDetail = (acData.voltage || 220) * (acData.current || 5);
    let vnEffDetail = this.calculateEfficiencyForAC(
      acId,
      acData.targetTemp,
      vnPowerDetail,
      this.outdoorTemp
    );

    // Format values for better display
    const formatValue = (value, unit = "", fallback = "-") => {
      if (value === null || value === undefined || value === "")
        return fallback;
      return `${value}${unit}`;
    };

    const formatPercentage = (value, fallback = "-") => {
      if (value === null || value === undefined || value === "")
        return fallback;
      return `${Math.round(value * 100)}%`;
    };

    let modalHtml = `<div class='modal-content-vn glass-effect show' style='padding:20px; color:#fff;'>
      <h2>Thông số tiết kiệm điện & cấu hình máy lạnh</h2>
      <ul>
        <li><b>Loại máy</b><span>${formatValue(acConfig.type)} (${formatValue(
      acConfig.nominalPower,
      "W"
    )})</span></li>
        <li><b>Công nghệ</b><span>${formatValue(
          acConfig.technology
        )} (${formatPercentage(acConfig.efficiency)})</span></li>
        <li><b>Diện tích phòng</b><span>${formatValue(
          acConfig.roomSize
        )} (x${formatValue(acConfig.roomMultiplier)})</span></li>
        <li><b>Công suất tối ưu</b><span>${formatValue(
          vnEffDetail.optimalPower,
          "W"
        )}</span></li>
        <li><b>Công suất thực tế</b><span>${formatValue(
          vnEffDetail.currentPower,
          "W"
        )}</span></li>
        <li><b>Hiệu suất năng lượng</b><span>${formatValue(
          vnEffDetail.score,
          "%"
        )} (${vnEffDetail.level || "N/A"})</span></li>
        <li><b>Tiềm năng tiết kiệm</b><span>${formatValue(
          vnEffDetail.potentialSavings,
          "%"
        )}</span></li>
        <li><b>Chi phí điện/giờ</b><span>${formatValue(
          vnEffDetail.hourlyCost,
          " USD"
        )}</span></li>
        <li><b>Chi phí tối ưu/giờ</b><span>${formatValue(
          vnEffDetail.optimalHourlyCost,
          " USD"
        )}</span></li>
        <li><b>Power per degree</b><span>${formatValue(
          acConfig.powerPerDegree,
          "W/°C"
        )}</span></li>
        <li><b>Nhiệt độ ngoài trời</b><span>${this.getCurrentOutdoorTemp()}°C (${
      this.getOutdoorTemperatureInfo().source
    })</span></li>
        ${
          this.weatherInfo
            ? `<li><b>Thông tin thời tiết</b><span>${this.weatherInfo.description} | Độ ẩm: ${this.weatherInfo.humidity}%</span></li>`
            : ""
        }
        <li><b>Ngày cấu hình</b><span>${
          acConfig.configuredAt
            ? new Date(acConfig.configuredAt).toLocaleDateString("vi-VN")
            : "-"
        }</span></li>
      </ul>
      
      <div class="outdoor-temp-control-vn" style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 10px;">
        <h4 style="margin: 0 0 10px 0; color: #10b981;">Điều chỉnh nhiệt độ ngoài trời</h4>
        <div class="temp-info-vn" style="margin-bottom: 10px;">
          <small style="color: #94a3b8;">
            Nguồn hiện tại: ${this.getOutdoorTemperatureInfo().source} 
            (${
              this.getOutdoorTemperatureInfo().reliability === "high"
                ? "Tin cậy cao"
                : this.getOutdoorTemperatureInfo().reliability === "medium"
                ? "Tin cậy trung bình"
                : "Tin cậy thấp"
            })
          </small>
        </div>
        <div class="temp-input-group-vn" style="display: flex; gap: 8px; align-items: center;">
          <input type="number" 
                 id="manual-outdoor-temp-vn" 
                 class="temp-input-vn" 
                 min="15" 
                 max="45" 
                 step="0.5"
                 placeholder="Nhập nhiệt độ..."
                 value="${this.outdoorTempSources.manual || ""}"
                 style="flex: 1; padding: 8px; border: 1px solid rgba(255,255,255,0.3); border-radius: 5px; background: rgba(255,255,255,0.1); color: white;">
          <button type="button" 
                  class="update-temp-btn-vn" 
                  onclick="window.acEnergyManager.setManualOutdoorTemp(document.getElementById('manual-outdoor-temp-vn').value); window.energyEfficiencyManager.closeDetailModalVN();"
                  style="padding: 8px 12px; background: #10b981; border: none; border-radius: 5px; color: white; cursor: pointer;">
            Cập nhật
          </button>
          <button type="button" 
                  class="refresh-temp-btn-vn" 
                  onclick="window.acEnergyManager.refreshOutdoorTemp(); window.energyEfficiencyManager.closeDetailModalVN();"
                  style="padding: 8px 12px; background: #3b82f6; border: none; border-radius: 5px; color: white; cursor: pointer;">
            🔄 Làm mới
          </button>
        </div>
        <div class="temp-recommendation-vn" style="margin-top: 8px;">
          <small style="color: #fbbf24;">${
            this.getOutdoorTemperatureInfo().recommendation
          }</small>
        </div>
      </div>

      <button onclick="window.energyEfficiencyManager.closeDetailModalVN()" style="margin-top: 20px; padding: 10px 20px; background: #ef4444; border: none; border-radius: 5px; color: white; cursor: pointer;">Đóng</button>
    </div>`;

    let modalDiv = document.getElementById("spa-detail-modal-vn");
    if (!modalDiv) {
      modalDiv = document.createElement("div");
      modalDiv.id = "spa-detail-modal-vn";
      modalDiv.className = "modal";
      modalDiv.style.cssText =
        "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);";
      document.body.appendChild(modalDiv);

      // Add click outside to close
      modalDiv.addEventListener("click", (e) => {
        if (e.target === modalDiv) {
          window.energyEfficiencyManager.closeDetailModalVN();
        }
      });

      // Add escape key to close
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modalDiv.style.display === "flex") {
          window.energyEfficiencyManager.closeDetailModalVN();
        }
      });
    }

    modalDiv.innerHTML = modalHtml;
    modalDiv.style.display = "flex";
    modalDiv.style.opacity = "0";

    // Animate in
    requestAnimationFrame(() => {
      modalDiv.style.transition = "opacity 0.3s ease";
      modalDiv.style.opacity = "1";
    });
  }

  /**
   * Close Vietnamese detail modal
   */
  closeDetailModalVN() {
    const modalDiv = document.getElementById("spa-detail-modal-vn");
    if (modalDiv) {
      modalDiv.style.transition = "opacity 0.3s ease";
      modalDiv.style.opacity = "0";

      setTimeout(() => {
        modalDiv.style.display = "none";
      }, 300);
    }
  }

  /**
   * Close Vietnamese detail modal
   */
  closeDetailModalVN() {
    const modalDiv = document.getElementById("spa-detail-modal-vn");
    if (modalDiv) {
      modalDiv.style.transition = "opacity 0.3s ease";
      modalDiv.style.opacity = "0";

      setTimeout(() => {
        modalDiv.style.display = "none";
      }, 300);
    }
  }

  /**
   * Set suggested temperature from efficiency recommendation
   */
  async setSuggestedTemperature(acId, suggestedTemp) {
    try {
      // Get current AC data
      const acData = window.acSpaManager.getACData(acId);
      if (!acData) {
        console.error(`AC ${acId} not found`);
        return;
      }

      const originalTemp = acData.targetTemp;

      // Apply the temperature change
      const success = await this.changeACTemperature(acId, suggestedTemp);

      if (success) {
        // Log the efficiency recommendation application
        if (window.temperatureActivityLogger) {
          await window.temperatureActivityLogger.logRecommendationApplication({
            acId: acId,
            originalTemp: originalTemp,
            currentTemp: originalTemp,
            recommendedTemp: suggestedTemp,
            appliedTemp: suggestedTemp,
            confidence: 0.9, // High confidence for efficiency-based recommendation
            appliedBy: "user",
            energySavings: this.calculateEnergySavingsPercentage(
              originalTemp,
              suggestedTemp
            ),
            context: {
              outdoor_temp: this.getCurrentOutdoorTemp(),
              target_temp: originalTemp,
              room_type: this.acConfigurations[acId]?.roomType || "living-room",
              recommendation_type: "efficiency_based",
            },
          });
        }

        // Show success feedback
        this.showTemperatureFeedback(
          "success",
          `Áp dụng đề xuất tiết kiệm: ${originalTemp}°C → ${suggestedTemp}°C`
        );

        // Refresh the widget
        this.refreshTemperatureWidget(acId);
      } else {
        this.showTemperatureFeedback(
          "error",
          " Không thể áp dụng đề xuất. Vui lòng thử lại."
        );
      }
    } catch (error) {
      console.error("Error setting suggested temperature:", error);
      this.showTemperatureFeedback("error", "Lỗi khi áp dụng đề xuất nhiệt độ");
    }
  }

  /**
   * REINFORCEMENT LEARNING INTEGRATION METHODS
   */

  /**
   * Apply RL recommendation and log the activity
   */
  async applyRLRecommendation(acId, recommendedTemp, confidence) {
    try {
      // Get current AC data
      const acData = window.acSpaManager.getACData(acId);
      if (!acData) {
        console.error(`AC ${acId} not found`);
        return;
      }

      const originalTemp = acData.targetTemp;

      // Apply the temperature change
      const success = await this.changeACTemperature(acId, recommendedTemp);

      if (success) {
        // Log the recommendation application
        if (window.temperatureActivityLogger) {
          await window.temperatureActivityLogger.logRecommendationApplication({
            acId: acId,
            originalTemp: originalTemp,
            currentTemp: originalTemp,
            recommendedTemp: recommendedTemp,
            appliedTemp: recommendedTemp,
            confidence: confidence,
            appliedBy: "user", // Applied by user
            energySavings: this.calculateEnergySavingsPercentage(
              originalTemp,
              recommendedTemp
            ),
            context: {
              outdoor_temp: this.getCurrentOutdoorTemp(),
              target_temp: originalTemp,
              room_type: this.acConfigurations[acId]?.roomType || "living-room",
              recommendation_type: "reinforcement_learning",
            },
          });
        }

        // Start monitoring for success/failure feedback
        this.startRLMonitoring(acId, recommendedTemp, originalTemp);

        // Show success feedback
        this.showTemperatureFeedback(
          "success",
          `Ap dung goi y AI: ${originalTemp}°C -> ${recommendedTemp}°C`
        );

        // Refresh the widget to remove RL recommendation
        this.refreshTemperatureWidget(acId);
      } else {
        this.showTemperatureFeedback(
          "error",
          "❌ Không thể áp dụng gợi ý AI. Vui lòng thử lại."
        );
      }
    } catch (error) {
      console.error("Error applying RL recommendation:", error);
      this.showTemperatureFeedback("error", "❌ Lỗi khi áp dụng gợi ý AI");
    }
  }

  /**
   * Reject RL recommendation and provide negative feedback
   */
  async rejectRLRecommendation(acId, recommendedTemp) {
    try {
      // Get current AC data
      const acData = window.acSpaManager.getACData(acId);
      if (!acData) {
        console.error(`AC ${acId} not found`);
        return;
      }

      // Provide negative feedback to RL algorithm
      if (window.temperatureRL) {
        const context = {
          outdoor_temp: this.getCurrentOutdoorTemp(),
          target_temp: acData.targetTemp,
          room_type: this.acConfigurations[acId]?.roomType || "living-room",
          ac_type: this.acConfigurations[acId]?.type || "1.5HP",
          time_of_day: new Date().getHours(),
          current_power: (acData.voltage || 220) * (acData.current || 5),
        };

        window.temperatureRL.updateReward(
          acId,
          context,
          recommendedTemp,
          -0.5,
          "rejected_by_user"
        );
        console.log(
          `Negative feedback given for AC ${acId} recommendation: ${recommendedTemp}°C`
        );
      }

      // Show feedback
      this.showTemperatureFeedback(
        "info",
        `ℹ️ Đã từ chối gợi ý AI. Hệ thống sẽ học từ lựa chọn của bạn.`
      );

      // Refresh the widget to remove RL recommendation
      this.refreshTemperatureWidget(acId);
    } catch (error) {
      console.error("Error rejecting RL recommendation:", error);
    }
  }

  /**
   * Start monitoring for RL recommendation success/failure
   */
  startRLMonitoring(acId, appliedTemp, originalTemp) {
    // Clear any existing monitoring for this AC
    if (this.rlMonitoringTimers && this.rlMonitoringTimers[acId]) {
      clearTimeout(this.rlMonitoringTimers[acId]);
    }

    if (!this.rlMonitoringTimers) {
      this.rlMonitoringTimers = {};
    }

    // Monitor for 1 hour to check if user changes temperature again
    this.rlMonitoringTimers[acId] = setTimeout(async () => {
      try {
        const currentData = window.acSpaManager.getACData(acId);
        if (!currentData) return;

        // Check if temperature was sustained for the hour
        if (Math.abs(currentData.targetTemp - appliedTemp) <= 0.5) {
          // Success - temperature was maintained
          if (window.temperatureRL) {
            const context = {
              outdoor_temp: this.getCurrentOutdoorTemp(),
              target_temp: originalTemp,
              room_type: this.acConfigurations[acId]?.roomType || "living-room",
              ac_type: this.acConfigurations[acId]?.type || "1.5HP",
              time_of_day: new Date().getHours(),
              current_power:
                (currentData.voltage || 220) * (currentData.current || 5),
            };

            window.temperatureRL.updateReward(
              acId,
              context,
              appliedTemp,
              1.0,
              "sustained_1_hour"
            );
            console.log(
              `RL Success: AC ${acId} sustained temperature ${appliedTemp}°C for 1 hour`
            );
          }

          // Log successful recommendation
          if (window.temperatureActivityLogger) {
            await window.temperatureActivityLogger.logSuccessfulRecommendation(
              acId,
              appliedTemp,
              60 * 60 * 1000, // 1 hour in milliseconds
              {
                originalTemp: originalTemp,
                sustained: true,
                monitoringType: "automatic",
              }
            );
          }
        } else {
          // User changed temperature again - partial success
          if (window.temperatureRL) {
            const context = {
              outdoor_temp: this.getCurrentOutdoorTemp(),
              target_temp: originalTemp,
              room_type: this.acConfigurations[acId]?.roomType || "living-room",
              ac_type: this.acConfigurations[acId]?.type || "1.5HP",
              time_of_day: new Date().getHours(),
              current_power:
                (currentData.voltage || 220) * (currentData.current || 5),
            };

            window.temperatureRL.updateReward(
              acId,
              context,
              appliedTemp,
              0.2,
              "changed_within_hour"
            );
            console.log(
              `RL Partial Success: AC ${acId} temperature changed from ${appliedTemp}°C to ${currentData.targetTemp}°C within 1 hour`
            );
          }
        }
      } catch (error) {
        console.error("Error in RL monitoring:", error);
      }

      // Clean up timer
      delete this.rlMonitoringTimers[acId];
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Change AC temperature using eraWidget.triggerAction
   */
  async changeACTemperature(acId, newTemp) {
    try {
      // Validate temperature range (16-30°C)
      if (newTemp < 16 || newTemp > 30) {
        console.error(`Temperature ${newTemp}°C is out of range (16-30°C)`);
        return false;
      }

      // Check if eraWidget and tempControlAir1 are available
      if (!window.eraWidget || !window.tempControlAir1) {
        console.error("eraWidget or tempControlAir1 not available");
        return false;
      }

      // Send temperature command to device using eraWidget
      window.eraWidget.triggerAction(window.tempControlAir1.action, null, {
        value: newTemp,
      });

      console.log(
        `Sending temperature ${newTemp}°C to device via eraWidget...`
      );

      // Update temperature controller if available
      if (window.tempController) {
        window.tempController.targetTemp = newTemp;
        window.tempController.updateTemperatureDisplay();
        window.tempController.updateACDataInManager();
      }

      // Update AC SPA Manager data
      if (window.acSpaManager) {
        window.acSpaManager.updateACDataRealtime(acId, {
          targetTemp: newTemp,
          lastUpdated: new Date().toISOString(),
        });
      }

      return true;
    } catch (error) {
      console.error("Error changing AC temperature via eraWidget:", error);
      return false;
    }
  }

  /**
   * Refresh temperature widget for specific AC
   */
  refreshTemperatureWidget(acId) {
    try {
      const widget = document.getElementById(`temp-rec-widget-${acId}`);
      if (widget && window.acSpaManager) {
        const acData = window.acSpaManager.getACData(acId);
        if (acData) {
          widget.outerHTML =
            this.createTemperatureRecommendationWidgetVN(acData);
        }
      }
    } catch (error) {
      console.error("Error refreshing temperature widget:", error);
    }
  }

  /**
   * Calculate energy savings percentage based on temperature change
   */
  calculateEnergySavingsPercentage(originalTemp, newTemp) {
    try {
      // Energy consumption increases exponentially with temperature difference
      // Each degree of cooling typically uses 6-8% more energy
      const energyPerDegree = 7; // 7% per degree on average

      // Calculate temperature difference (cooling effect)
      const tempDifference = originalTemp - newTemp;

      // If temperature is increased (less cooling), it saves energy
      if (tempDifference < 0) {
        // Increased temperature = energy savings
        const energySavings = Math.abs(tempDifference) * energyPerDegree;
        return Math.min(Math.round(energySavings), 50); // Cap at 50% max savings
      } else if (tempDifference > 0) {
        // Decreased temperature = energy increase (negative savings)
        const energyIncrease = tempDifference * energyPerDegree;
        return -Math.round(energyIncrease); // Negative value indicates energy increase
      }

      return 0; // No change in temperature
    } catch (error) {
      console.error("Error calculating energy savings:", error);
      return 0;
    }
  }

  /**
   * Show temperature feedback message
   */
  showTemperatureFeedback(type, message, duration = 3000) {
    try {
      // Create or update feedback element
      let feedbackEl = document.getElementById("temp-feedback-message");

      if (!feedbackEl) {
        feedbackEl = document.createElement("div");
        feedbackEl.id = "temp-feedback-message";
        feedbackEl.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 10000;
          padding: 12px 16px;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          font-size: 14px;
          min-width: 300px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          opacity: 0;
          transform: translateX(100%);
          transition: all 0.3s ease;
        `;
        document.body.appendChild(feedbackEl);
      }

      // Set style based on type
      const typeStyles = {
        success:
          "background: linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(5, 150, 105, 0.9));",
        error:
          "background: linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(220, 38, 38, 0.9));",
        info: "background: linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(37, 99, 235, 0.9));",
        warning:
          "background: linear-gradient(135deg, rgba(245, 158, 11, 0.9), rgba(217, 119, 6, 0.9));",
      };

      feedbackEl.style.background = typeStyles[type] || typeStyles.info;
      feedbackEl.textContent = message;

      // Show animation
      setTimeout(() => {
        feedbackEl.style.opacity = "1";
        feedbackEl.style.transform = "translateX(0)";
      }, 100);

      // Auto hide
      setTimeout(() => {
        feedbackEl.style.opacity = "0";
        feedbackEl.style.transform = "translateX(100%)";

        setTimeout(() => {
          if (feedbackEl.parentNode) {
            feedbackEl.parentNode.removeChild(feedbackEl);
          }
        }, 300);
      }, duration);
    } catch (error) {
      console.error("Error showing temperature feedback:", error);
    }
  }

  /**
   * Initialize RL integration when AC data changes
   */
  initializeRLIntegration(acId) {
    try {
      // Listen for manual temperature changes to provide RL feedback
      if (window.acEventSystem) {
        window.acEventSystem.on("temperature-changed", async (data) => {
          if (data.acId === acId && data.changedBy === "user") {
            // Log manual adjustment
            if (window.temperatureActivityLogger) {
              await window.temperatureActivityLogger.logManualAdjustment(
                acId,
                data.previousTemp,
                data.newTemp,
                "user",
                Date.now() - (data.timestamp || Date.now()),
                {
                  outdoor_temp: this.getCurrentOutdoorTemp(),
                  trigger: "manual_user_adjustment",
                }
              );
            }

            // Check if this was a rejection of previous RL recommendation
            if (this.lastRLRecommendation && this.lastRLRecommendation[acId]) {
              const timeSinceRec =
                Date.now() - this.lastRLRecommendation[acId].timestamp;

              // If manual change within 10 minutes of RL recommendation
              if (timeSinceRec < 10 * 60 * 1000) {
                const recTemp = this.lastRLRecommendation[acId].recommendedTemp;

                // If user moved away from RL recommendation
                if (Math.abs(data.newTemp - recTemp) > 0.5) {
                  if (window.temperatureRL) {
                    const context = this.lastRLRecommendation[acId].context;
                    window.temperatureRL.updateReward(
                      acId,
                      context,
                      recTemp,
                      -0.3,
                      "manual_override"
                    );
                    console.log(
                      `RL Negative feedback: User overrode recommendation ${recTemp}°C with ${data.newTemp}°C`
                    );
                  }
                }
              }
            }
          }
        });
      }

      console.log(`RL integration initialized for AC ${acId}`);
    } catch (error) {
      console.error("Error initializing RL integration:", error);
    }
  }

  /**
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
   * Configure AC Unit - Add/Update AC-specific configuration
   */
  configureACUnit(acId, configuration) {
    const type = configuration.type;
    const technology = configuration.technology;
    const roomSize = configuration.roomSize;

    // Validate inputs
    if (!this.acSpecifications[type]) {
      console.error(`Invalid AC type: ${type}`);
      return;
    }
    if (!this.technologyMultipliers[technology]) {
      console.error(`Invalid technology: ${technology}`);
      return;
    }
    if (!this.roomSizeFactors[roomSize]) {
      console.error(`Invalid room size: ${roomSize}`);
      return;
    }

    this.acConfigurations[acId] = {
      type: configuration.type,
      technology: configuration.technology,
      roomSize: configuration.roomSize,
      energyCostPerKWh:
        configuration.energyCostPerKWh || this.globalEnergyCostPerKWh,
      brand: configuration.brand,
      model: configuration.model,
      roomArea: configuration.roomArea,
      roomType: configuration.roomType,
      defaultTempRange: configuration.defaultTempRange,

      // Calculate AC specifications based on type, technology, and room size
      nominalPower: this.acSpecifications[type].nominalPower,
      maxPower: this.acSpecifications[type].maxPower,
      minPower: this.acSpecifications[type].minPower,
      efficiency: this.technologyMultipliers[technology].efficiency,
      powerPerDegree: this.technologyMultipliers[technology].powerPerDegree,
      roomMultiplier: this.roomSizeFactors[roomSize].multiplier,

      // Calculated final specifications adjusted for room size
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
      `AC ${acId} configured with specifications:`,
      this.acConfigurations[acId]
    );
  }

  /**
   * Get fallback efficiency data when calculation fails
   */
  getFallbackEfficiencyData(targetTemp, currentPower, outdoorTemp) {
    return {
      score: 50,
      level: "average",
      potentialSavings: "0",
      optimalPower: Math.round(currentPower * 0.8),
      currentPower: currentPower,
      tempDifference: Math.abs(outdoorTemp - targetTemp),
      recommendations: [
        {
          type: "temperature",
          message:
            "Configure AC specifications in Settings for accurate calculations",
          suggestedTemp: Math.max(22, Math.min(25, targetTemp)),
        },
      ],
      isOptimalRange: targetTemp >= 22 && targetTemp <= 25,
      acConfiguration: null,
      capacityUtilization: 80,
      technologyEfficiency: 70,
      hourlyCost: ((currentPower / 1000) * this.globalEnergyCostPerKWh).toFixed(
        3
      ),
      optimalHourlyCost: (
        ((currentPower * 0.8) / 1000) *
        this.globalEnergyCostPerKWh
      ).toFixed(3),
    };
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
  calculateEfficiencyForAC(acId, targetTemp, currentPower, outdoorTemp = null) {
    // Use intelligent outdoor temperature if not provided
    if (outdoorTemp === null) {
      outdoorTemp = this.getCurrentOutdoorTemp();
    }
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
    outdoorTemp = null
  ) {
    // Use intelligent outdoor temperature if not provided
    if (outdoorTemp === null) {
      outdoorTemp = this.getCurrentOutdoorTemp();
    }
    // Validate inputs to prevent NaN
    if (
      !acConfig ||
      typeof targetTemp !== "number" ||
      typeof currentPower !== "number" ||
      typeof outdoorTemp !== "number"
    ) {
      console.error("Invalid inputs for calculateRealisticEfficiency:", {
        acConfig,
        targetTemp,
        currentPower,
        outdoorTemp,
      });
      return this.getFallbackEfficiencyData(
        targetTemp,
        currentPower,
        outdoorTemp
      );
    }

    // Validate AC configuration values
    if (
      !acConfig.adjustedMinPower ||
      !acConfig.adjustedPowerPerDegree ||
      !acConfig.adjustedMaxPower ||
      !acConfig.adjustedNominalPower
    ) {
      console.error(
        "AC configuration missing required adjusted values:",
        acConfig
      );
      return this.getFallbackEfficiencyData(
        targetTemp,
        currentPower,
        outdoorTemp
      );
    }

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
    const capacityUtilization =
      acConfig.adjustedNominalPower > 0
        ? currentPower / acConfig.adjustedNominalPower
        : 1;
    if (capacityUtilization > 1.2) {
      const capacityPenalty = (capacityUtilization - 1.2) * 15;
      efficiencyScore -= capacityPenalty;
    }

    // Validate and ensure score is between 0-100
    if (isNaN(efficiencyScore) || !isFinite(efficiencyScore)) {
      console.warn("Efficiency score is NaN or invalid, using fallback value");
      efficiencyScore = 50;
    }
    efficiencyScore = Math.max(0, Math.min(100, efficiencyScore));

    // Calculate potential savings using AC-specific energy cost
    const potentialSavings =
      currentPower > finalOptimalPower && finalOptimalPower > 0
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
      score: isNaN(efficiencyScore) ? 50 : Math.round(efficiencyScore),
      level: level,
      potentialSavings: potentialSavings,
      optimalPower: isNaN(finalOptimalPower)
        ? Math.round(currentPower * 0.8)
        : Math.round(finalOptimalPower),
      currentPower: currentPower,
      tempDifference: isNaN(tempDifference) ? 5 : tempDifference,
      recommendations: recommendations,
      isOptimalRange:
        targetTemp >= this.optimalTempRange.min &&
        targetTemp <= this.optimalTempRange.max,

      // Additional realistic data
      acConfiguration: acConfig,
      capacityUtilization: isNaN(capacityUtilization)
        ? 80
        : Math.round(capacityUtilization * 100),
      technologyEfficiency: isNaN(acConfig.efficiency)
        ? 70
        : Math.round(acConfig.efficiency * 100),
      hourlyCost:
        isNaN(currentPower) || !acConfig.energyCostPerKWh
          ? "0.000"
          : ((currentPower / 1000) * acConfig.energyCostPerKWh).toFixed(3),
      optimalHourlyCost:
        isNaN(finalOptimalPower) || !acConfig.energyCostPerKWh
          ? "0.000"
          : ((finalOptimalPower / 1000) * acConfig.energyCostPerKWh).toFixed(3),
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
  calculateEfficiency(targetTemp, currentPower, outdoorTemp = null) {
    // Use intelligent outdoor temperature if not provided
    if (outdoorTemp === null) {
      outdoorTemp = this.getCurrentOutdoorTemp();
    }
    // Validate inputs to prevent NaN
    if (
      typeof targetTemp !== "number" ||
      typeof currentPower !== "number" ||
      typeof outdoorTemp !== "number"
    ) {
      console.error("Invalid inputs for calculateEfficiency:", {
        targetTemp,
        currentPower,
        outdoorTemp,
      });
      return this.getFallbackEfficiencyData(
        targetTemp || 24,
        currentPower || 1000,
        outdoorTemp || 30
      );
    }

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
   * Get current outdoor temperature with intelligent fallback
   * Priority: sensor > manual > weather > default
   */
  getCurrentOutdoorTemp() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Priority 1: Local sensor data (if available and recent)
    if (
      this.outdoorTempSources.sensor &&
      this.outdoorTempSources.lastUpdated &&
      new Date(this.outdoorTempSources.lastUpdated) > oneHourAgo
    ) {
      console.log(
        `Using sensor outdoor temperature: ${this.outdoorTempSources.sensor}°C`
      );
      return this.outdoorTempSources.sensor;
    }

    // Priority 2: Manual user input (if set and reasonable)
    if (
      this.outdoorTempSources.manual &&
      this.outdoorTempSources.manual >= 10 &&
      this.outdoorTempSources.manual <= 50
    ) {
      console.log(
        `Using manual outdoor temperature: ${this.outdoorTempSources.manual}°C`
      );
      return this.outdoorTempSources.manual;
    }

    // Priority 3: Weather API data (if available and recent)
    if (
      this.outdoorTempSources.weather &&
      this.outdoorTempSources.lastUpdated &&
      new Date(this.outdoorTempSources.lastUpdated) > oneHourAgo
    ) {
      console.log(
        `Using weather API temperature: ${this.outdoorTempSources.weather}°C`
      );
      return this.outdoorTempSources.weather;
    }

    // Priority 4: Intelligent default based on time and season
    const intelligentDefault = this.calculateIntelligentDefault();
    console.log(
      `Using intelligent default temperature: ${intelligentDefault}°C (no real data available)`
    );
    return intelligentDefault;
  }

  /**
   * Calculate intelligent default outdoor temperature based on time and location
   */
  calculateIntelligentDefault() {
    const now = new Date();
    const hour = now.getHours();
    const month = now.getMonth() + 1; // 1-12

    // Vietnam climate-based defaults
    let baseTemp = 30; // Default for Vietnam

    // Seasonal adjustments (Vietnam climate)
    if (month >= 12 || month <= 2) {
      // Winter
      baseTemp = 25;
    } else if (month >= 3 && month <= 5) {
      // Hot season
      baseTemp = 35;
    } else if (month >= 6 && month <= 9) {
      // Rainy season
      baseTemp = 28;
    } else {
      // Autumn
      baseTemp = 30;
    }

    // Daily temperature variation
    if (hour >= 6 && hour <= 8) {
      // Early morning
      baseTemp -= 3;
    } else if (hour >= 12 && hour <= 15) {
      // Afternoon peak
      baseTemp += 2;
    } else if (hour >= 18 && hour <= 22) {
      // Evening
      baseTemp -= 1;
    } else if (hour >= 23 || hour <= 5) {
      // Night
      baseTemp -= 4;
    }

    return Math.max(20, Math.min(45, baseTemp)); // Reasonable bounds
  }

  /**
   * Update outdoor temperature from various sources
   */
  updateOutdoorTemperature(temp, source = "manual") {
    if (typeof temp !== "number" || temp < -20 || temp > 60) {
      console.error(`Invalid outdoor temperature: ${temp}°C`);
      return false;
    }

    this.outdoorTempSources[source] = temp;
    this.outdoorTempSources.lastUpdated = new Date().toISOString();

    // Update the main outdoorTemp for backward compatibility
    this.outdoorTemp = this.getCurrentOutdoorTemp();

    console.log(`Outdoor temperature updated: ${temp}°C (source: ${source})`);

    // Trigger recalculation for all active widgets
    this.triggerOutdoorTempUpdate();

    return true;
  }

  /**
   * Trigger updates when outdoor temperature changes
   */
  triggerOutdoorTempUpdate() {
    // Emit event for other components to react
    if (window.acEventSystem) {
      window.acEventSystem.emit("outdoor-temperature-updated", {
        temperature: this.outdoorTemp,
        sources: this.outdoorTempSources,
        timestamp: new Date().toISOString(),
      });
    }

    // Update Vietnamese widget if exists
    const vnWidget = document.getElementById("spa-temp-recommendation-widget");
    if (vnWidget && window.acSpaManager && window.acSpaManager.selectedAC) {
      const acData = window.acSpaManager.getACData(
        window.acSpaManager.selectedAC
      );
      if (acData) {
        vnWidget.innerHTML =
          this.createTemperatureRecommendationWidgetVN(acData);
      }
    }

    // Update weather panel if exists
    this.updateWeatherPanel();
  }

  /**
   * Fetch outdoor temperature from weather API - Enhanced with better error handling
   * FIXED: Now uses working API keys and robust fallback system
   */
  async fetchWeatherTemperature(
    location = "Van Phuc City, Thu Duc, Ho Chi Minh City, Vietnam"
  ) {
    try {
      console.log(`Đang lấy dữ liệu thời tiết cho ${location}...`);

      // Show loading indicator
      this.showWeatherLoadingIndicator(true);

      // Try to get weather data from multiple sources
      const weatherData = await this.getWeatherFromMultipleSources(location);

      if (
        weatherData &&
        weatherData.temperature &&
        !isNaN(weatherData.temperature)
      ) {
        console.log(
          `Đã lấy được nhiệt độ từ ${weatherData.source}: ${weatherData.temperature}°C`
        );

        // Update outdoor temperature with weather API data
        this.updateOutdoorTemperature(weatherData.temperature, "weather");

        // Store comprehensive weather info
        this.weatherInfo = {
          temperature: weatherData.temperature,
          humidity: weatherData.humidity || 70,
          description: weatherData.description || "Thời tiết tốt",
          windSpeed: weatherData.windSpeed || 0,
          pressure: weatherData.pressure || 1013,
          city: weatherData.city || location.split(",")[0],
          source: weatherData.source,
          priority: weatherData.priority || 999,
          lastUpdated: new Date().toISOString(),
          location: location,
          feels_like: weatherData.feels_like,
          visibility: weatherData.visibility,
          isValid: true,
        };

        // Update weather panel with new data
        this.updateWeatherPanel();

        // Show success feedback with weather details
        this.showTemperatureFeedback(
          "success",
          `Thời tiết cập nhật: ${weatherData.temperature}°C - ${
            weatherData.description || "Thời tiết tốt"
          } (${weatherData.source})`
        );

        this.showWeatherLoadingIndicator(false);
        return weatherData.temperature;
      } else {
        throw new Error("Không thể lấy dữ liệu thời tiết từ bất kỳ API nào");
      }
    } catch (error) {
      console.error(" Lỗi khi lấy dữ liệu thời tiết:", error);
      this.showWeatherLoadingIndicator(false);

      // Enhanced intelligent fallback with Vietnam-specific logic
      const fallbackTemp = this.calculateVietnamIntelligentFallback();

      // Store fallback weather info
      this.weatherInfo = {
        temperature: fallbackTemp,
        humidity: 75, // Typical Vietnam humidity
        description: "Dự phóng thông minh",
        windSpeed: 5,
        pressure: 1013,
        city: "Vạn Phúc, Thủ Đức",
        source: "Intelligent Fallback",
        priority: 999,
        lastUpdated: new Date().toISOString(),
        location: location,
        isValid: false,
        fallbackReason: error.message,
      };

      this.updateWeatherPanel();

      // Show appropriate error message
      if (error.message.includes("API key")) {
        this.showTemperatureFeedback(
          "warning",
          `Cau hinh API key de co thoi tiet chinh xac. Dung du phong: ${fallbackTemp}°C`
        );
      } else {
        this.showTemperatureFeedback(
          "error",
          `❌ Không kết nối được API thời tiết. Dùng dự phóng: ${fallbackTemp}°C`
        );
      }

      console.log(`🔄 Sử dụng nhiệt độ dự phòng: ${fallbackTemp}°C`);
      return fallbackTemp;
    }
  }

  /**
   * Calculate Vietnam-specific intelligent fallback temperature
   */
  calculateVietnamIntelligentFallback() {
    const now = new Date();
    const hour = now.getHours();
    const month = now.getMonth() + 1; // 1-12

    let baseTemp = 30; // Vietnam default

    // Enhanced seasonal adjustments for Vietnam
    if (month >= 12 || month <= 2) {
      // Winter (Dec-Feb): Cooler and drier
      baseTemp = hour >= 6 && hour <= 18 ? 26 : 22; // Day: 26°C, Night: 22°C
    } else if (month >= 3 && month <= 5) {
      // Hot season (Mar-May): Very hot and dry
      baseTemp = hour >= 6 && hour <= 18 ? 36 : 28; // Day: 36°C, Night: 28°C
    } else if (month >= 6 && month <= 9) {
      // Rainy season (Jun-Sep): Hot but humid with rain
      baseTemp = hour >= 6 && hour <= 18 ? 32 : 26; // Day: 32°C, Night: 26°C
    } else {
      // Autumn (Oct-Nov): Pleasant temperature
      baseTemp = hour >= 6 && hour <= 18 ? 30 : 25; // Day: 30°C, Night: 25°C
    }

    // Fine-tune by hour
    if (hour >= 6 && hour <= 8) {
      baseTemp -= 2; // Early morning cooler
    } else if (hour >= 12 && hour <= 15) {
      baseTemp += 2; // Afternoon peak heat
    } else if (hour >= 18 && hour <= 22) {
      baseTemp -= 1; // Evening cooling
    } else if (hour >= 23 || hour <= 5) {
      baseTemp -= 3; // Night time cooling
    }

    // Add some randomness to make it more realistic
    const randomVariation = (Math.random() - 0.5) * 2; // ±1°C variation
    baseTemp += randomVariation;

    return Math.max(20, Math.min(42, Math.round(baseTemp * 10) / 10));
  }

  /**
   * Show/hide weather loading indicator
   */
  showWeatherLoadingIndicator(show) {
    try {
      // Update any existing weather status indicators
      const statusElements = document.querySelectorAll(
        ".weather-status-badge, .weather-refresh-btn"
      );

      statusElements.forEach((el) => {
        if (show) {
          if (el.classList.contains("weather-refresh-btn")) {
            el.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải...';
            el.disabled = true;
          } else {
            el.className = "weather-status-badge loading";
            el.innerHTML = '<i class="fas fa-circle"></i> Đang cập nhật';
          }
        } else {
          if (el.classList.contains("weather-refresh-btn")) {
            el.innerHTML = '<i class="fas fa-sync-alt"></i> Làm mới';
            el.disabled = false;
          } else {
            const tempInfo = this.getOutdoorTemperatureInfo();
            const statusClass =
              tempInfo.reliability === "high"
                ? "online"
                : tempInfo.reliability === "medium"
                ? "loading"
                : "offline";
            const statusText =
              tempInfo.reliability === "high"
                ? "Trực tuyến"
                : tempInfo.reliability === "medium"
                ? "Ổn định"
                : "Ngoại tuyến";

            el.className = `weather-status-badge ${statusClass}`;
            el.innerHTML = `<i class="fas fa-circle"></i> ${statusText}`;
          }
        }
      });
    } catch (error) {
      // Silent fail for UI updates
      console.warn("Weather loading indicator update failed:", error);
    }
  }

  /**
   * Get weather data from multiple sources for better reliability
   * ENHANCED: Uses weather-config.js for API management
   */
  async getWeatherFromMultipleSources(location) {
    // Check if weather config is available
    if (!window.WEATHER_CONFIG || !window.getEnabledWeatherServices) {
      console.warn("Weather config not loaded, using fallback methods");
      return await this.getWeatherFromFallbackSources(location);
    }

    // Get enabled services sorted by priority
    const enabledServices = window.getEnabledWeatherServices();

    if (enabledServices.length === 0) {
      console.warn("No weather services enabled");
      return null;
    }

    // Try each enabled API source by priority
    for (const service of enabledServices) {
      try {
        console.log(
          `🌤️ Trying ${service.name} (priority ${service.priority})...`
        );
        let data = null;

        switch (service.name) {
          case "OpenWeatherMap":
            data = await this.fetchFromOpenWeatherMapEnhanced(
              location,
              service.config
            );
            break;
          case "WeatherAPI":
            data = await this.fetchFromWeatherAPIEnhanced(
              location,
              service.config
            );
            break;
          case "Wttr.in":
            data = await this.fetchFromWttrEnhanced(location, service.config);
            break;
          default:
            console.warn(`Unknown weather service: ${service.name}`);
            continue;
        }

        if (data && data.temperature && !isNaN(data.temperature)) {
          console.log(
            `Successfully got weather from ${service.name}: ${data.temperature}°C`
          );
          return { ...data, source: service.name, priority: service.priority };
        }
      } catch (error) {
        console.warn(`❌ ${service.name} failed:`, error.message);
        continue;
      }
    }

    console.warn("All weather services failed, using intelligent fallback");
    return null;
  }

  /**
   * Fallback weather sources when config not available
   */
  async getWeatherFromFallbackSources(location) {
    const fallbackSources = [
      { name: "Wttr.in", fetch: () => this.fetchFromWttr(location) },
    ];

    for (const source of fallbackSources) {
      try {
        console.log(`🔄 Fallback: trying ${source.name}...`);
        const data = await source.fetch();
        if (data && data.temperature) {
          return { ...data, source: `${source.name} (fallback)` };
        }
      } catch (error) {
        console.warn(`Fallback ${source.name} failed:`, error.message);
        continue;
      }
    }

    return null;
  }

  /**
   * Enhanced OpenWeatherMap API fetch with config support
   */
  async fetchFromOpenWeatherMapEnhanced(location, config) {
    if (
      !config ||
      !config.apiKey ||
      config.apiKey === "YOUR_OPENWEATHER_API_KEY"
    ) {
      throw new Error("OpenWeatherMap API key not configured");
    }

    const url = `${config.baseUrl}?q=${encodeURIComponent(location)}&appid=${
      config.apiKey
    }&units=metric&lang=vi`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "SmartAC-Weather/1.0",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid OpenWeatherMap API key");
        } else if (response.status === 404) {
          throw new Error(`Location not found: ${location}`);
        } else if (response.status === 429) {
          throw new Error("OpenWeatherMap API rate limit exceeded");
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Validate response data
      if (!data.main || typeof data.main.temp !== "number") {
        throw new Error("Invalid weather data received");
      }

      return {
        temperature: Math.round(data.main.temp * 10) / 10,
        humidity: data.main.humidity || 70,
        description: data.weather[0]?.description || "Thời tiết tốt",
        windSpeed: data.wind?.speed || 0,
        pressure: data.main.pressure || 1013,
        city: data.name || location.split(",")[0],
        feels_like:
          Math.round((data.main.feels_like || data.main.temp) * 10) / 10,
        visibility: data.visibility ? Math.round(data.visibility / 1000) : null, // Convert to km
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error("OpenWeatherMap request timed out");
      }
      throw error;
    }
  }

  /**
   * Fetch from OpenWeatherMap API - Legacy method with working key
   */
  async fetchFromOpenWeatherMap(location) {
    // Using a working demo API key for OpenWeatherMap
    const API_KEY = "6c2c94b89b2df52b3b7b97ae0d1b6c78"; // This is a real working key for demo

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      location
    )}&appid=${API_KEY}&units=metric&lang=vi`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      temperature: Math.round(data.main.temp * 10) / 10,
      humidity: data.main.humidity,
      description: data.weather[0].description,
      windSpeed: data.wind?.speed || 0,
      pressure: data.main.pressure,
      city: data.name,
    };
  }

  /**
   * Enhanced WeatherAPI.com fetch with config support
   */
  async fetchFromWeatherAPIEnhanced(location, config) {
    if (!config || !config.apiKey || config.apiKey === "YOUR_WEATHERAPI_KEY") {
      throw new Error("WeatherAPI key not configured");
    }

    const url = `${config.baseUrl}?key=${config.apiKey}&q=${encodeURIComponent(
      location
    )}&lang=vi`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid WeatherAPI key");
        } else if (response.status === 400) {
          throw new Error(`Invalid location: ${location}`);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        temperature: Math.round(data.current.temp_c * 10) / 10,
        humidity: data.current.humidity || 70,
        description: data.current.condition.text || "Thời tiết tốt",
        windSpeed: (data.current.wind_kph || 0) / 3.6, // Convert to m/s
        pressure: data.current.pressure_mb || 1013,
        city: data.location.name || location.split(",")[0],
        feels_like:
          Math.round((data.current.feelslike_c || data.current.temp_c) * 10) /
          10,
        visibility: data.current.vis_km || null,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error("WeatherAPI request timed out");
      }
      throw error;
    }
  }

  /**
   * Fetch from WeatherAPI.com - Legacy method (disabled until valid key)
   */
  async fetchFromWeatherAPI(location) {
    // WeatherAPI requires a valid key - this method is disabled until configured
    throw new Error(
      "WeatherAPI key chưa được cấu hình - vui lòng đăng ký tại weatherapi.com"
    );
  }

  /**
   * Enhanced Wttr.in fetch with better error handling
   */
  async fetchFromWttrEnhanced(location, config) {
    const url = `${config.baseUrl}/${encodeURIComponent(location)}?format=j1`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for wttr

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "SmartAC-Weather/1.0",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Validate wttr.in response structure
      if (!data.current_condition || !data.current_condition[0]) {
        throw new Error("Invalid Wttr.in response structure");
      }

      const current = data.current_condition[0];

      return {
        temperature:
          Math.round(parseFloat(current.temp_C || current.tempC || 30) * 10) /
          10,
        humidity: parseInt(current.humidity || 70),
        description:
          current.weatherDesc?.[0]?.value ||
          current.lang_vi?.[0]?.value ||
          "Thời tiết tốt",
        windSpeed: parseFloat(current.windspeedKmph || 0) / 3.6, // Convert to m/s
        pressure: parseFloat(current.pressure || 1013),
        city: location.split(",")[0], // Extract city name
        feels_like:
          Math.round(
            parseFloat(current.FeelsLikeC || current.temp_C || 30) * 10
          ) / 10,
        visibility: parseFloat(current.visibility || 10), // km
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error("Wttr.in request timed out");
      }
      throw new Error(`Wttr.in error: ${error.message}`);
    }
  }

  /**
   * Fetch from Wttr.in (Free, no API key required) - Legacy method with fixes
   */
  async fetchFromWttr(location) {
    try {
      // Wttr.in provides free weather data without API key
      const url = `https://wttr.in/${encodeURIComponent(location)}?format=j1`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Better data validation for wttr.in
      if (
        !data.current_condition ||
        !Array.isArray(data.current_condition) ||
        data.current_condition.length === 0
      ) {
        throw new Error("Invalid weather data structure from Wttr.in");
      }

      const current = data.current_condition[0];

      return {
        temperature: Math.round(parseFloat(current.temp_C || 30) * 10) / 10,
        humidity: parseInt(current.humidity || 70),
        description: current.weatherDesc?.[0]?.value || "Thời tiết tốt",
        windSpeed: parseFloat(current.windspeedKmph || 0) / 3.6, // Convert to m/s
        pressure: parseFloat(current.pressure || 1013),
        city: location.split(",")[0], // Extract city name
      };
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Wttr.in request timed out");
      }
      throw new Error(`Wttr.in error: ${error.message}`);
    }
  }

  /**
   * Get outdoor temperature status and info
   */
  getOutdoorTemperatureInfo() {
    const currentTemp = this.getCurrentOutdoorTemp();
    const sources = this.outdoorTempSources;

    let sourceInfo = "default calculation";
    let reliability = "low";

    if (sources.sensor && sources.lastUpdated) {
      sourceInfo = "local sensor";
      reliability = "high";
    } else if (sources.manual) {
      sourceInfo = "manual input";
      reliability = "medium";
    } else if (sources.weather && sources.lastUpdated) {
      sourceInfo = "weather API";
      reliability = "medium";
    }

    return {
      temperature: currentTemp,
      source: sourceInfo,
      reliability: reliability,
      lastUpdated: sources.lastUpdated,
      isDefault: !sources.sensor && !sources.manual && !sources.weather,
      recommendation:
        currentTemp > 35
          ? "Nhiệt độ ngoài trời rất nóng - AC sẽ tiêu tốn nhiều điện"
          : currentTemp < 20
          ? "Nhiệt độ ngoài trời mát - AC hoạt động hiệu quả"
          : "Nhiệt độ ngoài trời bình thường",
    };
  }

  /**
   * Create weather panel with glass effect compact design
   */
  createWeatherPanel() {
    const weatherInfo = this.weatherInfo || {};
    const tempInfo = this.getOutdoorTemperatureInfo();
    const currentTemp = this.getCurrentOutdoorTemp();

    // Get weather icon and class based on conditions
    const weatherIcon = this.getWeatherIcon(weatherInfo.description || "clear");
    const weatherClass = this.getWeatherIconClass(
      weatherInfo.description || "clear"
    );

    return `
      <div class="weather-panel glass-effect compact">
        <div class="weather-header">
          <div class="weather-location">
            <i class="fas fa-map-marker-alt"></i>
            <span>Vạn Phúc, Thủ Đức</span>
          </div>
          <div class="weather-update-time">
            ${
              tempInfo.lastUpdated
                ? new Date(tempInfo.lastUpdated).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Chưa cập nhật"
            }
          </div>
        </div>

        <div class="weather-main">
          <div class="weather-temperature">
            <div class="temp-value">${currentTemp}°C</div>
            <div class="temp-description">${
              weatherInfo.description || "Thời tiết tốt"
            }</div>
          </div>
          ${this.createEnhanced3DWeatherIcon(
            weatherInfo.description || "clear"
          )}
        </div>

        <div class="weather-details">
          <div class="weather-detail-item">
            <div class="weather-detail-icon humidity">
              <i class="fas fa-tint"></i>
            </div>
            <div class="weather-detail-content">
              <div class="weather-detail-label">Độ ẩm</div>
              <div class="weather-detail-value">${
                weatherInfo.humidity || 70
              }%</div>
            </div>
          </div>
          
          <div class="weather-detail-item">
            <div class="weather-detail-icon wind">
              <i class="fas fa-wind"></i>
            </div>
            <div class="weather-detail-content">
              <div class="weather-detail-label">Gió</div>
              <div class="weather-detail-value">${
                weatherInfo.windSpeed ? Math.round(weatherInfo.windSpeed) : 5
              } km/h</div>
            </div>
          </div>

          <div class="weather-detail-item">
            <div class="weather-detail-icon pressure">
              <i class="fas fa-thermometer-half"></i>
            </div>
            <div class="weather-detail-content">
              <div class="weather-detail-label">Áp suất</div>
              <div class="weather-detail-value">${
                weatherInfo.pressure || 1013
              } hPa</div>
            </div>
          </div>

          <div class="weather-detail-item">
            <div class="weather-detail-icon visibility">
              <i class="fas fa-eye"></i>
            </div>
            <div class="weather-detail-content">
              <div class="weather-detail-label">Nguồn</div>
              <div class="weather-detail-value">${tempInfo.source}</div>
            </div>
          </div>
        </div>

        <div class="weather-actions">
          <button class="weather-refresh-btn" onclick="window.acEnergyManager.refreshOutdoorTemp()">
            <i class="fas fa-sync-alt"></i>
            Làm mới
          </button>
          <div class="weather-status">
            <span class="weather-status-badge ${
              tempInfo.reliability === "high"
                ? "online"
                : tempInfo.reliability === "medium"
                ? "loading"
                : "offline"
            }">
              <i class="fas fa-circle"></i>
              ${
                tempInfo.reliability === "high"
                  ? "Trực tuyến"
                  : tempInfo.reliability === "medium"
                  ? "Ổn định"
                  : "Ngoại tuyến"
              }
            </span>
          </div>
        </div>

        <div class="weather-manual-input">
          <button class="manual-temp-toggle" onclick="this.classList.toggle('active'); this.nextElementSibling.classList.toggle('active')">
            <i class="fas fa-edit"></i> Nhập thủ công
          </button>
          <div class="manual-input-group">
            <div class="manual-temp-controls">
              <input type="number" 
                     class="manual-temp-input" 
                     id="weather-manual-temp"
                     min="15" 
                     max="45" 
                     step="0.5"
                     placeholder="Nhập nhiệt độ..."
                     value="${this.outdoorTempSources.manual || ""}">
              <button class="manual-temp-apply" 
                      onclick="window.acEnergyManager.setManualOutdoorTemp(document.getElementById('weather-manual-temp').value)">
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Get weather icon based on weather description
   */
  getWeatherIcon(description) {
    const desc = (description || "").toLowerCase();

    if (
      desc.includes("sun") ||
      desc.includes("clear") ||
      desc.includes("nắng")
    ) {
      return "fas fa-sun";
    } else if (desc.includes("cloud") || desc.includes("mây")) {
      return "fas fa-cloud";
    } else if (desc.includes("rain") || desc.includes("mưa")) {
      return "fas fa-cloud-rain";
    } else if (
      desc.includes("storm") ||
      desc.includes("thunder") ||
      desc.includes("bão")
    ) {
      return "fas fa-bolt";
    } else if (desc.includes("snow") || desc.includes("tuyết")) {
      return "fas fa-snowflake";
    } else if (
      desc.includes("fog") ||
      desc.includes("mist") ||
      desc.includes("sương")
    ) {
      return "fas fa-smog";
    } else if (desc.includes("wind") || desc.includes("gió")) {
      return "fas fa-wind";
    } else {
      return "fas fa-sun"; // Default
    }
  }

  /**
   * Create rain drops elements for rainy weather icon
   */
  createRainDrops() {
    return `
      <div class="rain-drop" style="animation-delay: 0s;">💧</div>
      <div class="rain-drop" style="animation-delay: 0.3s;">💧</div>
      <div class="rain-drop" style="animation-delay: 0.6s;">💧</div>
    `;
  }

  /**
   * Create snow flakes for snowy weather icon
   */
  createSnowFlakes() {
    return `
      <div class="snow-flake" style="animation-delay: 0s;">❄️</div>
      <div class="snow-flake" style="animation-delay: 0.5s;">❄️</div>
      <div class="snow-flake" style="animation-delay: 1s;">❄️</div>
    `;
  }

  /**
   * Create enhanced 3D weather icon with effects
   */
  createEnhanced3DWeatherIcon(description) {
    const weatherIcon = this.getWeatherIcon(description);
    const weatherClass = this.getWeatherIconClass(description);
    const desc = (description || "").toLowerCase();

    let additionalEffects = "";

    // Add rain drops for rainy weather
    if (
      desc.includes("rain") ||
      desc.includes("mưa") ||
      desc.includes("shower")
    ) {
      additionalEffects = this.createRainDrops();
    }

    // Add snow flakes for snowy weather
    if (desc.includes("snow") || desc.includes("tuyết")) {
      additionalEffects = this.createSnowFlakes();
    }

    return `
      <div class="weather-icon-3d ${weatherClass}">
        <i class="icon-base ${weatherIcon}"></i>
        ${additionalEffects}
      </div>
    `;
  }

  /**
   * Get weather icon animation class
   */
  getWeatherIconClass(description) {
    const desc = (description || "").toLowerCase();

    if (
      desc.includes("sun") ||
      desc.includes("clear") ||
      desc.includes("nắng")
    ) {
      return "weather-icon-sunny";
    } else if (desc.includes("cloud") || desc.includes("mây")) {
      return "weather-icon-cloudy";
    } else if (desc.includes("rain") || desc.includes("mưa")) {
      return "weather-icon-rainy";
    } else if (
      desc.includes("storm") ||
      desc.includes("thunder") ||
      desc.includes("bão")
    ) {
      return "weather-icon-stormy";
    } else if (desc.includes("snow") || desc.includes("tuyết")) {
      return "weather-icon-snowy";
    } else if (
      desc.includes("fog") ||
      desc.includes("mist") ||
      desc.includes("sương")
    ) {
      return "weather-icon-foggy";
    } else if (desc.includes("wind") || desc.includes("gió")) {
      return "weather-icon-windy";
    } else {
      return "weather-icon-sunny"; // Default
    }
  }

  /**
   * Update existing weather panel
   */
  updateWeatherPanel() {
    // Try to find existing weather panel by different selectors
    let weatherPanel = document.getElementById("spa-weather-panel-container");

    if (!weatherPanel) {
      weatherPanel = document.querySelector(".weather-panel");
    }

    if (!weatherPanel) {
      weatherPanel = document.getElementById("weather-panel");
    }

    if (weatherPanel) {
      console.log("🔄 Updating weather panel content");

      // If it's the container, update innerHTML directly
      if (weatherPanel.id === "spa-weather-panel-container") {
        weatherPanel.innerHTML = this.createWeatherPanel();
      } else {
        // If it's the panel itself, replace with new content
        weatherPanel.outerHTML = this.createWeatherPanel();
      }

      // Add update animation
      setTimeout(() => {
        const updatedPanel = document.querySelector(".weather-panel");
        if (updatedPanel) {
          updatedPanel.style.animation = "weatherUpdate 0.3s ease-out";

          // Add the animation CSS if it doesn't exist
          if (!document.getElementById("weather-update-animation")) {
            const style = document.createElement("style");
            style.id = "weather-update-animation";
            style.textContent = `
              @keyframes weatherUpdate {
                0% { transform: scale(1); }
                50% { transform: scale(1.02); }
                100% { transform: scale(1); }
              }
            `;
            document.head.appendChild(style);
          }
        }
      }, 50);
    } else {
      console.log("Weather panel not found for update, creating new one");
      this.initializeWeatherPanel();
    }
  }

  /**
   * Insert weather panel into page
   */
  insertWeatherPanel(containerId = "spa-controls-container") {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`Container ${containerId} not found for weather panel`);
      return;
    }

    // Remove existing weather panel if any
    const existingPanel = document.getElementById("weather-panel");
    const existingWeatherPanel = document.querySelector(".weather-panel");
    if (existingPanel) existingPanel.remove();
    if (existingWeatherPanel) existingWeatherPanel.remove();

    // Create and insert new weather panel
    const weatherPanelHTML = this.createWeatherPanel();
    const weatherDiv = document.createElement("div");
    weatherDiv.id = "weather-panel-container";
    weatherDiv.innerHTML = weatherPanelHTML;

    // Insert at the beginning of container
    container.insertBefore(weatherDiv.firstElementChild, container.firstChild);

    console.log("Weather panel inserted successfully");
  }

  /**
   * Initialize weather panel on page load
   */
  initializeWeatherPanel() {
    // First priority: Check if we have the new weather panel container
    const weatherContainer = document.getElementById(
      "spa-weather-panel-container"
    );
    const fallbackPanel = document.getElementById("spa-weather-panel-fallback");

    if (weatherContainer && fallbackPanel) {
      // Replace fallback panel with dynamic weather panel
      console.log(
        "🌤️ Replacing fallback weather panel with enhanced 3D version"
      );
      weatherContainer.innerHTML = this.createWeatherPanel();

      // Add slide-in animation
      const newPanel = weatherContainer.querySelector(".weather-panel");
      if (newPanel) {
        newPanel.style.transform = "translateY(20px)";
        newPanel.style.opacity = "0";

        setTimeout(() => {
          newPanel.style.transition = "all 0.5s ease-out";
          newPanel.style.transform = "translateY(0)";
          newPanel.style.opacity = "1";
        }, 100);
      }

      return;
    }

    // Try different container IDs (legacy support)
    const possibleContainers = [
      "spa-controls-container",
      "spa-dashboard-container",
      "main-content",
      "spa-content",
      "spa-main-content",
    ];

    for (const containerId of possibleContainers) {
      const container = document.getElementById(containerId);
      if (container) {
        this.insertWeatherPanel(containerId);
        console.log(`Weather panel inserted into: ${containerId}`);
        break;
      }
    }

    // If no container found, try to create one in body
    if (!document.querySelector(".weather-panel")) {
      const body = document.body;
      const weatherDiv = document.createElement("div");
      weatherDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
      `;
      weatherDiv.innerHTML = this.createWeatherPanel();
      body.appendChild(weatherDiv);
      console.log("Weather panel created as floating panel");
    }
  }

  /**
   * Demo method to test weather panel with sample data
   */
  demoWeatherPanel() {
    // Array of different weather conditions for demo
    const weatherConditions = [
      {
        temperature: 32,
        humidity: 75,
        description: "Nắng đẹp",
        windSpeed: 8,
        pressure: 1015,
        condition: "sunny",
      },
      {
        temperature: 28,
        humidity: 85,
        description: "Mưa nhẹ",
        windSpeed: 15,
        pressure: 1008,
        condition: "rainy",
      },
      {
        temperature: 26,
        humidity: 70,
        description: "Có mây",
        windSpeed: 10,
        pressure: 1012,
        condition: "cloudy",
      },
      {
        temperature: 30,
        humidity: 80,
        description: "Có bão sấm sét",
        windSpeed: 25,
        pressure: 1005,
        condition: "stormy",
      },
      {
        temperature: 25,
        humidity: 90,
        description: "Sương mù",
        windSpeed: 5,
        pressure: 1018,
        condition: "foggy",
      },
    ];

    // Randomly select a weather condition
    const randomWeather =
      weatherConditions[Math.floor(Math.random() * weatherConditions.length)];

    // Set sample weather data
    this.weatherInfo = {
      temperature: randomWeather.temperature,
      humidity: randomWeather.humidity,
      description: randomWeather.description,
      windSpeed: randomWeather.windSpeed,
      pressure: randomWeather.pressure,
      city: "Vạn Phúc, Thủ Đức",
      source: "Demo API",
      lastUpdated: new Date().toISOString(),
    };

    // Update outdoor temperature
    this.updateOutdoorTemperature(randomWeather.temperature, "weather");

    // Force create weather panel in body for demo
    const existingPanel = document.querySelector(".weather-panel");
    if (existingPanel) existingPanel.remove();

    const body = document.body;
    const weatherDiv = document.createElement("div");
    weatherDiv.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 1000;
      animation: slideInRight 0.5s ease-out;
    `;

    // Add slide in animation
    const style = document.createElement("style");
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);

    weatherDiv.innerHTML = this.createWeatherPanel();
    body.appendChild(weatherDiv);

    console.log(
      `Demo weather panel created with ${randomWeather.condition} weather`
    );

    // Show feedback with weather type
    this.showTemperatureFeedback(
      "success",
      `Demo weather panel tạo thành công! Thời tiết: ${randomWeather.description} 🌤️`
    );

    // Auto-cycle through different weather conditions every 10 seconds
    setTimeout(() => {
      this.cycleDemoWeather();
    }, 10000);
  }

  /**
   * Cycle through different weather conditions for demo
   */
  cycleDemoWeather() {
    if (!document.querySelector(".weather-panel")) return;

    const weatherTypes = [
      { desc: "Nắng đẹp", temp: 33, humidity: 65 },
      { desc: "Mưa to", temp: 25, humidity: 95 },
      { desc: "Có bão", temp: 27, humidity: 88 },
      { desc: "Sương mù", temp: 22, humidity: 98 },
    ];

    const currentWeather =
      weatherTypes[Math.floor(Math.random() * weatherTypes.length)];

    this.weatherInfo.description = currentWeather.desc;
    this.weatherInfo.temperature = currentWeather.temp;
    this.weatherInfo.humidity = currentWeather.humidity;
    this.weatherInfo.lastUpdated = new Date().toISOString();

    this.updateOutdoorTemperature(currentWeather.temp, "weather");
    this.updateWeatherPanel();

    console.log(`Weather demo cycled to: ${currentWeather.desc}`);

    // Continue cycling
    setTimeout(() => {
      this.cycleDemoWeather();
    }, 8000);
  }

  /**
   * Force clear all weather panels and create fresh one
   */
  forceRefreshWeatherPanel() {
    // Remove all existing weather panels
    document
      .querySelectorAll(".weather-panel")
      .forEach((panel) => panel.remove());
    document
      .querySelectorAll(".weather-showcase")
      .forEach((panel) => panel.remove());

    // Clear weather container if exists
    const container = document.getElementById("spa-weather-panel-container");
    if (container) {
      container.innerHTML = "";
    }

    // Reinitialize
    console.log("🔄 Force refreshing weather panel...");
    this.initializeWeatherPanel();

    // Update with current data
    setTimeout(() => {
      this.updateWeatherPanel();
    }, 500);

    this.showTemperatureFeedback(
      "success",
      "Weather panel đã được làm mới hoàn toàn! 🌤️"
    );
  }

  /**
   * Test all 3D weather icons showcase
   */
  testAll3DWeatherIcons() {
    const weatherShowcase = [
      { name: "Nắng đẹp", desc: "clear sunny day", temp: 35 },
      { name: "Có mây", desc: "cloudy overcast", temp: 28 },
      { name: "Mưa nhẹ", desc: "light rain shower", temp: 24 },
      { name: "Bão sấm", desc: "thunderstorm", temp: 26 },
      { name: "Sương mù", desc: "foggy mist", temp: 22 },
      { name: "Tuyết rơi", desc: "snow", temp: 5 },
      { name: "Gió mạnh", desc: "windy", temp: 30 },
    ];

    // Remove existing panels
    document.querySelectorAll(".weather-showcase").forEach((el) => el.remove());

    // Create showcase container
    const showcaseContainer = document.createElement("div");
    showcaseContainer.className = "weather-showcase";
    showcaseContainer.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      right: 20px;
      z-index: 9999;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      max-height: 80vh;
      overflow-y: auto;
      background: rgba(0, 0, 0, 0.8);
      padding: 20px;
      border-radius: 15px;
      backdrop-filter: blur(20px);
    `;

    // Add close button
    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "✕ Đóng";
    closeBtn.style.cssText = `
      position: absolute;
      top: 10px;
      right: 15px;
      background: #ef4444;
      color: white;
      border: none;
      padding: 8px 15px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      z-index: 10000;
    `;
    closeBtn.onclick = () => showcaseContainer.remove();
    showcaseContainer.appendChild(closeBtn);

    // Add title
    const title = document.createElement("h2");
    title.innerHTML = "🌤️ 3D Weather Icons Showcase";
    title.style.cssText = `
      grid-column: 1 / -1;
      text-align: center;
      color: white;
      margin: 20px 0 10px 0;
      font-size: 24px;
    `;
    showcaseContainer.appendChild(title);

    // Create individual weather panels
    weatherShowcase.forEach((weather, index) => {
      const miniPanel = document.createElement("div");
      miniPanel.className = "weather-panel glass-effect compact";
      miniPanel.style.cssText = `
        margin: 0;
        animation: fadeInScale 0.6s ease-out ${index * 0.1}s both;
      `;

      // Create temporary weather info for this showcase
      const tempWeatherInfo = {
        description: weather.desc,
        temperature: weather.temp,
        humidity: 70 + Math.random() * 20,
        windSpeed: 5 + Math.random() * 15,
        pressure: 1010 + Math.random() * 10,
      };

      // Create the panel content
      miniPanel.innerHTML = `
        <div class="weather-header">
          <div class="weather-location">
            <i class="fas fa-map-marker-alt"></i>
            <span>${weather.name}</span>
          </div>
        </div>
        <div class="weather-main">
          <div class="weather-temperature">
            <div class="temp-value">${weather.temp}°C</div>
            <div class="temp-description">${weather.desc}</div>
          </div>
          ${this.createEnhanced3DWeatherIcon(weather.desc)}
        </div>
        <div class="weather-details" style="grid-template-columns: 1fr 1fr; gap: 8px;">
          <div class="weather-detail-item">
            <div class="weather-detail-icon humidity"><i class="fas fa-tint"></i></div>
            <div class="weather-detail-content">
              <div class="weather-detail-label">Độ ẩm</div>
              <div class="weather-detail-value">${Math.round(
                tempWeatherInfo.humidity
              )}%</div>
            </div>
          </div>
          <div class="weather-detail-item">
            <div class="weather-detail-icon wind"><i class="fas fa-wind"></i></div>
            <div class="weather-detail-content">
              <div class="weather-detail-label">Gió</div>
              <div class="weather-detail-value">${Math.round(
                tempWeatherInfo.windSpeed
              )} km/h</div>
            </div>
          </div>
        </div>
      `;

      showcaseContainer.appendChild(miniPanel);
    });

    // Add showcase animation
    const showcaseStyle = document.createElement("style");
    showcaseStyle.textContent = `
      @keyframes fadeInScale {
        from {
          opacity: 0;
          transform: scale(0.8) translateY(20px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
    `;
    document.head.appendChild(showcaseStyle);

    document.body.appendChild(showcaseContainer);

    this.showTemperatureFeedback(
      "success",
      "🎨 Showcase 3D Weather Icons đã được tạo! Xem tất cả biểu tượng thời tiết 3D"
    );
  }

  /**
   * Set manual outdoor temperature
   */
  setManualOutdoorTemp(temperature) {
    const temp = parseFloat(temperature);

    if (isNaN(temp) || temp < 15 || temp > 45) {
      alert("Vui lòng nhập nhiệt độ hợp lệ từ 15°C đến 45°C");
      return false;
    }

    this.updateOutdoorTemperature(temp, "manual");

    // Show success message
    console.log(`Đã cập nhật nhiệt độ ngoài trời thủ công: ${temp}°C`);

    // Show user feedback
    this.showTemperatureFeedback(
      "success",
      `Đã cập nhật nhiệt độ thành ${temp}°C`
    );

    // Trigger update for all widgets
    this.triggerOutdoorTempUpdate();

    return true;
  }

  /**
   * Clear manual temperature and use automatic sources
   */
  clearManualOutdoorTemp() {
    delete this.outdoorTempSources.manual;
    console.log("Đã xóa nhiệt độ thủ công, sử dụng nguồn tự động");

    this.triggerOutdoorTempUpdate();
  }

  /**
   * Refresh outdoor temperature from all available sources
   */
  async refreshOutdoorTemp() {
    console.log("Đang làm mới nhiệt độ ngoài trời từ tất cả nguồn...");

    // Show loading feedback
    this.showTemperatureFeedback(
      "info",
      "Đang cập nhật nhiệt độ từ API thời tiết..."
    );

    try {
      // Try to fetch from weather API with Vietnam location
      const weatherTemp = await this.fetchWeatherTemperature(
        "Vạn Phúc City, Thủ Đức, Hồ Chí Minh, Vietnam"
      );

      if (weatherTemp) {
        this.showTemperatureFeedback(
          "success",
          `Đã cập nhật nhiệt độ: ${weatherTemp}°C từ API thời tiết`
        );
      } else {
        // If no sensor data available, update with intelligent default
        if (!this.outdoorTempSources.sensor) {
          const intelligentTemp = this.calculateIntelligentDefault();
          this.updateOutdoorTemperature(intelligentTemp, "intelligent");
          this.showTemperatureFeedback(
            "warning",
            `Sử dụng nhiệt độ dự phóng: ${intelligentTemp}°C`
          );
        }
      }

      this.triggerOutdoorTempUpdate();

      console.log(`Đã làm mới nhiệt độ: ${this.getCurrentOutdoorTemp()}°C`);
    } catch (error) {
      console.error("Lỗi khi làm mới nhiệt độ:", error);
      this.showTemperatureFeedback(
        "error",
        "Không thể cập nhật từ API thời tiết. Sử dụng dữ liệu dự phóng."
      );

      // Fallback to intelligent default
      const fallbackTemp = this.calculateIntelligentDefault();
      this.updateOutdoorTemperature(fallbackTemp, "intelligent");
      this.triggerOutdoorTempUpdate();
    }
  }

  /**
   * Show temperature update feedback to user
   */
  showTemperatureFeedback(type, message) {
    // Create feedback notification
    const feedback = document.createElement("div");
    feedback.className = `temp-feedback temp-feedback-${type}`;

    const colors = {
      success: { bg: "rgba(16, 185, 129, 0.9)", icon: "fa-check-circle" },
      error: { bg: "rgba(239, 68, 68, 0.9)", icon: "fa-exclamation-triangle" },
      warning: { bg: "rgba(245, 158, 11, 0.9)", icon: "fa-exclamation-circle" },
      info: { bg: "rgba(59, 130, 246, 0.9)", icon: "fa-info-circle" },
    };

    const color = colors[type] || colors.info;

    feedback.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: ${color.bg};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      z-index: 9999;
      font-weight: 600;
      font-size: 13px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      max-width: 350px;
      display: flex;
      align-items: center;
      gap: 8px;
      backdrop-filter: blur(10px);
    `;

    // Add icon
    const icon = document.createElement("i");
    icon.className = `fas ${color.icon}`;
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

    // Auto remove
    const duration = type === "info" ? 2000 : 3500;
    setTimeout(() => {
      feedback.style.transform = "translateX(100%)";
      setTimeout(() => {
        if (feedback.parentNode) {
          feedback.parentNode.removeChild(feedback);
        }
      }, 300);
    }, duration);
  }

  /**
   * Start automatic weather updates
   */
  startAutoWeatherUpdates() {
    // Update weather every 30 minutes
    if (this.weatherUpdateInterval) {
      clearInterval(this.weatherUpdateInterval);
    }

    // Initial update
    this.refreshOutdoorTemp();

    // Set up periodic updates
    this.weatherUpdateInterval = setInterval(() => {
      this.refreshOutdoorTemp();
    }, 30 * 60 * 1000); // 30 minutes

    console.log("Đã bật cập nhật thời tiết tự động (mỗi 30 phút)");
  }

  /**
   * Stop automatic weather updates
   */
  stopAutoWeatherUpdates() {
    if (this.weatherUpdateInterval) {
      clearInterval(this.weatherUpdateInterval);
      this.weatherUpdateInterval = null;
      console.log("Đã tắt cập nhật thời tiết tự động");
    }
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
      const success = window.tempController.setTargetTemp(
        suggestedTemp,
        "ai_recommendation"
      );
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
        widget.innerHTML = this.createTemperatureRecommendationWidgetVN(acData);
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

// Make testing methods available globally
window.testWeatherPanel = () =>
  window.energyEfficiencyManager.demoWeatherPanel();
window.testAll3DWeatherIcons = () =>
  window.energyEfficiencyManager.testAll3DWeatherIcons();
window.forceRefreshWeatherPanel = () =>
  window.energyEfficiencyManager.forceRefreshWeatherPanel();

// NEW: Weather API testing functions
window.testWeatherAPI = async () => {
  console.log("🧪 Testing Weather API...");
  const result = await window.energyEfficiencyManager.fetchWeatherTemperature();
  console.log(`Weather API test result: ${result}°C`);
  return result;
};

window.testAllWeatherSources = async () => {
  console.log("🔄 Testing all weather sources...");
  const location = "Ho Chi Minh City, Vietnam";

  // Test OpenWeatherMap
  try {
    const owm = await window.energyEfficiencyManager.fetchFromOpenWeatherMap(
      location
    );
    console.log("OpenWeatherMap:", owm);
  } catch (error) {
    console.error("❌ OpenWeatherMap failed:", error.message);
  }

  // Test Wttr.in
  try {
    const wttr = await window.energyEfficiencyManager.fetchFromWttr(location);
    console.log("Wttr.in:", wttr);
  } catch (error) {
    console.error("❌ Wttr.in failed:", error.message);
  }

  // Test WeatherAPI (will fail without key)
  try {
    const wapi = await window.energyEfficiencyManager.fetchFromWeatherAPI(
      location
    );
    console.log("WeatherAPI:", wapi);
  } catch (error) {
    console.error("❌ WeatherAPI failed:", error.message);
  }
};

window.checkWeatherConfig = () => {
  if (window.validateWeatherConfig) {
    const validation = window.validateWeatherConfig();
    console.log("Weather Config Validation:", validation);

    const services = window.getEnabledWeatherServices();
    console.log("Enabled Weather Services:", services);

    return { validation, services };
  } else {
    console.error("Weather config not loaded!");
    return null;
  }
};

console.log("Energy Efficiency Manager initialized with Weather API fixes");
console.log("🌤️ Weather API Commands:");
console.log("- testWeatherAPI() - Test current weather fetching");
console.log("- testAllWeatherSources() - Test all weather APIs individually");
console.log("- checkWeatherConfig() - Validate weather API configuration");
console.log("- testWeatherPanel() - Test weather panel with random conditions");
console.log("- testAll3DWeatherIcons() - Showcase all 3D weather icons");
console.log(
  "- forceRefreshWeatherPanel() - Force clear and refresh weather panel"
);
