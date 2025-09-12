# Visual Data Flow Diagram

## Smart AC Real-time Data Architecture

```
📱 E-RA IoT Platform
         │
         │ Real-time Data
         ▼
┌─────────────────────────────────────────────────┐
│           onValues Callback                     │
│  - targetTempAir1 = values[config].value       │
│  - currentTempAir1 = values[config].value      │
│  - currentModeAir1 = values[config].value      │
└─────────────────────────────────────────────────┘
         │
         │ Device Data Object
         ▼
┌─────────────────────────────────────────────────┐
│      🌐 Global Device Data Manager             │
│      (Singleton Pattern)                       │
│                                                │
│  ┌─ updateDeviceData(newData) ──────────────┐  │
│  │  • Process raw device data               │  │
│  │  • Add timestamp & power status          │  │
│  │  • Store in this.deviceData              │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  ┌─ notifySubscribers(data) ────────────────┐  │
│  │  • Loop through this.subscribers[]       │  │
│  │  • Call each callback function           │  │
│  │  • Broadcast to all listeners            │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
         │
         │ Broadcast Event
         ├─────────────────────────┬─────────────────────────
         ▼                         ▼                         ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   🎛️ ACSpaManager   │    │ 🌡️ Temperature      │    │  📊 Future          │
│   (Dashboard)       │    │   Controller        │    │    Components       │
│                     │    │   (Control Page)    │    │                     │
│ ┌─ subscribe() ───┐ │    │ ┌─ subscribe() ───┐ │    │ ┌─ subscribe() ───┐ │
│ │ • Listen for    │ │    │ │ • Listen for    │ │    │ │ • Listen for    │ │
│ │   data changes  │ │    │ │   data changes  │ │    │ │   data changes  │ │
│ │ • Convert to    │ │    │ │ • Update UI     │ │    │ │ • Custom logic  │ │
│ │   AC format     │ │    │ │   displays      │ │    │ │   here          │ │
│ └─────────────────┘ │    │ └─────────────────┘ │    │ └─────────────────┘ │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
         │
         │ AC Data Update
         ▼
┌─────────────────────────────────────────────────┐
│     updateACDataRealtime("AC-001", data)       │
│                                                │
│  ┌─ Update Internal Data Store ─────────────┐  │
│  │  this.acData["AC-001"] = {                │  │
│  │    ...existingData,                       │  │
│  │    ...newData,                            │  │
│  │    lastUpdated: timestamp                 │  │
│  │  }                                        │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  ┌─ Emit Event ──────────────────────────────┐  │
│  │  acEventSystem.emit("ac-data-updated", {  │  │
│  │    acId: "AC-001",                        │  │
│  │    data: updatedData,                     │  │
│  │    changes: newData                       │  │
│  │  })                                       │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
         │
         │ Event Broadcast
         ▼
┌─────────────────────────────────────────────────┐
│        🎯 Event System Listeners               │
│                                                │
│  ┌─ Dashboard Auto-Refresh ─────────────────┐  │
│  │  • Check if on dashboard page            │  │
│  │  • Update specific table row             │  │
│  │  • Update statistics counters            │  │
│  │  • Add visual feedback animation         │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  ┌─ Control Page Updates ───────────────────┐  │
│  │  • Update temperature displays           │  │
│  │  • Update mode buttons                   │  │
│  │  • Update power status                   │  │
│  │  • Update AC image                       │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
         │
         │ UI Updates
         ▼
┌─────────────────────────────────────────────────┐
│            🖥️ User Interface                    │
│                                                │
│  ┌─ Dashboard Table ─────────────────────────┐  │
│  │  • Real-time temperature updates         │  │
│  │  • Status badge changes                  │  │
│  │  • Mode badge updates                    │  │
│  │  • Power toggle states                   │  │
│  │  • Green animation on changes 🟢         │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  ┌─ Statistics Cards ───────────────────────┐  │
│  │  • Online/Offline counts                 │  │
│  │  • Total devices counter                 │  │
│  │  • Auto-calculated from data             │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  ┌─ Control Interface ──────────────────────┐  │
│  │  • Temperature displays                  │  │
│  │  • Mode button states                    │  │
│  │  • Power button status                   │  │
│  │  • AC status indicators                  │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## 🔄 **Data Transformation Flow**

```
📡 Raw E-RA Data:
{
  configTargetTempAir1.id: { value: 22 },
  configCurrentTempAir1.id: { value: 24 },
  configModeAir1.id: { value: 1 }
}
         │ Extract Values
         ▼
🔧 Processed Device Data:
{
  targetTemp: 22,
  currentTemp: 24,
  mode: 1
}
         │ Add Metadata
         ▼
🌐 Global Manager Data:
{
  targetTemp: 22,
  currentTemp: 24,
  mode: 1,
  timestamp: "2025-09-03T10:30:00.000Z",
  isPowerOn: true  // mode > 0
}
         │ Convert Format
         ▼
🎛️ AC Manager Data:
{
  currentTemp: 24,
  targetTemp: 22,
  mode: "cool",     // 1 → "cool"
  power: true,      // isPowerOn
  status: "online",
  lastUpdated: "2025-09-03T10:30:00.000Z"
}
         │ Merge with Existing
         ▼
💾 Final AC Data Store:
{
  "AC-001": {
    id: "AC-001",
    location: "Living Room",
    status: "online",
    currentTemp: 24,   // ← Updated
    targetTemp: 22,    // ← Updated
    mode: "cool",      // ← Updated
    power: true,       // ← Updated
    lastUpdated: "2025-09-03T10:30:00.000Z"
  }
}
```

## 🎭 **Observer Pattern in Action**

```
📢 Publisher (Global Manager)
│
├── 👂 Subscriber 1: ACSpaManager
│   └── Action: Update dashboard table
│
├── 👂 Subscriber 2: TemperatureController
│   └── Action: Update control interface
│
├── 👂 Subscriber 3: Future Analytics Module
│   └── Action: Log data for analytics
│
└── 👂 Subscriber 4: Future Notification System
    └── Action: Send alerts if needed

🔄 When Global Manager calls notifySubscribers():
   All subscribers receive the same data simultaneously
   Each subscriber processes it according to their needs
   No direct dependencies between subscribers
```

## 🏗️ **Architecture Benefits**

```
❌ Before (Tightly Coupled):
E-RA → onValues → TemperatureController → ACSpaManager → Dashboard
     (Only works when control page visited first)

✅ After (Loosely Coupled):
E-RA → onValues → GlobalManager → [ACSpaManager, TempController, ...] → UI
     (Works immediately from any page)
```

## 📊 **Performance Characteristics**

```
⚡ Update Speed: ~50ms from device to UI
🔄 Update Frequency: Real-time (as fast as E-RA sends)
💾 Memory Usage: Minimal (only current data stored)
🔧 Scalability: Easy to add new subscribers
🛡️ Error Handling: Isolated failures don't break system
```

## 🧪 **Testing Flow**

```
1. 🏁 Start Test
   │
2. 📡 Simulate E-RA Data
   │ globalManager.updateDeviceData(testData)
   │
3. ✅ Verify Global Manager
   │ Check data stored correctly
   │
4. ✅ Verify Subscribers Notified
   │ Check callbacks executed
   │
5. ✅ Verify UI Updates
   │ Check dashboard table changes
   │ Check animations appear
   │
6. ✅ Verify Event System
   │ Check events emitted/received
   │
7. 🎯 Test Complete
```

---

**📝 Lưu ý:** Diagram này minh họa luồng dữ liệu real-time từ E-RA device đến user interface, cho thấy cách các component tương tác với nhau thông qua các design patterns đã implement.
