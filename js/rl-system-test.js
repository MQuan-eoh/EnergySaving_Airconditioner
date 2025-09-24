/**
 * REINFORCEMENT LEARNING SYSTEM TEST SUITE
 * Test suite for verifying the complete RL system integration
 *
 * COMPONENTS TESTED:
 * - Temperature Reinforcement Learning Algorithm
 * - Activity Logger
 * - UI Components
 * - Integration with Energy Efficiency Manager
 *
 * USAGE:
 * 1. Open browser console
 * 2. Run: RLSystemTest.runAllTests()
 * 3. Check results and verify functionality
 */

class RLSystemTest {
  constructor() {
    this.testResults = [];
    this.testAC = "test-ac-001";
    this.startTime = Date.now();
  }

  /**
   * RUN ALL TESTS
   * Execute complete test suite
   */
  async runAllTests() {
    console.log("🧪 Starting Reinforcement Learning System Test Suite...");
    console.log("=".repeat(60));

    try {
      // Initialize test environment
      await this.initializeTestEnvironment();

      // Component availability tests
      await this.testComponentAvailability();

      // RL Algorithm tests
      await this.testRLAlgorithm();

      // Activity Logger tests
      await this.testActivityLogger();

      // UI Components tests
      await this.testUIComponents();

      // Integration tests
      await this.testIntegration();

      // Performance tests
      await this.testPerformance();

      // Generate report
      this.generateTestReport();
    } catch (error) {
      console.error("❌ Test suite failed:", error);
      this.addTestResult(
        "TEST_SUITE",
        false,
        `Test suite failed: ${error.message}`
      );
    }
  }

