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

    // Get initial device data after configuration is loaded
    fetchInitialDeviceData();
  },
  onValues: (values) => {
    // Handle incoming values using the correct E-RA syntax
    targetTempAir1 = values[configTargetTempAir1.id].value;
    currentTempAir1 = values[configCurrentTempAir1.id].value;
    currentModeAir1 = values[configModeAir1.id].value;

    console.log("Received values from E-RA:", values);
    console.log("Target temp from device:", targetTempAir1);
    console.log("Current temp from device:", currentTempAir1);
    console.log("Current mode from device:", currentModeAir1);

    // Update global device data manager first
    if (window.globalDeviceDataManager) {
      const deviceData = {
        targetTemp: targetTempAir1,
        currentTemp: currentTempAir1,
        mode: currentModeAir1,
      };

      window.globalDeviceDataManager.updateDeviceData(deviceData);
      console.log(
        "Global Device Data Manager updated - data broadcasted to all systems"
      );
    } else {
      console.warn("Global Device Data Manager not available");
    }

    // Update temperature controller if exists
    if (window.tempController) {
      window.tempController.currentTemp = currentTempAir1;
      window.tempController.targetTemp = targetTempAir1;
      window.tempController.updateFromDevice(currentTempAir1, currentModeAir1);

      const isPowerOn = currentModeAir1 > 0;
      window.tempController.isPowerOn = isPowerOn;

      window.tempController.updateCurrentTempDisplay();
      window.tempController.updateTemperatureDisplay();
      window.tempController.updateModeDisplay();
      window.tempController.updatePowerDisplay();
      window.tempController.updateACDataInManager();

      console.log("Temperature controller updated with device data");
    }

    // Store received values globally for legacy support
    window.deviceDataReceived = true;
    window.latestDeviceValues = {
      targetTemp: targetTempAir1,
      currentTemp: currentTempAir1,
      mode: currentModeAir1,
      timestamp: new Date().toISOString(),
    };
  },
});

/**
 * Global Device Data Manager - Singleton Pattern
 * Manages centralized data distribution from E-RA to all components
 */
class GlobalDeviceDataManager {
  constructor() {
    if (GlobalDeviceDataManager.instance) {
      return GlobalDeviceDataManager.instance;
    }

    this.initialized = false;
    this.deviceData = null;
    this.subscribers = [];

    GlobalDeviceDataManager.instance = this;
  }

  /**
   * Subscribe to data changes - Observer Pattern
   */
  subscribe(callback) {
    if (typeof callback === "function") {
      this.subscribers.push(callback);
      console.log(
        "New subscriber added. Total subscribers:",
        this.subscribers.length
      );
    } else {
      console.error("Callback must be a function");
    }
  }

  /**
   * BROADCAST DATA TO ALL SUBSCRIBERS
   * Concept: Broadcast Pattern - phát dữ liệu đến tất cả subscriber
   * Syntax: forEach() method để lặp qua array
   * Example: subscribers.forEach(callback => callback(data));
   */
  notifySubscribers(data) {
    console.log("Broadcasting data to", this.subscribers.length, "subscribers");

    // forEach syntax: array.forEach((element, index) => { ... });
    this.subscribers.forEach((callback, index) => {
      try {
        // Call each callback function with data
        callback(data);
      } catch (error) {
        console.error(`Error in subscriber ${index}:`, error);
      }
    });
  }

  /**
   * UPDATE DEVICE DATA AND NOTIFY ALL SYSTEMS
   * Concept: Data Flow Management - quản lý luồng dữ liệu từ device đến UI
   * Syntax: Object destructuring và spread operator
   */
  updateDeviceData(newData) {
    // Object destructuring syntax: const { prop1, prop2 } = object;
    const { targetTemp, currentTemp, mode } = newData;

    // Create new data object using object literal syntax
    this.deviceData = {
      targetTemp: targetTemp || 22,
      currentTemp: currentTemp || 22,
      mode: mode || 0,
      timestamp: new Date().toISOString(), // ISO string format for timestamps
      isPowerOn: mode > 0, // Boolean conversion: mode > 0 returns true/false
    };

    console.log("Global device data updated:", this.deviceData);

    // Notify all subscribers about data change
    this.notifySubscribers(this.deviceData);

    // Update ACSpaManager với dữ liệu mới
    this.updateACSpaManagerData();
  }

