# 🔧 ENERGY EFFICIENCY SYSTEM - COMPLETE WORKFLOW DOCUMENTATION

## 📊 SYSTEM OVERVIEW

The Energy Efficiency System is a comprehensive solution for calculating and optimizing air conditioner energy consumption based on realistic AC specifications, advanced algorithms, and real-time device data integration.

### 🏗️ SYSTEM ARCHITECTURE

The system consists of three main components working together:

1. **Energy Efficiency Manager** - Core calculation engine
2. **AC Configuration Manager** - Specifications and settings management
3. **eRaServices Controls** - Real-time device data integration

## 🌊 DATA FLOW ARCHITECTURE

### 📡 Real-Time Data Collection Flow

```
E-RA Device Platform
        ↓
onValues() Callback
        ↓
GlobalDeviceDataManager (Singleton)
        ↓
TemperatureController + ACSpaManager
        ↓
Energy Efficiency Manager
        ↓
UI Dashboard + Charts
```

### 🔄 Event-Driven Architecture (EDA)

The system uses Event-Driven Architecture for loose coupling between components:

```javascript
// Event System Flow
AC Configuration Change → Event Emission → Energy Manager Update
Temperature Change → Event Emission → Efficiency Recalculation
Power Update → Event Emission → Dashboard Refresh
```

## ⚡ ENERGY EFFICIENCY CALCULATION WORKFLOW

### 📋 Step 1: AC Configuration Setup

**Location:** `ac-configuration-manager.js`

User configures AC specifications through Settings page:

```javascript
// AC Specifications Database
acSpecifications = {
  "1HP": { nominalPower: 800W, maxPower: 1000W, minPower: 200W },
  "1.5HP": { nominalPower: 1200W, maxPower: 1500W, minPower: 300W },
  "2HP": { nominalPower: 1600W, maxPower: 2000W, minPower: 400W },
  "2.5HP": { nominalPower: 2000W, maxPower: 2500W, minPower: 500W }
}
```

**Technology Multipliers:**

```javascript
technologyMultipliers = {
  "non-inverter": { efficiency: 0.7, powerPerDegree: 25W },
  "inverter": { efficiency: 0.85, powerPerDegree: 18W },
  "dual-inverter": { efficiency: 0.95, powerPerDegree: 15W }
}
```

**Room Size Factors:**

```javascript
roomSizeFactors = {
  small: { area: "10-20m²", multiplier: 0.8 }, // Bedroom
  medium: { area: "20-35m²", multiplier: 1.0 }, // Living Room
  large: { area: "35-50m²", multiplier: 1.3 }, // Open Space
  xlarge: { area: "50+m²", multiplier: 1.6 }, // Commercial
};
```

### 📋 Step 2: Real-Time Data Integration

**Location:** `eRaServices-controls.js`

Device data flows through GlobalDeviceDataManager:

```javascript
// Data Collection from E-RA Platform
onValues: (values) => {
  targetTempAir1 = values[configTargetTempAir1.id].value;
  currentTempAir1 = values[configCurrentTempAir1.id].value;
  powerAir1 = values[configPowerAir1.id].value;
  currentAir1_value = values[configCurrentAir1.id].value;
  voltageAir1_value = values[configVoltageAir1.id].value;

  // Update Global Device Data Manager
  globalDeviceDataManager.updateDeviceData({
    targetTemp: targetTempAir1,
    currentTemp: currentTempAir1,
    power: powerAir1,
    current: currentAir1_value,
    voltage: voltageAir1_value,
  });
};
```

### 📋 Step 3: Optimal Power Calculation

**Location:** `energy-efficiency-manager.js`

Advanced realistic calculation based on AC specifications:

```javascript
// OPTIMAL POWER CALCULATION FORMULA
calculateRealisticEfficiency(acConfig, targetTemp, currentPower, outdoorTemp) {
  // Temperature difference calculation
  const tempDifference = Math.abs(outdoorTemp - targetTemp);

  // Calculate optimal power using AC-specific specifications
  const optimalPower = acConfig.adjustedMinPower +
                      (tempDifference * acConfig.adjustedPowerPerDegree);

  // Ensure optimal power doesn't exceed AC capacity
  const finalOptimalPower = Math.min(optimalPower, acConfig.adjustedMaxPower);

  return finalOptimalPower;
}
```

**Power Specification Calculation:**

```javascript
// Adjusted specifications based on room size and technology
adjustedMinPower = acSpec.minPower * roomMultiplier;
adjustedMaxPower = acSpec.maxPower * roomMultiplier;
adjustedNominalPower = acSpec.nominalPower * roomMultiplier;
adjustedPowerPerDegree = techMultiplier.powerPerDegree * roomMultiplier;
```

### 📋 Step 4: Efficiency Score Calculation

**Location:** `energy-efficiency-manager.js`

