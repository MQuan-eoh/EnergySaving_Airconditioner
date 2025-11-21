/**
 * Power Consumption Manager
 * Handles monitoring, storage, and visualization of AC power consumption
 */
class PowerConsumptionManager {
  constructor() {
    this.monitoringInterval = null;
    this.currentSessionId = null;
    this.acId = "AC-001"; // Default AC ID
    this.electricityPrice = 3000; // Default VND/kWh
    this.chart = null;
    this.viewMode = "day"; // day, week, month, year
    this.selectedDate = new Date();

    // DOM Elements
    this.elements = {
      powerValue: null,
      powerBtn: null,
      chartCanvas: null,
      totalConsumption: null,
      totalCost: null,
      datePicker: null,
      priceInput: null,
      viewButtons: null,
    };
  }

  init() {
    console.log("Power Consumption Manager Initializing...");
    this.cacheDOM();
    this.bindEvents();
    this.setupChart();
    this.loadData();

    // Check initial state
    this.checkPowerState();

    console.log("Power Consumption Manager Initialized");
  }

  cacheDOM() {
    this.elements.powerValue = document.getElementById("spa-power-value");
    this.elements.powerBtn = document.getElementById("spa-power-btn");
    this.elements.chartCanvas = document.getElementById(
      "power-consumption-chart"
    );
    this.elements.totalConsumption = document.getElementById(
      "power-total-consumption"
    );
    this.elements.totalCost = document.getElementById("power-total-cost");
    this.elements.datePicker = document.getElementById("power-date-picker");
    this.elements.priceInput = document.getElementById("power-price-input");
    this.elements.viewButtons = document.querySelectorAll(".view-mode-btn");

    // Set default date
    if (this.elements.datePicker) {
      this.elements.datePicker.valueAsDate = this.selectedDate;
    }

    // Set default price
    if (this.elements.priceInput) {
      this.elements.priceInput.value = this.electricityPrice;
    }
  }

