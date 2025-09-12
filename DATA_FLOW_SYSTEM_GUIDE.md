# 🏗️ SMART AC DATA FLOW SYSTEM - HƯỚNG DẪN CHI TIẾT

## 📊 OVERVIEW - TỔNG QUAN HỆ THỐNG

Hệ thống Smart AC sử dụng kiến trúc Event-Driven với Observer Pattern để quản lý luồng dữ liệu từ thiết bị IoT E-RA đến giao diện người dùng.

### 🔄 Data Flow Architecture

```
📱 E-RA IoT Platform
         │
         │ WebSocket Real-time Data
         ▼
┌─────────────────────────────────────────────────┐
│           onValues Callback                     │
│  - Extract device values from E-RA             │
│  - Process raw sensor data                     │
│  - Validate and clean data                     │
└─────────────────────────────────────────────────┘
         │
         │ Processed Device Data Object
         ▼
┌─────────────────────────────────────────────────┐
│      🌐 GlobalDeviceDataManager                │
│      (Singleton Pattern)                       │
│                                                │
│  • Central data hub cho toàn hệ thống          │
│  • Broadcast data đến tất cả subscribers       │
│  • Data normalization và validation           │
│  • Event emission cho loose coupling          │
└─────────────────────────────────────────────────┘
         │
         │ Notify All Subscribers
         ▼
┌─────────────────┬─────────────────┬─────────────────┐
│  🎛️ ACSpaManager  │ 🌡️ Temperature    │  📊 Energy       │
│  (Dashboard)    │   Controller    │    Manager      │
│                 │   (Control UI)  │   (Analytics)   │
│ • Table updates │ • UI controls   │ • Calculations  │
│ • Status badges │ • Real-time     │ • Efficiency    │
│ • Power toggles │   display       │   monitoring    │
└─────────────────┴─────────────────┴─────────────────┘
```

## 🔧 DETAILED IMPLEMENTATION - CHI TIẾT TRIỂN KHAI

### 1. 📡 DATA COLLECTION LAYER - Lớp Thu Thập Dữ Liệu

**File:** `eRaServices-controls.js`
**Function:** `onValues(values)`

```javascript
// STEP 1: Extract values from E-RA device
onValues: (values) => {
  // Extract individual sensor values
  targetTempAir1 = values[configTargetTempAir1.id].value;
  currentTempAir1 = values[configCurrentTempAir1.id].value;
  currentModeAir1 = values[configModeAir1.id].value;
  fanSpeed = values[configFanSpeed.id].value;
  powerAir1 = values[configPowerAir1.id].value;
  currentAir1_value = values[configCurrentAir1.id].value;
  voltageAir1_value = values[configVoltageAir1.id].value;
  currentPowerConsumption_value = values[configPowerConsumption.id].value;

  // STEP 2: Create normalized device data object
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

  // STEP 3: Send to Global Device Data Manager
  window.globalDeviceDataManager.updateDeviceData(deviceData);
};
```

### 2. 🌐 CENTRAL DATA MANAGEMENT - Quản Lý Dữ Liệu Trung Tâm

**File:** `eRaServices-controls.js`
**Class:** `GlobalDeviceDataManager`

#### 📥 Data Input Processing

**Function:** `updateDeviceData(newData)`

```javascript
updateDeviceData(newData) {
  // STEP 1: Destructure incoming data
  const {
    targetTemp, currentTemp, mode, fanSpeed, power,
    current, voltage, powerConsumption // ← New property added here
  } = newData;

  // STEP 2: Create normalized data object with defaults
  this.deviceData = {
    targetTemp: targetTemp || 22,
    currentTemp: currentTemp || 22,
    mode: mode || 0,
    fanSpeed: fanSpeed || 0,
    power: power || false,
    current: current || 0,
    voltage: voltage || 0,
    powerConsumption: powerConsumption || 0, // ← Add with default value
    timestamp: new Date().toISOString(),
    isPowerOn: power || false,
  };

  // STEP 3: Broadcast to all subscribers
  this.notifySubscribers(this.deviceData);

  // STEP 4: Update specific components
  this.updateACSpaManagerData();
}
```

#### 📤 Data Output Distribution

**Function:** `updateACSpaManagerData()`

