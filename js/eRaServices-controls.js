const eraWidget = new EraWidget();
let configTargetTempAir1 = null,
  configCurrentTempAir1 = null,
  configModeAir1 = null,
  actions = null,
  onAirConditioner1 = null,
  offAirConditioner1 = null,
  modeAuto = null,
  modeCool = null,
  modeDry = null,
  modeFan = null,
  targetTempAir1 = null,
  currentTempAir1 = null,
  currentModeAir1 = null,
  tempControlAir1 = null;
eraWidget.init({
  needRealtimeConfigs: true,
  needActions: true,

  onConfiguration: (configuration) => {
    configTargetTempAir1 = configuration.realtime_configs[0];
    configCurrentTempAir1 = configuration.realtime_configs[1];
    configModeAir1 = configuration.realtime_configs[2];
    onAirConditioner1 = configuration.actions[0];
    offAirConditioner1 = configuration.actions[1];
    tempControlAir1 = configuration.actions[2];
    modeAuto = configuration.actions[3];
    modeCool = configuration.actions[4];
    modeDry = configuration.actions[5];
    modeFan = configuration.actions[6];
    console.log("Received configuration:", configuration);
  },
  onValues: (values) => {
    // Handle incoming values
    targetTempAir1 = values[configTargetTempAir1.id].value;
    currentTempAir1 = values[configCurrentTempAir1.id].value;
    currentModeAir1 = values[configModeAir1.id].value;

    // Update controller if it exists
    if (window.tempController) {
      window.tempController.updateFromDevice(currentTempAir1, currentModeAir1);
    }

    console.log("Received values:", values);
    console.log("Current mode from device:", currentModeAir1);
  },
});

class TemperatureController {
  constructor() {
    this.currentTemp = currentTempAir1 || 22; // Current temperature from device
    this.targetTemp = targetTempAir1 || 22; // Target temperature
    this.tempRange = { min: 16, max: 30 }; // Temperature limit
    this.debounceTimer = null; // Timer for debounce
    this.isPowerOn = false;
    this.availableMode = ["auto", "cool", "dry", "fan"];
    // Initialize current mode from device or default to "auto"
    this.currentMode =
      currentModeAir1 !== null
        ? this.mapDeviceValueToMode(currentModeAir1)
        : "auto";
    this.currentModeIndex = this.availableMode.indexOf(this.currentMode);
    this.init();
  }

  init() {
    console.log("Temperature Controller initialized");
    this.setupTemperatureControls();
    this.setupModeControls();

    // Initialize displays
    this.updateModeDisplay();
    this.updateCurrentTempDisplay();
    this.updateTemperatureDisplay();
  }

  /**
   * Attach event listeners to temperature control buttons
   */
  setupTemperatureControls() {
    // Find the temperature up button
    const tempUpBtn = document.getElementById("spa-temp-up");
    const tempDownBtn = document.getElementById("spa-temp-down");
    const powerAir1 = document.getElementById("spa-power-btn");

    // Attach event for the up button
    powerAir1.addEventListener("click", () => {
      this.handlePowerToggle();
      console.log("Power button connected");
    });
    if (tempUpBtn) {
      tempUpBtn.addEventListener("click", () => {
        this.handleTempIncrease();
      });
      console.log("Temperature UP button connected");
    }

    // Attach event for the down button (for you to code later)
    if (tempDownBtn) {
      tempDownBtn.addEventListener("click", () => {
        this.handleTempDecrease();
      });
      console.log("Temperature DOWN button connected");
    }
  }
  setupModeControls() {
    const modeButtons = document.querySelectorAll(".mode-btn"); //query to mode buttons
    modeButtons.forEach((button) => {
      //loop through each button and checking
      button.addEventListener("click", () => {
        const mode = button.getAttribute("data-mode"); //get mode from button when clicked -- call handleModeChange
        this.handleModeChange(mode);
      });
    });
    console.log("Mode buttons connected:", modeButtons.length);
  }
  handleModeChange(newMode) {
    //using newMode assign to function
    console.log("Mode changed to ", newMode);
    if (this.availableMode.includes(newMode)) {
      //check if newMode is available
      this.showFeedback("info", "Mode changed successfully");
    } else {
      this.showFeedback("error", "Mode not available");
      return;
    }
    //Compare old mode with newest mode and switch mode
    //Update current mode
    const oldMode = this.currentMode;
    if (oldMode != newMode) {
      this.currentMode = newMode;
      console.log("Mode switched from", oldMode, "to", newMode);
    }
    this.currentModeIndex = this.availableMode.indexOf(newMode);

    // Check if mode control actions are available
    if (!modeAuto || !modeCool || !modeDry || !modeFan) {
      console.error("Mode control actions not available");
      this.showFeedback(
        "error",
        "Mode control not available. Please wait for system to initialize."
      );

      // Revert mode on error
      this.currentMode = oldMode;
      this.updateModeDisplay();
      return;
    }
    this.addButtonAnimation("spa-mode-btn", "success");
    //send mode to device
    this.sendModeToDevice(newMode);
  }
  updateModeDisplay() {
    // Remove active class from all mode buttons
    const modeButtons = document.querySelectorAll(".mode-btn");
    modeButtons.forEach((button) => {
      button.classList.remove("active");
    });

    // Add active class to current mode button
    const currentModeButton = document.getElementById(
      `spa-mode-${this.currentMode}`
    );
    if (currentModeButton) {
      currentModeButton.classList.add("active");
    }

    // Update mode display text if exists
    const currentModeDisplay = document.getElementById("spa-current-mode");
    if (currentModeDisplay) {
      currentModeDisplay.textContent = this.currentMode.toUpperCase();
    }

    console.log(`Mode display updated: ${this.currentMode}`);
  }