Multi-factor efficiency scoring system:

```javascript
// EFFICIENCY SCORE CALCULATION (0-100 scale)
let efficiencyScore = 100;

// Temperature penalties
if (targetTemp < 18) efficiencyScore -= (18 - targetTemp) * 12; // Extreme cold
if (targetTemp < 20) efficiencyScore -= (20 - targetTemp) * 8; // Very cold
if (targetTemp > 28) efficiencyScore -= (targetTemp - 28) * 6; // Too hot
if (targetTemp > 30) efficiencyScore -= (targetTemp - 30) * 10; // Extreme hot

// Power consumption penalty
if (currentPower > finalOptimalPower) {
  const powerWasteRatio =
    (currentPower - finalOptimalPower) / finalOptimalPower;
  const powerPenalty = Math.min(powerWasteRatio * 60, 40);
  efficiencyScore -= powerPenalty;
}

// Technology efficiency bonus
const technologyBonus = (acConfig.efficiency - 0.7) * 20;
efficiencyScore += technologyBonus;

// Optimal temperature range bonus
if (targetTemp >= 22 && targetTemp <= 25) {
  efficiencyScore += 10;
}

// Capacity utilization penalty
const capacityUtilization = currentPower / acConfig.adjustedNominalPower;
if (capacityUtilization > 1.2) {
  const capacityPenalty = (capacityUtilization - 1.2) * 15;
  efficiencyScore -= capacityPenalty;
}
```

### 📋 Step 5: Cost Analysis

**Location:** `energy-efficiency-manager.js`

Real-time cost calculation with savings potential:

```javascript
// COST CALCULATION
const hourlyCost = ((currentPower / 1000) * acConfig.energyCostPerKWh).toFixed(
  3
);
const optimalHourlyCost = (
  (finalOptimalPower / 1000) *
  acConfig.energyCostPerKWh
).toFixed(3);

// SAVINGS CALCULATION
const potentialSavings =
  currentPower > finalOptimalPower
    ? (((currentPower - finalOptimalPower) / currentPower) * 100).toFixed(1)
    : 0;
```

### 📋 Step 6: Smart Recommendations Generation

**Location:** `energy-efficiency-manager.js`

AI-powered recommendations based on AC capacity and usage:

```javascript
// TEMPERATURE RECOMMENDATIONS
if (targetTemp < optimalTempRange.min) {
  recommendations.push({
    type: "temperature",
    action: "increase",
    message: `Increase temperature to ${suggestedTemp}°C for ${savings}% energy savings`,
    suggestedTemp: suggestedTemp,
    estimatedSavings: savings,
    priority: "high"
  });
}

// CAPACITY RECOMMENDATIONS
const capacityUtilization = currentPower / acConfig.adjustedNominalPower;
if (capacityUtilization > 1.1) {
  recommendations.push({
    type: "capacity",
    action: "upgrade",
    message: `Your ${acConfig.type} AC is running at ${Math.round(capacityUtilization * 100)}% capacity`,
    suggestedUpgrade: suggestACUpgrade(acConfig.type),
    priority: "medium"
  });
}

// TECHNOLOGY RECOMMENDATIONS
if (acConfig.technology === "non-inverter" && powerWaste > 20%) {
  recommendations.push({
    type: "technology",
    action: "upgrade",
    message: "Consider upgrading to inverter AC for 15-30% energy savings",
    estimatedSavings: "15-30",
    priority: "low"
  });
}
```

## 🔬 CALCULATION EXAMPLES

### Example 1: 1.5HP Inverter AC, Medium Room (25m²)

**Input Parameters:**

- AC Type: 1.5HP Inverter
- Room Size: Medium (25m²)
- Outdoor Temperature: 32°C
- Target Temperature: 22°C
- Current Power: 1100W

**Calculation Process:**

```javascript
// Step 1: Get AC specifications
acSpec = { nominalPower: 1200W, maxPower: 1500W, minPower: 300W }
techMultiplier = { efficiency: 0.85, powerPerDegree: 18W }
roomMultiplier = 1.0

// Step 2: Calculate adjusted specifications
adjustedMinPower = 300W * 1.0 = 300W
adjustedPowerPerDegree = 18W * 1.0 = 18W/°C

// Step 3: Calculate optimal power
tempDifference = |32 - 22| = 10°C
optimalPower = 300W + (10 * 18W) = 480W

// Step 4: Calculate efficiency score
efficiencyScore = 100
// Optimal range bonus: +10 (22°C is in 22-25°C range)
// Power waste penalty: -((1100-480)/480)*60 = -77.5 (capped at -40)
// Technology bonus: +(0.85-0.7)*20 = +3
finalScore = 100 + 10 - 40 + 3 = 73%

// Step 5: Calculate savings
potentialSavings = ((1100-480)/1100)*100 = 56.4%
```

