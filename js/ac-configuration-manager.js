/**
 * AC Configuration Manager
 * Manages AC unit specifications for realistic energy efficiency calculations
 * Implements the advanced formula from ENERGY-EFFICIENCY-FORMULA.md
 *
 * ARCHITECTURE OVERVIEW:
 * - Stores AC specifications per unit (HP, technology, room size)
 * - Provides configuration interface in Settings page
 * - Integrates with Energy Efficiency Manager for accurate calculations
 * - Uses localStorage for persistence
 *
 * CONFIGURATION WORKFLOW:
 * 1. User selects AC unit from dropdown (populated from ACSpaManager)
 * 2. User defines HP capacity, technology type, room size
 * 3. System calculates power specifications automatically
 * 4. Configuration saved and applied to energy calculations
 * 5. Energy Efficiency Manager uses these specs for all calculations
 */

class ACConfigurationManager {
  constructor() {
    // AC Specifications Database - from ENERGY-EFFICIENCY-FORMULA.md
    this.acSpecifications = {
      "1HP": { nominalPower: 800, maxPower: 1000, minPower: 200 },
      "1.5HP": { nominalPower: 1200, maxPower: 1500, minPower: 300 },
      "2HP": { nominalPower: 1600, maxPower: 2000, minPower: 400 },
      "2.5HP": { nominalPower: 2000, maxPower: 2500, minPower: 500 },
      "3HP": { nominalPower: 2400, maxPower: 3000, minPower: 600 },
      "4HP": { nominalPower: 3200, maxPower: 4000, minPower: 800 },
      "5HP": { nominalPower: 4000, maxPower: 5000, minPower: 1000 },
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

    // Stored AC configurations
    this.acConfigurations = this.loadConfigurationsFromStorage();

    // Global settings
    this.globalSettings = this.loadGlobalSettings();

    this.isEditMode = false;
    this.currentEditAC = null;
  }

  /**
   * Initialize AC Configuration Manager
   */
  init() {
    console.log("AC Configuration Manager initialized");
    this.setupConfigurationForm();
    this.updateConfigurationTable();
    this.loadGlobalSettingsToUI();
    this.applyConfigurationsToEnergyManager();
    this.setupEDAEventListeners();

    console.log("AC configurations loaded:", this.acConfigurations);
  }

  /**
   * SETUP EDA EVENT LISTENERS
   * Setup Event-Driven Architecture listeners for data synchronization
   */
  setupEDAEventListeners() {
    if (!window.acEventSystem) {
      console.warn("AC Event System not available for EDA setup");
      return;
    }

    // Listen for AC data updates from SPA Manager
    window.acEventSystem.on("ac-data-updated", (data) => {
      if (this.acConfigurations[data.acId]) {
        console.log(`AC data updated for configured unit: ${data.acId}`);
        // Trigger energy efficiency recalculation
        this.triggerEnergyEfficiencyUpdate(data.acId, data.acData);
      }
    });

    // Listen for energy efficiency calculations
    window.acEventSystem.on("energy-efficiency-calculated", (data) => {
      console.log(
        `Energy efficiency calculated for AC: ${data.acId}`,
        data.efficiency
      );
    });

    // Listen for temperature changes
    window.acEventSystem.on("temperature-changed", (data) => {
      if (this.acConfigurations[data.acId]) {
        console.log(
          `Temperature changed for configured AC: ${data.acId} to ${data.temperature}°C`
        );
        // Update efficiency calculations
        this.triggerEnergyEfficiencyUpdate(data.acId, {
          targetTemp: data.temperature,
        });
      }
    });

    // Listen for power consumption updates
    window.acEventSystem.on("power-consumption-updated", (data) => {
      if (this.acConfigurations[data.acId]) {
        console.log(
          `Power consumption updated for AC: ${data.acId} to ${data.power}W`
        );
        // Trigger efficiency recalculation
        this.triggerEnergyEfficiencyUpdate(data.acId, {
          currentPower: data.power,
        });
      }
    });

    console.log("EDA Event listeners setup complete");
  }

  /**
   * TRIGGER ENERGY EFFICIENCY UPDATE
   * Trigger energy efficiency calculation update via EDA
   */
  triggerEnergyEfficiencyUpdate(acId, acData) {
    if (window.energyEfficiencyManager && this.acConfigurations[acId]) {
      const config = this.acConfigurations[acId];

      // Calculate current power if not provided
      let currentPower = acData.currentPower;
      if (!currentPower && acData.voltage && acData.current) {
        currentPower = acData.voltage * acData.current;
      }

      // Get target temperature
      const targetTemp = acData.targetTemp || config.defaultTempRange.min;

      if (currentPower && targetTemp) {
        const efficiency =
          window.energyEfficiencyManager.calculateEfficiencyForAC(
            acId,
            targetTemp,
            currentPower
          );

        // Emit efficiency calculation result
        if (window.acEventSystem) {
          window.acEventSystem.emit("energy-efficiency-calculated", {
            acId: acId,
            efficiency: efficiency,
            configuration: config,
            acData: acData,
          });
        }
      }
    }
  }

  /**
   * SETUP CONFIGURATION FORM
   * Initialize form event handlers and dynamic updates
   */
  setupConfigurationForm() {
    const form = document.getElementById("ac-config-form");
    const acSelect = document.getElementById("config-ac-id");
    const mainAcSelect = document.getElementById("ac-id");
    const hpSelect = document.getElementById("config-hp-capacity");
    const techSelect = document.getElementById("config-technology");
    const roomSelect = document.getElementById("config-room-size");

    if (!form) {
      console.warn("AC configuration form not found");
      return;
    }

    // Populate AC unit dropdowns from ACSpaManager
    this.populateACUnitsDropdown();
    this.populateMainACDropdown();

    // Form submission handler
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveConfiguration(e);
    });