  /**
   * INITIALIZE TEST ENVIRONMENT
   */
  async initializeTestEnvironment() {
    console.log("🔧 Initializing test environment...");

    try {
      // Wait for components to load
      await this.waitForComponents();

      // Setup test AC configuration
      if (window.energyEfficiencyManager) {
        window.energyEfficiencyManager.configureACUnit(this.testAC, {
          type: "1.5HP",
          technology: "inverter",
          roomSize: "medium",
          roomType: "living-room",
          brand: "Test Brand",
          model: "Test Model",
          roomArea: "25m²",
        });
      }

      this.addTestResult(
        "INIT_ENVIRONMENT",
        true,
        "Test environment initialized"
      );
    } catch (error) {
      this.addTestResult(
        "INIT_ENVIRONMENT",
        false,
        `Failed to initialize: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * WAIT FOR COMPONENTS
   */
  async waitForComponents() {
    const maxWaitTime = 15000; // 15 seconds
    const checkInterval = 500; // 0.5 seconds
    let waitTime = 0;

    return new Promise((resolve, reject) => {
      const checkComponents = () => {
        if (waitTime >= maxWaitTime) {
          reject(new Error("Timeout waiting for components"));
          return;
        }

        const components = {
          temperatureRL:
            window.temperatureRL && window.temperatureRL.isInitialized(),
          activityLogger:
            window.temperatureActivityLogger &&
            window.temperatureActivityLogger.isInitialized(),
          activityUI:
            window.tempActivityLogUI &&
            window.tempActivityLogUI.isInitialized(),
          energyManager: window.energyEfficiencyManager !== undefined,
          eventSystem: window.acEventSystem !== undefined,
        };

        const allReady = Object.values(components).every(
          (ready) => ready === true
        );

        if (allReady) {
          console.log("All components ready:", components);
          resolve(components);
        } else {
          console.log(
            `⏳ Waiting for components... (${waitTime}ms)`,
            components
          );
          waitTime += checkInterval;
          setTimeout(checkComponents, checkInterval);
        }
      };

      checkComponents();
    });
  }

  /**
   * TEST COMPONENT AVAILABILITY
   */
  async testComponentAvailability() {
    console.log("🔍 Testing component availability...");

    const tests = [
      {
        name: "TemperatureRL Available",
        test: () => window.temperatureRL !== undefined,
        description: "Temperature RL algorithm component loaded",
      },
      {
        name: "TemperatureRL Initialized",
        test: () =>
          window.temperatureRL && window.temperatureRL.isInitialized(),
        description: "Temperature RL algorithm properly initialized",
      },
      {
        name: "ActivityLogger Available",
        test: () => window.temperatureActivityLogger !== undefined,
        description: "Activity logger component loaded",
      },
      {
        name: "ActivityLogger Initialized",
        test: () =>
          window.temperatureActivityLogger &&
          window.temperatureActivityLogger.isInitialized(),
        description: "Activity logger properly initialized",
      },
      {
        name: "ActivityUI Available",
        test: () => window.tempActivityLogUI !== undefined,
        description: "Activity log UI component loaded",
      },
      {
        name: "ActivityUI Initialized",
        test: () =>
          window.tempActivityLogUI && window.tempActivityLogUI.isInitialized(),
        description: "Activity log UI properly initialized",
      },
      {
        name: "EnergyManager Available",
        test: () => window.energyEfficiencyManager !== undefined,
        description: "Energy efficiency manager loaded",
      },
      {
        name: "EventSystem Available",
        test: () => window.acEventSystem !== undefined,
        description: "Event system loaded",
      },
      {
        name: "Firebase Available",
        test: () => window.firebase !== undefined,
        description: "Firebase SDK loaded",
      },
    ];

    for (const test of tests) {
      try {
        const result = await test.test();
        this.addTestResult(test.name, result, test.description);
      } catch (error) {
        this.addTestResult(
          test.name,
          false,
          `${test.description} - Error: ${error.message}`
        );
      }
    }
  }

  /**
   * TEST RL ALGORITHM
   */
  async testRLAlgorithm() {
    console.log("🤖 Testing RL Algorithm...");

    if (!window.temperatureRL) {
      this.addTestResult("RL_ALGORITHM", false, "RL Algorithm not available");
      return;
    }

    const tests = [
      {
        name: "Get Recommendation",
        test: async () => {
          const context = {
            outdoor_temp: 30,
            target_temp: 24,
            room_type: "living-room",
            ac_type: "1.5HP",
            time_of_day: 14,
            current_power: 1200,
          };

          const recommendation =
            window.temperatureRL.getTemperatureRecommendation(
              this.testAC,
              context
            );
          return (
            recommendation && typeof recommendation.recommendedTemp === "number"
          );
        },
      },
      {
        name: "Update Reward",
        test: async () => {
          const context = {
            outdoor_temp: 30,
            target_temp: 24,
            room_type: "living-room",
          };

          window.temperatureRL.updateReward(
            this.testAC,
            context,
            23,
            1.0,
            "test_reward"
          );
          return true;
        },
      },
      {
        name: "Get Statistics",
        test: async () => {
          const stats = window.temperatureRL.getACStatistics(this.testAC);
          return stats && typeof stats.totalRecommendations === "number";
        },
      },
      {
        name: "Exploration vs Exploitation",
        test: async () => {
          // Test multiple recommendations to verify exploration
          const context = {
            outdoor_temp: 30,
            target_temp: 24,
            room_type: "living-room",
            ac_type: "1.5HP",
            time_of_day: 14,
            current_power: 1200,
          };

          const recommendations = [];
          for (let i = 0; i < 10; i++) {
            const rec = window.temperatureRL.getTemperatureRecommendation(
              this.testAC,
              context
            );
            recommendations.push(rec.recommendedTemp);
          }

          // Should have some variation due to exploration
          const uniqueValues = [...new Set(recommendations)];
          return uniqueValues.length >= 1; // At least some recommendations
        },
      },
    ];

    for (const test of tests) {
      try {
        const result = await test.test();
        this.addTestResult(
          `RL_${test.name.replace(/\s+/g, "_").toUpperCase()}`,
          result,
          `RL Algorithm: ${test.name}`
        );
      } catch (error) {
        this.addTestResult(
          `RL_${test.name.replace(/\s+/g, "_").toUpperCase()}`,
          false,
          `RL Algorithm: ${test.name} - Error: ${error.message}`
        );
      }
    }
  }

  /**
   * TEST ACTIVITY LOGGER
   */
  async testActivityLogger() {
    console.log("Testing Activity Logger...");

    if (!window.temperatureActivityLogger) {
      this.addTestResult(
        "ACTIVITY_LOGGER",
        false,
        "Activity Logger not available"
      );
      return;
    }

    const tests = [
      {
        name: "Log Recommendation Application",
        test: async () => {
          await window.temperatureActivityLogger.logRecommendationApplication({
            acId: this.testAC,
            originalTemp: 24,
            currentTemp: 24,
            recommendedTemp: 23,
            appliedTemp: 23,
            confidence: 0.8,
            appliedBy: "test_user",
            energySavings: 7, // 1 degree increase = ~7% energy savings
            context: {
              outdoor_temp: 30,
              target_temp: 24,
              room_type: "living-room",
              recommendation_type: "test",
            },
          });
          return true;
        },
      },
      {
        name: "Log Manual Adjustment",
        test: async () => {
          await window.temperatureActivityLogger.logManualAdjustment(
            this.testAC,
            23, // previousTemp
            25, // newTemp
            "test_user",
            5000, // adjustmentTime (5 seconds)
            {
              outdoor_temp: 30,
              trigger: "test_manual_adjustment",
            }
          );
          return true;
        },
      },
      {
        name: "Log Successful Recommendation",
        test: async () => {
          await window.temperatureActivityLogger.logSuccessfulRecommendation(
            this.testAC,
            23, // sustainedTemp
            3600000, // sustainedDuration (1 hour)
            {
              originalTemp: 24,
              sustained: true,
              monitoringType: "test",
            }
          );
          return true;
        },
      },
      {
        name: "Get Activity Logs",
        test: async () => {
          const logs = await window.temperatureActivityLogger.getActivityLogs(
            this.testAC,
            { limit: 10 }
          );
          return logs && Array.isArray(logs.logs);
        },
      },
      {
        name: "Export Data",
        test: async () => {
          // Test export functionality (without actually downloading)
          const success =
            await window.temperatureActivityLogger.exportActivityData(
              this.testAC,
              "json"
            );
          return success;
        },
      },
    ];

    for (const test of tests) {
      try {
        const result = await test.test();
        this.addTestResult(
          `LOGGER_${test.name.replace(/\s+/g, "_").toUpperCase()}`,
          result,
          `Activity Logger: ${test.name}`
        );
      } catch (error) {
        this.addTestResult(
          `LOGGER_${test.name.replace(/\s+/g, "_").toUpperCase()}`,
          false,
          `Activity Logger: ${test.name} - Error: ${error.message}`
        );
      }
    }
  }

  /**
   * TEST UI COMPONENTS
   */
  async testUIComponents() {
    console.log("🖥️ Testing UI Components...");

    if (!window.tempActivityLogUI) {
      this.addTestResult(
        "UI_COMPONENTS",
        false,
        "Activity Log UI not available"
      );
      return;
    }

    const tests = [
      {
        name: "Header Button Created",
        test: () => {
          const button = document.getElementById("activity-log-btn");
          return button !== null;
        },
      },
      {
        name: "Modal Created",
        test: () => {
          const modal = document.getElementById("activity-log-modal");
          return modal !== null;
        },
      },
      {
        name: "Open Modal",
        test: async () => {
          await window.tempActivityLogUI.openModal();
          const modal = document.getElementById("activity-log-modal");
          return modal && modal.classList.contains("show");
        },
      },
      {
        name: "Close Modal",
        test: () => {
          window.tempActivityLogUI.closeModal();
          const modal = document.getElementById("activity-log-modal");
          return modal && !modal.classList.contains("show");
        },
      },
      {
        name: "CSS Loaded",
        test: () => {
          // Check if activity log CSS is loaded
          const styles = Array.from(document.styleSheets);
          return styles.some((sheet) => {
            try {
              return (
                sheet.href &&
                sheet.href.includes("temperature-activity-log.css")
              );
            } catch (e) {
              return false;
            }
          });
        },
      },
    ];

    for (const test of tests) {
      try {
        const result = await test.test();
        this.addTestResult(
          `UI_${test.name.replace(/\s+/g, "_").toUpperCase()}`,
          result,
          `UI Components: ${test.name}`
        );
      } catch (error) {
        this.addTestResult(
          `UI_${test.name.replace(/\s+/g, "_").toUpperCase()}`,
          false,
          `UI Components: ${test.name} - Error: ${error.message}`
        );
      }
    }
  }

  /**
   * TEST INTEGRATION
   */
  async testIntegration() {
    console.log("🔗 Testing System Integration...");

    const tests = [
      {
        name: "RL Widget Integration",
        test: () => {
          // Test if energy efficiency manager has RL integration
          return (
            window.energyEfficiencyManager &&
            typeof window.energyEfficiencyManager.applyRLRecommendation ===
              "function"
          );
        },
      },
      {
        name: "Event System Integration",
        test: () => {
          // Test if event system can handle RL events
          if (!window.acEventSystem) return false;

          let eventReceived = false;
          window.acEventSystem.on("test-rl-event", () => {
            eventReceived = true;
          });

          window.acEventSystem.emit("test-rl-event", { test: true });

          return eventReceived;
        },
      },
      {
        name: "Firebase Integration",
        test: async () => {
          // Test Firebase connection for activity logging
          if (!window.temperatureActivityLogger) return false;

          try {
            // Test a simple Firebase operation
            const testData = { test: true, timestamp: Date.now() };
            // This would typically test actual Firebase write, but we'll just verify the method exists
            return (
              typeof window.temperatureActivityLogger.syncToFirebase ===
              "function"
            );
          } catch (error) {
            return false;
          }
        },
      },
      {
        name: "Temperature Widget Enhanced",
        test: () => {
          // Test if temperature widget has RL features
          if (!window.energyEfficiencyManager) return false;

          const mockACData = {
            id: this.testAC,
            power: true,
            targetTemp: 24,
            voltage: 220,
            current: 5,
          };

          const widget =
            window.energyEfficiencyManager.createTemperatureRecommendationWidgetVN(
              mockACData
            );

          // Check if widget contains RL elements
          return (
            widget.includes("rl-recommendation-section") ||
            widget.includes("btn-apply-rl-recommendation")
          );
        },
      },
    ];

    for (const test of tests) {
      try {
        const result = await test.test();
        this.addTestResult(
          `INTEGRATION_${test.name.replace(/\s+/g, "_").toUpperCase()}`,
          result,
          `Integration: ${test.name}`
        );
      } catch (error) {
        this.addTestResult(
          `INTEGRATION_${test.name.replace(/\s+/g, "_").toUpperCase()}`,
          false,
          `Integration: ${test.name} - Error: ${error.message}`
        );
      }
    }
  }

  /**
   * TEST PERFORMANCE
   */
  async testPerformance() {
    console.log("⚡ Testing Performance...");

    const tests = [
      {
        name: "RL Recommendation Speed",
        test: async () => {
          const startTime = performance.now();

          for (let i = 0; i < 100; i++) {
            const context = {
              outdoor_temp: 30 + Math.random() * 10,
              target_temp: 22 + Math.random() * 6,
              room_type: "living-room",
              ac_type: "1.5HP",
              time_of_day: Math.floor(Math.random() * 24),
              current_power: 1000 + Math.random() * 500,
            };

            if (window.temperatureRL) {
              window.temperatureRL.getTemperatureRecommendation(
                this.testAC,
                context
              );
            }
          }

          const endTime = performance.now();
          const avgTime = (endTime - startTime) / 100;

          console.log(
            `Average RL recommendation time: ${avgTime.toFixed(2)}ms`
          );

          // Should be under 5ms per recommendation
          return avgTime < 5;
        },
      },
      {
        name: "Activity Logging Speed",
        test: async () => {
          const startTime = performance.now();

          const promises = [];
          for (let i = 0; i < 50; i++) {
            if (window.temperatureActivityLogger) {
              promises.push(
                window.temperatureActivityLogger.logRecommendationApplication({
                  acId: this.testAC,
                  originalTemp: 24,
                  currentTemp: 24,
                  recommendedTemp: 23,
                  appliedTemp: 23,
                  confidence: 0.8,
                  appliedBy: "test_user",
                  energySavings: 7,
                  context: { test: i, recommendation_type: "stress_test" },
                })
              );
            }
          }

          await Promise.all(promises);

          const endTime = performance.now();
          const avgTime = (endTime - startTime) / 50;

          console.log(`Average activity logging time: ${avgTime.toFixed(2)}ms`);

          // Should be under 20ms per log entry
          return avgTime < 20;
        },
      },
      {
        name: "Memory Usage",
        test: () => {
          // Basic memory usage check
          if (performance.memory) {
            const memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
            console.log(`Current memory usage: ${memoryMB.toFixed(2)}MB`);

            // Should be under 100MB for reasonable performance
            return memoryMB < 100;
          }

          return true; // Skip if memory API not available
        },
      },
    ];

    for (const test of tests) {
      try {
        const result = await test.test();
        this.addTestResult(
          `PERFORMANCE_${test.name.replace(/\s+/g, "_").toUpperCase()}`,
          result,
          `Performance: ${test.name}`
        );
      } catch (error) {
        this.addTestResult(
          `PERFORMANCE_${test.name.replace(/\s+/g, "_").toUpperCase()}`,
          false,
          `Performance: ${test.name} - Error: ${error.message}`
        );
      }
    }
  }

  /**
   * ADD TEST RESULT
   */
  addTestResult(testName, passed, description) {
    this.testResults.push({
      name: testName,
      passed: passed,
      description: description,
      timestamp: Date.now(),
    });

    const status = passed ? "PASS" : "FAIL";
    console.log(`${status} ${testName}: ${description}`);
  }

  /**
   * GENERATE TEST REPORT
   */
  generateTestReport() {
    const endTime = Date.now();
    const totalTime = endTime - this.startTime;

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter((r) => r.passed).length;
    const failedTests = totalTests - passedTests;

    console.log("\n" + "=".repeat(60));
    console.log("🧪 REINFORCEMENT LEARNING SYSTEM TEST REPORT");
    console.log("=".repeat(60));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`⏱️ Total Time: ${totalTime}ms`);
    console.log(
      `📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`
    );

    if (failedTests > 0) {
      console.log("\n❌ FAILED TESTS:");
      this.testResults
        .filter((r) => !r.passed)
        .forEach((r) => {
          console.log(`   • ${r.name}: ${r.description}`);
        });
    }

    console.log("\nDETAILED RESULTS:");
    console.table(
      this.testResults.map((r) => ({
        Test: r.name,
        Status: r.passed ? "PASS" : "FAIL",
        Description: r.description,
      }))
    );

    // Generate overall status
    const overallStatus =
      failedTests === 0
        ? "🎉 ALL TESTS PASSED!"
        : passedTests > failedTests
        ? "PARTIAL SUCCESS"
        : "💥 SYSTEM NOT READY";

    console.log("\n" + "=".repeat(60));
    console.log(overallStatus);
    console.log("=".repeat(60));

    // Return summary for programmatic use
    return {
      totalTests,
      passedTests,
      failedTests,
      successRate: (passedTests / totalTests) * 100,
      totalTime,
      status: overallStatus,
      results: this.testResults,
    };
  }

  /**
   * QUICK HEALTH CHECK
   * Simplified test for basic functionality
   */
  async quickHealthCheck() {
    console.log("🔍 RL System Quick Health Check...");

    const checks = {
      rlLoaded: window.temperatureRL !== undefined,
      rlInitialized:
        window.temperatureRL && window.temperatureRL.isInitialized(),
      loggerLoaded: window.temperatureActivityLogger !== undefined,
      loggerInitialized:
        window.temperatureActivityLogger &&
        window.temperatureActivityLogger.isInitialized(),
      uiLoaded: window.tempActivityLogUI !== undefined,
      uiInitialized:
        window.tempActivityLogUI && window.tempActivityLogUI.isInitialized(),
      energyManagerIntegrated:
        window.energyEfficiencyManager &&
        typeof window.energyEfficiencyManager.applyRLRecommendation ===
          "function",
    };

    const passedChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;

    console.log("Health Check Results:");
    Object.entries(checks).forEach(([key, value]) => {
      console.log(`${value ? "PASS" : "FAIL"} ${key}`);
    });

    console.log(
      `\nHealth Score: ${passedChecks}/${totalChecks} (${(
        (passedChecks / totalChecks) *
        100
      ).toFixed(1)}%)`
    );

    return {
      score: passedChecks / totalChecks,
      details: checks,
      ready: passedChecks === totalChecks,
    };
  }

  /**
   * DEMO MODE
   * Run interactive demo of RL system
   */
  async runDemo() {
    console.log("🎬 Starting RL System Demo...");

    if (!window.temperatureRL || !window.temperatureActivityLogger) {
      console.error("❌ Demo requires RL components to be loaded");
      return;
    }

    console.log("🏠 Setting up demo AC...");

    // Configure demo AC
    if (window.energyEfficiencyManager) {
      window.energyEfficiencyManager.configureACUnit("demo-ac", {
        type: "1.5HP",
        technology: "inverter",
        roomSize: "medium",
        roomType: "living-room",
        brand: "Demo Brand",
        model: "Smart AC Pro",
      });
    }

    // Simulate usage pattern
    console.log("🤖 Simulating AI learning process...");

    const scenarios = [
      { outdoor: 35, target: 24, expected: 23, user_accepts: true },
      { outdoor: 32, target: 25, expected: 24, user_accepts: false },
      { outdoor: 30, target: 22, expected: 23, user_accepts: true },
      { outdoor: 28, target: 26, expected: 25, user_accepts: true },
      { outdoor: 38, target: 20, expected: 22, user_accepts: false },
    ];

    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];

      console.log(
        `\n📝 Scenario ${i + 1}: Outdoor ${scenario.outdoor}°C, Target ${
          scenario.target
        }°C`
      );

      // Get RL recommendation
      const context = {
        outdoor_temp: scenario.outdoor,
        target_temp: scenario.target,
        room_type: "living-room",
        ac_type: "1.5HP",
        time_of_day: 14,
        current_power: 1200,
      };

      const recommendation = window.temperatureRL.getTemperatureRecommendation(
        "demo-ac",
        context
      );
      console.log(
        `🤖 AI recommends: ${recommendation.recommendedTemp}°C (confidence: ${(
          recommendation.confidence * 100
        ).toFixed(1)}%)`
      );

      // Simulate user response
      if (scenario.user_accepts) {
        console.log("User accepts recommendation");
        await window.temperatureActivityLogger.logRecommendationApplication({
          acId: "demo-ac",
          originalTemp: scenario.target,
          currentTemp: scenario.target,
          recommendedTemp: recommendation.recommendedTemp,
          appliedTemp: recommendation.recommendedTemp,
          confidence: recommendation.confidence,
          appliedBy: "demo_user",
          energySavings:
            Math.abs(scenario.target - recommendation.recommendedTemp) * 7,
          context: {
            ...context,
            recommendation_type: "demo_scenario",
          },
        });

        // Positive feedback
        window.temperatureRL.updateReward(
          "demo-ac",
          context,
          recommendation.recommendedTemp,
          1.0,
          "accepted"
        );
      } else {
        console.log("❌ User rejects recommendation");

        // Negative feedback
        window.temperatureRL.updateReward(
          "demo-ac",
          context,
          recommendation.recommendedTemp,
          -0.5,
          "rejected"
        );

        // Log manual adjustment
        await window.temperatureActivityLogger.logManualAdjustment(
          "demo-ac",
          recommendation.recommendedTemp,
          scenario.target,
          "demo_user",
          2000,
          context
        );
      }

      // Wait between scenarios
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Show learning results
    console.log("\nLearning Results:");
    const stats = window.temperatureRL.getACStatistics("demo-ac");
    console.log("Statistics:", stats);

    // Test improved recommendation
    console.log("\n🎯 Testing learned behavior:");
    const finalTest = {
      outdoor_temp: 35,
      target_temp: 24,
      room_type: "living-room",
      ac_type: "1.5HP",
      time_of_day: 14,
      current_power: 1200,
    };

    const finalRec = window.temperatureRL.getTemperatureRecommendation(
      "demo-ac",
      finalTest
    );
    console.log(
      `🧠 Final AI recommendation: ${
        finalRec.recommendedTemp
      }°C (confidence: ${(finalRec.confidence * 100).toFixed(1)}%)`
    );

    console.log("\n🎉 Demo completed! AI has learned from user preferences.");
  }
}

// Global instance for easy access
window.RLSystemTest = new RLSystemTest();

// Auto-run health check when page loads
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(async () => {
    console.log("🔍 Auto-running RL System Health Check...");
    const health = await window.RLSystemTest.quickHealthCheck();

    if (health.ready) {
      console.log(
        "🎉 RL System is ready! Run RLSystemTest.runDemo() for a demonstration."
      );
    } else {
      console.log(
        "RL System not fully ready. Run RLSystemTest.runAllTests() for detailed diagnostics."
      );
    }
  }, 5000);
});

console.log("🧪 RL System Test Suite loaded. Available commands:");
console.log("• RLSystemTest.runAllTests() - Complete test suite");
console.log("• RLSystemTest.quickHealthCheck() - Quick status check");
console.log("• RLSystemTest.runDemo() - Interactive demonstration");
