# FIREBASE INTEGRATION GUIDE

## Hướng Dẫn Tích Hợp Firebase Realtime Database

### 📋 TỔNG QUAN SYSTEM

Hệ thống sử dụng **Firebase Realtime Database** để lưu trữ dữ liệu hóa đơn điện với kiến trúc **Hybrid Storage** (LocalStorage + Firebase).

#### 🏗️ KIẾN TRÚC TỔNG QUAN

```
User Input → LocalStorage (instant) → Firebase (background sync)
User Load ← LocalStorage (fast) ← Firebase (source of truth)
```

#### 🗂️ CẤU TRÚC DATABASE MỚI

```
Air_Conditioner/
├── $userId/
│   └── Electricity_bill/
│       ├── 2024/
│       │   ├── 01/ { kwh: 150, amount: 350000, workingDays: 22, notes: "" }
│       │   ├── 02/ { kwh: 180, amount: 420000, workingDays: 20, notes: "" }
│       │   └── ...
│       └── 2025/
│           └── ...
```

#### 🎯 FEATURES CHÍNH

- ✅ **Offline-first**: Hoạt động khi mất mạng
- ✅ **Real-time sync**: Đồng bộ tự động khi có mạng
- ✅ **Multi-device**: Sync giữa các thiết bị
- ✅ **Authentication**: Google Sign-in + Anonymous
- ✅ **Structured data**: Air Conditioner → Electricity bill → Year → Month
- ✅ **KWh + Amount**: Lưu trữ cả số điện và tiền điện
- ✅ **Conflict resolution**: Xử lý xung đột dữ liệu
- ✅ **Auto backup**: Sao lưu tự động

---

## 🔧 SETUP FIREBASE PROJECT

### Bước 1: Tạo Firebase Project