  async sendModeToDevice(mode) {
    try {
      // Get the specific action for the mode
      const modeAction = this.getModeAction(mode);

      if (!modeAction) {
        throw new Error(`No action available for mode: ${mode}`);
      }

      // Trigger the specific mode action
      eraWidget.triggerAction(modeAction.action, null);

      console.log(`Sending mode ${mode} using action: ${modeAction.action}`);
    } catch (error) {
      console.error("Failed to send mode to device:", error);
      this.showFeedback("error", "Failed to change mode. Please try again.");
    }
  }

  /**
   * GET MODE ACTION
   * Get the specific action object for a mode
   */
  getModeAction(mode) {
    const modeActionMap = {
      auto: modeAuto,
      cool: modeCool,
      dry: modeDry,
      fan: modeFan,
    };

    return modeActionMap[mode] || null;
  }

  mapModeToDeviceValue(mode) {
    const modeMap = {
      auto: 0, // Auto mode
      cool: 1, // Cool mode
      dry: 2, // Dry mode
      fan: 3, // Fan mode
    };

    return modeMap[mode] !== undefined ? modeMap[mode] : 0;
  }
  /**
   * MAP DEVICE VALUE TO MODE
   * Convert device value back to mode string
   */
  mapDeviceValueToMode(value) {
    const valueMap = {
      0: "auto",
      1: "cool",
      2: "dry",
      3: "fan",
    };

    return valueMap[value] || "auto";
  }

  /**
   * UPDATE FROM DEVICE - Enhanced to handle mode
   */
  updateFromDevice(newTemp, newMode) {
    // Handle temperature update
    if (newTemp !== null && newTemp !== undefined) {
      const oldTemp = this.currentTemp;
      this.currentTemp = newTemp;

      if (oldTemp !== newTemp) {
        console.log(`Device temperature updated: ${oldTemp}°C → ${newTemp}°C`);
        this.updateCurrentTempDisplay();
      }
    }

    // Handle mode update
    if (newMode !== null && newMode !== undefined) {
      // Convert device value to mode string if needed
      const modeString =
        typeof newMode === "number"
          ? this.mapDeviceValueToMode(newMode)
          : newMode;

      const oldMode = this.currentMode;

      if (oldMode !== modeString) {
        this.currentMode = modeString;
        this.currentModeIndex = this.availableMode.indexOf(modeString);

        console.log(`Device mode updated: ${oldMode} → ${modeString}`);
        this.updateModeDisplay();
      }
    }
  }

