/**
 * FIREBASE CONFIGURATION
 * Setup Firebase project configuration for Electricity Bill Management System
 *
 * IMPORTANT: Replace these values with your actual Firebase project configuration
 * Get these values from: Firebase Console > Project Settings > General > Your apps
 */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCi-XsnFB_0--PMA_xSCwtcZ66ATUAX7_c",
  authDomain: "energysaving-air.firebaseapp.com",
  databaseURL:
    "https://energysaving-air-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "energysaving-air",
  storageBucket: "energysaving-air.firebasestorage.app",
  messagingSenderId: "125415480861",
  appId: "1:125415480861:web:8678e641cdbe7a5fc630f4",
  measurementId: "G-NW7TNV5J1E",
};

/**
 * FIREBASE INITIALIZATION
 * Initialize Firebase with configuration when DOM is ready
 * Auto-creates user without requiring Google sign-in
 */
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Check if FirebaseStorageManager is available
    if (!window.firebaseStorageManager) {
      console.error(
        "FirebaseStorageManager not found. Please include firebase-storage-manager.js"
      );
      return;
    }

    // Initialize Firebase Storage Manager (works with or without Firebase)
    const initSuccess = await window.firebaseStorageManager.init(
      FIREBASE_CONFIG
    );

    if (initSuccess) {
      console.log("Storage Manager initialized successfully!");

      // Auto-create user (anonymous or device-based)
      // No manual sign-in required!
      const user = window.firebaseStorageManager.getCurrentUser();
      if (user) {
        console.log(" Auto-signed user:", user.displayName || user.uid);
      }

      // Subscribe to storage events
      window.firebaseStorageManager.subscribe((event, data) => {
        console.log("Storage Event:", event, data);

        // Notify other components about storage events
        if (window.electricityBillManager) {
          window.electricityBillManager.notify("firebase_" + event, data);
        }
      });
    } else {
      console.log(" Running in offline mode only");
    }
  } catch (error) {
    console.error("Storage setup error:", error);
  }
});

/**
 * FIREBASE RULES REFERENCE
 * Copy these rules to Firebase Console > Realtime Database > Rules
 *
 * DATABASE STRUCTURE:
 * Air_Conditioner/
 *   $userId/
 *     Electricity_bill/
 *       $year/
 *         $month/
 *           kwh: number
 *           amount: number
 *           lastModified: timestamp
 *           workingDays: number (optional)
 *           notes: string (optional)
 *
 * {
 *   "rules": {
 *     "Air_Conditioner": {
 *       "$userId": {
 *         ".read": "$userId === auth.uid",
 *         ".write": "$userId === auth.uid",
 *         "Electricity_bill": {
 *           "$year": {
 *             ".validate": "$year.matches(/^20[0-9]{2}$/)",
 *             "$month": {
 *               ".validate": "$month.matches(/^(0[1-9]|1[0-2])$/)",
 *               ".validate": "newData.hasChildren(['kwh', 'amount'])",
 *               "kwh": {
 *                 ".validate": "newData.isNumber() && newData.val() >= 0"
 *               },
 *               "amount": {
 *                 ".validate": "newData.isNumber() && newData.val() >= 0"
 *               },
 *               "lastModified": {
 *                 ".validate": "newData.isNumber()"
 *               },
 *               "workingDays": {
 *                 ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 31"
 *               },
 *               "notes": {
 *                 ".validate": "newData.isString() && newData.val().length <= 500"
 *               }
 *             }
 *           }
 *         }
 *       }
 *     }
 *   }
 * }
 */

// Export configuration for other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = { FIREBASE_CONFIG };
}