```javascript
updateACSpaManagerData() {
  if (window.acSpaManager && this.deviceData) {
    const acUpdateData = {
      currentTemp: this.deviceData.currentTemp,
      targetTemp: this.deviceData.targetTemp,
      mode: this.mapDeviceValueToMode(this.deviceData.mode),
      power: this.deviceData.power,
      current: this.deviceData.current,
      voltage: this.deviceData.voltage,
      powerConsumption: this.deviceData.powerConsumption, // ← Pass to dashboard
      status: this.deviceData.power ? "online" : "offline",
      lastUpdated: this.deviceData.timestamp,
    };

    // Send to dashboard for real-time updates
    window.acSpaManager.updateACDataRealtime("AC-001", acUpdateData);
  }
}
```

### 3. 🎛️ UI CONTROL LAYER - Lớp Giao Diện Điều Khiển

**File:** `eRaServices-controls.js`
**Class:** `TemperatureController`

#### 🔧 Controller Data Processing

**Function:** `updateElectricalDisplay(current, voltage, powerConsumption)`

```javascript
updateElectricalDisplay(current, voltage, powerConsumption) {
  // STEP 1: Update internal state
  if (powerConsumption !== null && powerConsumption !== undefined) {
    this.powerConsumption = powerConsumption;
  }

  // STEP 2: Get UI elements
  const voltageElement = document.getElementById("spa-voltage-value");
  const currentElement = document.getElementById("spa-current-value");
  const powerElement = document.getElementById("spa-power-value");

  // STEP 3: Update power display with priority logic
  if (powerElement) {
    if (powerConsumption && powerConsumption > 0) {
      // Priority 1: Use actual device power consumption
      powerElement.textContent = powerConsumption.toFixed(0);
    } else if (voltage && current) {
      // Priority 2: Calculate power from V×I
      const calculatedPower = voltage * current;
      powerElement.textContent = calculatedPower.toFixed(0);
    } else {
      // Priority 3: Default fallback
      powerElement.textContent = "0";
    }
  }
}
```

### 4. 📊 DASHBOARD MANAGEMENT - Quản Lý Dashboard

**File:** `spa-management.js`
**Class:** `ACSpaManager`

#### 📋 Real-time Table Updates

**Function:** `updateDashboardTableRow(acId, acData)`

```javascript
updateDashboardTableRow(acId, acData) {
  const row = document.querySelector(`tr[data-ac-id="${acId}"]`);

  if (row) {
    // Update energy usage column with actual power consumption
    const energyUsageCell = row.querySelector(".energy-usage-cell");
    if (energyUsageCell && acData.power) {

      // PRIORITY LOGIC for power calculation
      let currentPower;
      if (acData.powerConsumption && acData.powerConsumption > 0) {
        // Use actual power consumption from device
        currentPower = acData.powerConsumption;
      } else {
        // Fallback to calculated power
        currentPower = (acData.voltage || 220) * (acData.current || 5);
      }

      // Display with efficiency indicator
      energyUsageCell.innerHTML = `${(currentPower / 1000).toFixed(1)} kW`;
    }
  }
}
```

## 🚀 ADDING NEW PROPERTIES - HƯỚNG DẪN THÊM THUỘC TÍNH MỚI

### 📋 Quy trình 8 bước chuẩn:

#### STEP 1: E-RA Configuration Setup

```javascript
// File: eRaServices-controls.js - onConfiguration
configNewProperty = configuration.realtime_configs[X]; // Add new config
```

#### STEP 2: Extract in onValues

```javascript
// File: eRaServices-controls.js - onValues
newPropertyValue = values[configNewProperty.id].value;

const deviceData = {
  // ... existing properties
  newProperty: newPropertyValue, // ← ADD HERE
};
```

#### STEP 3: Global Manager Processing

```javascript
// File: eRaServices-controls.js - updateDeviceData
const {
  targetTemp,
  currentTemp, // ... existing
  newProperty, // ← ADD TO DESTRUCTURING
} = newData;

this.deviceData = {
  // ... existing properties
  newProperty: newProperty || defaultValue, // ← ADD WITH DEFAULT
};
```

#### STEP 4: Data Distribution

```javascript
// File: eRaServices-controls.js - updateACSpaManagerData
const acUpdateData = {
  // ... existing properties
  newProperty: this.deviceData.newProperty, // ← PASS TO DASHBOARD
};
```

#### STEP 5: Controller Integration

```javascript
// File: eRaServices-controls.js - TemperatureController
constructor() {
  this.newProperty = defaultValue; // ← ADD TO CONSTRUCTOR
}

updateACDataInManager() {
  window.acSpaManager.updateACDataRealtime(this.acId, {
    // ... existing properties
    newProperty: this.newProperty, // ← ADD TO AC DATA
  });
}
```

#### STEP 6: Dashboard Processing

```javascript
// File: spa-management.js - subscribeToGlobalDeviceData
const acDataUpdate = {
  // ... existing properties
  newProperty: deviceData.newProperty, // ← ADD TO UPDATE DATA
};
```

