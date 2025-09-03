class ACEventSystem {
  constructor() {
    this.events = {};
  }

  // Subscribe to events
  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(callback);
  }

  // Emit events
  emit(eventName, data) {
    if (this.events[eventName]) {
      this.events[eventName].forEach((callback) => callback(data));
    }
  }
}

// Initialize the global event system
window.acEventSystem = new ACEventSystem();

// Log initialization for debugging
console.log("AC Event System initialized successfully");
