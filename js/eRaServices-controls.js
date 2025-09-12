const eraWidget = new EraWidget();
let configTargetTempAir1 = null,
  configCurrentTempAir1 = null,
  configModeAir1 = null,
  configFanSpeed = null,
  configPowerAir1 = null,
  configCurrentAir1 = null,
  configVoltageAir1 = null,
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
  tempControlAir1 = null,
  powerAir1 = null,
  fanSpeed = null,
  current = null,
  voltage = null,
  configPowerConsumption = null,
  currentPowerConsumption_value = null,
  currentAir1_value = null,
  voltageAir1_value = null,
  fanSpeedControl = null;
eraWidget.init({
  needRealtimeConfigs: true,
  needActions: true,

  onConfiguration: (configuration) => {
    configTargetTempAir1 = configuration.realtime_configs[0];
    configCurrentTempAir1 = configuration.realtime_configs[1];
    configModeAir1 = configuration.realtime_configs[2];
    configFanSpeed = configuration.realtime_configs[3];
    configPowerAir1 = configuration.realtime_configs[4];
    configCurrentAir1 = configuration.realtime_configs[5];
    configVoltageAir1 = configuration.realtime_configs[6];
    configPowerConsumption = configuration.realtime_configs[7];
    onAirConditioner1 = configuration.actions[0];
    offAirConditioner1 = configuration.actions[1];
    tempControlAir1 = configuration.actions[2];
    modeAuto = configuration.actions[3];
    modeCool = configuration.actions[4];
    modeDry = configuration.actions[5];
    modeFan = configuration.actions[6];
    fanSpeedControl = configuration.actions[7];
    console.log("Received configuration:", configuration); // Expose global variables for energy efficiency manager
    window.eraWidget = eraWidget;
    window.tempControlAir1 = tempControlAir1;

    console.log("Global E-RA variables exposed for energy efficiency manager");

    // Get initial device data after configuration is loaded
    fetchInitialDeviceData();

    // Initialize temperature usage chart
    if (window.temperatureUsageChart) {
      window.temperatureUsageChart.initializeChart();
    }
  },
  onValues: (values) => {
    // Handle incoming values using the correct E-RA syntax
    targetTempAir1 = values[configTargetTempAir1.id].value;
    currentTempAir1 = values[configCurrentTempAir1.id].value;
    currentModeAir1 = values[configModeAir1.id].value;
    fanSpeed = values[configFanSpeed.id].value;
    powerAir1 = values[configPowerAir1.id].value;
    currentAir1_value = values[configCurrentAir1.id].value;
    voltageAir1_value = values[configVoltageAir1.id].value;

    // Extract power consumption with safe fallback
    if (configPowerConsumption && configPowerConsumption.id) {
      currentPowerConsumption_value =
        values[configPowerConsumption.id]?.value || 0;
    } else {
      currentPowerConsumption_value = 0;
    }

    console.log("Received values from E-RA:", values);
    console.log("Target temp from device:", targetTempAir1);
    console.log("Current temp from device:", currentTempAir1);
    console.log("Current mode from device:", currentModeAir1);
    console.log("Fan speed from device:", fanSpeed);
    console.log(
      "Power consumption from device:",
      currentPowerConsumption_value
    );

    // Update global device data manager first
    if (window.globalDeviceDataManager) {
      const deviceData = {
        targetTemp: targetTempAir1,
        currentTemp: currentTempAir1,
        mode: currentModeAir1,
        fanSpeed: fanSpeed,
        power: powerAir1,
        current: currentAir1_value,
        voltage: voltageAir1_value,
        powerConsumption: currentPowerConsumption_value,
      };

      window.globalDeviceDataManager.updateDeviceData(deviceData);
    } else {
      console.warn("Global Device Data Manager not available");
    }

    // Update temperature controller if exists
    if (window.tempController) {
      window.tempController.currentTemp = currentTempAir1;
      window.tempController.targetTemp = targetTempAir1;
      window.tempController.updateFromDevice(currentTempAir1, currentModeAir1);
      window.tempController.current = currentAir1_value;
      window.tempController.voltage = voltageAir1_value;
      window.tempController.powerConsumption = currentPowerConsumption_value;
      // Update power status from device power value
      window.tempController.isPowerOn = powerAir1;

      window.tempController.updateCurrentTempDisplay();
      window.tempController.updateTemperatureDisplay();
      window.tempController.updateModeDisplay();
      window.tempController.updatePowerDisplay();
      window.tempController.updateFanSpeedFromDevice(fanSpeed);
      window.tempController.updateElectricalDisplay(
        currentAir1_value,
        voltageAir1_value,
        currentPowerConsumption_value
      );
      window.tempController.updateACDataInManager();

      console.log(
        "Temperature controller updated with device data - Power:",
        powerAir1 ? "ON" : "OFF"
      );
    }

    // Store received values globally for legacy support
    window.deviceDataReceived = true;
    window.latestDeviceValues = {
      targetTemp: targetTempAir1,
      currentTemp: currentTempAir1,
      mode: currentModeAir1,
      power: powerAir1,
      timestamp: new Date().toISOString(),
      current: currentAir1_value,
      voltage: voltageAir1_value,
      powerConsumption: currentPowerConsumption_value,
    };
  },
  onHistories: (histories) => {
    console.log("Received histories data for chart:", histories);

    // Process histories data for temperature usage chart
    if (window.temperatureUsageChart && histories && histories.length > 0) {
      window.temperatureUsageChart.processHistoriesData(histories);
    } else {
      console.warn(
        "Temperature usage chart not available or no histories data"
      );
    }
  },
});