  /**
   * UPDATE AC SPA MANAGER WITH DEVICE DATA
   * Concept: Inter-component Communication - giao tiếp giữa các component
   */
  updateACSpaManagerData() {
    if (window.acSpaManager && this.deviceData) {
      // Convert device mode value to string mode
      const modeString = this.mapDeviceValueToMode(this.deviceData.mode);

      // Object creation with computed properties
      const acUpdateData = {
        currentTemp: this.deviceData.currentTemp,
        targetTemp: this.deviceData.targetTemp,
        mode: modeString,
        power: this.deviceData.isPowerOn,
        status: "online", // Device is online if sending data
        lastUpdated: this.deviceData.timestamp,
      };

      // Call ACSpaManager update method
      window.acSpaManager.updateACDataRealtime("AC-001", acUpdateData);
    }
  }

  /**
   * MAP DEVICE VALUE TO MODE STRING
   * Concept: Data Transformation - chuyển đổi dữ liệu từ format này sang format khác
   * Syntax: Object literal as lookup table
   */
  mapDeviceValueToMode(value) {
    // Object literal syntax for lookup table
    const modeMap = {
      0: "auto",
      1: "cool",
      2: "dry",
      3: "fan",
    };

    // Nullish coalescing operator (??) - returns right side if left is null/undefined
    return modeMap[value] ?? "auto";
  }

  /**
   * GET CURRENT DEVICE DATA
   * Concept: Getter method - cung cấp access an toàn đến internal data
   */
  getDeviceData() {
    return this.deviceData ? { ...this.deviceData } : null; // Spread operator để tạo copy
  }

  /**
   * CHECK IF MANAGER IS INITIALIZED
   * Concept: State checking - kiểm tra trạng thái của object
   */
  isInitialized() {
    return this.initialized && this.deviceData !== null;
  }
}

// Create global instance using Singleton pattern
window.globalDeviceDataManager = new GlobalDeviceDataManager();

/**
 * Initialize device data when system starts
 * This function waits for onValues to receive data from E-RA platform
 */
function fetchInitialDeviceData() {
  console.log("Waiting for initial device data from E-RA platform...");

  // Check if configurations are available
  if (!configTargetTempAir1 || !configCurrentTempAir1 || !configModeAir1) {
    console.error("Device configurations not available yet");
    return;
  }

  // Set flag to indicate we're waiting for initial data
  window.waitingForInitialData = true;

  // Subscribe global manager to receive data updates
  console.log("Global Device Data Manager ready to receive E-RA data");
  console.log("System ready to receive device data via onValues callback");
}

/**
 * Check if we have received device data and initialize controller
 * This replaces the old getValue approach with onValues data
 */
function initializeWithDeviceData() {
  // Wait for device data to be received via onValues
  if (!window.deviceDataReceived || !window.latestDeviceValues) {
    console.log("Still waiting for device data...");
    return false;
  }

  const deviceData = window.latestDeviceValues;
  console.log("Initializing system with device data:", deviceData);

  // Update temperature controller if it exists
  if (window.tempController) {
    // Set values from device
    window.tempController.currentTemp = deviceData.currentTemp || 22;
    window.tempController.targetTemp = deviceData.targetTemp || 22;

    // Determine mode and power from device mode value
    const deviceMode = window.tempController.mapDeviceValueToMode(
      deviceData.mode || 0
    );
    window.tempController.currentMode = deviceMode;
    window.tempController.currentModeIndex =
      window.tempController.availableMode.indexOf(deviceMode);
    window.tempController.isPowerOn = deviceData.mode > 0;

    // Update all displays
    window.tempController.updateCurrentTempDisplay();
    window.tempController.updateTemperatureDisplay();
    window.tempController.updateModeDisplay();
    window.tempController.updatePowerDisplay();
    window.tempController.updateACDataInManager();

    console.log("Temperature controller initialized with device data");
    return true;
  }

  return false;
}

class TemperatureController {
  constructor(acId = "AC-001") {
    this.acId = acId; // AC ID for this controller instance
    this.currentTemp = 22; // Default current temperature
    this.targetTemp = 22; // Default target temperature
    this.tempRange = { min: 16, max: 30 }; // Temperature limit
    this.debounceTimer = null; // Timer for debounce
    this.isPowerOn = false;
    this.availableMode = ["auto", "cool", "dry", "fan"];
    this.currentMode = "auto"; // Default mode
    this.currentModeIndex = this.availableMode.indexOf(this.currentMode);
    this.init();
  }

  init() {
    console.log("Temperature Controller initialized for AC:", this.acId);
    this.loadACData();
    this.setupTemperatureControls();
    this.setupModeControls();

    // Initialize displays
    this.updateModeDisplay();
    this.updateCurrentTempDisplay();
    this.updateTemperatureDisplay();
  }

