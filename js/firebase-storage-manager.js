/**
 * FIREBASE STORAGE MANAGER
 * Hybrid storage system: LocalStorage + Firebase Realtime Database
 *
 * FEATURES:
 * - Offline-first approach with LocalStorage cache
 * - Real-time sync with Firebase when online
 * - Auto conflict resolution
 * - Data backup and restore
 * - User authentication integration
 *
 * ARCHITECTURE:
 * User Input → LocalStorage (instant) → Firebase (background sync)
 * User Load ← LocalStorage (fast) ← Firebase (source of truth)
 */

class FirebaseStorageManager {
  constructor() {
    if (FirebaseStorageManager.instance) {
      return FirebaseStorageManager.instance;
    }

    this.initialized = false;
    this.database = null;
    this.auth = null;
    this.currentUser = null;
    this.isOnline = navigator.onLine;
    this.syncQueue = [];
    this.observers = [];

    // Storage keys
    this.CACHE_KEY = "electricity_bills_cache";
    this.SYNC_QUEUE_KEY = "firebase_sync_queue";
    this.USER_KEY = "firebase_user_cache";

    FirebaseStorageManager.instance = this;
    this.setupNetworkListeners();
    console.log("Firebase Storage Manager initialized");
  }

  /**
   * INITIALIZE FIREBASE
   * Setup Firebase configuration and auto-authentication
   */
  async init(firebaseConfig) {
    try {
      if (this.initialized) {
        console.warn("Firebase Storage Manager already initialized");
        return true;
      }

      // Initialize Firebase (optional - can work without it)
      if (window.firebase) {
        try {
          firebase.initializeApp(firebaseConfig);
          this.database = firebase.database();
          this.auth = firebase.auth();

          // Setup authentication state listener
          this.auth.onAuthStateChanged((user) => {
            this.handleAuthStateChange(user);
          });
        } catch (firebaseError) {
          console.warn(
            "Firebase initialization failed, using offline mode:",
            firebaseError
          );
          this.database = null;
          this.auth = null;
        }
      } else {
        console.warn("Firebase SDK not loaded. Running in offline-only mode.");
        this.database = null;
        this.auth = null;
      }

      // Auto sign-in (works with or without Firebase)


      // Try to restore cached user session
      await this.restoreUserSession();

      this.initialized = true;
      console.log(
        " Storage Manager ready! Mode:",
        this.database ? "Firebase + Local" : "Local only"
      );
      return true;
    } catch (error) {
      console.error("Storage Manager initialization failed:", error);
      // Still initialize in offline mode

      this.initialized = true;
      this.showNotification("Chạy ở chế độ offline", "warning");
      return false;
    }
  }

  /**
   * GET OR CREATE DEVICE ID
   * Generate persistent device identifier
   */
  getOrCreateDeviceId() {
    const DEVICE_ID_KEY = "air_conditioner_device_id";

    // Try to get existing device ID
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);

    if (!deviceId) {
      // Generate new device ID
      deviceId =
        "device_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
      console.log("Created new device ID:", deviceId);
    }