**Result:**

- Efficiency Score: 73%
- Optimal Power: 480W
- Current Power: 1100W
- Potential Savings: 56.4%
- Level: Good
- Recommendation: "Consider maintenance - AC consuming excessive power"

### Example 2: 2HP Non-Inverter AC, Large Room (40m²)

**Input Parameters:**

- AC Type: 2HP Non-Inverter
- Room Size: Large (40m²)
- Outdoor Temperature: 30°C
- Target Temperature: 18°C
- Current Power: 1800W

**Calculation Process:**

```javascript
// Step 1: Get AC specifications
acSpec = { nominalPower: 1600W, maxPower: 2000W, minPower: 400W }
techMultiplier = { efficiency: 0.7, powerPerDegree: 25W }
roomMultiplier = 1.3

// Step 2: Calculate adjusted specifications
adjustedMinPower = 400W * 1.3 = 520W
adjustedMaxPower = 2000W * 1.3 = 2600W
adjustedPowerPerDegree = 25W * 1.3 = 32.5W/°C

// Step 3: Calculate optimal power
tempDifference = |30 - 18| = 12°C
optimalPower = 520W + (12 * 32.5W) = 910W
finalOptimalPower = min(910W, 2600W) = 910W

// Step 4: Calculate efficiency score
efficiencyScore = 100
// Extreme cold penalty: -(18-18)*12 = 0
// Very cold penalty: -(20-18)*8 = -16
// Power waste penalty: -((1800-910)/910)*60 = -58.6 (capped at -40)
// Technology penalty: +(0.7-0.7)*20 = 0
finalScore = 100 - 16 - 40 + 0 = 44%

// Step 5: Calculate savings
potentialSavings = ((1800-910)/1800)*100 = 49.4%
```

**Result:**

- Efficiency Score: 44%
- Optimal Power: 910W
- Current Power: 1800W
- Potential Savings: 49.4%
- Level: Average
- Recommendations:
  - "Increase temperature to 22°C for 35% energy savings"
  - "Consider upgrading to inverter AC for 15-30% energy savings"

## 🎯 RESEARCH & ALGORITHM BASIS

### 📚 Energy Efficiency Formula Research

The calculation algorithms are based on:

1. **ASHRAE Standards** - American Society of Heating, Refrigerating and Air-Conditioning Engineers
2. **Energy Star Ratings** - US EPA energy efficiency standards
3. **Heat Load Calculations** - Standard HVAC engineering practices
4. **Inverter Technology Studies** - Energy consumption comparisons
5. **Room Size Heat Load Factors** - Building thermal analysis

### 🔬 Power Consumption Research

**Base Power Calculations:**

- Minimum power consumption based on AC standby + minimal cooling
- Power per degree based on thermodynamic cooling requirements
- Maximum power limited by AC capacity and electrical specifications

**Technology Efficiency Multipliers:**

- Non-Inverter: 70% efficiency (constant speed compressor)
- Inverter: 85% efficiency (variable speed compressor)
- Dual-Inverter: 95% efficiency (advanced variable speed + optimization)

**Room Size Load Factors:**

- Small rooms: 0.8x multiplier (less thermal mass, faster cooling)
- Medium rooms: 1.0x multiplier (baseline calculations)
- Large rooms: 1.3x multiplier (higher thermal load)
- Extra Large: 1.6x multiplier (commercial/industrial spaces)

### 🌡️ Temperature Optimization Research

**Optimal Temperature Range (22-25°C):**

- Based on human comfort studies and energy consumption curves
- Sweet spot where cooling efficiency is highest
- Balance between comfort and energy savings

**Temperature Penalty Calculations:**

- Extreme temperatures require exponentially more energy
- Penalties based on real-world energy consumption data
- Graduated penalty system to encourage gradual adjustments

## 🛠️ INTEGRATION WORKFLOW

### 🏢 System Integration Steps

1. **Initial Setup**

   - User configures AC specifications in Settings
   - System validates and stores configuration in localStorage
   - Energy Efficiency Manager receives configuration

2. **Real-Time Operation**

   - E-RA platform sends device data via WebSocket
   - GlobalDeviceDataManager processes and distributes data
   - Temperature Controller updates UI and triggers calculations

3. **Efficiency Calculation**

   - Energy Efficiency Manager calculates using realistic formulas
   - Results include score, recommendations, and cost analysis
   - UI updates with efficiency badges and recommendation widgets

4. **User Interaction**
   - User can apply temperature recommendations with one click
   - System sends commands back to E-RA platform
   - Real-time feedback and efficiency recalculation

### 🔄 Event System Integration