/**
 * Global Device Data Manager - Singleton Pattern
 * Manages centralized data distribution from E-RA to all components
 *
 * POWER PROPERTY SYNCHRONIZATION FLOW:
 * 1. E-RA Device sends power value via onValues callback
 * 2. Power value stored in deviceData object: { power: powerAir1 }
 * 3. GlobalDeviceDataManager broadcasts power to all subscribers
 * 4. ACSpaManager receives power update and syncs dashboard table
 * 5. Toggle-slider state updated automatically via updateDashboardTableRow
 * 6. Status badges updated based on power state (online/offline)
 * 7. Statistics counters updated based on power status
 *
 * ADDING NEW PROPERTIES - FOLLOW THIS PATTERN:
 * 1. Add property to deviceData object in onValues callback
 * 2. Add property to updateDeviceData() method destructuring
 * 3. Include property in this.deviceData object creation
 * 4. Update updateACSpaManagerData() to pass property to dashboard
 * 5. Update ACSpaManager.updateDashboardTableRow() to handle UI updates
 * 6. Update createTableRow() method for new row creation
 * 7. Add any specific UI logic in dashboard update methods
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
   */
  notifySubscribers(data) {
    console.log("Broadcasting data to", this.subscribers.length, "subscribers");

    //Loop each subscribers and callback
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
    const {
      targetTemp,
      currentTemp,
      mode,
      fanSpeed,
      power,
      current,
      voltage,
      powerConsumption,
      // AC Configuration Properties
      hpCapacity,
      technology,
      brand,
      model,
      location,
      roomArea,
      roomType,
      energyStarRating,
      installationYear,
      // Energy Efficiency Properties
      energyCostPerKWh,
      energyConsumption,
      dailyUsageHours,
      estimatedMonthlyCost,
    } = newData;

    // Create new data object using object literal syntax
    this.deviceData = {
      // Basic Device Properties
      targetTemp: targetTemp || 22,
      currentTemp: currentTemp || 22,
      mode: mode || 0,
      fanSpeed: fanSpeed || 0,
      power: power || false,
      timestamp: new Date().toISOString(),
      isPowerOn: power || false,
      current: current || 0,
      voltage: voltage || 0,
      powerConsumption: powerConsumption || 0, // in KWh
      // AC Configuration Properties - integration với AC Configuration Manager
      hpCapacity: hpCapacity || "2HP",
      technology: technology || "inverter",
      brand: brand || "Unknown",
      model: model || "Unknown",
      location: location || "Living Room",
      roomArea: roomArea || 25,
      roomType: roomType || "medium",
      energyStarRating: energyStarRating || 3,
      installationYear: installationYear || new Date().getFullYear(),

      // Energy Efficiency Properties - integration với Energy Efficiency Manager
      energyCostPerKWh: energyCostPerKWh || 3000,
      energyConsumption: energyConsumption || 0,
      dailyUsageHours: dailyUsageHours || 8,
      estimatedMonthlyCost: estimatedMonthlyCost || 0,
    };

    console.log("Global device data updated:", this.deviceData);
    //After add timeStamp and power status => Notify all subscribers about data change
    this.notifySubscribers(this.deviceData);

    // Update ACSpaManager with new data
    this.updateACSpaManagerData(); //updateACSpaManagerData it's mean update AC data in SPA manager (dashboard Page)
  }
  updateFanSpeedDisplay;
  /**
   * UPDATE AC SPA MANAGER WITH DEVICE DATA --- dashboardPage
   * Concept: Inter-component Communication - giao tiếp giữa các component
   */
  updateACSpaManagerData() {
    if (window.acSpaManager && this.deviceData) {
      // Convert device mode value to string mode
      const modeString = this.mapDeviceValueToMode(this.deviceData.mode);
      //At updateDeviceData(newData) -- newData stored with this.deviceData
      // Object creation with computed properties - Enhanced với AC Configuration properties
      const acUpdateData = {
        // Basic Device Properties
        currentTemp: this.deviceData.currentTemp, //currentTemp at this.deviceData = {targetTemp,currentTemp,. . . .etc}
        targetTemp: this.deviceData.targetTemp,
        mode: modeString,
        power: this.deviceData.power, // Use direct power value from device
        status: this.deviceData.power ? "online" : "offline", // Status based on power state
        lastUpdated: this.deviceData.timestamp,
        current: this.deviceData.current,
        voltage: this.deviceData.voltage,
        fanSpeed: this.deviceData.fanSpeed,
        powerConsumption: this.deviceData.powerConsumption,

        // AC Configuration Properties - Integration với AC Configuration Manager
        hpCapacity: this.deviceData.hpCapacity,
        technology: this.deviceData.technology,
        brand: this.deviceData.brand,
        model: this.deviceData.model,
        location: this.deviceData.location,
        roomArea: this.deviceData.roomArea,
        roomType: this.deviceData.roomType,
        energyStarRating: this.deviceData.energyStarRating,
        installationYear: this.deviceData.installationYear,

        // Energy Efficiency Properties - Integration với Energy Efficiency Manager
        energyCostPerKWh: this.deviceData.energyCostPerKWh,
        energyConsumption: this.deviceData.energyConsumption,
        dailyUsageHours: this.deviceData.dailyUsageHours,
        estimatedMonthlyCost: this.deviceData.estimatedMonthlyCost,
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
   * UPDATE AC CONFIGURATION
   * Method để update AC configuration properties và notify subscribers
   */
  updateACConfiguration(acId, configuration) {
    if (this.deviceData) {
      // Update device data với new configuration
      this.deviceData = {
        ...this.deviceData,
        ...configuration,
        lastConfigUpdate: new Date().toISOString(),
      };

      console.log(
        `AC Configuration updated in Global Device Data Manager for ${acId}:`,
        configuration
      );

      // Notify all subscribers about configuration change
      this.notifySubscribers(this.deviceData);

      // Update ACSpaManager với new configuration
      this.updateACSpaManagerData();

      // Trigger event system notification nếu có
      if (window.acEventSystem) {
        window.acEventSystem.emit("ac-configuration-updated", {
          acId: acId,
          configuration: configuration,
          timestamp: new Date().toISOString(),
        });
      }
    }
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
 * Temperature Usage Chart Class
 * Manages Highcharts display for AC temperature usage data
 */
class TemperatureUsageChart {
  constructor() {
    this.chartInstance = null;
    this.isInitialized = false;
  }

  /**
   * Draw chart using data from E-Ra histories
   */
  drawChart(categories, series) {
    const chartContainer = document.getElementById("spa-temperature-chart");
    if (!chartContainer) {
      console.warn("Chart container not found");
      return;
    }

    this.chartInstance = Highcharts.chart("spa-temperature-chart", {
      chart: {
        type: "column",
        backgroundColor: "transparent",
        style: {
          fontFamily: "Inter, sans-serif",
        },
      },
      credits: {
        enabled: false,
      },
      title: null,
      subtitle: null,
      xAxis: {
        categories: categories,
        crosshair: true,
        accessibility: {
          description: "Air Conditioners",
        },
        labels: {
          style: {
            color: "rgba(255, 255, 255, 0.8)",
          },
        },
        lineColor: "rgba(255, 255, 255, 0.2)",
        tickColor: "rgba(255, 255, 255, 0.2)",
      },
      yAxis: {
        min: 0,
        title: {
          text: "Thời gian (giờ và phút)",
          style: {
            color: "rgba(255, 255, 255, 0.8)",
          },
        },
        labels: {
          style: {
            color: "rgba(255, 255, 255, 0.8)",
          },
          formatter: function () {
            const hours = Math.floor(this.value / 60);
            const minutes = this.value % 60;
            return `${hours} giờ ${minutes} phút`;
          },
        },
        gridLineColor: "rgba(255, 255, 255, 0.1)",
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderColor: "rgba(255, 255, 255, 0.2)",
        style: {
          color: "white",
        },
        formatter: function () {
          const hours = Math.floor(this.y / 60);
          const minutes = this.y % 60;
          return `<b>${this.series.name}°C</b><br/>${this.point.category}: ${hours} giờ ${minutes} phút`;
        },
      },
      plotOptions: {
        column: {
          pointPadding: 0.2,
          borderWidth: 1,
          borderRadius: 6,
          borderColor: "rgba(255, 255, 255, 0.15)",
          shadow: {
            color: "rgba(0, 0, 0, 0.3)",
            offsetX: 2,
            offsetY: 2,
            opacity: 0.3,
            width: 5,
          },
        },
      },
      legend: {
        itemStyle: {
          color: "rgba(255, 255, 255, 0.8)",
        },
      },
      series: series,
    });

    console.log(
      "Temperature usage chart created with",
      series.length,
      "temperature series"
    );
  }

  /**
   * Initialize chart with E-Ra data
   */
  initializeChart() {
    if (this.isInitialized) {
      console.log("Chart already initialized");
      return;
    }

    console.log("Initializing temperature usage chart...");

    // Setup chart control buttons
    this.setupChartControls();

    // Load default timeframe (hour)
    this.loadChartData("hour");

    this.isInitialized = true;
  }

  /**
   * Setup chart control buttons
   */
  setupChartControls() {
    const chartButtons = document.querySelectorAll(".chart-btn");

    chartButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        // Remove active class from all buttons
        chartButtons.forEach((btn) => btn.classList.remove("active"));

        // Add active class to clicked button
        e.target.classList.add("active");

        // Get period and reload chart data
        const period = e.target.getAttribute("data-period");
        this.loadChartData(period);
      });
    });

    console.log("Chart control buttons setup complete");
  }

  /**
   * Load chart data for specific time period
   */
  loadChartData(period) {
    console.log(`Loading chart data for period: ${period}`);

    let now = new Date();
    let startTime;

    switch (period) {
      case "hour":
        startTime = new Date(now.getTime() - 60 * 60 * 1000); // Last hour
        break;
      case "day":
        startTime = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
          0
        ); // Start of today
        break;
      case "week":
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
        break;
      case "month":
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
        break;
      default:
        startTime = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
          0
        ); // Default to today
    }

    if (eraWidget) {
      eraWidget.requestHistories(startTime.getTime(), now.getTime());
      console.log(`Requested histories from ${startTime} to ${now}`);
    }
  }

  /**
   * Process histories data and create chart
   */
  processHistoriesData(histories) {
    console.log("Processing histories data for chart:", histories);

    const categories = histories.map((item) => item.name);
    const temperatures = [];

    const summarySeries = histories.map((item) => {
      const timeByTemp = {};
      item.data?.map((dataItem) => {
        const [temp, time] = JSON.parse(dataItem.y);
        if (!temperatures.includes(temp)) {
          temperatures.push(temp);
        }
        if (!timeByTemp[temp]) {
          timeByTemp[temp] = 0;
        }
        timeByTemp[temp] += time;
      });
      return timeByTemp;
    });

    const series = temperatures
      .sort()
      .map((temp) => {
        if (temp < 16 || temp > 30) {
          return null;
        }
        return {
          name: temp,
          data: summarySeries.map((item) => item[temp] || 0),
          color: this.getTemperatureColor(temp),
          borderColor: "rgba(255, 255, 255, 0.2)",
          borderWidth: 1,
        };
      })
      .filter(Boolean);

    this.drawChart(categories, series);
  }

  /**
   * Get color for temperature based on range
   * Cold temperatures: Light cool colors
   * Hot temperatures: Dark warm colors
   */
  getTemperatureColor(temp) {
    // Very cold (16-17°C): Light ice blue
    if (temp <= 17) return "#E0F2FE"; // Very light cyan

    // Cold (18-19°C): Ice blue
    if (temp <= 19) return "#7DD3FC"; // Light sky blue

    // Cool (20-21°C): Cool blue
    if (temp <= 21) return "#38BDF8"; // Sky blue

    // Comfortable (22-23°C): Blue-green
    if (temp <= 23) return "#06B6D4"; // Cyan

    // Mild warm (24-25°C): Green-yellow
    if (temp <= 25) return "#10B981"; // Emerald green

    // Warm (26-27°C): Yellow-orange
    if (temp <= 27) return "#F59E0B"; // Amber

    // Hot (28-29°C): Orange-red
    if (temp <= 29) return "#F97316"; // Orange

    // Very hot (30°C+): Dark red
    return "#DC2626"; // Dark red
  }

  /**
   * Destroy existing chart
   */
  destroy() {
    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
      this.isInitialized = false;
    }
  }

  /**
   * Refresh chart with current timeframe
   */
  refreshChart() {
    const activeButton = document.querySelector(".chart-btn.active");
    const period = activeButton
      ? activeButton.getAttribute("data-period")
      : "hour";
    this.loadChartData(period);
  }
}