#### STEP 7: UI Display Logic

```javascript
// File: spa-management.js - updateDashboardTableRow or createTableRow
// Add display logic for new property
const newPropertyCell = row.querySelector(".new-property-cell");
if (newPropertyCell) {
  newPropertyCell.textContent = acData.newProperty;
}
```

#### STEP 8: HTML Structure (if needed)

```html
<!-- File: spa_app.html -->
<td class="new-property-cell">Default Value</td>
<span id="spa-new-property-value">0</span>
```

## 🔍 DEBUGGING CHECKLIST - DANH SÁCH KIỂM TRA LỖI

### ✅ Data Flow Verification:

1. **E-RA Data Reception:** Check browser console for `onValues` logs
2. **Global Manager Processing:** Verify `deviceData` object contains new property
3. **Subscriber Notification:** Confirm all subscribers receive updates
4. **UI Element Existence:** Ensure target HTML elements exist
5. **Data Type Validation:** Check for null/undefined values
6. **Default Value Handling:** Verify fallback values work correctly

### 🐛 Common Issues & Solutions:

| Issue                 | Location       | Solution                       |
| --------------------- | -------------- | ------------------------------ |
| Property not updating | onValues       | Check E-RA config mapping      |
| UI not refreshing     | Global Manager | Verify subscriber registration |
| Display shows default | Dashboard      | Check HTML element IDs         |
| Data type errors      | Processing     | Add null checks and validation |

## 📝 PROPERTY EXAMPLES - VÍ DỤ CÁC THUỘC TÍNH

### ⚡ Power Consumption (FIXED ✅)

- **E-RA Config:** `configPowerConsumption`
- **Data Flow:** `currentPowerConsumption_value` → `powerConsumption`
- **UI Display:** `spa-power-value` element + Dashboard energy column
- **Priority Logic:** Device value > Calculated (V×I) > Default (0)
- **Fixes Applied:**
  1. ✅ Added to default `acData` object
  2. ✅ Fixed priority logic in `updateDashboardTableRow()`
  3. ✅ Fixed priority logic in `createTableRow()`
  4. ✅ Added debug logging in `onValues`

### 🌡️ Humidity (Example for implementation)

- **E-RA Config:** `configHumidity` (to be added)
- **Data Flow:** `humidityValue` → `humidity`
- **UI Display:** `spa-humidity-value` element (to be added)
- **Default Value:** 50%

### 💨 Air Quality (Example for implementation)

- **E-RA Config:** `configAirQuality` (to be added)
- **Data Flow:** `airQualityValue` → `airQuality`
- **UI Display:** `spa-air-quality-value` element (to be added)
- **Default Value:** "Good"

## 🎯 BEST PRACTICES - THỰC HÀNH TỐT NHẤT

1. **Always provide default values** - Luôn cung cấp giá trị mặc định
2. **Add null checks before UI updates** - Kiểm tra null trước khi cập nhật UI
3. **Use consistent naming conventions** - Sử dụng quy ước đặt tên nhất quán
4. **Log important data transitions** - Ghi log các chuyển đổi dữ liệu quan trọng
5. **Maintain backward compatibility** - Duy trì tương thích ngược
6. **Document data transformations** - Tài liệu hóa các chuyển đổi dữ liệu
7. **Test with missing/invalid data** - Test với dữ liệu thiếu/không hợp lệ
8. **Update all related functions** - Cập nhật tất cả function liên quan khi thêm property

## 🔧 POWERCONSUMPTION INTEGRATION FIXES

### Issues Found & Fixed:

1. **Missing Default Value**: ❌ → ✅

   - Added `powerConsumption: 0` to constructor's `acData` object

2. **Dashboard Table Update Logic**: ❌ → ✅

   - Fixed priority logic in `updateDashboardTableRow()`
   - Now uses actual device `powerConsumption` when available

3. **Table Row Creation Logic**: ❌ → ✅

   - Fixed priority logic in `createTableRow()`
   - Now calculates with actual power consumption first

4. **Debug Logging**: ❌ → ✅
   - Added console.log for power consumption in `onValues`

### Testing Steps:

1. ✅ Check browser console for "Power consumption from device: [value]"
2. ✅ Verify dashboard energy column shows actual power consumption
3. ✅ Confirm priority: Device Power > Calculated (V×I) > Default
4. ✅ Test with real E-RA data

---

**📞 Contact:** Khi cần hỗ trợ thêm thuộc tính mới, hãy theo đúng 8 bước trên và kiểm tra debugging checklist.