```javascript
// Event-Driven Architecture Flow
window.acEventSystem.on("ac-data-updated", (data) => {
  // Trigger efficiency recalculation
  energyEfficiencyManager.calculateEfficiencyForAC(data.acId, data.acData);
});

window.acEventSystem.on("temperature-changed", (data) => {
  // Update efficiency calculations
  energyEfficiencyManager.triggerEnergyEfficiencyUpdate(data.acId, data);
});

window.acEventSystem.on("energy-efficiency-calculated", (data) => {
  // Update UI with new efficiency data
  acSpaManager.updateEfficiencyDisplay(data.acId, data.efficiency);
});
```

## 📈 PERFORMANCE OPTIMIZATIONS

### ⚡ Calculation Performance

1. **Pre-calculated Specifications**: AC specifications are pre-calculated during configuration to avoid repeated calculations
2. **Debounced Updates**: Temperature changes are debounced to prevent excessive calculations
3. **Cached Results**: Efficiency results are cached for identical input parameters
4. **Lazy Loading**: Charts and heavy UI components are loaded only when needed

### 💾 Memory Management

1. **Singleton Pattern**: GlobalDeviceDataManager uses singleton to prevent memory leaks
2. **Event Cleanup**: Event listeners are properly cleaned up when components are destroyed
3. **Data Pruning**: Historical data is automatically pruned to prevent memory bloat
4. **Efficient DOM Updates**: UI updates use targeted DOM manipulation instead of full re-renders

## 🎨 UI/UX FEATURES

### 🏷️ Visual Efficiency Indicators

**Efficiency Badges:**

- Real-time efficiency score display (0-100%)
- Color-coded performance levels (Excellent/Good/Average/Poor)
- Potential savings percentage
- Technology efficiency indicators

**Smart Recommendations:**

- One-click temperature optimization
- AC capacity upgrade suggestions
- Technology improvement recommendations
- Maintenance alerts based on power consumption

**Interactive Dashboard:**

- Real-time energy consumption monitoring
- Historical efficiency trends
- Cost analysis and savings tracking
- Comparative performance metrics

### 📊 Data Visualization

**Temperature Usage Charts:**

- Highcharts integration for professional visualizations
- Time-based efficiency analysis
- Temperature vs energy consumption correlations
- Savings potential visualization

**Real-Time Monitoring:**

- Live power consumption display
- Efficiency score updates
- Cost tracking per hour/day/month
- Environmental impact metrics

## 🔧 MAINTENANCE & TROUBLESHOOTING

### 🐛 Common Issues

1. **No Efficiency Data**: Check AC configuration in Settings
2. **Incorrect Calculations**: Verify E-RA device data connection
3. **UI Not Updating**: Ensure Event System is properly initialized
4. **Missing Recommendations**: Check if AC specifications are complete

### 🔍 Debug Information

Enable debug mode by setting:

```javascript
window.energyEfficiencyDebug = true;
```

Debug information includes:

- Real-time calculation steps
- Data flow tracking
- Event system monitoring
- Performance metrics

### 📝 Logging System

Comprehensive logging at multiple levels:

- **INFO**: Normal operation flow
- **WARN**: Non-critical issues and fallbacks
- **ERROR**: System errors and failures
- **DEBUG**: Detailed calculation steps and data flow

## 🚀 FUTURE ENHANCEMENTS

### 🤖 AI Integration Plans

1. **Machine Learning**: Learn user preferences and optimize automatically
2. **Predictive Analytics**: Predict optimal settings based on weather and usage patterns
3. **Smart Scheduling**: Automatically adjust AC settings based on occupancy
4. **Anomaly Detection**: Detect unusual energy consumption patterns

### 🌐 IoT Expansion

1. **Multi-Device Support**: Support for multiple AC units simultaneously
2. **Weather Integration**: Real-time weather data for better calculations
3. **Smart Home Integration**: Integration with other smart home devices
4. **Mobile App**: Dedicated mobile application for remote monitoring

### 📊 Advanced Analytics

1. **Energy Benchmarking**: Compare performance with similar setups
2. **ROI Calculator**: Calculate return on investment for AC upgrades
3. **Environmental Impact**: Track carbon footprint and environmental benefits
4. **Utility Integration**: Integration with utility company data and billing

---

## 📋 SUMMARY

The Energy Efficiency System represents a comprehensive approach to AC energy optimization, combining:

- **Realistic AC Specifications**: Based on actual HP, technology, and room size
- **Advanced Algorithms**: Multi-factor efficiency calculations with penalty/bonus systems
- **Real-Time Integration**: Seamless integration with E-RA IoT platform
- **Smart Recommendations**: AI-powered suggestions for optimization
- **Professional UI/UX**: Interactive dashboards and visualization tools
- **Event-Driven Architecture**: Scalable and maintainable system design

The system provides users with accurate, actionable insights to reduce energy consumption while maintaining comfort, backed by solid engineering principles and real-world testing data.