// Create global chart instance
window.temperatureUsageChart = new TemperatureUsageChart();

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
    window.tempController.isPowerOn = deviceData.power || false;
    window.tempController.current;
    // Update all displays
    window.tempController.updateCurrentTempDisplay();
    window.tempController.updateTemperatureDisplay();
    window.tempController.updateModeDisplay();
    window.tempController.updatePowerDisplay();
    window.tempController.updateACDataInManager();
    window.tempController.updateCurrentAirDisplay();
    window.tempController.updateVoltageDisplay();
    console.log("Temperature controller initialized with device data");
    return true;
  }

  return false;
}

class TemperatureController {
  constructor(acId = "AC-001") {
    // Basic Device Properties
    this.acId = acId;
    this.currentTemp = 22;
    this.targetTemp = 22;
    this.tempRange = { min: 16, max: 30 };
    this.debounceTimer = null;
    this.isPowerOn = false;
    this.availableMode = ["auto", "cool", "dry", "fan"];
    this.currentMode = "auto";
    this.currentModeIndex = this.availableMode.indexOf(this.currentMode);
    this.fanSpeed = 0;
    this.current = 0;
    this.voltage = 0;
    this.powerConsumption = 0; // in KWh
    // AC Configuration Properties - integration với AC Configuration Manager
    this.hpCapacity = "2HP";
    this.technology = "inverter";
    this.brand = "Unknown";
    this.model = "Unknown";
    this.location = "Living Room";
    this.roomArea = 25;
    this.roomType = "medium";
    this.energyStarRating = 3;
    this.installationYear = new Date().getFullYear();
    this.defaultTempMin = 22;
    this.defaultTempMax = 26;

    // Energy Efficiency Properties - integration với Energy Efficiency Manager
    this.energyCostPerKWh = 3000; // VND per kWh
    this.energyConsumption = 0; // Current power consumption in watts
    this.dailyUsageHours = 8; // Average daily usage hours
    this.estimatedMonthlyCost = 0; // Estimated monthly cost in VND
    this.powerEfficiencyRating = 0.85; // Technology efficiency multiplier
    this.roomSizeMultiplier = 1.0; // Room size factor

    // Load configuration from AC Configuration Manager nếu có
    this.loadACConfiguration();

    this.init();
  }

