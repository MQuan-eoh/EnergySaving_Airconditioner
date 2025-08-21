// Chart.js - Temperature chart and data visualization
// This file handles all chart-related functionality

class TemperatureChart {
  constructor() {
    this.chart = null;
    this.currentPeriod = "hour";
    this.isInitialized = false;

    this.init();
  }

  init() {
    if (this.isInitialized) return;

    // Wait for Chart.js library to be available
    if (typeof Chart === "undefined") {
      setTimeout(() => this.init(), 100);
      return;
    }

    this.setupChart();
    this.setupEventListeners();

    this.isInitialized = true;
    console.log("Temperature Chart initialized successfully");
  }

  setupChart() {
    const canvas = document.getElementById("temperature-chart");
    if (!canvas) {
      console.warn("Temperature chart canvas not found");
      return;
    }

    const ctx = canvas.getContext("2d");

    // Configure Chart.js defaults for dark theme
    Chart.defaults.color = "rgba(255, 255, 255, 0.7)";
    Chart.defaults.borderColor = "rgba(255, 255, 255, 0.1)";
    Chart.defaults.backgroundColor = "rgba(255, 255, 255, 0.05)";

    // Initial data
    const initialData = this.generateDataForPeriod("hour");

    this.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: initialData.labels,
        datasets: [
          {
            label: "Target Temperature",
            data: initialData.targetTemp,
            borderColor: "#fd7e14",
            backgroundColor: "rgba(253, 126, 20, 0.1)",
            borderWidth: 3,
            fill: false,
            tension: 0.4,
            pointBackgroundColor: "#fd7e14",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8,
          },
          {
            label: "Actual Temperature",
            data: initialData.actualTemp,
            borderColor: "#007bff",
            backgroundColor: "rgba(0, 123, 255, 0.1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#007bff",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8,
          },
          {
            label: "Energy Efficiency",
            data: initialData.efficiency,
            borderColor: "#28a745",
            backgroundColor: "rgba(40, 167, 69, 0.1)",
            borderWidth: 2,
            fill: false,
            tension: 0.3,
            pointBackgroundColor: "#28a745",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: "index",
        },
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              color: "rgba(255, 255, 255, 0.8)",
              font: {
                size: 12,
                family: "Inter, sans-serif",
              },
              usePointStyle: true,
              padding: 20,
            },
          },
          tooltip: {
            enabled: true,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            titleColor: "#ffffff",
            bodyColor: "#ffffff",
            borderColor: "rgba(255, 255, 255, 0.2)",
            borderWidth: 1,
            cornerRadius: 8,
            padding: 12,
            displayColors: true,
            callbacks: {
              title: (context) => {
                return `Time: ${context[0].label}`;
              },
              label: (context) => {
                const datasetLabel = context.dataset.label;
                const value = context.parsed.y;

                if (datasetLabel === "Energy Efficiency") {
                  return `${datasetLabel}: ${value}%`;
                } else {
                  return `${datasetLabel}: ${value}°C`;
                }
              },
            },
          },
        },
        scales: {
          x: {
            display: true,
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
              borderColor: "rgba(255, 255, 255, 0.2)",
            },
            ticks: {
              color: "rgba(255, 255, 255, 0.7)",
              font: {
                size: 11,
                family: "Inter, sans-serif",
              },
            },
            title: {
              display: true,
              text: "Time",
              color: "rgba(255, 255, 255, 0.8)",
              font: {
                size: 12,
                family: "Inter, sans-serif",
              },
            },
          },
          y: {
            type: "linear",
            display: true,
            position: "left",
            min: 16,
            max: 35,
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
              borderColor: "rgba(255, 255, 255, 0.2)",
            },
            ticks: {
              color: "rgba(255, 255, 255, 0.7)",
              font: {
                size: 11,
                family: "Inter, sans-serif",
              },
              callback: (value) => `${value}°C`,
            },
            title: {
              display: true,
              text: "Temperature (°C)",
              color: "rgba(255, 255, 255, 0.8)",
              font: {
                size: 12,
                family: "Inter, sans-serif",
              },
            },
          },
          y1: {
            type: "linear",
            display: true,
            position: "right",
            min: 0,
            max: 100,
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              color: "rgba(255, 255, 255, 0.7)",
              font: {
                size: 11,
                family: "Inter, sans-serif",
              },
              callback: (value) => `${value}%`,
            },
            title: {
              display: true,
              text: "Efficiency (%)",
              color: "rgba(255, 255, 255, 0.8)",
              font: {
                size: 12,
                family: "Inter, sans-serif",
              },
            },
          },
        },
        elements: {
          point: {
            hoverBackgroundColor: "#ffffff",
          },
        },
        animation: {
          duration: 1000,
          easing: "easeInOutQuart",
        },
      },
    });
  }

  setupEventListeners() {
    // Listen for chart period changes
    document.addEventListener("chartPeriodChange", (event) => {
      this.updateChartPeriod(event.detail.period);
    });

    // Auto-refresh chart data
    this.startAutoRefresh();
  }

  updateChartPeriod(period) {
    if (!this.chart || this.currentPeriod === period) return;

    this.currentPeriod = period;
    const newData = this.generateDataForPeriod(period);

    // Update chart data
    this.chart.data.labels = newData.labels;
    this.chart.data.datasets[0].data = newData.targetTemp;
    this.chart.data.datasets[1].data = newData.actualTemp;
    this.chart.data.datasets[2].data = newData.efficiency;

    // Update chart with animation
    this.chart.update("active");

    console.log(`Chart updated for period: ${period}`);
  }

  generateDataForPeriod(period) {
    let labels = [];
    let targetTemp = [];
    let actualTemp = [];
    let efficiency = [];

    switch (period) {
      case "hour":
        labels = this.generateHourlyLabels();
        break;
      case "day":
        labels = this.generateDailyLabels();
        break;
      case "week":
        labels = this.generateWeeklyLabels();
        break;
      case "month":
        labels = this.generateMonthlyLabels();
        break;
      default:
        labels = this.generateHourlyLabels();
    }

    // Generate realistic temperature data
    labels.forEach((label, index) => {
      const baseTargetTemp = 22;
      const baseActualTemp = 24;

      // Add some variation based on time patterns
      const timeVariation = this.getTimeBasedVariation(
        period,
        index,
        labels.length
      );

      // Target temperature (what user set)
      const target =
        baseTargetTemp + timeVariation.target + (Math.random() - 0.5) * 2;
      targetTemp.push(Math.round(target * 10) / 10);

      // Actual temperature (what AC achieved)
      const actual =
        target + timeVariation.actual + (Math.random() - 0.5) * 1.5;
      actualTemp.push(Math.round(actual * 10) / 10);

      // Energy efficiency (how well AC performed)
      const efficiencyValue = this.calculateEfficiency(
        target,
        actual,
        timeVariation.efficiency
      );
      efficiency.push(Math.round(efficiencyValue));
    });

    return { labels, targetTemp, actualTemp, efficiency };
  }

  generateHourlyLabels() {
    const labels = [];
    const now = new Date();

    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      labels.push(
        time.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      );
    }

    return labels;
  }

  generateDailyLabels() {
    const labels = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      labels.push(
        date.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      );
    }

    return labels;
  }

  generateWeeklyLabels() {
    const labels = [];
    const now = new Date();

    for (let i = 3; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date(date.getTime() + 6 * 24 * 60 * 60 * 1000);

      labels.push(
        `${date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })} - ${endDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}`
      );
    }

    return labels;
  }

  generateMonthlyLabels() {
    const labels = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(
        date.toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        })
      );
    }

    return labels;
  }

  getTimeBasedVariation(period, index, totalPoints) {
    let target = 0;
    let actual = 0;
    let efficiency = 0;

    switch (period) {
      case "hour":
        // Hourly pattern: cooler during night, warmer during day
        const hour = (new Date().getHours() - 23 + index) % 24;
        if (hour >= 6 && hour <= 18) {
          // Daytime - need more cooling
          target = Math.sin(((hour - 6) / 12) * Math.PI) * 2;
          actual = target + 1;
          efficiency = 75 + Math.sin(((hour - 6) / 12) * Math.PI) * 10;
        } else {
          // Nighttime - less cooling needed
          target = -1;
          actual = target + 0.5;
          efficiency = 85 + Math.random() * 10;
        }
        break;

      case "day":
        // Daily pattern: varies by day of week
        const dayOfWeek = (new Date().getDay() + 7 - 6 + index) % 7;
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          // Weekend - people home more
          target = 1;
          actual = target + 1;
          efficiency = 70 + Math.random() * 15;
        } else {
          // Weekday - people away during day
          target = -0.5;
          actual = target + 0.5;
          efficiency = 80 + Math.random() * 15;
        }
        break;

      case "week":
        // Weekly pattern: seasonal variation
        target = Math.sin((index / totalPoints) * Math.PI) * 1.5;
        actual = target + 0.8;
        efficiency = 78 + Math.sin((index / totalPoints) * Math.PI) * 12;
        break;

      case "month":
        // Monthly pattern: strong seasonal variation
        const month = (new Date().getMonth() + 12 - 11 + index) % 12;
        if (month >= 5 && month <= 8) {
          // Summer months
          target = 2 + Math.sin(((month - 5) / 3) * Math.PI) * 2;
          actual = target + 1.5;
          efficiency = 65 + Math.sin(((month - 5) / 3) * Math.PI) * 20;
        } else {
          // Cooler months
          target = -2;
          actual = target + 0.5;
          efficiency = 85 + Math.random() * 10;
        }
        break;
    }

    return { target, actual, efficiency };
  }

  calculateEfficiency(target, actual, baseEfficiency) {
    // Efficiency based on how close actual temperature is to target
    const tempDifference = Math.abs(target - actual);
    const efficiencyPenalty = tempDifference * 5; // 5% penalty per degree difference

    let efficiency = baseEfficiency - efficiencyPenalty;

    // Ensure efficiency stays within reasonable bounds
    efficiency = Math.max(45, Math.min(95, efficiency));

    return efficiency;
  }

  startAutoRefresh() {
    // Refresh chart data every 30 seconds for real-time updates
    this.refreshInterval = setInterval(() => {
      if (this.currentPeriod === "hour") {
        // Only auto-refresh for hourly view (real-time)
        this.updateChartPeriod("hour");
      }
    }, 30000);
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  // Energy savings calculations
  calculateEnergySavings(targetTemp, actualTemp, efficiency) {
    // Simplified energy calculation
    // Base consumption at 22°C
    const baseConsumption = 1.5; // kW per hour

    // Consumption increases with lower target temperature
    const tempFactor = Math.max(0.5, 1 - (22 - targetTemp) * 0.1);

    // Efficiency affects actual consumption
    const efficiencyFactor = efficiency / 100;

    // Calculate consumption
    const consumption = (baseConsumption * tempFactor) / efficiencyFactor;

    // Calculate savings compared to non-AI system (assume 20% less efficient)
    const nonAIConsumption = consumption / 0.8;
    const savings = nonAIConsumption - consumption;
    const savingsPercentage = (savings / nonAIConsumption) * 100;

    return {
      consumption: consumption.toFixed(2),
      savings: savings.toFixed(2),
      savingsPercentage: savingsPercentage.toFixed(1),
    };
  }

  // Export chart data
  exportChartData() {
    if (!this.chart) return null;

    const data = {
      period: this.currentPeriod,
      labels: this.chart.data.labels,
      datasets: this.chart.data.datasets.map((dataset) => ({
        label: dataset.label,
        data: dataset.data,
        borderColor: dataset.borderColor,
        backgroundColor: dataset.backgroundColor,
      })),
      timestamp: new Date().toISOString(),
    };

    return data;
  }

  // Resize handler
  resize() {
    if (this.chart) {
      this.chart.resize();
    }
  }

  // Cleanup
  destroy() {
    this.stopAutoRefresh();

    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    this.isInitialized = false;
    console.log("Temperature Chart destroyed");
  }
}

// Initialize chart when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.temperatureChart = new TemperatureChart();
});

// Handle window resize
window.addEventListener("resize", () => {
  if (window.temperatureChart) {
    window.temperatureChart.resize();
  }
});

// Handle page unload
window.addEventListener("beforeunload", () => {
  if (window.temperatureChart) {
    window.temperatureChart.destroy();
  }
});
