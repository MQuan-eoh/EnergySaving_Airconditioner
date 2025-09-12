# Event-Driven Architecture Practice Guide

## PRACTICE TASKS - Complete the TODOs

### TASK 1: Complete Demo Data (File: demo-event-system.js)

**Location**: Lines 12-18
**Task**: Add missing AC data objects

```javascript
// TODO: Add AC-002 data object
"AC-002": {
  id: "AC-002",
  location: "Bedroom",        // Your code
  status: "offline",          // Your code
  currentTemp: 26,           // Your code
  targetTemp: 20,            // Your code
  mode: "cool",              // Your code
  power: false,              // Your code
}

// TODO: Add AC-003 data object
// Create similar structure for kitchen AC
```

### TASK 2: Add Missing Constructor Property

**Location**: Line 29
**Task**: Add lastEventType property

```javascript
constructor() {
  this.acData = {...DEMO_AC_DATA};
  this.eventCounter = 0;
  // TODO: Add this.lastEventType = 'none';
}
```

### TASK 3: Complete Event Listeners

**Location**: Lines 50-60
**Task**: Add missing event listeners

```javascript
// TODO: Add listener for 'temperature-changed' event
window.acEventSystem.on("temperature-changed", (data) => {
  // Your code: Log the temperature change data
  // Your code: Call this.handleTemperatureChange(data)
});

// TODO: Add listener for 'power-toggled' event
// Your code: Create similar listener for power toggle

// TODO: Add listener for 'mode-changed' event
// Your code: Create similar listener for mode change
```

### TASK 4: Complete Demo Controls Setup

**Location**: Lines 75-85
**Task**: Add missing button event listeners

```javascript
// TODO: Add event listener for temp down button
document.getElementById("demo-temp-down")?.addEventListener("click", () => {
  // Your code: Call simulateTemperatureChange with correct parameters
});

// TODO: Add event listener for power toggle
// Your code: Add click handler for demo-power-toggle

// TODO: Add event listener for mode change
// Your code: Add click handler for demo-mode-change
```

### TASK 5: Complete simulatePowerToggle Function

**Location**: Lines 140-170
**Task**: Implement power toggle logic

```javascript
simulatePowerToggle(acId) {
  // TODO: Validate AC exists
  if (!this.acData[acId]) return; // Your code

  // TODO: Get old power state and calculate new state
  const oldPower = // Your code: get current power state
  const newPower = // Your code: calculate opposite of oldPower

  // TODO: Update local data
  this.acData[acId].power = // Your code
  this.acData[acId].status = // Your code: online if power true, offline if false

  // TODO: Emit 'power-toggled' event
  if (window.acEventSystem) {
    window.acEventSystem.emit('power-toggled', {
      // Your code: add acId, oldPower, newPower, timestamp
    });
  }

  // TODO: Update event counter and log
  // Your code: Call updateEventCounter
  // Your code: Add console.log
}
```

### TASK 6: Complete simulateModeChange Function

**Location**: Lines 180-210
**Task**: Implement complete mode change function

```javascript
simulateModeChange(acId, newMode) {
  // TODO: Step 1 - Validate AC exists
  // Your code here

  // TODO: Step 2 - Validate mode is allowed
  const allowedModes = // Your code: create array
  if (!allowedModes.includes(newMode)) {
    // Your code: return or show error
  }

  // TODO: Step 3 - Get old mode and update data
  const oldMode = // Your code
  this.acData[acId].mode = // Your code

  // TODO: Step 4 - Emit 'mode-changed' event
  // Your code: emit event with proper data

  // TODO: Step 5 - Emit general AC data update
  // Your code: emit ac-data-updated event

  // TODO: Step 6 - Update counter and log
  // Your code: call updateEventCounter and console.log
}
```

### TASK 7: Complete Event Handler

**Location**: Lines 225-240
**Task**: Add specific change handling

```javascript
handleACDataUpdate(eventData) {
  // Existing code...

  // TODO: Add specific change handling
  if (changes.targetTemp) {
    console.log("Temperature target changed to:", changes.targetTemp);
    // Your code: Add custom logic for temperature changes
  }

  // TODO: Handle power changes
  if (changes.power) {
    // Your code: Add logic for power changes
  }

  // TODO: Handle mode changes
  if (changes.mode) {
    // Your code: Add logic for mode changes
  }
}
```

### TASK 8: Complete updateEventCounter

**Location**: Lines 260-275
**Task**: Implement counter update logic

```javascript
updateEventCounter(eventType) {
  // TODO: Increment counter
  this.eventCounter += // Your code

  // TODO: Update lastEventType property
  this.lastEventType = // Your code

  const countEl = document.getElementById('demo-event-count');
  const lastEventEl = document.getElementById('demo-last-event');

  // TODO: Update counter display
  if (countEl) {
    countEl.textContent = // Your code
  }

  // TODO: Update last event display
  if (lastEventEl) {
    lastEventEl.textContent = // Your code
  }
}
```

## TESTING YOUR WORK

### Step 1: Open Browser Console

- Press F12 to open Developer Tools
- Go to Console tab

### Step 2: Load the Page

- Open spa_app.html in browser
- Look for demo control panel in top-left corner

### Step 3: Test Each Function

- Click "Temp +" button - should see temperature events
- Click "Temp -" button - should work after you complete TODO
- Click "Toggle Power" - should work after you complete TODO
- Click "Change Mode" - should work after you complete TODO

### Step 4: Check Console Logs

- Should see event logs for each action
- Should see event counter incrementing
- Should see "Demo received AC update" messages

### Expected Console Output:

```
Demo AC Controller initialized
Temperature changed: {acId: "AC-001", oldTemp: 22, newTemp: 23}
Power toggled for AC-002: true -> false
Mode changed for AC-003: dry -> cool
Demo received AC update: AC-001 {targetTemp: 23}
```

## LEARNING OBJECTIVES

After completing these tasks, you will understand:

1. **Event Registration**: How to use `.on()` method
2. **Event Emission**: How to use `.emit()` method
3. **Data Flow**: How events carry data between components
4. **Validation**: How to validate data before processing
5. **State Management**: How to update application state
6. **UI Feedback**: How to provide user feedback
7. **Debugging**: How to log and track events

## REMEMBER: NO EMOJIS IN CODE

Follow the instruction - use descriptive text instead of emojis:

- Use "Temperature changed" instead of "🌡️ Temperature changed"
- Use "Event emitted" instead of "🚀 Event emitted"
- Use "Error occurred" instead of "❌ Error occurred"

Good luck with your practice!