  /**
   * LOAD AC CONFIGURATION FROM AC CONFIGURATION MANAGER
   * Tích hợp với AC Configuration Manager để load configuration đã save
   */
  loadACConfiguration() {
    if (
      window.acConfigManager &&
      window.acConfigManager.isACConfigured(this.acId)
    ) {
      const config = window.acConfigManager.getACConfiguration(this.acId);

      if (config) {
        // Update AC Configuration Properties
        this.hpCapacity = config.hpCapacity || this.hpCapacity;
        this.technology = config.technology || this.technology;
        this.brand = config.brand || this.brand;
        this.model = config.model || this.model;
        this.location = config.location || this.location;
        this.roomArea = config.roomArea || this.roomArea;
        this.roomType = config.roomType || this.roomType;
        this.energyStarRating =
          config.energyStarRating || this.energyStarRating;
        this.installationYear =
          config.installationYear || this.installationYear;
        this.defaultTempMin = config.defaultTempMin || this.defaultTempMin;
        this.defaultTempMax = config.defaultTempMax || this.defaultTempMax;

        // Update Energy Efficiency Properties
        this.energyCostPerKWh =
          config.energyCostPerKWh || this.energyCostPerKWh;

        console.log(`AC Configuration loaded for ${this.acId}:`, config);
      }
    } else {
      console.log(
        `No saved configuration found for AC ${this.acId}, using defaults`
      );
    }
  }