  handlePowerToggle() {
    // Toggle power state
    this.isPowerOn = !this.isPowerOn;
    console.log(`AC Power state changed: ${this.isPowerOn ? "ON" : "OFF"}`);

    // Update UI immediately for responsive feel
    this.updatePowerDisplay();
    this.addButtonAnimation("spa-power-btn", "success");

    // Check if actions are available
    if (!onAirConditioner1 || !offAirConditioner1) {
      console.error("Power control actions not available");
      this.showFeedback(
        "error",
        "Power control not available. Please wait for system to initialize."
      );
      return;
    }

    // Select the appropriate action based on current power state
    const powerAction = this.isPowerOn ? onAirConditioner1 : offAirConditioner1;

    console.log(`Selected power action:`, powerAction);

    // Send command to device using the action object
    try {
      eraWidget.triggerAction(powerAction.action, null);
      console.log(
        `Power command sent: ${
          this.isPowerOn ? "ON" : "OFF"
        } command using action: ${powerAction.action}`
      );

      // Show success feedback
      this.showFeedback(
        "success",
        `Air Conditioner turned ${this.isPowerOn ? "ON" : "OFF"}`
      );
    } catch (error) {
      console.error("Failed to send power command:", error);

      // Revert power state on error
      this.isPowerOn = !this.isPowerOn;
      this.updatePowerDisplay();

      // Show error feedback
      this.showFeedback("error", "Failed to control AC. Please try again.");
    }
  }

  /**
   * UPDATE POWER DISPLAY
   * Update the power button and related UI elements
   */
  updatePowerDisplay() {
    // Update power button state
    const powerBtn = document.getElementById("spa-power-btn");
    const statusIndicator = document.getElementById("spa-status-indicator");
    const statusText = document.getElementById("spa-status-text");
    const acImage = document.getElementById("spa-ac-image");

    if (powerBtn) {
      if (this.isPowerOn) {
        powerBtn.classList.add("active");
      } else {
        powerBtn.classList.remove("active");
      }
    }

    // Update status indicator
    if (statusIndicator) {
      statusIndicator.classList.remove("on", "off");
      statusIndicator.classList.add(this.isPowerOn ? "on" : "off");
    }

    // Update status text
    if (statusText) {
      statusText.textContent = this.isPowerOn ? "Online" : "Offline";
    }

    // Update AC image
    if (acImage) {
      const imagePath = this.isPowerOn
        ? "Assets/Img_Design/AirConditioner_imgs/onAir.png"
        : "Assets/Img_Design/AirConditioner_imgs/offAir.png";
      acImage.src = imagePath;
    }

    console.log(`Power display updated: ${this.isPowerOn ? "ON" : "OFF"}`);
  }

  /**
   * HANDLE TEMPERATURE INCREASE
   * Main function to handle when user clicks the increase button
   */
  handleTempIncrease() {
    console.log("Temperature increase requested");

    // 1. Calculate new temperature
    const newTemp = this.targetTemp + 1;

    // 2. Validate range
    if (!this.validateTemperatureRange(newTemp)) {
      this.showFeedback(
        "error",
        `Maximum temperature is ${this.tempRange.max}°C`
      );
      this.addButtonAnimation("spa-temp-up", "shake");
      return;
    }

    // 3. Update target temperature
    this.targetTemp = newTemp;

    console.log(`Target temperature updated: ${this.targetTemp}°C`);
    // 4. Update UI immediately (responsive feel)
    this.updateTemperatureDisplay();

    // 5. Add visual feedback
    this.addButtonAnimation("spa-temp-up", "success");

    // 6. Debounced API call
    this.debounceAPICall();
  }

  /**
   * HANDLE TEMPERATURE DECREASE
   */
  handleTempDecrease() {
    console.log("Temperature decrease");
    const newTemp = this.targetTemp - 1;
    if (!this.validateTemperatureRange(newTemp)) {
      this.addButtonAnimation("spa-temp-down", "shake");
    }
    this.showFeedback("info", "Decreased temperature");
    this.targetTemp = newTemp;
    console.log(`Target temperature updated: ${this.targetTemp}°C`);
    this.updateTemperatureDisplay();
    this.addButtonAnimation("spa-temp-down", "success");
    this.debounceAPICall();
  }
  handleModeAir() {
    this.currentMode = currentModeAir1;
    console.log(`Current mode retrieved: ${this.currentMode}`);
  }
  /**
   * VALIDATE TEMPERATURE RANGE
   * Check if the temperature is within the allowed range
   */
  validateTemperatureRange(temp) {
    return temp >= this.tempRange.min && temp <= this.tempRange.max;
  }

  /**
   * UPDATE CURRENT TEMPERATURE DISPLAY
   * Update the current temperature display from device
   */
  updateCurrentTempDisplay() {
    const currentTempElement = document.getElementById("spa-current-temp");

    if (currentTempElement) {
      currentTempElement.textContent = `${this.currentTemp}°C`;
      console.log(`Current temperature display updated: ${this.currentTemp}°C`);
    }
  }