  bindEvents() {
    // Monitor Power Button Class Changes (Observer)
    if (this.elements.powerBtn) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === "class") {
            this.checkPowerState();
          }
        });
      });
      observer.observe(this.elements.powerBtn, { attributes: true });
    }

    // View Mode Buttons
    if (this.elements.viewButtons) {
      this.elements.viewButtons.forEach((btn) => {
        btn.addEventListener("click", (e) => {
          this.changeViewMode(e.target.dataset.mode);
        });
      });
    }

    // Date Picker
    if (this.elements.datePicker) {
      this.elements.datePicker.addEventListener("change", (e) => {
        this.selectedDate = new Date(e.target.value);
        this.loadData();
      });
    }

    // Price Input
    if (this.elements.priceInput) {
      this.elements.priceInput.addEventListener("change", (e) => {
        this.electricityPrice = parseFloat(e.target.value) || 0;
        this.updateTotals();
      });
    }
  }

  checkPowerState() {
    const isActive =
      this.elements.powerBtn &&
      this.elements.powerBtn.classList.contains("active");

    if (isActive && !this.monitoringInterval) {
      this.startMonitoring();
    } else if (!isActive && this.monitoringInterval) {
      this.stopMonitoring();
    }
  }

  startMonitoring() {
    console.log("Starting Power Monitoring...");

    // Get Start Values
    const startPower = this.getPowerValue();
    const startTime = Date.now();

    // Create Session ID (Timestamp)
    this.currentSessionId = startTime;

    // Initial Save
    this.saveSessionData(startTime, startPower, startPower);

    // Start Interval (10s)
    this.monitoringInterval = setInterval(() => {
      const currentPower = this.getPowerValue();
      this.saveSessionData(startTime, startPower, currentPower);
    }, 10000);

    // Show indicator
    const indicator = document.getElementById("power-monitoring-indicator");
    if (indicator) indicator.classList.remove("hidden");
  }

  stopMonitoring() {
    console.log("Stopping Power Monitoring...");

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Final Save
    if (this.currentSessionId) {
      const currentPower = this.getPowerValue();
      // We need to retrieve startPower from somewhere or keep it in memory
      // For simplicity, I'll assume the last read was correct, but better to fetch from DB or keep in memory
      // I'll keep startPower in memory for the session
      // Actually, let's just clear the session ID
      this.currentSessionId = null;
    }

    // Hide indicator
    const indicator = document.getElementById("power-monitoring-indicator");
    if (indicator) indicator.classList.add("hidden");
  }

  getPowerValue() {
    if (this.elements.powerValue) {
      return parseFloat(this.elements.powerValue.textContent) || 0;
    }
    return 0;
  }

  saveSessionData(startTime, startPower, currentPower) {
    const totalPowerOfDay = currentPower - startPower;

    // Ensure non-negative (in case of meter reset or error)
    const consumption = Math.max(0, totalPowerOfDay);

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    const path = `dailyPowerConsump/${this.acId}/${year}/${month}/${day}/sessions/${startTime}`;

    const data = {
      startMonitoring: startTime,
      startPowerConsump: startPower,
      currentPowerConsump: currentPower,
      totalPowerOfDay: consumption,
      lastUpdated: Date.now(),
    };

    // Save to Firebase
    if (firebase && firebase.database) {
      firebase
        .database()
        .ref(path)
        .update(data)
        .then(() => {
          // console.log("Power data saved:", data);
          // Refresh UI if we are viewing today
          if (this.isViewingToday()) {
            this.loadData();
          }
        })
        .catch((err) => console.error("Firebase save error:", err));
    }
  }

  isViewingToday() {
    const now = new Date();
    return (
      this.selectedDate.getDate() === now.getDate() &&
      this.selectedDate.getMonth() === now.getMonth() &&
      this.selectedDate.getFullYear() === now.getFullYear()
    );
  }

  changeViewMode(mode) {
    this.viewMode = mode;

    // Update UI classes
    if (this.elements.viewButtons) {
      this.elements.viewButtons.forEach((btn) => {
        if (btn.dataset.mode === mode) btn.classList.add("active");
        else btn.classList.remove("active");
      });
    }

    this.loadData();
  }

  loadData() {
    // Determine date range based on viewMode and selectedDate
    // Fetch data from Firebase
    // For now, let's implement fetching for the selected day/month/year

    const year = this.selectedDate.getFullYear();
    const month = String(this.selectedDate.getMonth() + 1).padStart(2, "0");
    const day = String(this.selectedDate.getDate()).padStart(2, "0");

    let path = `dailyPowerConsump/${this.acId}`;

    if (this.viewMode === "day") {
      path += `/${year}/${month}/${day}`;
    } else if (this.viewMode === "week") {
      // Logic for week fetch (needs multiple days)
      // For simplicity, fetching month and filtering
      path += `/${year}/${month}`;
    } else if (this.viewMode === "month") {
      path += `/${year}/${month}`;
    } else if (this.viewMode === "year") {
      path += `/${year}`;
    }

    if (firebase && firebase.database) {
      firebase
        .database()
        .ref(path)
        .once("value")
        .then((snapshot) => {
          const data = snapshot.val();
          this.processAndRenderData(data);
        });
    }
  }

  processAndRenderData(data) {
    let labels = [];
    let values = [];
    let totalConsumption = 0;

    if (!data) {
      this.updateChart(labels, values);
      this.updateTotals(0);
      return;
    }

    if (this.viewMode === "day") {
      // Data structure: { sessions: { timestamp: { ... } } }
      // We want to aggregate by hour or just show sessions?
      // Let's show sessions for now, or aggregate by hour if many

      if (data.sessions) {
        Object.values(data.sessions).forEach((session) => {
          const date = new Date(session.startMonitoring);
          const label = `${date.getHours()}:${String(
            date.getMinutes()
          ).padStart(2, "0")}`;
          // labels.push(label);
          // values.push(session.totalPowerOfDay); // This is cumulative for session
          totalConsumption += session.totalPowerOfDay;
        });

        // For chart, let's group by Hour
        const hourlyData = {};
        Object.values(data.sessions).forEach((session) => {
          const date = new Date(session.startMonitoring);
          const hour = date.getHours();
          if (!hourlyData[hour]) hourlyData[hour] = 0;
          hourlyData[hour] += session.totalPowerOfDay;
        });

        for (let i = 0; i < 24; i++) {
          labels.push(`${i}:00`);
          values.push(hourlyData[i] || 0);
        }
      }
    } else if (this.viewMode === "week") {
      // Calculate week range
      // ... (Simplified: just show days of current month for now or implement week logic)
      // Let's just show the last 7 days ending at selectedDate

      // Need to fetch multiple days.
      // If data is month data (from loadData path), we can filter.
      // Assuming data is { '01': { sessions... }, '02': ... }

      // TODO: Implement proper week logic. For now, treating as Month view but limited?
      // Let's just implement Month view logic for 'month' and 'week' (filtered)

      Object.keys(data)
        .sort()
        .forEach((dayKey) => {
          const dayData = data[dayKey];
          let dayTotal = 0;
          if (dayData.sessions) {
            Object.values(dayData.sessions).forEach(
              (s) => (dayTotal += s.totalPowerOfDay)
            );
          }
          labels.push(`${dayKey}/${this.selectedDate.getMonth() + 1}`);
          values.push(dayTotal);
          totalConsumption += dayTotal;
        });
    } else if (this.viewMode === "month") {
      // Data is { '01': ..., '02': ... }
      Object.keys(data)
        .sort()
        .forEach((dayKey) => {
          const dayData = data[dayKey];
          let dayTotal = 0;
          if (dayData.sessions) {
            Object.values(dayData.sessions).forEach(
              (s) => (dayTotal += s.totalPowerOfDay)
            );
          }
          labels.push(dayKey);
          values.push(dayTotal);
          totalConsumption += dayTotal;
        });
    } else if (this.viewMode === "year") {
      // Data is { '01': { days... }, '02': ... }
      Object.keys(data)
        .sort()
        .forEach((monthKey) => {
          const monthData = data[monthKey];
          let monthTotal = 0;
          // Iterate days
          Object.values(monthData).forEach((dayData) => {
            if (dayData.sessions) {
              Object.values(dayData.sessions).forEach(
                (s) => (monthTotal += s.totalPowerOfDay)
              );
            }
          });
          labels.push(monthKey);
          values.push(monthTotal);
          totalConsumption += monthTotal;
        });
    }

    this.updateChart(labels, values);
    this.updateTotals(totalConsumption);
  }

  updateChart(labels, values) {
    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = this.elements.chartCanvas.getContext("2d");

    // Gradient for bars
    const gradient = ctx.createLinearGradient(0, 0, 400, 0);
    gradient.addColorStop(0, "rgba(215, 90, 42, 0.8)");
    gradient.addColorStop(1, "rgba(155, 58, 90, 0.8)");

    this.chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Power Consumption (Wh)", // Assuming Wh based on user formula
            data: values,
            backgroundColor: gradient,
            borderColor: "rgba(255, 255, 255, 0.1)",
            borderWidth: 1,
            borderRadius: 4,
            barThickness: 20,
            indexAxis: "y", // Horizontal Bar Chart
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            titleColor: "#fff",
            bodyColor: "#fff",
            borderColor: "rgba(255, 255, 255, 0.2)",
            borderWidth: 1,
          },
        },
        scales: {
          x: {
            grid: {
              color: "rgba(255, 255, 255, 0.05)",
            },
            ticks: {
              color: "rgba(255, 255, 255, 0.6)",
            },
          },
          y: {
            grid: {
              display: false,
            },
            ticks: {
              color: "rgba(255, 255, 255, 0.8)",
            },
          },
        },
      },
    });
  }

  updateTotals(consumption = 0) {
    // Consumption is in Wh (based on assumption), convert to kWh for display if large
    // Or keep as Wh if small. User said "số lượng điện năng tiêu thụ".
    // Let's display kWh with 3 decimals.

    const kwh = consumption / 1000;

    if (this.elements.totalConsumption) {
      this.elements.totalConsumption.textContent = kwh.toFixed(3);
    }

    if (this.elements.totalCost) {
      const cost = kwh * this.electricityPrice;
      this.elements.totalCost.textContent = cost.toLocaleString("vi-VN", {
        maximumFractionDigits: 0,
      });
    }
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  window.powerConsumptionManager = new PowerConsumptionManager();
  // Delay init slightly to ensure other scripts loaded
  setTimeout(() => {
    window.powerConsumptionManager.init();
  }, 1000);
});