  loadACData() {
    console.log("Loading AC data for:", this.acId);

    // First try to load from AC SPA Manager (local data)
    if (window.acSpaManager) {
      const acData = window.acSpaManager.getACData(this.acId);
      if (acData) {
        this.currentTemp = acData.currentTemp || this.currentTemp;
        this.targetTemp = acData.targetTemp || this.targetTemp;
        this.currentMode = acData.mode || this.currentMode;
        this.isPowerOn = acData.power || this.isPowerOn;
        this.currentModeIndex = this.availableMode.indexOf(this.currentMode);
        console.log("Loaded local AC data:", acData);
      }
    }

    // Then fetch fresh data from E-RA device to ensure accuracy
    this.loadDataFromDevice();
  }

  /**
   * Load fresh data from device using onValues callback data
   * This method uses data received via onValues instead of direct API calls
   */
  loadDataFromDevice() {
    console.log("Loading fresh data from E-RA device...");

    // Check if E-RA configurations are ready
    if (!configTargetTempAir1 || !configCurrentTempAir1 || !configModeAir1) {
      console.warn("E-RA configurations not ready, using cached data");
      return;
    }

    // Check if we have received device data via onValues
    if (window.deviceDataReceived && window.latestDeviceValues) {
      const deviceData = window.latestDeviceValues;

      // Load current temperature from device data
      if (
        deviceData.currentTemp !== null &&
        deviceData.currentTemp !== undefined
      ) {
        this.currentTemp = deviceData.currentTemp;
        this.updateCurrentTempDisplay();
        console.log("Current temp loaded from device:", this.currentTemp);
      }

      // Load target temperature from device data
      if (
        deviceData.targetTemp !== null &&
        deviceData.targetTemp !== undefined
      ) {
        this.targetTemp = deviceData.targetTemp;
        this.updateTemperatureDisplay();
        console.log("Target temp loaded from device:", this.targetTemp);
      }

      // Load current mode from device data
      if (deviceData.mode !== null && deviceData.mode !== undefined) {
        const deviceMode = this.mapDeviceValueToMode(deviceData.mode);
        this.currentMode = deviceMode;
        this.currentModeIndex = this.availableMode.indexOf(deviceMode);
        this.updateModeDisplay();
        console.log("Mode loaded from device:", deviceMode);

        // Determine power status based on mode
        this.isPowerOn = deviceData.mode > 0;
        this.updatePowerDisplay();
      }

      // Update AC data in manager with fresh device data
      this.updateACDataInManager();
      console.log("Device data successfully loaded from onValues");
    } else {
      console.log(
        "No device data available yet, will use onValues when data arrives"
      );

      // Set up a timer to retry loading device data
      setTimeout(() => {
        if (window.deviceDataReceived) {
          this.loadDataFromDevice();
        }
      }, 2000); // Retry after 2 seconds
    }
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

    // Update AC data in manager
    this.updateACDataInManager();

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

    // Update AC data in SPA manager
    this.updateACDataInManager();
  }

  handlePowerToggle() {
    // Toggle power state
    this.isPowerOn = !this.isPowerOn;
    console.log(`AC Power state changed: ${this.isPowerOn ? "ON" : "OFF"}`);

    // Update UI immediately for responsive feel
    this.updatePowerDisplay();
    this.addButtonAnimation("spa-power-btn", "success");

    // Update AC data in manager
    this.updateACDataInManager();

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

    // 6. Update AC data in manager
    this.updateACDataInManager();

    // 7. Debounced API call
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

    // Update AC data in manager
    this.updateACDataInManager();

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

  /**
   * UPDATE AC DATA IN SPA MANAGER
   * Update AC data in the SPA manager when values change
   * Now uses real-time event-driven updates
   */
  updateACDataInManager() {
    if (window.acSpaManager) {
      // Use the new real-time update method
      window.acSpaManager.updateACDataRealtime(this.acId, {
        currentTemp: this.currentTemp,
        targetTemp: this.targetTemp,
        mode: this.currentMode,
        power: this.isPowerOn,
        status: this.isPowerOn ? "online" : "offline",
        lastUpdated: new Date().toISOString(),
      });
    }
  }
}

// INITIALIZE SYSTEM
document.addEventListener("DOMContentLoaded", () => {
  // Initialize temperature controller will be done when AC is selected
  // window.tempController = new TemperatureController();
  console.log("Temperature Control System Ready - waiting for AC selection!");
});