  /**
   * UPDATE UI DISPLAY
   * Update the temperature display on the interface
   */
  updateTemperatureDisplay() {
    // Find the element displaying the target temperature
    const targetTempElement = document.getElementById("spa-target-temp");

    if (targetTempElement) {
      // Animate the number change
      this.animateTemperatureChange(targetTempElement, this.targetTemp);
      console.log(`Temperature display updated: ${this.targetTemp}`);
    }
  }

  /**
   * ANIMATE TEMPERATURE CHANGE
   * Create animation when the number changes
   */
  animateTemperatureChange(element, newTemp) {
    // Add animation class
    element.classList.add("temp-updating");

    // Scale effect
    element.style.transform = "scale(1.1)";
    element.style.transition = "all 0.2s ease";

    // Update text
    element.textContent = `${newTemp}`;

    // Reset animation after 200ms
    setTimeout(() => {
      element.style.transform = "scale(1)";
      element.classList.remove("temp-updating");
    }, 200);
  }

  /**
   *  BUTTON ANIMATION FEEDBACK
   * Animation effect when user clicks the button
   */
  addButtonAnimation(buttonId, type) {
    const button = document.getElementById(buttonId);
    if (!button) return;

    // Remove existing animation classes
    button.classList.remove("btn-success", "btn-shake", "btn-pulse");

    // Add animation based on type
    switch (type) {
      case "success":
        button.classList.add("btn-success");
        break;
      case "shake":
        button.classList.add("btn-shake");
        break;
      case "pulse":
        button.classList.add("btn-pulse");
        break;
    }

    // Remove animation after duration
    setTimeout(() => {
      button.classList.remove("btn-success", "btn-shake", "btn-pulse");
    }, 500);
  }

  /**
   * STEP 8: DEBOUNCED API CALL
   * Prevent continuous API calls when user spams click
   */
  debounceAPICall() {
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set new timer
    this.debounceTimer = setTimeout(() => {
      this.sendTemperatureToDevice();
    }, 10); // 10ms delay
  }

  /**
   * STEP 9: SEND TO DEVICE/API
   * Send temperature command to the real device
   */
  async sendTemperatureToDevice() {
    eraWidget.triggerAction(tempControlAir1.action, null, {
      value: this.targetTemp,
    });
    console.log(`Sending temperature ${this.targetTemp}°C to device...`);
  }

  /**
   * SIMULATE API CALL (for demo)
   */
  simulateAPICall() {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // 90% success rate for demo
        if (Math.random() > 0.1) {
          resolve({ success: true });
        } else {
          reject(new Error("Network error"));
        }
      }, 500);
    });
  }

  /**
   * STEP 10: USER FEEDBACK
   * Show notification to user
   */
  showFeedback(type, message) {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `temp-notification temp-${type}`;
    notification.innerHTML = `
            <i class="fas fa-${this.getFeedbackIcon(type)}"></i>
            <span>${message}</span>
        `;

    // Style the notification
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            padding: 12px 16px;
            border-radius: 8px;
            background: ${this.getFeedbackColor(type)};
            color: white;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideInRight 0.3s ease;
        `;

    // Add to page
    document.body.appendChild(notification);

    // Auto remove
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  getFeedbackIcon(type) {
    const icons = {
      success: "check-circle",
      error: "exclamation-circle",
      info: "info-circle",
    };
    return icons[type] || "info-circle";
  }

  getFeedbackColor(type) {
    const colors = {
      success: "linear-gradient(45deg, #10b981, #34d399)",
      error: "linear-gradient(45deg, #ef4444, #f87171)",
      info: "linear-gradient(45deg, #3b82f6, #60a5fa)",
    };
    return colors[type] || colors.info;
  }
  getCurrentTemp() {
    console.log(`Current temperature retrieved: ${this.currentTemp}`);
    return this.currentTemp;
  }

  getTargetTemp() {
    console.log(`Current temperature retrieved: ${this.targetTemp}`);
    return this.targetTemp;
  }

  setTargetTemp(temp) {
    if (this.validateTemperatureRange(temp)) {
      this.targetTemp = temp;
      this.updateTemperatureDisplay();
      return true;
    }
    return false;
  }
}

// INITIALIZE SYSTEM
document.addEventListener("DOMContentLoaded", () => {
  window.tempController = new TemperatureController();
  console.log("Temperature Control System Ready!");
});