    return deviceId;
  }
  /**
   * DATA STORAGE METHODS
   * Enhanced to work with new Air Conditioner structure
   */
  async saveBillData(billData) {
    try {
      // Save to LocalStorage immediately (offline-first)
      this.saveToLocalStorage(billData);

      // Queue for Firebase sync if user is authenticated
      if (this.currentUser && this.isOnline) {
        await this.syncToFirebase(billData);
      } else {
        this.addToSyncQueue("save", billData);
      }

      this.notifyObservers("data_saved", billData);
      return true;
    } catch (error) {
      console.error("Save bill data failed:", error);
      this.showNotification("Lỗi lưu dữ liệu. Đã lưu offline.", "warning");
      return false;
    }
  }

  /**
   * SAVE SINGLE MONTH BILL
   * Save individual month data efficiently
   */
  async saveSingleMonthBill(year, month, billData) {
    try {
      const monthKey = `${year}-${String(month).padStart(2, "0")}`;

      // Update local storage
      const allData = this.loadFromLocalStorage();
      allData.set(monthKey, {
        kwh: parseFloat(billData.kwh) || 0,
        amount: parseFloat(billData.amount) || 0,
        workingDays: billData.workingDays || 0,
        notes: billData.notes || "",
        lastModified: Date.now(),
      });
      this.saveToLocalStorage(allData);

      // Sync to Firebase
      if (this.currentUser && this.isOnline) {
        await this.saveSingleMonthToFirebase(
          year,
          String(month).padStart(2, "0"),
          billData
        );
      } else {
        this.addToSyncQueue("save_month", { year, month, data: billData });
      }

      this.notifyObservers("month_saved", { year, month, data: billData });
      this.showNotification(
        `Đã lưu tiền điện tháng ${month}/${year}`,
        "success"
      );
      return true;
    } catch (error) {
      console.error("Save single month failed:", error);
      this.showNotification("Lỗi lưu dữ liệu tháng", "error");
      return false;
    }
  }

  async loadBillData() {
    try {
      // Load from LocalStorage first (fast)
      const cachedData = this.loadFromLocalStorage();

      // Sync from Firebase if online and authenticated
      if (this.currentUser && this.isOnline) {
        const firebaseData = await this.loadFromFirebase();
        if (firebaseData) {
          // Merge and resolve conflicts
          const mergedData = this.mergeData(cachedData, firebaseData);
          this.saveToLocalStorage(mergedData);
          this.notifyObservers("data_synced", mergedData);
          return mergedData;
        }
      }

      return cachedData;
    } catch (error) {
      console.error("Load bill data failed:", error);
      // Fallback to cached data
      return this.loadFromLocalStorage();
    }
  }

  async deleteBillData(monthKey) {
    try {
      // Delete from LocalStorage
      const cachedData = this.loadFromLocalStorage();
      if (cachedData.has && cachedData.has(monthKey)) {
        cachedData.delete(monthKey);
        this.saveToLocalStorage(cachedData);
      }

      // Queue for Firebase sync
      if (this.currentUser && this.isOnline) {
        await this.deleteFromFirebase(monthKey);
      } else {
        this.addToSyncQueue("delete", { monthKey });
      }

      this.notifyObservers("data_deleted", monthKey);
      return true;
    } catch (error) {
      console.error("Delete bill data failed:", error);
      return false;
    }
  }

  /**
   * FIREBASE REALTIME DATABASE METHODS
   * Structure: Air_Conditioner/$userId/Electricity_bill/$year/$month
   * Works with both Firebase users and device-based users
   */
  async syncToFirebase(billData) {
    // Skip Firebase sync if no database connection or user
    if (!this.currentUser || !this.database) {
      console.log("Skipping Firebase sync - no connection or user");
      return false;
    }

    try {
      const userRef = this.database.ref(
        `Air_Conditioner/${this.currentUser.uid}/Electricity_bill`
      );

      // Convert Map to structured data for Firebase
      const promises = [];

      for (const [monthKey, data] of billData.entries()) {
        const [year, month] = monthKey.split("-");

        // Structure data according to requirements
        const monthData = {
          kwh: parseFloat(data.kwh) || 0,
          amount: parseFloat(data.amount) || 0,
          lastModified: this.database
            ? firebase.database.ServerValue.TIMESTAMP
            : Date.now(),
          workingDays: data.workingDays || 0,
          notes: data.notes || "",
        };

        const monthRef = userRef.child(`${year}/${month}`);
        promises.push(monthRef.set(monthData));
      }

      await Promise.all(promises);
      console.log("✅ Data synced to Firebase with new structure");
      return true;
    } catch (error) {
      console.error("Firebase sync failed:", error);
      this.addToSyncQueue("save", billData);
      return false;
    }
  }

  async loadFromFirebase() {
    if (!this.currentUser || !this.database) return null;

    try {
      const userRef = this.database.ref(
        `Air_Conditioner/${this.currentUser.uid}/Electricity_bill`
      );
      const snapshot = await userRef.once("value");

      if (snapshot.exists()) {
        const firebaseData = snapshot.val();
        const billMap = new Map();

        // Convert structured Firebase data back to Map format
        for (const [year, yearData] of Object.entries(firebaseData)) {
          for (const [month, monthData] of Object.entries(yearData)) {
            const monthKey = `${year}-${month}`;
            billMap.set(monthKey, {
              // Firebase data fields
              kwh: monthData.kwh || 0,
              amount: monthData.amount || 0,
              workingDays: monthData.workingDays || 0,
              notes: monthData.notes || "",
              lastModified: monthData.lastModified || Date.now(),

              // Essential fields for JavaScript processing
              year: parseInt(year),
              month: parseInt(month) - 1, // Convert from 1-indexed to 0-indexed for JS

              // Alternative field names for compatibility
              billAmount: monthData.amount || 0,
              powerConsumption: monthData.kwh || 0,
              workingDaysCount: monthData.workingDays || 0,
            });
          }
        }

        console.log(`Loaded ${billMap.size} bills from Firebase`);
        return billMap;
      }

      return new Map();
    } catch (error) {
      console.error("Firebase load failed:", error);
      return null;
    }
  }

  /**
   * SAVE SINGLE MONTH DATA
   * Save data for specific month with new structure
   */
  async saveSingleMonthToFirebase(year, month, monthData) {
    if (!this.currentUser || !this.database) return false;

    try {
      const monthRef = this.database.ref(
        `Air_Conditioner/${this.currentUser.uid}/Electricity_bill/${year}/${month}`
      );

      const firebaseData = {
        kwh: parseFloat(monthData.kwh) || 0,
        amount: parseFloat(monthData.amount) || 0,
        lastModified: firebase.database.ServerValue.TIMESTAMP,
        workingDays: monthData.workingDays || 0,
        notes: monthData.notes || "",
      };

      await monthRef.set(firebaseData);
      console.log(`Saved ${year}-${month} to Firebase`);
      return true;
    } catch (error) {
      console.error("Save single month failed:", error);
      return false;
    }
  }

  /**
   * LOAD SINGLE MONTH DATA
   * Load data for specific month
   */
  async loadSingleMonthFromFirebase(year, month) {
    if (!this.currentUser || !this.database) return null;

    try {
      const monthRef = this.database.ref(
        `Air_Conditioner/${this.currentUser.uid}/Electricity_bill/${year}/${month}`
      );

      const snapshot = await monthRef.once("value");

      if (snapshot.exists()) {
        const data = snapshot.val();
        return {
          kwh: data.kwh || 0,
          amount: data.amount || 0,
          workingDays: data.workingDays || 0,
          notes: data.notes || "",
          lastModified: data.lastModified || Date.now(),
        };
      }

      return null;
    } catch (error) {
      console.error("Load single month failed:", error);
      return null;
    }
  }

  /**
   * LOAD YEAR DATA
   * Load all months data for specific year
   */
  async loadYearFromFirebase(year) {
    if (!this.currentUser || !this.database) return null;

    try {
      const yearRef = this.database.ref(
        `Air_Conditioner/${this.currentUser.uid}/Electricity_bill/${year}`
      );

      const snapshot = await yearRef.once("value");

      if (snapshot.exists()) {
        const yearData = snapshot.val();
        const yearMap = new Map();

        for (const [month, monthData] of Object.entries(yearData)) {
          const monthKey = `${year}-${month}`;
          yearMap.set(monthKey, {
            kwh: monthData.kwh || 0,
            amount: monthData.amount || 0,
            workingDays: monthData.workingDays || 0,
            notes: monthData.notes || "",
            lastModified: monthData.lastModified || Date.now(),
          });
        }

        return yearMap;
      }

      return new Map();
    } catch (error) {
      console.error("Load year data failed:", error);
      return null;
    }
  }

  async deleteFromFirebase(monthKey) {
    if (!this.currentUser || !this.database) return false;

    try {
      const [year, month] = monthKey.split("-");
      const monthRef = this.database.ref(
        `Air_Conditioner/${this.currentUser.uid}/Electricity_bill/${year}/${month}`
      );

      await monthRef.remove();
      console.log(`Deleted ${monthKey} from Firebase`);
      return true;
    } catch (error) {
      console.error("Firebase delete failed:", error);
      return false;
    }
  }

  /**
   * LOCALSTORAGE METHODS
   */
  saveToLocalStorage(billData) {
    try {
      const dataObject = this.mapToObject(billData);
      localStorage.setItem(
        this.CACHE_KEY,
        JSON.stringify({
          data: dataObject,
          lastModified: Date.now(),
          version: 1,
        })
      );
      return true;
    } catch (error) {
      console.error("LocalStorage save failed:", error);
      return false;
    }
  }

  loadFromLocalStorage() {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const parsedData = JSON.parse(cached);
        return this.objectToMap(parsedData.data || {});
      }
      return new Map();
    } catch (error) {
      console.error("LocalStorage load failed:", error);
      return new Map();
    }
  }

  /**
   * SYNC QUEUE MANAGEMENT
   */
  addToSyncQueue(operation, data) {
    const syncItem = {
      id: Date.now(),
      operation,
      data,
      timestamp: Date.now(),
      retries: 0,
    };

    this.syncQueue.push(syncItem);
    this.saveSyncQueue();
    console.log("Added to sync queue:", operation);
  }

  async processSyncQueue() {
    if (!this.currentUser || !this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    console.log(`Processing ${this.syncQueue.length} queued operations...`);

    const processedItems = [];

    for (const item of this.syncQueue) {
      try {
        let success = false;

        switch (item.operation) {
          case "save":
            success = await this.syncToFirebase(item.data);
            break;
          case "save_month":
            success = await this.saveSingleMonthToFirebase(
              item.data.year,
              String(item.data.month).padStart(2, "0"),
              item.data.data
            );
            break;
          case "delete":
            success = await this.deleteFromFirebase(item.data.monthKey);
            break;
          case "delete_month":
            success = await this.deleteFromFirebase(
              `${item.data.year}-${String(item.data.month).padStart(2, "0")}`
            );
            break;
        }

        if (success) {
          processedItems.push(item.id);
        } else {
          item.retries++;
          if (item.retries >= 3) {
            console.warn("Max retries reached for sync item:", item);
            processedItems.push(item.id);
          }
        }
      } catch (error) {
        console.error("Sync queue processing error:", error);
        item.retries++;
      }
    }

    // Remove processed items
    this.syncQueue = this.syncQueue.filter(
      (item) => !processedItems.includes(item.id)
    );
    this.saveSyncQueue();

    if (processedItems.length > 0) {
      this.showNotification(
        `Đồng bộ ${processedItems.length} thay đổi thành công!`,
        "success"
      );
    }
  }

  saveSyncQueue() {
    try {
      localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error("Save sync queue failed:", error);
    }
  }

  loadSyncQueue() {
    try {
      const cached = localStorage.getItem(this.SYNC_QUEUE_KEY);
      if (cached) {
        this.syncQueue = JSON.parse(cached);
      }
    } catch (error) {
      console.error("Load sync queue failed:", error);
      this.syncQueue = [];
    }
  }

  /**
   * DATA UTILITY METHODS
   */
  mapToObject(map) {
    if (!map || typeof map.entries !== "function") return {};

    const obj = {};
    for (const [key, value] of map.entries()) {
      obj[key] = value;
    }
    return obj;
  }

  objectToMap(obj) {
    const map = new Map();
    for (const [key, value] of Object.entries(obj)) {
      map.set(key, value);
    }
    return map;
  }

  mergeData(localData, firebaseData) {
    if (!localData) return firebaseData;
    if (!firebaseData) return localData;

    const merged = new Map(firebaseData);

    // Merge local changes (simple last-write-wins for now)
    for (const [key, value] of localData.entries()) {
      if (
        !merged.has(key) ||
        value.lastModified > (merged.get(key).lastModified || 0)
      ) {
        merged.set(key, value);
      }
    }

    return merged;
  }

  /**
   * SESSION MANAGEMENT
   * Support both Firebase users and device-based users
   */
  cacheUserSession(user) {
    try {
      const userData = {
        uid: user.uid,
        displayName: user.displayName || "Local User",
        email: user.email || null,
        photoURL: user.photoURL || null,
        isAnonymous: user.isAnonymous || false,
        deviceBased: user.deviceBased || false,
        lastActive: Date.now(),
      };
      localStorage.setItem(this.USER_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error("Cache user session failed:", error);
    }
  }

  async restoreUserSession() {
    try {
      const cached = localStorage.getItem(this.USER_KEY);
      if (cached) {
        const userData = JSON.parse(cached);

        // Check if session is still valid (less than 30 days old)
        const daysSinceLastActive =
          (Date.now() - (userData.lastActive || 0)) / (1000 * 60 * 60 * 24);

        if (daysSinceLastActive < 30) {
          console.log(
            "Restoring user session for:",
            userData.displayName || userData.uid
          );

          // If it's a device-based user, recreate the user object
          if (userData.deviceBased) {
            this.currentUser = {
              uid: userData.uid,
              displayName: userData.displayName,
              isAnonymous: true,
              deviceBased: true,
            };
          }
          // Firebase users will be restored automatically by Firebase Auth
        } else {
          console.log("User session expired, will create new one");
          this.clearUserSession();
        }
      }
    } catch (error) {
      console.error("Restore user session failed:", error);
    }
  }

  clearUserSession() {
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * EVENT HANDLERS
   */
  handleAuthStateChange(user) {
    const wasSignedIn = !!this.currentUser;
    this.currentUser = user;

    if (user && !wasSignedIn) {
      console.log("User signed in:", user.displayName || user.uid);
      this.loadSyncQueue();
      this.processSyncQueue();
      this.notifyObservers("user_signed_in", user);
    } else if (!user && wasSignedIn) {
      console.log("User signed out");
      this.syncQueue = [];
      this.notifyObservers("user_signed_out", null);
    }
  }

  setupNetworkListeners() {
    window.addEventListener("online", () => {
      console.log("Network: Online");
      this.isOnline = true;
      this.showNotification("Kết nối mạng đã khôi phục!", "success");
      this.processSyncQueue();
      this.notifyObservers("network_online", true);
    });

    window.addEventListener("offline", () => {
      console.log("Network: Offline");
      this.isOnline = false;
      this.showNotification("Mất kết nối mạng. Chế độ offline.", "warning");
      this.notifyObservers("network_offline", false);
    });
  }

  /**
   * BACKUP AND EXPORT METHODS
   * Export data with new Air Conditioner structure
   */
  async exportAllData() {
    try {
      const allData = await this.loadBillData();

      // Organize data by year and month for better structure
      const organizedData = {};

      for (const [monthKey, billData] of allData.entries()) {
        const [year, month] = monthKey.split("-");

        if (!organizedData[year]) {
          organizedData[year] = {};
        }

        organizedData[year][month] = {
          kwh: billData.kwh || 0,
          amount: billData.amount || 0,
          workingDays: billData.workingDays || 0,
          notes: billData.notes || "",
          lastModified: billData.lastModified || Date.now(),
        };
      }

      const exportData = {
        Air_Conditioner: {
          Electricity_bill: organizedData,
        },
        exportDate: new Date().toISOString(),
        version: 2, // Updated version for new structure
        structure: "Air_Conditioner/Electricity_bill/Year/Month",
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `air-conditioner-bills-backup-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showNotification("Xuất dữ liệu thành công!", "success");
      return true;
    } catch (error) {
      console.error("Export data failed:", error);
      this.showNotification("Lỗi xuất dữ liệu!", "error");
      return false;
    }
  }

  async importData(file) {
    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      let billsMap = new Map();

      // Handle different versions and structures
      if (importData.version === 2 && importData.Air_Conditioner) {
        // New structure: Air_Conditioner/Electricity_bill/Year/Month
        const electricityBills = importData.Air_Conditioner.Electricity_bill;

        for (const [year, yearData] of Object.entries(electricityBills)) {
          for (const [month, monthData] of Object.entries(yearData)) {
            const monthKey = `${year}-${month}`;
            billsMap.set(monthKey, {
              kwh: monthData.kwh || 0,
              amount: monthData.amount || 0,
              workingDays: monthData.workingDays || 0,
              notes: monthData.notes || "",
              lastModified: monthData.lastModified || Date.now(),
            });
          }
        }
      } else if (importData.version === 1 && importData.bills) {
        // Old structure compatibility
        billsMap = this.objectToMap(importData.bills);
      } else {
        throw new Error("Invalid backup file format or unsupported version");
      }

      await this.saveBillData(billsMap);
      this.showNotification(
        `Nhập dữ liệu thành công! ${billsMap.size} tháng`,
        "success"
      );
      return true;
    } catch (error) {
      console.error("Import data failed:", error);
      this.showNotification(
        "Lỗi nhập dữ liệu! Kiểm tra định dạng file.",
        "error"
      );
      return false;
    }
  }

  /**
   * OBSERVER PATTERN FOR EXTERNAL INTEGRATIONS
   */
  subscribe(observer) {
    this.observers.push(observer);
  }

  unsubscribe(observer) {
    this.observers = this.observers.filter((obs) => obs !== observer);
  }

  notifyObservers(event, data) {
    this.observers.forEach((observer) => {
      if (typeof observer === "function") {
        observer(event, data);
      } else if (observer[event]) {
        observer[event](data);
      }
    });
  }

  /**
   * UTILITY METHODS
   */
  showNotification(message, type = "info") {
    // Integrate with your notification system
    console.log(`[${type.toUpperCase()}] ${message}`);

    // If you have a notification manager, use it
    if (window.notificationManager) {
      window.notificationManager.show(message, type);
    }
  }

  /**
   * PUBLIC API METHODS
   */
  isAuthenticated() {
    return !!this.currentUser;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getConnectionStatus() {
    return {
      isOnline: this.isOnline,
      isAuthenticated: this.isAuthenticated(),
      hasFirebase: !!this.database,
      userType: this.currentUser?.deviceBased
        ? "device"
        : this.currentUser?.isAnonymous
        ? "anonymous"
        : "google",
      pendingSyncItems: this.syncQueue.length,
    };
  }

  /**
   * CHECK IF GOOGLE SIGN-IN IS AVAILABLE
   */
  canSignInWithGoogle() {
    return !!(this.auth && window.firebase?.auth?.GoogleAuthProvider);
  }

  /**
   * CLEANUP METHOD
   */
  destroy() {
    this.observers = [];
    this.syncQueue = [];
    if (this.auth) {
      this.auth.signOut();
    }
  }
}

// Initialize global instance when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.firebaseStorageManager = new FirebaseStorageManager();
  console.log("Firebase Storage Manager global instance created");
});

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = FirebaseStorageManager;
}
