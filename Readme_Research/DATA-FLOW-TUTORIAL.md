# SMART AC DATA FLOW ARCHITECTURE TUTORIAL

## 📊 DATA FLOW OVERVIEW

```
┌─────────────────┐    ┌─────────────────────┐    ┌─────────────────┐
│   E-RA DEVICE   │───▶│ GlobalDeviceData    │───▶│  ACSpaManager   │
│                 │    │     Manager         │    │                 │
│ powerAir1: true │    │                     │    │ Dashboard Table │
│ tempAir1: 22    │    │ Singleton Pattern   │    │ Toggle Sliders  │
│ modeAir1: 1     │    │ Observer Pattern    │    │ Status Badges   │
└─────────────────┘    └─────────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │TemperatureController │
                       │                 │
                       │   Control UI    │
                       │ Power Display   │
                       │ Mode Display    │
                       └─────────────────┘
```

## 🔧 ADDING NEW PROPERTY - STEP BY STEP GUIDE

### STEP 1: E-RA Device Values (onValues Callback)

**File:** `eRaServices-controls.js`
**Location:** Line ~60-70

```javascript
onValues: (values) => {
  // EXTRACT VALUES FROM E-RA
  targetTempAir1 = values[configTargetTempAir1.id].value;
  currentTempAir1 = values[configCurrentTempAir1.id].value;
  currentModeAir1 = values[configModeAir1.id].value;
  fanSpeed = values[configFanSpeed.id].value;
  power = values[configPowerAir1.id].value;

  // ✅ ADD NEW PROPERTY HERE
  // Example: humidity = values[configHumidityAir1.id].value;

  // CREATE DEVICE DATA OBJECT
  const deviceData = {
    targetTemp: targetTempAir1,
    currentTemp: currentTempAir1,
    mode: currentModeAir1,
    fanSpeed: fanSpeed,
    power: powerAir1,

    // ✅ ADD NEW PROPERTY HERE
    // humidity: humidity,
  };

  // BROADCAST TO ALL SYSTEMS
  window.globalDeviceDataManager.updateDeviceData(deviceData);
};
```

### STEP 2: Global Device Data Manager

**File:** `eRaServices-controls.js`
**Location:** Line ~150-180

```javascript
updateDeviceData(newData) {
  // ✅ ADD NEW PROPERTY TO DESTRUCTURING
  const { targetTemp, currentTemp, mode, fanSpeed, power, humidity } = newData;

  // ✅ ADD NEW PROPERTY TO DATA OBJECT
  this.deviceData = {
    targetTemp: targetTemp || 22,
    currentTemp: currentTemp || 22,
    mode: mode || 0,
    fanSpeed: fanSpeed || 0,
    power: power || false,
    humidity: humidity || 50, // ✅ NEW PROPERTY WITH DEFAULT VALUE
    timestamp: new Date().toISOString(),
    isPowerOn: power || false,
  };

  // BROADCAST TO ALL SUBSCRIBERS
  this.notifySubscribers(this.deviceData);
  this.updateACSpaManagerData();
}
```

### STEP 3: Update ACSpaManager Data Method

**File:** `eRaServices-controls.js`
**Location:** Line ~200-220

```javascript
updateACSpaManagerData() {
  if (window.acSpaManager && this.deviceData) {
    const modeString = this.mapDeviceValueToMode(this.deviceData.mode);

    const acUpdateData = {
      currentTemp: this.deviceData.currentTemp,
      targetTemp: this.deviceData.targetTemp,
      mode: modeString,
      power: this.deviceData.power,
      humidity: this.deviceData.humidity, // ✅ ADD NEW PROPERTY
      status: this.deviceData.power ? "online" : "offline",
      lastUpdated: this.deviceData.timestamp,
    };

    window.acSpaManager.updateACDataRealtime("AC-001", acUpdateData);
  }
}
```

### STEP 4: ACSpaManager Subscription Handler

**File:** `spa-management.js`
**Location:** Line ~40-60

```javascript
subscribeToGlobalDeviceData() {
  if (window.globalDeviceDataManager) {
    window.globalDeviceDataManager.subscribe((deviceData) => {
      const acDataUpdate = {
        currentTemp: deviceData.currentTemp,
        targetTemp: deviceData.targetTemp,
        mode: this.mapDeviceValueToMode(deviceData.mode),
        power: deviceData.power,
        humidity: deviceData.humidity, // ✅ ADD NEW PROPERTY
        status: deviceData.power ? "online" : "offline",
        lastUpdated: deviceData.timestamp,
      };

      this.updateACDataRealtime("AC-001", acDataUpdate);
    });
  }
}
```

### STEP 5: Dashboard Table Row Update

**File:** `spa-management.js`
**Location:** Line ~350-400