    // Main AC selection change handler
    if (mainAcSelect) {
      mainAcSelect.addEventListener("change", () => {
        this.handleMainACSelectionChange();
      });
    }

    // Config AC selection change handler
    if (acSelect) {
      acSelect.addEventListener("change", () => {
        this.handleACSelectionChange();
      });
    }

    // Specification change handlers for real-time calculation
    [hpSelect, techSelect, roomSelect].forEach((select) => {
      if (select) {
        select.addEventListener("change", () => {
          this.updatePowerSpecifications();
          this.updateExampleCalculation();
        });
      }
    });

    console.log("Configuration form setup complete");
  }

  /**
   * POPULATE AC UNITS DROPDOWN
   * Get AC units from ACSpaManager and populate dropdown
   */
  populateACUnitsDropdown() {
    const acSelect = document.getElementById("config-ac-id");
    if (!acSelect) return;

    // Clear existing options except first
    acSelect.innerHTML = '<option value="">Select AC Unit</option>';

    // Get AC units from ACSpaManager
    if (window.acSpaManager) {
      const allACs = window.acSpaManager.getAllACData();

      allACs.forEach((ac) => {
        const option = document.createElement("option");
        option.value = ac.id;
        option.textContent = `${ac.id} (${ac.location})`;
        acSelect.appendChild(option);
      });

      console.log(`Populated ${allACs.length} AC units in dropdown`);
    } else {
      console.warn("ACSpaManager not available for populating AC units");
    }
  }

  /**
   * POPULATE MAIN AC DROPDOWN
   * Get AC units from ACSpaManager and populate main configuration dropdown
   */
  populateMainACDropdown() {
    const mainAcSelect = document.getElementById("ac-id");
    if (!mainAcSelect) return;

    // Clear existing options except first
    mainAcSelect.innerHTML = '<option value="">Select AC Unit</option>';

    // Get AC units from ACSpaManager
    if (window.acSpaManager) {
      const allACs = window.acSpaManager.getAllACData();

      allACs.forEach((ac) => {
        const option = document.createElement("option");
        option.value = ac.id;
        option.textContent = `${ac.id} (${ac.location})`;
        mainAcSelect.appendChild(option);
      });

      console.log(`Populated ${allACs.length} AC units in main dropdown`);
    } else {
      console.warn(
        "ACSpaManager not available for populating main AC dropdown"
      );
    }
  }

  /**
   * HANDLE MAIN AC SELECTION CHANGE
   * Auto-populate location and load existing configuration when user selects an AC unit from main form
   */
  handleMainACSelectionChange() {
    const mainAcSelect = document.getElementById("ac-id");

    if (!mainAcSelect || !mainAcSelect.value) {
      return;
    }

    const selectedACId = mainAcSelect.value;

    // Load existing configuration if available
    const existingConfig = this.acConfigurations[selectedACId];
    if (existingConfig) {
      this.loadConfigurationToMainForm(existingConfig);
      console.log(`Loaded existing configuration for ${selectedACId}`);
    } else {
      console.log(`No existing configuration found for ${selectedACId}`);
    }
  }

  /**
   * LOAD CONFIGURATION TO MAIN FORM
   * Load existing configuration data into the main form fields
   */
  loadConfigurationToMainForm(config) {
    // Convert HP value from "1HP" format to numeric format for the main form using helper method
    const hpValue = this.getNumericHPValue(config.hpCapacity);

    const fields = {
      "ac-hp-capacity": hpValue,
      "ac-technology": config.technology,
      "ac-brand": config.brand,
      "ac-model": config.model,
      "room-area": config.roomArea,
      "room-type": config.roomType,
      "energy-star-rating": config.energyStarRating,
      "installation-year": config.installationYear,
      "default-temp-min": config.defaultTempMin,
      "default-temp-max": config.defaultTempMax,
    };

    Object.entries(fields).forEach(([fieldId, value]) => {
      const field = document.getElementById(fieldId);
      if (field && value !== undefined && value !== null) {
        field.value = value;
      }
    });

    console.log("Configuration loaded to main form:", config);
  }

  /**
   * HANDLE AC SELECTION CHANGE
   * Load existing configuration when user selects an AC unit
   */
  handleACSelectionChange() {
    const acSelect = document.getElementById("config-ac-id");
    const locationInput = document.getElementById("config-location");

    if (!acSelect || !acSelect.value) {
      this.clearConfigurationForm();
      return;
    }

    const selectedACId = acSelect.value;

    // Get AC data from ACSpaManager to populate location
    if (window.acSpaManager) {
      const acData = window.acSpaManager.getACData(selectedACId);
      if (acData && locationInput) {
        locationInput.value = acData.location || "";
      }
    }

    // Load existing configuration if available
    const existingConfig = this.acConfigurations[selectedACId];
    if (existingConfig) {
      this.loadConfigurationToForm(existingConfig);
      this.isEditMode = true;
      this.currentEditAC = selectedACId;

      // Update modal title
      const modalTitle = document.getElementById("config-modal-title");
      if (modalTitle) {
        modalTitle.textContent = `Edit Configuration - ${selectedACId}`;
      }
    } else {
      this.clearConfigurationFields();
      this.isEditMode = false;
      this.currentEditAC = null;

      // Update modal title
      const modalTitle = document.getElementById("config-modal-title");
      if (modalTitle) {
        modalTitle.textContent = `Configure - ${selectedACId}`;
      }
    }

    console.log(
      `AC selection changed to: ${selectedACId}, Edit mode: ${this.isEditMode}`
    );
  }

  /**
   * LOAD CONFIGURATION TO FORM
   * Load existing configuration data into the form fields
   */
  loadConfigurationToForm(config) {
    const fields = {
      "config-hp-capacity": config.hpCapacity,
      "config-technology": config.technology,
      "config-room-size": config.roomSize,
      "config-energy-cost": config.energyCostPerKWh,
    };

    Object.entries(fields).forEach(([fieldId, value]) => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.value = value;
      }
    });

    // Update power specifications and example calculation
    this.updatePowerSpecifications();
    this.updateExampleCalculation();

    console.log("Configuration loaded to form:", config);
  }

  /**
   * CLEAR CONFIGURATION FORM
   * Clear all form fields and hide specifications
   */
  clearConfigurationForm() {
    this.clearConfigurationFields();

    const locationInput = document.getElementById("config-location");
    if (locationInput) {
      locationInput.value = "";
    }

    this.hidePowerSpecifications();
    this.hideExampleCalculation();
  }

  /**
   * CLEAR CONFIGURATION FIELDS
   * Clear only the configuration-specific fields
   */
  clearConfigurationFields() {
    const fields = [
      "config-hp-capacity",
      "config-technology",
      "config-room-size",
      "config-energy-cost",
    ];

    fields.forEach((fieldId) => {
      const field = document.getElementById(fieldId);
      if (field) {
        if (fieldId === "config-energy-cost") {
          field.value = "0.12"; // Default energy cost
        } else {
          field.value = "";
        }
      }
    });

    this.hidePowerSpecifications();
    this.hideExampleCalculation();
  }

  /**
   * UPDATE POWER SPECIFICATIONS
   * Calculate and display power specifications based on form selections
   */
  updatePowerSpecifications() {
    const hpCapacity = document.getElementById("config-hp-capacity")?.value;
    const technology = document.getElementById("config-technology")?.value;
    const roomSize = document.getElementById("config-room-size")?.value;

    if (!hpCapacity || !technology || !roomSize) {
      this.hidePowerSpecifications();
      return;
    }

    // Get specifications
    const acSpec = this.acSpecifications[hpCapacity];
    const techMultiplier = this.technologyMultipliers[technology];
    const roomMultiplier = this.roomSizeFactors[roomSize].multiplier;

    if (!acSpec || !techMultiplier) {
      console.error("Invalid AC specifications");
      return;
    }

    // Calculate adjusted power specifications
    const adjustedMinPower = Math.round(acSpec.minPower * roomMultiplier);
    const adjustedMaxPower = Math.round(acSpec.maxPower * roomMultiplier);
    const adjustedNominalPower = Math.round(
      acSpec.nominalPower * roomMultiplier
    );
    const adjustedPowerPerDegree = Math.round(
      techMultiplier.powerPerDegree * roomMultiplier
    );

    // Update display
    const specs = {
      "spec-nominal-power": `${adjustedNominalPower}W`,
      "spec-max-power": `${adjustedMaxPower}W`,
      "spec-min-power": `${adjustedMinPower}W`,
      "spec-power-per-degree": `${adjustedPowerPerDegree}W/°C`,
      "spec-efficiency": `${(techMultiplier.efficiency * 100).toFixed(0)}%`,
      "spec-room-multiplier": `${roomMultiplier}x`,
    };

    Object.entries(specs).forEach(([elementId, value]) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.textContent = value;
      }
    });

    this.showPowerSpecifications();
    console.log("Power specifications updated:", specs);
  }

  /**
   * UPDATE EXAMPLE CALCULATION
   * Show example calculation for 30°C outdoor → 22°C indoor
   */
  updateExampleCalculation() {
    const hpCapacity = document.getElementById("config-hp-capacity")?.value;
    const technology = document.getElementById("config-technology")?.value;
    const roomSize = document.getElementById("config-room-size")?.value;
    const energyCost = parseFloat(
      document.getElementById("config-energy-cost")?.value || "0.12"
    );

    if (!hpCapacity || !technology || !roomSize) {
      this.hideExampleCalculation();
      return;
    }

    // Calculate example: 30°C outdoor → 22°C indoor
    const outdoorTemp = 30;
    const indoorTemp = 22;
    const tempDifference = Math.abs(outdoorTemp - indoorTemp);

    const acSpec = this.acSpecifications[hpCapacity];
    const techMultiplier = this.technologyMultipliers[technology];
    const roomMultiplier = this.roomSizeFactors[roomSize].multiplier;

    const adjustedMinPower = acSpec.minPower * roomMultiplier;
    const adjustedPowerPerDegree =
      techMultiplier.powerPerDegree * roomMultiplier;
    const optimalPower =
      adjustedMinPower + tempDifference * adjustedPowerPerDegree;

    const hourlyCost = (optimalPower / 1000) * energyCost;

    // Update display
    const calculations = {
      "calc-temp-diff": `${tempDifference}°C`,
      "calc-optimal-power": `${Math.round(optimalPower)}W`,
      "calc-hourly-cost": `$${hourlyCost.toFixed(3)}`,
    };

    Object.entries(calculations).forEach(([elementId, value]) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.textContent = value;
      }
    });

    this.showExampleCalculation();
    console.log("Example calculation updated:", calculations);
  }

  /**
   * SHOW/HIDE POWER SPECIFICATIONS
   */
  showPowerSpecifications() {
    const specsDisplay = document.getElementById("power-specs-display");
    if (specsDisplay) {
      specsDisplay.style.display = "block";
    }
  }

  hidePowerSpecifications() {
    const specsDisplay = document.getElementById("power-specs-display");
    if (specsDisplay) {
      specsDisplay.style.display = "none";
    }
  }

  /**
   * SHOW/HIDE EXAMPLE CALCULATION
   */
  showExampleCalculation() {
    const exampleCalc = document.getElementById("example-calculation");
    if (exampleCalc) {
      exampleCalc.style.display = "block";
    }
  }

  hideExampleCalculation() {
    const exampleCalc = document.getElementById("example-calculation");
    if (exampleCalc) {
      exampleCalc.style.display = "none";
    }
  }

  /**
   * SAVE AC CONFIGURATION
   * Save the form data as AC configuration
   */
  saveACConfiguration() {
    const formData = this.getFormData();

    if (!this.validateFormData(formData)) {
      this.showFeedback("error", "Please fill in all required fields");
      return;
    }

    // Create configuration object
    const configuration = {
      acId: formData.acId,
      location: formData.location,
      hpCapacity: formData.hpCapacity,
      technology: formData.technology,
      roomSize: formData.roomSize,
      energyCostPerKWh: formData.energyCost,
      createdAt: this.isEditMode
        ? this.acConfigurations[formData.acId]?.createdAt
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store configuration
    this.acConfigurations[formData.acId] = configuration;
    this.saveConfigurationsToStorage();

    // Update energy efficiency manager
    this.applyConfigurationToEnergyManager(formData.acId, configuration);

    // Update table display
    this.updateConfigurationTable();

    // Close modal and show feedback
    this.closeConfigModal();
    this.showFeedback("success", `Configuration saved for ${formData.acId}`);

    // Trigger dashboard update if on dashboard page
    if (
      window.spaApp?.getCurrentPage() === "dashboard" &&
      window.acSpaManager
    ) {
      window.acSpaManager.updateDashboardTable();
    }

    console.log("AC configuration saved:", configuration);
  }

  /**
   * GET FORM DATA
   * Extract data from the configuration form
   */
  getFormData() {
    // Get HP capacity value and normalize it using helper method
    const rawHpValue = document.getElementById("ac-hp-capacity")?.value;
    const hpValue = this.normalizeHPValue(rawHpValue);

    return {
      acId: document.getElementById("ac-id")?.value,
      hpCapacity: hpValue,
      technology: document.getElementById("ac-technology")?.value,
      brand: document.getElementById("ac-brand")?.value,
      model: document.getElementById("ac-model")?.value,
      roomArea: parseFloat(document.getElementById("room-area")?.value || "0"),
      roomType: document.getElementById("room-type")?.value,
      energyStarRating: document.getElementById("energy-star-rating")?.value,
      installationYear: parseInt(
        document.getElementById("installation-year")?.value || "0"
      ),
      defaultTempMin: parseInt(
        document.getElementById("default-temp-min")?.value || "22"
      ),
      defaultTempMax: parseInt(
        document.getElementById("default-temp-max")?.value || "26"
      ),
    };
  }

  /**
   * VALIDATE FORM DATA
   * Validate that all required fields are filled
   */
  validateFormData(formData) {
    const requiredFields = [
      "acId",
      "hpCapacity",
      "technology",
      "brand",
      "roomArea",
      "roomType",
    ];

    for (const field of requiredFields) {
      if (
        !formData[field] ||
        (typeof formData[field] === "string" && formData[field].trim() === "")
      ) {
        console.error(`Required field missing: ${field}`);
        this.showFeedback("error", `Please fill in the ${field} field`);
        return false;
      }
    }

    // Validate HP capacity exists in specifications
    if (!this.acSpecifications[formData.hpCapacity]) {
      console.error(`Invalid HP capacity: ${formData.hpCapacity}`);
      this.showFeedback(
        "error",
        `Invalid HP capacity selected: ${formData.hpCapacity}. Please select a valid HP value.`
      );
      return false;
    }

    // Validate technology type exists
    if (!this.technologyMultipliers[formData.technology]) {
      console.error(`Invalid technology type: ${formData.technology}`);
      this.showFeedback(
        "error",
        `Invalid technology type selected: ${formData.technology}. Please select a valid technology.`
      );
      return false;
    }

    // Validate room area
    if (formData.roomArea <= 0 || formData.roomArea > 200) {
      console.error(`Invalid room area: ${formData.roomArea}`);
      return false;
    }

    // Validate temperature range
    if (formData.defaultTempMin >= formData.defaultTempMax) {
      console.error(
        `Invalid temperature range: ${formData.defaultTempMin} >= ${formData.defaultTempMax}`
      );
      return false;
    }

    return true;
  }

  /**
   * SAVE AC CONFIGURATION - Enhanced for new form structure
   * Save the form data as AC configuration
   */
  saveConfiguration(event) {
    if (event) {
      event.preventDefault();
    }

    console.log("Starting saveConfiguration process...");
    const formData = this.getFormData();
    console.log("Extracted form data:", formData);

    if (!this.validateFormData(formData)) {
      console.log("Form validation failed");
      this.showFeedback(
        "error",
        "Please fill in all required fields correctly"
      );
      return;
    }

    console.log("Form validation passed, proceeding with save...");

    // Calculate room size category based on area
    const roomSizeCategory = this.calculateRoomSizeCategory(formData.roomArea);

    // Create configuration object
    const configuration = {
      acId: formData.acId,
      hpCapacity: formData.hpCapacity,
      technology: formData.technology,
      brand: formData.brand,
      model: formData.model || "",
      roomArea: formData.roomArea,
      roomType: formData.roomType,
      roomSizeCategory: roomSizeCategory,
      energyStarRating: formData.energyStarRating || "",
      installationYear: formData.installationYear || new Date().getFullYear(),
      defaultTempRange: {
        min: formData.defaultTempMin,
        max: formData.defaultTempMax,
      },
      energyCostPerKWh: 0.12, // Default energy cost
      createdAt: this.isEditMode
        ? this.acConfigurations[formData.acId]?.createdAt
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store configuration
    this.acConfigurations[formData.acId] = configuration;
    this.saveConfigurationsToStorage();

    // Apply to energy efficiency manager
    this.applyConfigurationToEnergyManager(formData.acId, configuration);

    // Emit EDA event for configuration saved
    if (window.acEventSystem) {
      window.acEventSystem.emit("ac-configuration-saved", {
        acId: formData.acId,
        configuration: configuration,
        isEdit: this.isEditMode,
      });
    }

    // Update table display if in settings page
    this.updateConfigurationTable();

    // Close modal and show feedback
    this.closeConfigModal();
    this.showFeedback(
      "success",
      `Configuration saved for ${formData.acName || formData.acId}`
    );

    console.log("AC configuration saved:", configuration);
  }

  /**
   * CALCULATE ROOM SIZE CATEGORY
   * Calculate room size category based on area
   */
  calculateRoomSizeCategory(area) {
    if (area <= 20) return "small";
    if (area <= 35) return "medium";
    if (area <= 50) return "large";
    return "xlarge";
  }

  /**
   * PREVIEW CALCULATION
   * Show preview of power specifications based on current form values
   */
  previewCalculation() {
    const formData = this.getFormData();

    if (!formData.hpCapacity || !formData.technology || !formData.roomArea) {
      this.showFeedback(
        "error",
        "Please fill in HP Capacity, Technology, and Room Area first"
      );
      return;
    }

    const roomSizeCategory = this.calculateRoomSizeCategory(formData.roomArea);
    const acSpec = this.acSpecifications[formData.hpCapacity];
    const techMultiplier = this.technologyMultipliers[formData.technology];
    const roomMultiplier = this.roomSizeFactors[roomSizeCategory].multiplier;

    // Calculate specifications
    const basePower = Math.round(acSpec.minPower * roomMultiplier);
    const maxPower = Math.round(acSpec.maxPower * roomMultiplier);
    const efficiency = Math.round(techMultiplier.efficiency * 100);
    const dailyCost = (
      ((acSpec.nominalPower * roomMultiplier) / 1000) *
      8 *
      0.12
    ).toFixed(2);

    // Update display
    document.getElementById(
      "calculated-base-power"
    ).textContent = `${basePower}W`;
    document.getElementById(
      "calculated-efficiency"
    ).textContent = `${efficiency}%`;
    document.getElementById("calculated-coverage").textContent = `${Math.round(
      (formData.roomArea / (formData.hpCapacity.replace("HP", "") * 12)) * 100
    )}%`;
    document.getElementById(
      "calculated-daily-cost"
    ).textContent = `$${dailyCost}`;

    this.showFeedback(
      "success",
      "Power specifications calculated successfully"
    );
  }

  /**
   * RESET FORM
   * Reset all form fields to default values
   */
  resetForm() {
    if (!confirm("Are you sure you want to reset all fields?")) {
      return;
    }

    const form = document.getElementById("ac-config-form");
    if (form) {
      form.reset();

      // Reset calculated values
      [
        "calculated-base-power",
        "calculated-efficiency",
        "calculated-coverage",
        "calculated-daily-cost",
      ].forEach((id) => {
        const element = document.getElementById(id);
        if (element) {
          element.textContent = "-- ";
        }
      });

      this.showFeedback("info", "Form reset to default values");
    }
  }

  /**
   * UPDATE CONFIGURATION TABLE
   * Update the settings page table with current configurations
   */
  updateConfigurationTable() {
    const tableBody = document.getElementById("ac-config-table-body");
    if (!tableBody) {
      console.warn("AC configuration table body not found");
      return;
    }

    tableBody.innerHTML = "";

    Object.values(this.acConfigurations).forEach((config) => {
      const row = this.createConfigurationTableRow(config);
      tableBody.appendChild(row);
    });

    console.log(
      `Configuration table updated with ${
        Object.keys(this.acConfigurations).length
      } configurations`
    );
  }

  /**
   * CREATE CONFIGURATION TABLE ROW
   * Create a table row for displaying AC configuration
   */
  createConfigurationTableRow(config) {
    const row = document.createElement("tr");
    row.setAttribute("data-ac-id", config.acId);

    // Calculate power range from specifications
    const acSpec = this.acSpecifications[config.hpCapacity];
    const roomMultiplier = this.roomSizeFactors[config.roomSize].multiplier;
    const minPower = Math.round(acSpec.minPower * roomMultiplier);
    const maxPower = Math.round(acSpec.maxPower * roomMultiplier);

    // Create HP capacity badge class
    const hpClass = config.hpCapacity.replace(".", "-").toLowerCase();

    row.innerHTML = `
      <td>${config.acId}</td>
      <td>${config.location}</td>
      <td>
        <span class="hp-capacity-badge ${hpClass}">
          ${config.hpCapacity}
        </span>
      </td>
      <td>
        <span class="technology-badge ${config.technology}">
          ${config.technology.replace("-", " ").toUpperCase()}
        </span>
      </td>
      <td>${this.roomSizeFactors[config.roomSize].area}</td>
      <td>${minPower}W - ${maxPower}W</td>
      <td>$${config.energyCostPerKWh.toFixed(3)}/kWh</td>
      <td>
        <button 
          class="dashboard-glass-btn" 
          onclick="window.acConfigManager.editConfiguration('${config.acId}')"
          title="Edit Configuration">
          <i class="fas fa-edit"></i>
        </button>
        <button 
          class="dashboard-glass-btn" 
          onclick="window.acConfigManager.deleteConfiguration('${config.acId}')"
          title="Delete Configuration"
          style="margin-left: 8px;">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;

    return row;
  }

  /**
   * EDIT CONFIGURATION
   * Open modal to edit existing configuration
   */
  editConfiguration(acId) {
    const configuration = this.acConfigurations[acId];
    if (!configuration) {
      this.showFeedback("error", `Configuration not found for ${acId}`);
      return;
    }

    // Open modal
    this.openConfigModal();

    // Set AC ID and load configuration
    const acSelect = document.getElementById("config-ac-id");
    if (acSelect) {
      acSelect.value = acId;
      this.handleACSelectionChange();
    }

    console.log(`Editing configuration for ${acId}`);
  }

  /**
   * DELETE CONFIGURATION
   * Delete AC configuration with confirmation
   */
  deleteConfiguration(acId) {
    if (
      !confirm(`Are you sure you want to delete the configuration for ${acId}?`)
    ) {
      return;
    }

    delete this.acConfigurations[acId];
    this.saveConfigurationsToStorage();

    // Remove from energy efficiency manager
    if (
      window.energyEfficiencyManager &&
      window.energyEfficiencyManager.removeACConfiguration
    ) {
      window.energyEfficiencyManager.removeACConfiguration(acId);
    }

    // Update table display
    this.updateConfigurationTable();

    this.showFeedback("success", `Configuration deleted for ${acId}`);
    console.log(`Configuration deleted for ${acId}`);
  }

  /**
   * APPLY CONFIGURATIONS TO ENERGY MANAGER
   * Apply all stored configurations to the Energy Efficiency Manager
   */
  applyConfigurationsToEnergyManager() {
    if (!window.energyEfficiencyManager) {
      console.warn("Energy Efficiency Manager not available");
      return;
    }

    // Apply each configuration
    Object.entries(this.acConfigurations).forEach(([acId, config]) => {
      this.applyConfigurationToEnergyManager(acId, config);
    });

    // Apply global settings
    if (window.energyEfficiencyManager.updateGlobalSettings) {
      window.energyEfficiencyManager.updateGlobalSettings(this.globalSettings);
    }

    console.log("All configurations applied to Energy Efficiency Manager");
  }

  /**
   * APPLY SINGLE CONFIGURATION TO ENERGY MANAGER
   * Apply a single AC configuration to the Energy Efficiency Manager
   */
  applyConfigurationToEnergyManager(acId, configuration) {
    if (
      !window.energyEfficiencyManager ||
      !window.energyEfficiencyManager.configureACUnit
    ) {
      console.warn(
        "Energy Efficiency Manager or configureACUnit method not available"
      );
      return;
    }

    try {
      window.energyEfficiencyManager.configureACUnit(acId, {
        type: configuration.hpCapacity,
        technology: configuration.technology,
        roomSize: configuration.roomSizeCategory,
        energyCostPerKWh: configuration.energyCostPerKWh,
        brand: configuration.brand,
        model: configuration.model,
        roomArea: configuration.roomArea,
        roomType: configuration.roomType,
        defaultTempRange: configuration.defaultTempRange,
      });

      console.log(`Configuration applied to Energy Manager for ${acId}`);

      // Emit EDA event for energy manager sync
      if (window.acEventSystem) {
        window.acEventSystem.emit("energy-efficiency-updated", {
          acId: acId,
          configuration: configuration,
        });
      }
    } catch (error) {
      console.error(`Failed to apply configuration for ${acId}:`, error);
    }
  }

  /**
   * MODAL MANAGEMENT
   */
  openConfigModal() {
    const modal = document.getElementById("ac-config-modal");
    if (modal) {
      modal.classList.add("show");
      this.populateACUnitsDropdown(); // Refresh config AC units dropdown
      this.populateMainACDropdown(); // Refresh main AC units dropdown
    }
  }

  closeConfigModal() {
    const modal = document.getElementById("ac-config-modal");
    if (modal) {
      modal.classList.remove("show");
      this.clearConfigurationForm();
      this.isEditMode = false;
      this.currentEditAC = null;
    }
  }

  /**
   * GLOBAL SETTINGS MANAGEMENT
   */
  updateOutdoorTemp(temp) {
    const temperature = parseFloat(temp);
    if (temperature >= 15 && temperature <= 45) {
      this.globalSettings.outdoorTemp = temperature;
      this.saveGlobalSettings();

      if (window.energyEfficiencyManager) {
        window.energyEfficiencyManager.updateOutdoorTemperature(temperature);
      }

      console.log(`Outdoor temperature updated to ${temperature}°C`);
    }
  }

  updateEnergyCost(cost) {
    const energyCost = parseFloat(cost);
    if (energyCost >= 0.01 && energyCost <= 1.0) {
      this.globalSettings.energyCostPerKWh = energyCost;
      this.saveGlobalSettings();
      console.log(`Energy cost updated to $${energyCost}/kWh`);
    }
  }

  updateOptimalRange() {
    const minTemp = parseInt(
      document.getElementById("optimal-temp-min")?.value || "22"
    );
    const maxTemp = parseInt(
      document.getElementById("optimal-temp-max")?.value || "25"
    );

    if (minTemp < maxTemp && minTemp >= 16 && maxTemp <= 30) {
      this.globalSettings.optimalTempRange = { min: minTemp, max: maxTemp };
      this.saveGlobalSettings();

      if (window.energyEfficiencyManager) {
        window.energyEfficiencyManager.optimalTempRange = {
          min: minTemp,
          max: maxTemp,
        };
      }

      console.log(
        `Optimal temperature range updated: ${minTemp}°C - ${maxTemp}°C`
      );
    }
  }

  resetToDefaults() {
    if (!confirm("Are you sure you want to reset all settings to defaults?")) {
      return;
    }

    this.globalSettings = this.getDefaultGlobalSettings();
    this.saveGlobalSettings();
    this.loadGlobalSettingsToUI();

    if (window.energyEfficiencyManager) {
      window.energyEfficiencyManager.updateGlobalSettings(this.globalSettings);
    }

    this.showFeedback("success", "Settings reset to defaults");
    console.log("Settings reset to defaults");
  }

  saveSettings() {
    this.saveGlobalSettings();
    this.showFeedback("success", "Settings saved successfully");
    console.log("Global settings saved");
  }

  /**
   * STORAGE MANAGEMENT
   */
  loadConfigurationsFromStorage() {
    try {
      const stored = localStorage.getItem("ac-configurations");
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error("Failed to load configurations from storage:", error);
      return {};
    }
  }

  saveConfigurationsToStorage() {
    try {
      localStorage.setItem(
        "ac-configurations",
        JSON.stringify(this.acConfigurations)
      );
      console.log("Configurations saved to storage");
    } catch (error) {
      console.error("Failed to save configurations to storage:", error);
    }
  }

  loadGlobalSettings() {
    try {
      const stored = localStorage.getItem("ac-global-settings");
      return stored ? JSON.parse(stored) : this.getDefaultGlobalSettings();
    } catch (error) {
      console.error("Failed to load global settings from storage:", error);
      return this.getDefaultGlobalSettings();
    }
  }

  saveGlobalSettings() {
    try {
      localStorage.setItem(
        "ac-global-settings",
        JSON.stringify(this.globalSettings)
      );
      console.log("Global settings saved to storage");
    } catch (error) {
      console.error("Failed to save global settings to storage:", error);
    }
  }

  getDefaultGlobalSettings() {
    return {
      outdoorTemp: 30,
      energyCostPerKWh: 0.12,
      optimalTempRange: { min: 22, max: 25 },
    };
  }

  loadGlobalSettingsToUI() {
    const settings = this.globalSettings;

    const elements = {
      "outdoor-temp-setting": settings.outdoorTemp,
      "energy-cost-setting": settings.energyCostPerKWh,
      "optimal-temp-min": settings.optimalTempRange.min,
      "optimal-temp-max": settings.optimalTempRange.max,
    };

    Object.entries(elements).forEach(([elementId, value]) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.value = value;
      }
    });

    console.log("Global settings loaded to UI:", settings);
  }

  /**
   * NORMALIZE HP VALUE
   * Convert HP value to consistent format for validation and storage
   * @param {string} hpValue - HP value to normalize
   * @returns {string} - Normalized HP value in "XHP" format
   */
  normalizeHPValue(hpValue) {
    if (!hpValue) return "";

    // If already in correct format, return as is
    if (hpValue.includes("HP")) {
      return hpValue;
    }

    // Convert numeric value to HP format
    return hpValue + "HP";
  }

  /**
   * GET NUMERIC HP VALUE
   * Extract numeric value from HP string (e.g., "2.5HP" -> "2.5")
   * @param {string} hpValue - HP value to extract from
   * @returns {string} - Numeric HP value
   */
  getNumericHPValue(hpValue) {
    if (!hpValue) return "";

    // If already numeric, return as is
    if (!hpValue.includes("HP")) {
      return hpValue;
    }

    // Extract numeric part
    return hpValue.replace("HP", "");
  }

  /**
   * USER FEEDBACK
   */
  showFeedback(type, message) {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `config-notification config-${type}`;
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

  /**
   * GET AC CONFIGURATION
   * Public method to get configuration for specific AC
   */
  getACConfiguration(acId) {
    return this.acConfigurations[acId] || null;
  }

  /**
   * CHECK IF AC IS CONFIGURED
   * Check if an AC unit has configuration
   */
  isACConfigured(acId) {
    return !!this.acConfigurations[acId];
  }

  /**
   * GET ALL CONFIGURED AC IDS
   * Get list of all configured AC unit IDs
   */
  getConfiguredACIds() {
    return Object.keys(this.acConfigurations);
  }
}

// Initialize AC Configuration Manager when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.acConfigManager = new ACConfigurationManager();

  // Initialize when the settings page is visited
  if (window.spaApp) {
    // Listen for page changes to initialize when settings page is accessed
    const originalNavigateTo = window.spaApp.navigateTo;
    window.spaApp.navigateTo = function (page) {
      const result = originalNavigateTo.call(this, page);

      if (page === "settings") {
        // Initialize configuration manager after a short delay to ensure DOM is ready
        setTimeout(() => {
          window.acConfigManager.init();
        }, 100);
      }

      return result;
    };
  } else {
    // Fallback initialization
    setTimeout(() => {
      window.acConfigManager.init();
    }, 1000);
  }

  console.log("AC Configuration Manager ready!");
});