  /**
   * UPDATE AC CONFIGURATION
   * Method to update AC configuration properties and save to manager
   */
  updateACConfiguration(newConfig) {
    // Update properties
    Object.keys(newConfig).forEach((key) => {
      if (this.hasOwnProperty(key)) {
        this[key] = newConfig[key];
      }
    });

    // Save to AC Configuration Manager
    if (window.acConfigManager) {
      window.acConfigManager.applyConfigurationToEnergyManager(
        this.acId,
        newConfig
      );
    }

    console.log(`AC Configuration updated for ${this.acId}:`, newConfig);
  }

  init() {
    console.log("Temperature Controller initialized for AC:", this.acId);
    this.loadACData();
    this.setupTemperatureControls();
    this.setupModeControls();
    this.setupFanControls();
    this.setupConfigurationEventListeners();

    // Initialize displays
    this.updateModeDisplay();
    this.updateCurrentTempDisplay();
    this.updateTemperatureDisplay();
    this.updateFanSpeedDisplay();
    this.updateElectricalDisplay(
      this.current,
      this.voltage,
      this.powerConsumption
    );
  }

  /**
   * SETUP CONFIGURATION EVENT LISTENERS
   * Listen for AC configuration changes via Event-Driven Architecture
   */
  setupConfigurationEventListeners() {
    if (window.acEventSystem) {
      // Listen for AC configuration updates
      window.acEventSystem.on("ac-configuration-updated", (data) => {
        if (data.acId === this.acId) {
          this.syncWithACConfiguration(data.acId, data.configuration);
        }
      });

      // Listen for energy efficiency calculation results
      window.acEventSystem.on("energy-efficiency-calculated", (data) => {
        if (data.acId === this.acId) {
          this.energyConsumption =
            data.energyConsumption || this.energyConsumption;
          this.estimatedMonthlyCost =
            data.estimatedMonthlyCost || this.estimatedMonthlyCost;
          this.updateACDataInManager();
        }
      });

      console.log(`Configuration event listeners setup for AC ${this.acId}`);
    }
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

        // Determine power status based on power property
        this.isPowerOn = deviceData.power || false;
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

    // Update energy efficiency recommendation widget
    if (window.energyEfficiencyManager) {
      window.energyEfficiencyManager.updateRecommendationWidget();
    }
  }
  updateCurrentAirDisplay() {
    const currentAirElement = document.getElementById("spa-current-air");
    if (currentAirElement) {
      currentAirElement.textContent = `${this.current} A`;
      console.log(`Current display updated: ${this.current} A`);
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

      // Also send command to device
      this.sendTemperatureToDevice();

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
      // Use the new real-time update method - Enhanced với AC Configuration properties
      window.acSpaManager.updateACDataRealtime(this.acId, {
        // Basic Device Properties
        currentTemp: this.currentTemp,
        targetTemp: this.targetTemp,
        mode: this.currentMode,
        power: this.isPowerOn,
        fanSpeed: this.fanSpeed,
        status: this.isPowerOn ? "online" : "offline",
        lastUpdated: new Date().toISOString(),
        current: this.current,
        voltage: this.voltage,
        powerConsumption: this.powerConsumption, // in KWh

        // AC Configuration Properties - Integration với AC Configuration Manager
        hpCapacity: this.hpCapacity,
        technology: this.technology,
        brand: this.brand,
        model: this.model,
        location: this.location,
        roomArea: this.roomArea,
        roomType: this.roomType,
        energyStarRating: this.energyStarRating,
        installationYear: this.installationYear,
        defaultTempMin: this.defaultTempMin,
        defaultTempMax: this.defaultTempMax,

        // Energy Efficiency Properties - Integration với Energy Efficiency Manager
        energyCostPerKWh: this.energyCostPerKWh,
        energyConsumption: this.energyConsumption,
        dailyUsageHours: this.dailyUsageHours,
        estimatedMonthlyCost: this.estimatedMonthlyCost,
        powerEfficiencyRating: this.powerEfficiencyRating,
        roomSizeMultiplier: this.roomSizeMultiplier,
      });
    }
  }