```javascript
updateDashboardTableRow(acId, acData) {
  const row = document.querySelector(`tr[data-ac-id="${acId}"]`);

  if (row) {
    // UPDATE EXISTING COLUMNS
    const statusBadge = row.querySelector(".status-badge");
    const currentTempCell = row.querySelector(".current-temp-cell");
    const targetTempCell = row.querySelector(".target-temp-cell");

    // ✅ ADD NEW PROPERTY UPDATE
    const humidityCell = row.querySelector(".humidity-cell");
    if (humidityCell) {
      humidityCell.textContent = `${acData.humidity}%`;
    }

    // UPDATE POWER TOGGLE
    const powerToggle = row.querySelector(".iphone-toggle input");
    if (powerToggle) {
      powerToggle.checked = acData.power;
    }
  }
}
```

### STEP 6: Create Table Row Method

**File:** `spa-management.js`
**Location:** Line ~420-470

```javascript
createTableRow(acData) {
  const row = document.createElement("tr");
  row.setAttribute("data-ac-id", acData.id);

  const statusDisplay = acData.power ? "online" : "offline";

  row.innerHTML = `
    <td>${acData.id}</td>
    <td>${acData.location}</td>
    <td><span class="status-badge ${statusDisplay}">${statusDisplay.toUpperCase()}</span></td>
    <td class="current-temp-cell">${acData.currentTemp}°C</td>
    <td class="target-temp-cell">${acData.targetTemp}°C</td>
    <td class="humidity-cell">${acData.humidity}%</td> <!-- ✅ NEW COLUMN -->
    <td><span class="mode-badge ${acData.mode}">${acData.mode.toUpperCase()}</span></td>
    <td>1.2 kW</td>
    <td>Just now</td>
    <td>
      <div class="toggle-container">
        <label class="iphone-toggle">
          <input type="checkbox" ${acData.power ? "checked" : ""}
                 data-ac-id="${acData.id}"
                 onchange="handleACPowerToggle(this)">
          <span class="toggle-slider"></span>
        </label>
        <div class="power-status ${acData.power ? "on" : "off"}">
          <span class="power-indicator-dot"></span>
          <span>${acData.power ? "ON" : "OFF"}</span>
        </div>
      </div>
    </td>
  `;

  return row;
}
```

### STEP 7: Update HTML Table Structure (if needed)

**File:** `spa_app.html`
**Location:** Dashboard table header

```html
<thead>
  <tr>
    <th>ID</th>
    <th>Location</th>
    <th>Status</th>
    <th>Current Temp</th>
    <th>Target Temp</th>
    <th>Humidity</th>
    <!-- ✅ ADD NEW COLUMN HEADER -->
    <th>Mode</th>
    <th>Energy Usage</th>
    <th>Last Updated</th>
    <th>Actions</th>
  </tr>
</thead>
```

### STEP 8: Initial Data Structure

**File:** `spa-management.js`
**Location:** Constructor

```javascript
constructor() {
  this.selectedAC = null;
  this.acData = {
    "AC-001": {
      id: "AC-001",
      location: "Living Room",
      status: "online",
      currentTemp: 24,
      targetTemp: 22,
      mode: "auto",
      power: false,
      fanSpeed: 0,
      humidity: 50, // ✅ ADD NEW PROPERTY WITH DEFAULT VALUE
    },
  };
}
```

## 🎯 PROPERTY FLOW SUMMARY

1. **Device** → `onValues()` → Extract new property
2. **GlobalDeviceDataManager** → `updateDeviceData()` → Add to data object
3. **GlobalDeviceDataManager** → `updateACSpaManagerData()` → Send to SPA Manager
4. **ACSpaManager** → `subscribeToGlobalDeviceData()` → Receive updates
5. **ACSpaManager** → `updateDashboardTableRow()` → Update specific UI elements
6. **ACSpaManager** → `createTableRow()` → Create new rows with property
7. **HTML Structure** → Add table column if needed

## 🔥 KEY CONCEPTS

### Observer Pattern

```javascript
// Subscribe to changes
globalDeviceDataManager.subscribe((data) => {
  // Handle data updates
});

// Notify all subscribers
this.notifySubscribers(this.deviceData);
```

### Singleton Pattern

```javascript
class GlobalDeviceDataManager {
  constructor() {
    if (GlobalDeviceDataManager.instance) {
      return GlobalDeviceDataManager.instance;
    }
    GlobalDeviceDataManager.instance = this;
  }
}
```

### Event-Driven Communication

```javascript
// Emit event
window.acEventSystem.emit("ac-data-updated", eventData);

// Listen for event
window.acEventSystem.on("ac-data-updated", (eventData) => {
  // Handle update
});
```

## ⚠️ IMPORTANT NOTES

1. **Always add default values** for new properties
2. **Update both creation and update methods** in ACSpaManager
3. **Add appropriate null checks** before updating UI elements
4. **Consider data validation** for new properties
5. **Update CSS styling** if new UI elements are added
6. **Test data flow** from device to UI completely

## 🧪 TESTING CHECKLIST

- [ ] Property received from E-RA device
- [ ] GlobalDeviceDataManager processes property
- [ ] ACSpaManager receives property updates
- [ ] Dashboard table displays property correctly
- [ ] New rows created with property
- [ ] Property updates in real-time
- [ ] Default values work correctly
- [ ] Error handling for missing property