1. Truy cập [Firebase Console](https://console.firebase.google.com)
2. Click **"Create a project"**
3. Nhập tên project: `energy-saving-ac`
4. Disable Google Analytics (optional)
5. Click **"Create project"**

### Bước 2: Enable Authentication

1. Trong Firebase Console → **Authentication**
2. Click tab **"Sign-in method"**
3. Enable **"Anonymous"** và **"Google"**
4. Với Google: Nhập email hỗ trợ project

### Bước 3: Setup Realtime Database

1. Trong Firebase Console → **Realtime Database**
2. Click **"Create Database"**
3. Chọn **"Start in test mode"** (tạm thời)
4. Chọn location: **"asia-southeast1"** (Singapore)

### Bước 4: Configure Database Rules

Vào **Database → Rules** và paste đoạn code này:

```json
{
  "rules": {
    "electricity_bills": {
      "$userId": {
        ".read": "$userId === auth.uid",
        ".write": "$userId === auth.uid",
        ".validate": "newData.hasChildren(['data', 'lastModified', 'version'])",
        "data": {
          ".validate": "newData.isObject()"
        },
        "lastModified": {
          ".validate": "newData.isNumber()"
        },
        "version": {
          ".validate": "newData.isNumber()"
        }
      }
    }
  }
}
```

### Bước 5: Lấy Configuration Keys

1. Trong Firebase Console → **Project Settings** (⚙️)
2. Scroll xuống **"Your apps"**
3. Click **"Web app"** (</>) icon
4. Nhập tên app: `electricity-bill-app`
5. Copy toàn bộ `firebaseConfig` object

### Bước 6: Cập Nhật Configuration

Mở file `js/firebase-config.js` và thay thế:

```javascript
const FIREBASE_CONFIG = {
  apiKey: "your-actual-api-key",
  authDomain: "energy-saving-ac.firebaseapp.com",
  databaseURL:
    "https://energy-saving-ac-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "energy-saving-ac",
  storageBucket: "energy-saving-ac.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789012",
};
```

---

## 📁 CẤU TRÚC FILES VÀ FUNCTIONS

### 1. `firebase-storage-manager.js` - Core Storage Engine

#### 🎯 **Class: FirebaseStorageManager**

Singleton class quản lý toàn bộ storage operations.

#### 📋 **Key Methods:**

##### **Initialization & Setup**

```javascript
// Initialize Firebase with config
async init(firebaseConfig)

// Setup network event listeners
setupNetworkListeners()

// Initialize storage system in bill manager
async initializeStorage()
```

##### **Authentication Methods**

```javascript
// Sign in anonymously (auto for new users)
async signInAnonymously()

// Sign in with Google popup
async signInWithGoogle()

// Sign out current user
async signOut()

// Check if user is authenticated
isAuthenticated()

// Get current user info
getCurrentUser()
```

##### **Data Storage Methods**

```javascript
// Save bill data (hybrid: localStorage + Firebase)
async saveBillData(billData)

// Load bill data (Firebase first, localStorage fallback)
async loadBillData()

// Delete specific bill by month key
async deleteBillData(monthKey)
```

##### **Firebase Database Operations**

```javascript
// Sync local data to Firebase
async syncToFirebase(billData)

// Load data from Firebase
async loadFromFirebase()

// Delete data from Firebase
async deleteFromFirebase(monthKey)
```

##### **Sync Queue Management**

```javascript
// Add operation to sync queue when offline
addToSyncQueue(operation, data)

// Process queued operations when online
async processSyncQueue()

// Save/load sync queue to localStorage
saveSyncQueue() / loadSyncQueue()
```

##### **Utility & Helper Methods**

```javascript
// Convert Map to Object for Firebase
mapToObject(map);

// Convert Object to Map from Firebase
objectToMap(obj);

// Merge local and Firebase data with conflict resolution
mergeData(localData, firebaseData);

// Get connection and auth status
getConnectionStatus();
```

##### **Backup & Export**

```javascript
// Export all data to JSON file
async exportAllData()

// Import data from JSON file
async importData(file)
```

### 2. `firebase-config.js` - Configuration & Initialization

#### 🎯 **Constants & Setup**

```javascript
// Firebase project configuration object
const FIREBASE_CONFIG = { ... }

// Auto-initialize when DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Firebase Storage Manager
  await window.firebaseStorageManager.init(FIREBASE_CONFIG)

  // Auto sign-in anonymously
  if (!window.firebaseStorageManager.isAuthenticated()) {
    await window.firebaseStorageManager.signInAnonymously()
  }
})
```

### 3. `electricity-bill-manager.js` - Integration Layer

#### 🎯 **Updated Methods:**

##### **Storage Integration**

```javascript
// Initialize Firebase integration
async initializeStorage()

// Handle Firebase events (auth, sync, network)
handleStorageEvent(event, data)

// Firebase-aware save operation
async saveBillData(data)

// Firebase-aware load operation
async loadStoredData()
```

##### **UI Integration**

```javascript
// Update Firebase status in modal header
updateFirebaseStatusUI()

// Handle Google sign-in from UI
async handleGoogleSignIn()

// Handle sign-out from UI
async handleSignOut()
```

---

## 🎮 CÁCH SỬ DỤNG CHO DỰ ÁN HIỆN TẠI

### 1. **Setup Complete**

Sau khi setup Firebase project và update config:

```bash
# Mở spa_app.html trong browser
# Firebase sẽ tự động initialize
# Kiểm tra Console log để xem status
```

### 2. **User Flow**

```
1. User mở modal hóa đơn điện
2. Hệ thống auto sign-in anonymous
3. UI hiển thị connection status (Online/Offline)
4. User nhập dữ liệu → Lưu cục bộ + sync Firebase
5. User có thể sign-in Google để sync cross-device
6. Khi offline: Tất cả lưu cục bộ, sync khi online
```

### 3. **Kiểm Tra Functions**

```javascript
// Trong Console browser:

// Kiểm tra Firebase manager
console.log(window.firebaseStorageManager);

// Kiểm tra connection status
console.log(window.firebaseStorageManager.getConnectionStatus());

// Kiểm tra user hiện tại
console.log(window.firebaseStorageManager.getCurrentUser());

// Kiểm tra data
window.firebaseStorageManager.loadBillData().then((data) => console.log(data));
```

### 4. **Debugging Common Issues**

#### ❌ **"Firebase SDK not loaded"**

```html
<!-- Kiểm tra thứ tự scripts trong spa_app.html -->
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"></script>
```

#### ❌ **"Permission denied"**

Kiểm tra Database Rules - đảm bảo user đã authenticated.

#### ❌ **"Invalid API key"**

Kiểm tra lại `FIREBASE_CONFIG` trong `firebase-config.js`.

---

## 🚀 ÁP DỤNG CHO CÁC DỰ ÁN KHÁC

### 1. **Generic Firebase Storage Class**

Tạo file `generic-firebase-storage.js`:

```javascript
class GenericFirebaseStorage {
  constructor(config) {
    this.config = config;
    this.database = null;
    this.auth = null;
    this.dataPath = "app_data"; // Customizable data path
  }

  async init() {
    firebase.initializeApp(this.config);
    this.database = firebase.database();
    this.auth = firebase.auth();
  }

  async saveData(key, data) {
    const user = this.auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const ref = this.database.ref(`${this.dataPath}/${user.uid}/${key}`);
    await ref.set({
      data: data,
      lastModified: firebase.database.ServerValue.TIMESTAMP,
    });
  }

  async loadData(key) {
    const user = this.auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const ref = this.database.ref(`${this.dataPath}/${user.uid}/${key}`);
    const snapshot = await ref.once("value");
    return snapshot.exists() ? snapshot.val().data : null;
  }

  async deleteData(key) {
    const user = this.auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const ref = this.database.ref(`${this.dataPath}/${user.uid}/${key}`);
    await ref.remove();
  }
}
```

### 2. **Implementation Template**

Cho bất kỳ dự án nào:

```javascript
// 1. Setup Firebase project (như hướng dẫn trên)

// 2. Include Firebase scripts
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"></script>

// 3. Initialize storage
const firebaseConfig = { /* your config */ };
const storage = new GenericFirebaseStorage(firebaseConfig);
await storage.init();

// 4. Authenticate user
await firebase.auth().signInAnonymously();

// 5. Use storage methods
await storage.saveData('user_settings', { theme: 'dark' });
const settings = await storage.loadData('user_settings');
```

### 3. **Required Functions Cho Mọi Dự Án**

#### **Core Storage Interface**

```javascript
class ProjectStorageManager {
  // Required methods:
  async init(config)              // Initialize Firebase
  async saveData(key, data)       // Save data to cloud
  async loadData(key)             // Load data from cloud
  async deleteData(key)           // Delete data from cloud

  // Authentication methods:
  async signInAnonymously()       // Anonymous auth
  async signInWithGoogle()        // Google OAuth
  async signOut()                 // Sign out user

  // Offline support:
  saveToLocalStorage(key, data)   // Cache locally
  loadFromLocalStorage(key)       // Load from cache
  addToSyncQueue(operation)       // Queue for later sync
  processSyncQueue()              // Sync when online

  // Utility methods:
  isOnline()                      // Check network status
  isAuthenticated()               // Check auth status
  getConnectionStatus()           // Get full status
}
```

#### **Database Rules Template**

```json
{
  "rules": {
    "app_data": {
      "$userId": {
        ".read": "$userId === auth.uid",
        ".write": "$userId === auth.uid"
      }
    }
  }
}
```

#### **HTML Setup Template**

```html
<!-- Firebase Scripts -->
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"></script>

<!-- Your Storage Manager -->
<script src="js/storage-manager.js"></script>
<script src="js/firebase-config.js"></script>

<!-- Your App -->
<script src="js/main-app.js"></script>
```

---

## 📊 MONITORING & ANALYTICS

### 1. **Firebase Console Monitoring**

- **Authentication** → Users: Xem users đã đăng ký
- **Realtime Database** → Data: Xem cấu trúc dữ liệu
- **Realtime Database** → Usage: Xem bandwidth usage

### 2. **Client-side Monitoring**

```javascript
// Track storage events
window.firebaseStorageManager.subscribe((event, data) => {
  console.log("Storage Event:", event, data);

  // Send to analytics
  if (window.gtag) {
    gtag("event", "firebase_" + event, {
      custom_parameter: data,
    });
  }
});
```

### 3. **Performance Metrics**

```javascript
// Measure sync performance
const startTime = performance.now();
await firebaseStorageManager.saveBillData(data);
const endTime = performance.now();
console.log("Save time:", endTime - startTime, "ms");
```

---

## 🔒 SECURITY & BEST PRACTICES

### 1. **Database Security Rules**

```json
{
  "rules": {
    "electricity_bills": {
      "$userId": {
        ".read": "$userId === auth.uid",
        ".write": "$userId === auth.uid && auth.token.firebase.sign_in_provider !== null",
        ".validate": "newData.hasChildren(['data', 'lastModified', 'version']) && newData.children().length() === 3",
        "data": {
          ".validate": "newData.isObject() && newData.val() !== null"
        },
        "lastModified": {
          ".validate": "newData.isNumber() && newData.val() <= now"
        },
        "version": {
          ".validate": "newData.isNumber() && newData.val() === 1"
        }
      }
    }
  }
}
```

### 2. **Data Validation**

```javascript
// Validate data before saving
validateBillData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data format');
  }

  if (!data.amount || data.amount <= 0) {
    throw new Error('Invalid bill amount');
  }

  if (!data.consumption || data.consumption <= 0) {
    throw new Error('Invalid consumption value');
  }

  return true;
}
```

### 3. **Error Handling**

```javascript
async saveBillData(data) {
  try {
    this.validateBillData(data);
    await this.storageManager.saveBillData(data);
  } catch (error) {
    console.error('Save error:', error);

    // Log error for debugging
    this.logError('save_bill_data', error);

    // Show user-friendly message
    this.showNotification('Lỗi lưu dữ liệu. Vui lòng thử lại.', 'error');

    // Fallback to localStorage
    this.saveToLocalStorage(data);
  }
}
```

---

## 📞 TROUBLESHOOTING

### ❓ **Common Issues & Solutions**

#### **1. "Network error" khi save**

```javascript
// Solution: Implement retry mechanism
async saveWithRetry(data, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await this.saveBillData(data);
      return;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

#### **2. Data không sync giữa devices**

- Kiểm tra user đã authenticated chưa
- Kiểm tra Database Rules
- Kiểm tra network connection

#### **3. "Quota exceeded" error**

Firebase free tier limits:

- 1GB stored data
- 10GB bandwidth/month
- 50,000 simultaneous connections

#### **4. Performance chậm**

```javascript
// Solution: Implement data pagination
async loadBillDataPaginated(limit = 50) {
  const ref = this.database.ref(`electricity_bills/${user.uid}/data`)
    .orderByChild('lastModified')
    .limitToLast(limit);

  const snapshot = await ref.once('value');
  return snapshot.val();
}
```

---

## 🎯 CONCLUSION

Hệ thống Firebase Realtime Database integration này cung cấp:

- ✅ **Reliable storage** với offline support
- ✅ **Cross-device sync** cho better UX
- ✅ **Scalable architecture** dễ maintain
- ✅ **Free tier** đủ dùng cho most projects
- ✅ **Generic approach** áp dụng được cho nhiều dự án

**Next Steps:**

1. Setup Firebase project theo hướng dẫn
2. Update configuration trong code
3. Test với real data
4. Monitor performance và usage
5. Scale up plan nếu cần thiết

**Support:**

- Firebase Documentation: https://firebase.google.com/docs
- Realtime Database Guide: https://firebase.google.com/docs/database
- Authentication Guide: https://firebase.google.com/docs/auth