  /**
   * SYNC WITH AC CONFIGURATION MANAGER
   * Method được call từ AC Configuration Manager khi user update configuration
   */
  syncWithACConfiguration(acId, configuration) {
    if (acId === this.acId) {
      // Update AC Configuration Properties
      this.hpCapacity = configuration.hpCapacity || this.hpCapacity;
      this.technology = configuration.technology || this.technology;
      this.brand = configuration.brand || this.brand;
      this.model = configuration.model || this.model;
      this.location = configuration.location || this.location;
      this.roomArea = configuration.roomArea || this.roomArea;
      this.roomType = configuration.roomType || this.roomType;
      this.energyStarRating =
        configuration.energyStarRating || this.energyStarRating;
      this.installationYear =
        configuration.installationYear || this.installationYear;
      this.defaultTempMin = configuration.defaultTempMin || this.defaultTempMin;
      this.defaultTempMax = configuration.defaultTempMax || this.defaultTempMax;

      // Update Energy Efficiency Properties
      this.energyCostPerKWh =
        configuration.energyCostPerKWh || this.energyCostPerKWh;

      // Update temperature range based on new defaults
      this.tempRange.min = this.defaultTempMin;
      this.tempRange.max = this.defaultTempMax;

      // Update AC data in manager với new configuration
      this.updateACDataInManager();

      // Trigger energy efficiency recalculation if manager exists
      if (window.energyEfficiencyManager) {
        window.energyEfficiencyManager.calculateEnergyEfficiency(acId, {
          currentTemp: this.currentTemp,
          targetTemp: this.targetTemp,
          mode: this.currentMode,
          power: this.isPowerOn,
        });
      }

      console.log(
        `Temperature Controller synced with AC Configuration for ${acId}:`,
        configuration
      );
    }
  }

