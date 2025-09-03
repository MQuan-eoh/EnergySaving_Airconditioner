# Real-Time Data Architecture Documentation

## Smart Air Conditioner System - Event-Driven Data Flow

### 📋 **Table of Contents**

1. [Overview - Tổng quan hệ thống](#overview)
2. [Architecture Patterns - Các mẫu thiết kế](#patterns)
3. [Data Flow Process - Quy trình luồng dữ liệu](#dataflow)
4. [Component Breakdown - Phân tích từng thành phần](#components)
5. [Step-by-Step Implementation - Triển khai từng bước](#implementation)
6. [Key Concepts & Syntax - Khái niệm và cú pháp](#concepts)
7. [Testing & Troubleshooting - Kiểm tra và khắc phục](#testing)

---

## 🎯 **Overview - Tổng quan hệ thống** {#overview}

### **Vấn đề ban đầu:**

- Dữ liệu điều hòa chỉ hiện lên dashboard khi user đã vào control page ít nhất 1 lần
- Không có real-time sync giữa E-RA device và dashboard
- Dashboard hiển thị dữ liệu cũ, không cập nhật tự động

### **Giải pháp đã triển khai:**

- **Global Device Data Manager**: Quản lý dữ liệu tập trung
- **Event-Driven Architecture**: Hệ thống sự kiện real-time
- **Observer Pattern**: Components "lắng nghe" thay đổi dữ liệu
- **Automatic Dashboard Sync**: Tự động đồng bộ dashboard

### **Kết quả đạt được:**

✅ Dashboard hiển thị dữ liệu real-time ngay khi load page  
✅ Tự động cập nhật khi có thay đổi từ device  
✅ Visual feedback với animation khi data update  
✅ Centralized data management - quản lý dữ liệu tập trung

---

## 🏗️ **Architecture Patterns - Các mẫu thiết kế** {#patterns}

### **1. Singleton Pattern**

```javascript
class GlobalDeviceDataManager {
  constructor() {
    // Chỉ cho phép 1 instance duy nhất
    if (GlobalDeviceDataManager.instance) {
      return GlobalDeviceDataManager.instance;
    }
    GlobalDeviceDataManager.instance = this;
  }
}
```

**Giải thích:**

- **Singleton** = Chỉ có 1 object duy nhất trong toàn bộ app
- **Tại sao cần?** Đảm bảo tất cả components dùng chung 1 data manager
- **Ví dụ thực tế:** Như chỉ có 1 người quản lý kho trong công ty

### **2. Observer Pattern**

```javascript
// Subscriber đăng ký nhận thông tin
globalDataManager.subscribe((data) => {
  console.log("Received data:", data);
});

// Publisher phát thông tin đến tất cả subscribers
this.notifySubscribers(newData);
```

**Giải thích:**

- **Observer** = Mô hình "theo dõi" - một thay đổi, nhiều nơi biết
- **Ví dụ thực tế:** Như YouTube - 1 video mới, tất cả subscribers được thông báo
- **Trong app:** E-RA gửi data mới → Dashboard và Control page đều cập nhật

### **3. Event-Driven Architecture**

```javascript
// Phát sự kiện
window.acEventSystem.emit("ac-data-updated", eventData);

// Lắng nghe sự kiện
window.acEventSystem.on("ac-data-updated", (data) => {
  // Xử lý khi có sự kiện
});
```

**Giải thích:**

- **Event-Driven** = Hệ thống dựa trên sự kiện
- **Loose Coupling** = Components không phụ thuộc trực tiếp vào nhau
- **Ví dụ thực tế:** Như hệ thống chuông cửa - ai bấm chuông, ai cần biết đều nghe được

---

## 🔄 **Data Flow Process - Quy trình luồng dữ liệu** {#dataflow}

### **Bước 1: E-RA Platform → onValues Callback**

```javascript
onValues: (values) => {
  // E-RA gửi dữ liệu về qua callback này
  targetTempAir1 = values[configTargetTempAir1.id].value;
  currentTempAir1 = values[configCurrentTempAir1.id].value;
  currentModeAir1 = values[configModeAir1.id].value;
};
```

### **Bước 2: Global Manager nhận và xử lý**

```javascript
// Update Global Device Data Manager
if (window.globalDeviceDataManager) {
  const deviceData = {
    targetTemp: targetTempAir1,
    currentTemp: currentTempAir1,
    mode: currentModeAir1,
  };
  window.globalDeviceDataManager.updateDeviceData(deviceData);
}
```

### **Bước 3: Broadcast đến tất cả subscribers**

```javascript
notifySubscribers(data) {
  this.subscribers.forEach((callback) => {
    callback(data); // Gọi tất cả functions đã đăng ký
  });
}
```

### **Bước 4: ACSpaManager nhận và cập nhật Dashboard**

```javascript
subscribeToGlobalDeviceData() {
  window.globalDeviceDataManager.subscribe((deviceData) => {
    // Convert device data thành AC data format
    const acDataUpdate = {
      currentTemp: deviceData.currentTemp,
      targetTemp: deviceData.targetTemp,
      mode: this.mapDeviceValueToMode(deviceData.mode),
      power: deviceData.isPowerOn
    };

    // Update dashboard real-time
    this.updateACDataRealtime("AC-001", acDataUpdate);
  });
}
```

### **Bước 5: UI Updates với Animation**

```javascript
addUpdateIndicator(acId) {
  const row = document.querySelector(`tr[data-ac-id="${acId}"]`);
  row.classList.add("data-updated"); // CSS animation

  setTimeout(() => {
    row.classList.remove("data-updated");
  }, 2000);
}
```

---

## 🧩 **Component Breakdown - Phân tích từng thành phần** {#components}

### **A. GlobalDeviceDataManager**

**Vai trò:** Quản lý dữ liệu tập trung
**Chức năng chính:**

- `subscribe()`: Đăng ký nhận thông báo
- `updateDeviceData()`: Cập nhật dữ liệu từ device
- `notifySubscribers()`: Thông báo đến tất cả subscribers
- `mapDeviceValueToMode()`: Chuyển đổi device value thành mode string

**Ví dụ sử dụng:**

```javascript
// Đăng ký nhận dữ liệu
globalManager.subscribe((data) => {
  console.log("New data:", data);
});

// Cập nhật dữ liệu
globalManager.updateDeviceData({
  targetTemp: 25,
  currentTemp: 24,
  mode: 1,
});
```

### **B. ACSpaManager**

**Vai trò:** Quản lý AC data và dashboard
**Chức năng mới:**

- `subscribeToGlobalDeviceData()`: Subscribe nhận dữ liệu global
- `initializeDashboardWithDefaultData()`: Khởi tạo dashboard với data mặc định
- `updateDashboardTableRow()`: Cập nhật từng row trong table
- `addUpdateIndicator()`: Thêm visual feedback

### **C. Event System**

**Vai trò:** Hệ thống sự kiện

```javascript
class ACEventSystem {
  constructor() {
    this.events = {}; // Lưu trữ các event listeners
  }

  on(eventName, callback) {
    // Đăng ký lắng nghe event
  }

  emit(eventName, data) {
    // Phát event đến tất cả listeners
  }
}
```

---

## 📝 **Step-by-Step Implementation - Triển khai từng bước** {#implementation}

### **Bước 1: Tạo Global Manager**

```javascript
// File: eRaServices-controls.js
class GlobalDeviceDataManager {
  constructor() {
    // Singleton pattern
    if (GlobalDeviceDataManager.instance) {
      return GlobalDeviceDataManager.instance;
    }

    this.subscribers = []; // Array chứa callback functions
    this.deviceData = null; // Current device data
    GlobalDeviceDataManager.instance = this;
  }
}

// Tạo global instance
window.globalDeviceDataManager = new GlobalDeviceDataManager();
```

### **Bước 2: Cập nhật onValues Callback**

```javascript
onValues: (values) => {
  // ... existing code ...

  // NEW: Update global manager
  if (window.globalDeviceDataManager) {
    const deviceData = {
      targetTemp: targetTempAir1,
      currentTemp: currentTempAir1,
      mode: currentModeAir1,
    };
    window.globalDeviceDataManager.updateDeviceData(deviceData);
  }
};
```

### **Bước 3: ACSpaManager Subscribe**

```javascript
// File: spa-management.js
subscribeToGlobalDeviceData() {
  if (window.globalDeviceDataManager) {
    window.globalDeviceDataManager.subscribe((deviceData) => {
      // Process data và update dashboard
      const acDataUpdate = {
        currentTemp: deviceData.currentTemp,
        targetTemp: deviceData.targetTemp,
        mode: this.mapDeviceValueToMode(deviceData.mode),
        power: deviceData.isPowerOn
      };

      this.updateACDataRealtime("AC-001", acDataUpdate);
    });
  }
}
```

### **Bước 4: CSS Animation cho Visual Feedback**

```css
/* File: styles.css */
.data-updated {
  background: rgba(52, 199, 89, 0.1) !important;
  border-left: 3px solid var(--update-success-color) !important;
  animation: updatePulse 2s ease-in-out;
}

@keyframes updatePulse {
  0% {
    background: rgba(52, 199, 89, 0.2);
  }
  50% {
    background: rgba(52, 199, 89, 0.1);
  }
  100% {
    background: rgba(52, 199, 89, 0.05);
  }
}
```

---

## 💡 **Key Concepts & Syntax - Khái niệm và cú pháp** {#concepts}

### **1. Arrow Functions & Context Preservation**

```javascript
// Regular function - tạo context mới
function regularFunction() {
  console.log(this); // 'this' có thể khác
}

// Arrow function - giữ nguyên context
const arrowFunction = () => {
  console.log(this); // 'this' từ outer scope
};

// Trong subscribe callback
window.globalDeviceDataManager.subscribe((deviceData) => {
  // 'this' ở đây vẫn là ACSpaManager
  this.updateACDataRealtime("AC-001", acDataUpdate);
});
```

### **2. Object Destructuring**

```javascript
// Cách cũ
const targetTemp = newData.targetTemp;
const currentTemp = newData.currentTemp;
const mode = newData.mode;

// Destructuring - ngắn gọn hơn
const { targetTemp, currentTemp, mode } = newData;

// Với default values
const { targetTemp = 22, currentTemp = 22, mode = 0 } = newData;
```

### **3. Spread Operator**

```javascript
// Copy object
const oldData = { ...this.acData[acId] };

// Merge objects
this.acData[acId] = {
  ...this.acData[acId], // existing data
  ...newData, // new data (overwrites existing)
  lastUpdated: new Date().toISOString(),
};
```

### **4. Optional Chaining**

```javascript
// Cách cũ - có thể bị lỗi nếu window.spaApp null
if (window.spaApp && window.spaApp.getCurrentPage() === "dashboard") {
  // do something
}

// Optional chaining - an toàn hơn
if (window.spaApp?.getCurrentPage() === "dashboard") {
  // do something
}
```

### **5. Array Methods**

```javascript
// forEach - lặp qua array
this.subscribers.forEach((callback, index) => {
  callback(data);
});

// filter - lọc elements
const onlineACs = allACs.filter((ac) => ac.status === "online");

// map - transform elements
const acIds = allACs.map((ac) => ac.id);
```

---

## 🧪 **Testing & Troubleshooting - Kiểm tra và khắc phục** {#testing}

### **Debug Console Commands**

```javascript
// Check if Global Manager exists
console.log("Global Manager:", window.globalDeviceDataManager);

// Check subscribers count
console.log(
  "Subscribers:",
  window.globalDeviceDataManager?.subscribers?.length
);

// Check current device data
console.log("Device Data:", window.globalDeviceDataManager?.getDeviceData());

// Check AC SPA Manager
console.log("AC SPA Manager:", window.acSpaManager);

// Test subscription manually
window.globalDeviceDataManager?.updateDeviceData({
  targetTemp: 25,
  currentTemp: 24,
  mode: 1,
});
```

### **Common Issues & Solutions**

#### **Issue 1: Dashboard không cập nhật**

```javascript
// Check 1: Global manager có tồn tại?
if (!window.globalDeviceDataManager) {
  console.error("Global Device Data Manager not initialized");
}

// Check 2: ACSpaManager có subscribe?
if (!window.acSpaManager) {
  console.error("AC SPA Manager not initialized");
}

// Check 3: Event system hoạt động?
if (!window.acEventSystem) {
  console.error("Event system not available");
}
```

#### **Issue 2: Animation không hoạt động**

```css
/* Đảm bảo CSS animation được load */
.data-updated {
  background: rgba(52, 199, 89, 0.1) !important;
  animation: updatePulse 2s ease-in-out !important;
}
```

#### **Issue 3: Data không sync**

```javascript
// Check onValues có được gọi?
console.log("onValues called with:", values);

// Check device data format
console.log("Device data format:", {
  targetTemp: targetTempAir1,
  currentTemp: currentTempAir1,
  mode: currentModeAir1,
});
```

### **Performance Optimization**

#### **1. Debounce Updates**

```javascript
// Tránh update quá nhiều lần
debounceUpdate(callback, delay = 300) {
  clearTimeout(this.updateTimer);
  this.updateTimer = setTimeout(callback, delay);
}
```

#### **2. Conditional Updates**

```javascript
// Chỉ update khi đang ở dashboard
const isOnDashboard = window.spaApp?.getCurrentPage() === "dashboard";
if (isOnDashboard) {
  this.updateDashboardTableRow(acId, acData);
}
```

#### **3. Efficient DOM Updates**

```javascript
// Update từng row thay vì rebuild toàn bộ table
updateDashboardTableRow(acId, acData) {
  const row = document.querySelector(`tr[data-ac-id="${acId}"]`);
  if (row) {
    // Update specific cells
    const currentTempCell = row.querySelector(".current-temp-cell");
    currentTempCell.textContent = `${acData.currentTemp}°C`;
  }
}
```

---

## 🎯 **Summary - Tóm tắt**

### **Những gì đã implement:**

1. **Global Device Data Manager** - Quản lý dữ liệu tập trung
2. **Observer Pattern** - Components tự động nhận updates
3. **Event-Driven Architecture** - Hệ thống sự kiện real-time
4. **Real-time Dashboard Sync** - Dashboard tự động cập nhật
5. **Visual Feedback** - Animation khi data thay đổi

### **Benefits - Lợi ích:**

- ✅ Dashboard hiển thị dữ liệu real-time ngay từ đầu
- ✅ Tự động sync khi có thay đổi từ device
- ✅ Loose coupling giữa các components
- ✅ Dễ maintain và extend
- ✅ User experience tốt hơn với visual feedback

### **Architecture Flow:**

```
E-RA Device → onValues → Global Manager → Notify Subscribers →
ACSpaManager → Update Dashboard → Visual Animation
```

### **Files Modified:**

- `eRaServices-controls.js` - Global Device Data Manager
- `spa-management.js` - ACSpaManager updates
- `styles.css` - Animation styles
- `event-system.js` - Event handling

### **Next Steps - Bước tiếp theo:**

1. Add error handling và retry logic
2. Implement data persistence với localStorage
3. Add connection status indicator
4. Performance monitoring và optimization