  /**
   * SETUP FAN CONTROL HANDLERS
   * Setup event listeners for fan speed control buttons
   */
  setupFanControls() {
    const fanLevelButtons = document.querySelectorAll(".fan-level-btn");

    fanLevelButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const level = parseInt(e.currentTarget.dataset.level);
        this.handleFanSpeedChange(level);
      });
    });

    console.log("Fan control handlers setup complete");
  }

  /**
   * HANDLE FAN SPEED CHANGE
   * Handle when user clicks fan speed buttons
   */
  handleFanSpeedChange(level) {
    console.log(`Fan speed change requested: ${level}`);

    // Update internal fan speed
    this.fanSpeed = level;

    // Update UI display
    this.updateFanSpeedDisplay(level);
    this.updateFanLevelButtons(level);

    // Send to E-Ra platform
    this.sendFanSpeedToEra(level);

    // Update AC data in SPA manager
    this.updateACDataInManager();

    console.log(`Fan speed changed to level ${level} for AC ${this.acId}`);
  }

  /**
   * SEND FAN SPEED TO E-RA
   * Send fan speed command to E-Ra platform
   */
  async sendFanSpeedToEra(level) {
    if (fanSpeedControl) {
      try {
        console.log(`Sending fan speed ${level} to E-Ra...`);

        // Send fan speed to E-Ra using triggerAction
        eraWidget.triggerAction(fanSpeedControl.action, null, { value: level });

        console.log(`Fan speed level ${level} sent to E-Ra successfully`);
      } catch (error) {
        console.error("Failed to send fan speed to E-Ra:", error);
      }
    } else {
      console.warn("Fan speed control action not available");
    }
  }

  /**
   * UPDATE FAN SPEED DISPLAY
   * Update the fan speed value and icon in UI
   */
  updateFanSpeedDisplay(level) {
    const speedValueEl = document.getElementById("spa-fan-speed-value");
    const speedIconEl = document.getElementById("spa-fan-speed-icon");

    if (speedValueEl) {
      speedValueEl.textContent = level;
    }

    if (speedIconEl) {
      // Stop animation for level 0 (Auto), start for others
      if (level === 0) {
        speedIconEl.classList.add("stopped");
      } else {
        speedIconEl.classList.remove("stopped");
      }
    }
  }

  /**
   * UPDATE FAN LEVEL BUTTONS
   * Update active state of fan level buttons
   */
  updateFanLevelButtons(activeLevel) {
    const fanLevelButtons = document.querySelectorAll(".fan-level-btn");

    fanLevelButtons.forEach((button) => {
      const level = parseInt(button.dataset.level);

      if (level === activeLevel) {
        button.classList.add("active");
      } else {
        button.classList.remove("active");
      }
    });
  }

  /**
   * UPDATE FROM DEVICE - Enhanced to handle fan speed
   */
  updateFanSpeedFromDevice(newFanSpeed) {
    console.log("Updating fan speed from device:", newFanSpeed);

    this.fanSpeed = newFanSpeed;
    this.updateFanSpeedDisplay(newFanSpeed);
    this.updateFanLevelButtons(newFanSpeed);

    console.log("Fan speed updated from device data");
  }

  /**
   * UPDATE ELECTRICAL DISPLAY
   * Update voltage, current and calculated power display
   */
  updateElectricalDisplay(current, voltage, powerConsumption) {
    // Update instance variables first
    if (current !== null && current !== undefined) {
      this.current = current;
    }
    if (voltage !== null && voltage !== undefined) {
      this.voltage = voltage;
    }
    if (powerConsumption !== null && powerConsumption !== undefined) {
      this.powerConsumption = powerConsumption;
    }
    const voltageElement = document.getElementById("spa-voltage-value");
    const currentElement = document.getElementById("spa-current-value");
    const powerElement = document.getElementById("spa-power-value");

    if (voltageElement && voltage !== null && voltage !== undefined) {
      voltageElement.textContent = voltage.toFixed(1);
      console.log(`Voltage display updated: ${voltage.toFixed(1)}V`);
    }

    if (currentElement && current !== null && current !== undefined) {
      currentElement.textContent = current.toFixed(2);
      console.log(`Current display updated: ${current.toFixed(2)}A`);
    }

    if (powerElement) {
      let displayPowerConsumption;
      if (powerConsumption != null && powerConsumption != undefined) {
        displayPowerConsumption = powerConsumption;
        powerElement.textContent = displayPowerConsumption.toFixed(2);
      }
    }
  }
}

// INITIALIZE SYSTEM
document.addEventListener("DOMContentLoaded", () => {
  // Initialize temperature controller will be done when AC is selected
  // window.tempController = new TemperatureController();
  console.log("Temperature Control System Ready - waiting for AC selection!");
});
