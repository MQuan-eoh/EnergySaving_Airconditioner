/**
 * ELECTRICITY BILL MANAGEMENT SYSTEM
 * Advanced Glass Calendar với Before/After Comparison Engine
 * Firebase Integration for Cloud Storage
 *
 * DESIGN CONCEPT:
 * - Glass Calendar với month/year navigation
 * - Before/After energy consumption comparison
 * - Working days/hours configuration
 * - Excel export functionality
 * - Statistical analysis engine
 * - Firebase Realtime Database integration
 *
 * ARCHITECTURE:
 * - Singleton Pattern cho Data Management
 * - Observer Pattern cho UI Updates
 * - Module Pattern cho Component Isolation
 * - Event-Driven Architecture
 * - Hybrid Storage: LocalStorage + Firebase
 */

class ElectricityBillManager {
  constructor() {
    if (ElectricityBillManager.instance) {
      return ElectricityBillManager.instance;
    }

    this.initialized = false;
    this.currentDate = new Date();
    this.selectedDate = null;
    this.billData = new Map(); // Store bill data by month-year key
    this.workingConfig = {
      workingDays: [1, 2, 3, 4, 5], // Mon-Fri default
      hoursPerDay: 8,
      isFlexible: false,
    };
    this.comparisonResults = null;
    this.observers = [];
    this.updateTimeout = null; // For debouncing
    this.storageManager = null; // Firebase storage manager

    ElectricityBillManager.instance = this;
    console.log("Electricity Bill Manager initialized");
  }

  /**
   * INITIALIZE SYSTEM
   * Setup DOM, events, Firebase integration, and load existing data
   */
  async init() {
    if (this.initialized) {
      console.warn("Electricity Bill Manager already initialized");
      return;
    }

    this.setupDOM();
    this.bindEvents();
    await this.initializeStorage();
    await this.loadStoredData();
    this.updateCalendar();

    // Auto-select day 1 of current month on first load
    this.autoSelectDay1();

    this.initialized = true;
    console.log("Electricity Bill Manager ready!");
  }

  /**
   * INITIALIZE STORAGE SYSTEM
   * Setup Firebase storage manager integration
   */
  async initializeStorage() {
    try {
      // Get Firebase storage manager instance
      this.storageManager = window.firebaseStorageManager;

      if (this.storageManager) {
        // Subscribe to storage events
        this.storageManager.subscribe((event, data) => {
          this.handleStorageEvent(event, data);
        });

        console.log("✅ Firebase storage integration enabled");
        this.showNotification("Đã kết nối cloud storage", "success");
      } else {
        console.warn(
          "⚠️ Firebase storage manager not available - using LocalStorage only"
        );
        this.showNotification("Chế độ offline - dữ liệu lưu cục bộ", "warning");
      }
    } catch (error) {
      console.error("Storage initialization error:", error);
      this.showNotification(
        "Lỗi kết nối storage - dùng chế độ offline",
        "warning"
      );
    }
  }

  /**
   * HANDLE STORAGE EVENTS
   * Process Firebase storage events
   */
  handleStorageEvent(event, data) {
    switch (event) {
      case "data_synced":
        this.billData = data;
        this.updateCalendar();
        this.showNotification("Dữ liệu đã đồng bộ từ cloud", "success");
        break;

      case "user_signed_in":
        this.showNotification(
          `Chào mừng ${data.displayName || "User"}!`,
          "success"
        );
        break;

      case "user_signed_out":
        this.showNotification(
          "Đã đăng xuất - chuyển sang chế độ offline",
          "info"
        );
        break;

      case "network_online":
        this.showNotification("Đã kết nối mạng - đồng bộ dữ liệu", "success");
        break;

      case "network_offline":
        this.showNotification("Mất kết nối - chế độ offline", "warning");
        break;
    }

    // Notify observers
    this.notify("storage_" + event, data);

    // Update Firebase status UI
    this.updateFirebaseStatusUI();
  }

  /**
   * FIREBASE AUTHENTICATION HANDLERS
   */
  async handleGoogleSignIn() {
    try {
      if (this.storageManager) {
        this.showLoading(true);
        const user = await this.storageManager.signInWithGoogle();
        if (user) {
          await this.loadStoredData();
          this.updateCalendar();
        }
      } else {
        this.showNotification("Firebase không khả dụng", "error");
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
      this.showNotification("Lỗi đăng nhập Google", "error");
    } finally {
      this.showLoading(false);
    }
  }

  async handleSignOut() {
    try {
      if (this.storageManager) {
        await this.storageManager.signOut();
        this.showNotification("Đã đăng xuất thành công", "success");
      }
    } catch (error) {
      console.error("Sign-out error:", error);
      this.showNotification("Lỗi đăng xuất", "error");
    }
  }

  updateFirebaseStatusUI() {
    const connectionStatus = document.getElementById("connection-status");
    const authStatus = document.getElementById("auth-status");
    const googleSigninBtn = document.getElementById("google-signin");

    if (!this.storageManager) {
      connectionStatus.innerHTML =
        '<i class="fas fa-exclamation-triangle"></i><span>Offline</span>';
      connectionStatus.className = "status-item offline";
      authStatus.innerHTML =
        '<i class="fas fa-user-slash"></i><span>Không có</span>';
      return;
    }

    const status = this.storageManager.getConnectionStatus();

    // Update connection status
    if (status.isOnline) {
      connectionStatus.innerHTML =
        '<i class="fas fa-wifi"></i><span>Online</span>';
      connectionStatus.className = "status-item online";
    } else {
      connectionStatus.innerHTML =
        '<i class="fas fa-wifi-slash"></i><span>Offline</span>';
      connectionStatus.className = "status-item offline";
    }

    // Update authentication status
    if (status.isAuthenticated) {
      const user = this.storageManager.getCurrentUser();
      const displayName = user.displayName || "User";
      authStatus.innerHTML = `<i class="fas fa-user-check"></i><span>${displayName}</span>`;
      authStatus.className = "status-item authenticated";

      googleSigninBtn.style.display = "none";
    } else {
      authStatus.innerHTML =
        '<i class="fas fa-user"></i><span>Chưa đăng nhập</span>';
      authStatus.className = "status-item";

      googleSigninBtn.style.display = "flex";
    }

    // Show sync queue status
    if (status.pendingSyncItems > 0) {
      connectionStatus.innerHTML += ` <span class="sync-badge">${status.pendingSyncItems}</span>`;
    }
  }

  /**
   * SETUP DOM STRUCTURE
   * Create modal and all UI components
   */
  setupDOM() {
    const modalHTML = `
      <!-- Electricity Bill Management Modal -->
      <div class="electricity-bill-modal" id="electricity-bill-modal">
        <div class="electricity-bill-content">
          <div class="bill-modal-header">
            <h2 class="bill-modal-title">
              <i class="fas fa-chart-line"></i>
              Quản Lý Hóa Đơn Tiền Điện
            </h2>
            <p class="bill-modal-subtitle">
              So sánh tiêu thụ điện năng trước và sau khi sử dụng giải pháp tiết kiệm
            </p>
            
            <!-- Firebase Status Panel -->
            <div class="firebase-status-panel" id="firebase-status-panel">
              <div class="status-item" id="connection-status">
                <i class="fas fa-wifi"></i>
                <span>Đang kết nối...</span>
              </div>
              <div class="status-item" id="auth-status">
                <i class="fas fa-user"></i>
                <span>Đăng nhập...</span>
              </div>
              <div class="status-actions">
                <button class="btn-status" id="google-signin" style="display: none;">
                  <i class="fab fa-google"></i>
                  Google
                </button>
                <button class="btn-status btn-status-stats" id="view-monthly-stats">
                  <i class="fas fa-chart-bar"></i>
                  Thống Kê
                </button>
              </div>
            </div>
            
            <button class="bill-modal-close" id="bill-modal-close">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="bill-modal-body">
            <div class="bill-content-layout">
              <!-- LEFT PANEL - CALENDAR SECTION -->
              <div class="bill-calendar-section">
                <div class="calendar-header">
                  <div class="calendar-title">
                    <i class="fas fa-calendar-alt"></i>
                    Chọn Tháng/Năm
                  </div>
                  <div class="month-year-picker">
                    <div class="month-year-controls">
                      <!-- Month Navigation -->
                      <div class="month-controls">
                        <button class="nav-btn" id="prev-month" title="Tháng trước">
                          <i class="fas fa-chevron-left"></i>
                        </button>
                        <span class="current-month" id="current-month">
                          Tháng ${this.currentDate.getMonth() + 1}
                        </span>
                        <button class="nav-btn" id="next-month" title="Tháng sau">
                          <i class="fas fa-chevron-right"></i>
                        </button>
                      </div>
                      
                      <!-- Year Navigation -->
                      <div class="year-controls">
                        <button class="nav-btn" id="prev-year" title="Năm trước">
                          <i class="fas fa-chevron-left"></i>
                        </button>
                        <span class="current-year" id="current-year">
                          ${this.currentDate.getFullYear()}
                        </span>
                        <button class="nav-btn" id="next-year" title="Năm sau">
                          <i class="fas fa-chevron-right"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Glass Calendar -->
                <div class="glass-calendar">
                  <div class="calendar-grid" id="calendar-grid">
                    ${this.generateCalendarHTML()}
                  </div>
                </div>

                <!-- Selection Info -->
                <div class="selection-info" id="selection-info" style="display: none;">
                  <h4><i class="fas fa-info-circle"></i> Tháng Đã Chọn</h4>
                  <div class="selected-month-info">
                    <div class="info-item">
                      <div class="info-label">Tháng/Năm</div>
                      <div class="info-value" id="selected-month-display">--</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Ngày Làm Việc</div>
                      <div class="info-value" id="working-days-count">--</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- RIGHT PANEL - BILL INPUT SECTION -->
              <div class="bill-input-section">
                <div class="input-section-header">
                  <h3 class="input-section-title">
                    <i class="fas fa-receipt"></i>
                    Nhập Thông Tin Hóa Đơn
                  </h3>
                  <p class="input-section-subtitle">
                    Nhập số tiền điện và cấu hình ngày làm việc
                  </p>
                </div>

                <form class="bill-input-form" id="bill-input-form">
                  <!-- Bill Amount -->
                  <div class="form-group-glass">
                    <label class="form-label-glass">
                      <i class="fas fa-money-bill-wave"></i>
                      Số Tiền Điện (VND)
                    </label>
                    <div class="input-with-unit">
                      <input 
                        type="number" 
                        class="form-input-glass" 
                        id="bill-amount"
                        placeholder="Nhập số tiền điện tháng này (có thể có lẻ)"
                        min="0"
                        step="0.01"
                        required
                      >
                      <span class="input-unit">VND</span>
                    </div>
                  </div>

                  <!-- Power Consumption -->
                  <div class="form-group-glass">
                    <label class="form-label-glass">
                      <i class="fas fa-bolt"></i>
                      Số Điện Tiêu Thụ (kWh)
                    </label>
                    <div class="input-with-unit">
                      <input 
                        type="number" 
                        class="form-input-glass" 
                        id="power-consumption"
                        placeholder="Số kWh tiêu thụ trong tháng"
                        min="0"
                        step="0.1"
                        required
                      >
                      <span class="input-unit">kWh</span>
                    </div>
                  </div>

                  <!-- Working Configuration -->
                  <div class="working-config">
                    <h4><i class="fas fa-cogs"></i> Cấu Hình Ngày Làm Việc</h4>
                    
                    <div class="working-days-grid">
                      <div class="form-group-glass">
                        <label class="form-label-glass">
                          <i class="fas fa-clock"></i>
                          Giờ Làm Việc/Ngày
                        </label>
                        <div class="input-with-unit">
                          <input 
                            type="number" 
                            class="form-input-glass" 
                            id="hours-per-day"
                            value="8"
                            min="1"
                            max="24"
                            step="1"
                            required
                          >
                          <span class="input-unit">giờ</span>
                        </div>
                      </div>

                      <div class="form-group-glass">
                        <label class="form-label-glass">
                          <i class="fas fa-calendar-week"></i>
                          Chọn Ngày Làm Việc
                        </label>
                        <div class="working-days-selector">
                          <div class="day-checkbox">
                            <input type="checkbox" id="day-1" value="1">
                            <label for="day-1">T2</label>
                          </div>
                          <div class="day-checkbox">
                            <input type="checkbox" id="day-2" value="2" checked>
                            <label for="day-2">T3</label>
                          </div>
                          <div class="day-checkbox">
                            <input type="checkbox" id="day-3" value="3" checked>
                            <label for="day-3">T4</label>
                          </div>
                          <div class="day-checkbox">
                            <input type="checkbox" id="day-4" value="4" checked>
                            <label for="day-4">T5</label>
                          </div>
                          <div class="day-checkbox">
                            <input type="checkbox" id="day-5" value="5" checked>
                            <label for="day-5">T6</label>
                          </div>
                          <div class="day-checkbox">
                            <input type="checkbox" id="day-6" value="6" checked>
                            <label for="day-6">T7</label>
                          </div>
                          <div class="day-checkbox">
                            <input type="checkbox" id="day-0" value="0">
                            <label for="day-0">CN</label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Form Actions -->
                  <div class="bill-form-actions">
                    <button type="button" class="btn-glass-secondary" id="clear-form">
                      <i class="fas fa-eraser"></i>
                      Xóa Form
                    </button>
                    <button type="submit" class="btn-glass-primary" id="save-bill">
                      <i class="fas fa-save"></i>
                      Lưu Hóa Đơn
                    </button>
                  </div>
                </form>
              </div>

              <!-- COMPARISON RESULTS SECTION -->
              <div class="comparison-results" id="comparison-results" style="display: none;">
                <div class="comparison-header">
                  <h3 class="comparison-title">
                    <i class="fas fa-chart-pie"></i>
                    Kết Quả So Sánh
                  </h3>
                  <p class="comparison-subtitle">
                    Phân tích hiệu quả tiết kiệm điện năng trước và sau khi áp dụng giải pháp
                  </p>
                </div>

                <div class="comparison-grid" id="comparison-grid">
                  <!-- Comparison cards will be generated here -->
                </div>

                <!-- Export Section -->
                <div class="export-section">
                  <h4 class="export-title">
                    <i class="fas fa-file-excel"></i>
                    Xuất Báo Cáo Excel
                  </h4>
                  <p class="export-description">
                    Tải xuống báo cáo chi tiết so sánh tiêu thụ điện năng với đầy đủ thống kê và biểu đồ
                  </p>
                  <div class="export-actions">
                    <button class="btn-export" id="export-detailed">
                      <i class="fas fa-file-excel"></i>
                      Báo Cáo Chi Tiết
                    </button>
                    <button class="btn-export" id="export-summary">
                      <i class="fas fa-chart-bar"></i>
                      Tóm Tắt Thống Kê
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Loading Overlay -->
          <div class="loading-overlay" id="bill-loading-overlay">
            <div class="loading-spinner"></div>
          </div>
        </div>
      </div>
    `;

    // Insert modal into DOM
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Add Monthly Statistics Modal
    const statsModalHTML = `
      <!-- Monthly Statistics Modal -->
      <div class="electricity-bill-modal stats-modal" id="monthly-stats-modal">
        <div class="electricity-bill-content stats-content">
          <div class="bill-modal-header">
            <h2 class="bill-modal-title">
              <i class="fas fa-chart-bar"></i>
              Thống Kê Hóa Đơn Điện Hàng Tháng
            </h2>
            <p class="bill-modal-subtitle">
              Xem tổng quan dữ liệu tiêu thụ điện năng và chi phí theo từng tháng
            </p>
            
            <button class="bill-modal-close" id="stats-modal-close">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="bill-modal-body">
            <!-- Statistics Content -->
            <div class="stats-content-layout">
              <!-- Summary Cards -->
              <div class="stats-summary-grid">
                <div class="stats-card total-bills">
                  <div class="stats-card-icon">
                    <i class="fas fa-file-invoice-dollar"></i>
                  </div>
                  <div class="stats-card-value" id="total-bills-count">0</div>
                  <div class="stats-card-label">tháng theo dõi</div>
                </div>

                <div class="stats-card total-amount">
                  <div class="stats-card-icon">
                    <i class="fas fa-money-bill-wave"></i>
                  </div>
                  <div class="stats-card-value" id="total-amount-value">0 VND</div>
                  <div class="stats-card-label">tổng tiền điện</div>
                </div>

                <div class="stats-card total-consumption">
                  <div class="stats-card-icon">
                    <i class="fas fa-bolt"></i>
                  </div>
                  <div class="stats-card-value" id="total-consumption-value">0 kWh</div>
                  <div class="stats-card-label">điện năng sử dụng</div>
                </div>

                <div class="stats-card average-monthly">
                  <div class="stats-card-icon">
                    <i class="fas fa-chart-pie"></i>
                  </div>
                  <div class="stats-card-value" id="average-monthly-value">0 VND</div>
                  <div class="stats-card-label">chi phí trung bình</div>
                </div>
              </div>

              <!-- Monthly Data Table -->
              <div class="monthly-data-table-container">
                <div class="table-header">
                  <h3>
                    <i class="fas fa-table"></i>
                    Chi Tiết Theo Tháng
                  </h3>
                  <div class="table-actions">
                    <button class="btn-glass-secondary" id="refresh-stats">
                      <i class="fas fa-sync-alt"></i>
                      Làm Mới
                    </button>
                    <button class="btn-glass-primary" id="export-stats">
                      <i class="fas fa-download"></i>
                      Xuất Excel
                    </button>
                  </div>
                </div>

                <div class="stats-list-wrapper">
                  <div id="monthly-stats-list" class="monthly-stats-list">
                    <!-- Dynamic content populated by JavaScript -->
                  </div>
                </div>
              </div>

              <!-- Chart Visualization -->
              <div class="stats-chart-container">
                <div class="chart-header">
                  <h3>
                    <i class="fas fa-chart-line"></i>
                    Biểu Đồ Xu Hướng
                  </h3>
                  <div class="chart-controls">
                    <button class="chart-toggle-btn active" data-chart="amount">
                      <i class="fas fa-money-bill"></i>
                      Tiền Điện
                    </button>
                    <button class="chart-toggle-btn" data-chart="consumption">
                      <i class="fas fa-bolt"></i>
                      Điện Năng
                    </button>
                  </div>
                </div>
                <div class="chart-wrapper">
                  <canvas id="monthly-stats-chart"></canvas>
                </div>
              </div>
            </div>
          </div>

          <!-- Loading Overlay -->
          <div class="loading-overlay" id="stats-loading-overlay">
            <div class="loading-spinner"></div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", statsModalHTML);
  }

  /**
   * BIND EVENT LISTENERS
   * Setup all interactive functionality
   */
  bindEvents() {
    // Modal controls
    document
      .getElementById("bill-modal-close")
      .addEventListener("click", () => this.hide());
    document
      .getElementById("electricity-bill-modal")
      .addEventListener("click", (e) => {
        if (e.target.id === "electricity-bill-modal") this.hide();
      });

    // Firebase authentication controls
    document
      .getElementById("google-signin")
      .addEventListener("click", () => this.handleGoogleSignIn());

    // Monthly statistics button
    document
      .getElementById("view-monthly-stats")
      .addEventListener("click", () => this.showMonthlyStats());

    // Stats modal controls
    document
      .getElementById("stats-modal-close")
      .addEventListener("click", () => this.hideMonthlyStats());
    document
      .getElementById("monthly-stats-modal")
      .addEventListener("click", (e) => {
        if (e.target.id === "monthly-stats-modal") this.hideMonthlyStats();
      });
    // Calendar navigation
    document
      .getElementById("prev-month")
      .addEventListener("click", () => this.navigateMonth(-1));
    document
      .getElementById("next-month")
      .addEventListener("click", () => this.navigateMonth(1));
    document
      .getElementById("prev-year")
      .addEventListener("click", () => this.navigateYear(-1));
    document
      .getElementById("next-year")
      .addEventListener("click", () => this.navigateYear(1));

    // Form submission
    document
      .getElementById("bill-input-form")
      .addEventListener("submit", (e) => this.handleFormSubmit(e));
    document
      .getElementById("clear-form")
      .addEventListener("click", () => this.clearForm());

    // Working days checkboxes
    document.querySelectorAll(".day-checkbox input").forEach((checkbox) => {
      checkbox.addEventListener("change", () => this.updateWorkingDays());
    });

    // Add input formatting for bill amount
    const billAmountInput = document.getElementById("bill-amount");
    if (billAmountInput) {
      // Format display while preserving actual numeric value
      billAmountInput.addEventListener("blur", (e) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value)) {
          // Keep the actual numeric value for calculations
          e.target.value = value;
          console.log("Bill amount set to:", value);
        }
      });

      // Show helpful placeholder on focus
      billAmountInput.addEventListener("focus", (e) => {
        if (e.target.value === "") {
          e.target.placeholder = "Ví dụ: 350000 hoặc 350000.50";
        }
      });

      billAmountInput.addEventListener("blur", (e) => {
        if (e.target.value === "") {
          e.target.placeholder = "Nhập số tiền điện tháng này (có thể có lẻ)";
        }
      });
    }

    // Export buttons
    document
      .getElementById("export-detailed")
      .addEventListener("click", () => this.exportToExcel("detailed"));
    document
      .getElementById("export-summary")
      .addEventListener("click", () => this.exportToExcel("summary"));

    // Stats modal action buttons
    document
      .getElementById("refresh-stats")
      .addEventListener("click", () => this.refreshStats());
    document
      .getElementById("export-stats")
      .addEventListener("click", () => this.exportStatsToExcel());

    // Chart toggle buttons
    document.querySelectorAll(".chart-toggle-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const chartType = e.target.closest(".chart-toggle-btn").dataset.chart;
        this.toggleChart(chartType);
      });
    });

    // Calendar day selection will be bound dynamically
  }

  /**
   * CALENDAR GENERATION METHODS
   */
  generateCalendarHTML() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    // Days of week headers
    const dayHeaders = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    let html = "";

    // Add day headers
    dayHeaders.forEach((day) => {
      html += `<div class="calendar-day-header">${day}</div>`;
    });

    // Get first day of month and days in month
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Add previous month's trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      html += `<div class="calendar-day other-month" data-day="${day}" data-month="${
        month - 1
      }" data-year="${year}">${day}</div>`;
    }

    // Add current month days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday =
        year === today.getFullYear() &&
        month === today.getMonth() &&
        day === today.getDate();

      const monthKey = this.getMonthKey(year, month);
      const hasData = this.billData.has(monthKey);

      let classes = "calendar-day";
      if (isToday) classes += " today";
      if (hasData) classes += " has-data";

      html += `<div class="${classes}" data-day="${day}" data-month="${month}" data-year="${year}">${day}</div>`;
    }

    // Add next month's leading days
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const remainingCells = totalCells - (firstDay + daysInMonth);

    for (let day = 1; day <= remainingCells; day++) {
      html += `<div class="calendar-day other-month" data-day="${day}" data-month="${
        month + 1
      }" data-year="${year}">${day}</div>`;
    }

    return html;
  }

  updateCalendar() {
    // Clear existing timeout to prevent multiple rapid updates
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    // Debounce calendar updates
    this.updateTimeout = setTimeout(() => {
      const calendarGrid = document.getElementById("calendar-grid");
      if (calendarGrid) {
        calendarGrid.innerHTML = this.generateCalendarHTML();

        // Update navigation display
        this.updateNavigationDisplay();

        // Bind calendar day events
        this.bindCalendarEvents();
      }
    }, 50);
  }

  bindCalendarEvents() {
    document
      .querySelectorAll(".calendar-day:not(.other-month)")
      .forEach((dayEl) => {
        dayEl.addEventListener("click", (e) => {
          const day = parseInt(e.target.dataset.day);
          const month = parseInt(e.target.dataset.month);
          const year = parseInt(e.target.dataset.year);

          // User explicitly clicked on a specific day
          this.selectDay(year, month, day);
        });
      });
  }

  /**
   * SELECT SPECIFIC DAY
   * Allow user to select any day, not just day 1
   */
  selectDay(year, month, day) {
    // Set selectedDate to the clicked day
    this.selectedDate = new Date(year, month, day);

    // Update UI - Remove previous selections
    document
      .querySelectorAll(".calendar-day")
      .forEach((el) => el.classList.remove("selected"));

    // Select the clicked day
    const clickedElement = document.querySelector(
      `[data-month="${month}"][data-year="${year}"][data-day="${day}"]:not(.other-month)`
    );

    if (clickedElement) {
      clickedElement.classList.add("selected");
      console.log(`User selected day ${day} of month ${month + 1}/${year}`);
    }

    // Show selection info
    this.updateSelectionInfo();

    // Load existing bill data for this month
    this.loadBillDataForMonth(year, month);
  }

  /**
   * MONTH SELECTION AND NAVIGATION
   * Auto-select day 1 when navigating to a new month
   */
  selectMonth(year, month) {
    // Always select the 1st day of the month when navigating
    this.selectedDate = new Date(year, month, 1);

    // Update UI - Remove previous selections
    document
      .querySelectorAll(".calendar-day")
      .forEach((el) => el.classList.remove("selected"));

    // Select day 1 of the target month automatically
    const day1Element = document.querySelector(
      `[data-month="${month}"][data-year="${year}"][data-day="1"]:not(.other-month)`
    );

    if (day1Element) {
      day1Element.classList.add("selected");
      console.log(`Auto-selected day 1 of month ${month + 1}/${year}`);
    } else {
      // Fallback: select any day from the target month if day 1 not found
      const anyDayInMonth = document.querySelector(
        `[data-month="${month}"][data-year="${year}"]:not(.other-month)`
      );
      if (anyDayInMonth) {
        anyDayInMonth.classList.add("selected");
        // Update selectedDate to match the selected day
        const dayNum = parseInt(anyDayInMonth.getAttribute("data-day")) || 1;
        this.selectedDate = new Date(year, month, dayNum);
        console.log(
          `Fallback: selected day ${dayNum} of month ${month + 1}/${year}`
        );
      }
    }

    // Show selection info
    this.updateSelectionInfo();

    // Load existing bill data if available
    this.loadBillDataForMonth(year, month);

    console.log(
      `Navigated to month: ${
        month + 1
      }/${year}, selected day: ${this.selectedDate.getDate()}`
    );
  }

  updateSelectionInfo() {
    const selectionInfo = document.getElementById("selection-info");
    const selectedMonthDisplay = document.getElementById(
      "selected-month-display"
    );
    const workingDaysCount = document.getElementById("working-days-count");

    if (this.selectedDate) {
      const monthNames = [
        "Tháng 1",
        "Tháng 2",
        "Tháng 3",
        "Tháng 4",
        "Tháng 5",
        "Tháng 6",
        "Tháng 7",
        "Tháng 8",
        "Tháng 9",
        "Tháng 10",
        "Tháng 11",
        "Tháng 12",
      ];

      const monthName = monthNames[this.selectedDate.getMonth()];
      const year = this.selectedDate.getFullYear();

      selectedMonthDisplay.textContent = `${monthName} ${year}`;
      workingDaysCount.textContent = `${this.calculateWorkingDays()} ngày`;

      selectionInfo.style.display = "block";
    } else {
      selectionInfo.style.display = "none";
    }
  }

  navigateYear(direction) {
    this.currentDate.setFullYear(this.currentDate.getFullYear() + direction);
    this.updateCalendar();
    this.updateNavigationDisplay();

    // Auto-select day 1 of the new year/month
    this.autoSelectDay1();
  }

  navigateMonth(direction) {
    this.currentDate.setMonth(this.currentDate.getMonth() + direction);
    this.updateCalendar();
    this.updateNavigationDisplay();

    // Auto-select day 1 of the new month
    this.autoSelectDay1();
  }

  /**
   * AUTO-SELECT DAY 1 OF CURRENT MONTH
   * Automatically select day 1 when navigating months/years
   */
  autoSelectDay1() {
    // Wait for calendar to be rendered
    setTimeout(() => {
      const year = this.currentDate.getFullYear();
      const month = this.currentDate.getMonth();

      // Set selectedDate to day 1 of current month
      this.selectedDate = new Date(year, month, 1);

      // Clear previous selections
      document
        .querySelectorAll(".calendar-day")
        .forEach((el) => el.classList.remove("selected"));

      // Find and select day 1 element
      const day1Element = document.querySelector(
        `[data-month="${month}"][data-year="${year}"][data-day="1"]:not(.other-month)`
      );

      if (day1Element) {
        day1Element.classList.add("selected");
        console.log(`Auto-selected day 1 of ${month + 1}/${year}`);

        // Update selection info
        this.updateSelectionInfo();

        // Load bill data for this month
        this.loadBillDataForMonth(year, month);
      } else {
        console.warn(`Could not find day 1 element for ${month + 1}/${year}`);
      }
    }, 150); // Increased delay to ensure calendar is fully rendered
  }

  updateNavigationDisplay() {
    const currentMonthEl = document.getElementById("current-month");
    const currentYearEl = document.getElementById("current-year");

    if (currentMonthEl) {
      currentMonthEl.textContent = `Tháng ${this.currentDate.getMonth() + 1}`;
    }
    if (currentYearEl) {
      currentYearEl.textContent = this.currentDate.getFullYear();
    }
  }

  getMonthYearDisplay() {
    const monthNames = [
      "Tháng 1",
      "Tháng 2",
      "Tháng 3",
      "Tháng 4",
      "Tháng 5",
      "Tháng 6",
      "Tháng 7",
      "Tháng 8",
      "Tháng 9",
      "Tháng 10",
      "Tháng 11",
      "Tháng 12",
    ];

    return `${
      monthNames[this.currentDate.getMonth()]
    } ${this.currentDate.getFullYear()}`;
  }

  getMonthKey(year, month) {
    return `${year}-${String(month + 1).padStart(2, "0")}`;
  }

  /**
   * WORKING DAYS CALCULATION
   */
  calculateWorkingDays() {
    if (!this.selectedDate) return 0;

    const year = this.selectedDate.getFullYear();
    const month = this.selectedDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let workingDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();

      if (this.workingConfig.workingDays.includes(dayOfWeek)) {
        workingDays++;
      }
    }

    return workingDays;
  }

  updateWorkingDays() {
    const selectedDays = [];
    document
      .querySelectorAll(".day-checkbox input:checked")
      .forEach((checkbox) => {
        selectedDays.push(parseInt(checkbox.value));
      });

    this.workingConfig.workingDays = selectedDays;
    this.updateSelectionInfo();

    console.log("Working days updated:", selectedDays);
  }

  /**
   * FORM HANDLING METHODS
   */
  handleFormSubmit(e) {
    e.preventDefault();

    if (!this.selectedDate) {
      this.showNotification(
        "Vui lòng chọn tháng trước khi lưu hóa đơn!",
        "warning"
      );
      return;
    }

    const formData = this.getFormData();
    if (!formData) return;

    this.saveBillData(formData);
  }

  getFormData() {
    const billAmount = parseFloat(document.getElementById("bill-amount").value);
    const powerConsumption = parseFloat(
      document.getElementById("power-consumption").value
    );
    const hoursPerDay = parseInt(
      document.getElementById("hours-per-day").value
    );

    if (!billAmount || !powerConsumption || !hoursPerDay) {
      this.showNotification("Vui lòng điền đầy đủ thông tin!", "error");
      return null;
    }

    return {
      year: this.selectedDate.getFullYear(),
      month: this.selectedDate.getMonth(),
      // Firebase schema fields
      amount: billAmount,
      kwh: powerConsumption,
      // Additional fields for local storage and UI
      billAmount,
      powerConsumption,
      hoursPerDay,
      workingDays: [...this.workingConfig.workingDays],
      workingDaysCount: this.calculateWorkingDays(),
      createdAt: new Date().toISOString(),
    };
  }

  async saveBillData(data) {
    const monthKey = this.getMonthKey(data.year, data.month);

    // Store in local billData Map with full data structure
    this.billData.set(monthKey, {
      ...data,
      lastModified: Date.now(),
    });

    try {
      // Save to Firebase using the specialized single month method
      if (this.storageManager) {
        // Use saveSingleMonthBill for better data structure mapping
        const success = await this.storageManager.saveSingleMonthBill(
          data.year,
          data.month + 1, // Month is 0-indexed in JS, 1-indexed in storage
          {
            kwh: data.kwh,
            amount: data.amount,
            workingDays: data.workingDaysCount || data.workingDays?.length || 0,
            notes: data.notes || "",
          }
        );

        if (!success) {
          throw new Error("Firebase save failed");
        }

        // Clear form inputs after successful Firebase save
        this.clearBillInputs();
      } else {
        // Fallback to localStorage
        this.saveToStorage();
      }

      // Update calendar to show data indicator
      this.updateCalendar();

      // Calculate comparison if we have enough data
      this.calculateComparison();

      this.showNotification("Đã lưu hóa đơn thành công!", "success");
      console.log("Bill data saved successfully:", {
        monthKey,
        kwh: data.kwh,
        amount: data.amount,
        month: data.month + 1,
        year: data.year,
      });
    } catch (error) {
      console.error("Save bill data error:", error);
      this.showNotification("Lỗi lưu dữ liệu - đã lưu cục bộ", "warning");

      // Fallback to localStorage
      this.saveToStorage();
    }
  }

  loadBillDataForMonth(year, month) {
    const monthKey = this.getMonthKey(year, month);
    const data = this.billData.get(monthKey);

    if (data) {
      // Support both old and new data structure
      const billAmount = data.amount || data.billAmount || 0;
      const powerConsumption = data.kwh || data.powerConsumption || 0;
      const hoursPerDay = data.hoursPerDay || 8;
      const workingDays = data.workingDays || [1, 2, 3, 4, 5];

      // Populate form with existing data
      document.getElementById("bill-amount").value = billAmount;
      document.getElementById("power-consumption").value = powerConsumption;
      document.getElementById("hours-per-day").value = hoursPerDay;

      // Update working days checkboxes
      document.querySelectorAll(".day-checkbox input").forEach((checkbox) => {
        checkbox.checked = workingDays.includes(parseInt(checkbox.value));
      });

      this.workingConfig.workingDays = workingDays;

      console.log("Loaded existing bill data:", {
        monthKey,
        amount: billAmount,
        kwh: powerConsumption,
        originalData: data,
      });
    } else {
      // Only clear form if user hasn't entered any data
      // Check if form has any user-entered values
      const billAmount = document.getElementById("bill-amount").value.trim();
      const powerConsumption = document
        .getElementById("power-consumption")
        .value.trim();

      if (!billAmount && !powerConsumption) {
        // Form is empty, safe to clear and set defaults
        this.clearForm();
      } else {
        // User has entered data, only reset working days to default
        console.log("Preserving user input - not clearing form");

        // Still reset working days to default for new month
        document.querySelectorAll(".day-checkbox input").forEach((checkbox) => {
          checkbox.checked = [1, 2, 3, 4, 5].includes(parseInt(checkbox.value));
        });
        this.workingConfig.workingDays = [1, 2, 3, 4, 5];

        // Set hours per day to default if not set
        if (!document.getElementById("hours-per-day").value) {
          document.getElementById("hours-per-day").value = 8;
        }
      }
    }
  }

  /**
   * CLEAR BILL INPUT FIELDS ONLY
   * Clear only bill amount and power consumption fields after successful save
   */
  clearBillInputs() {
    const billAmountInput = document.getElementById("bill-amount");
    const powerConsumptionInput = document.getElementById("power-consumption");

    if (billAmountInput) {
      billAmountInput.value = "";
      // Reset placeholder
      billAmountInput.placeholder = "Nhập số tiền điện tháng này)";
    }

    if (powerConsumptionInput) {
      powerConsumptionInput.value = "";
    }

    // Focus on bill amount input for quick re-entry
    setTimeout(() => {
      if (billAmountInput) {
        billAmountInput.focus();
      }
    }, 100);

    console.log(" Bill input fields cleared after successful save");
  }

  clearForm() {
    document.getElementById("bill-input-form").reset();
    document.getElementById("hours-per-day").value = 8;

    // Reset working days to default (Mon-Fri)
    document
      .querySelectorAll(".day-checkbox input")
      .forEach((checkbox, index) => {
        checkbox.checked = [1, 2, 3, 4, 5].includes(parseInt(checkbox.value));
      });

    this.workingConfig.workingDays = [1, 2, 3, 4, 5];
  }

  /**
   * COMPARISON AND ANALYSIS ENGINE
   */
  calculateComparison() {
    const billDataArray = Array.from(this.billData.values());

    if (billDataArray.length < 2) {
      document.getElementById("comparison-results").style.display = "none";
      return;
    }

    // Sort by date to get before/after periods
    billDataArray.sort((a, b) => {
      const dateA = new Date(a.year, a.month);
      const dateB = new Date(b.year, b.month);
      return dateA - dateB;
    });

    // Calculate different period comparisons
    this.comparisonResults = {
      monthly: this.calculateMonthlyComparison(billDataArray),
      quarterly: this.calculateQuarterlyComparison(billDataArray),
      halfYearly: this.calculateHalfYearlyComparison(billDataArray),
      yearly: this.calculateYearlyComparison(billDataArray),
    };

    this.displayComparisonResults();
  }

  calculateMonthlyComparison(data) {
    if (data.length < 2) return null;

    const latest = data[data.length - 1];
    const previous = data[data.length - 2];

    return this.compareDataPoints(previous, latest, "Tháng");
  }

  calculateQuarterlyComparison(data) {
    if (data.length < 6) return null; // Need at least 6 months for 2 quarters

    const latestQuarter = data.slice(-3);
    const previousQuarter = data.slice(-6, -3);

    return this.compareDataSets(previousQuarter, latestQuarter, "Quý");
  }

  calculateHalfYearlyComparison(data) {
    if (data.length < 12) return null; // Need at least 12 months for 2 half-years

    const latestHalf = data.slice(-6);
    const previousHalf = data.slice(-12, -6);

    return this.compareDataSets(previousHalf, latestHalf, "6 Tháng");
  }

  calculateYearlyComparison(data) {
    if (data.length < 24) return null; // Need at least 24 months for 2 years

    const latestYear = data.slice(-12);
    const previousYear = data.slice(-24, -12);

    return this.compareDataSets(previousYear, latestYear, "Năm");
  }

  compareDataPoints(before, after, period) {
    const billSavings = before.billAmount - after.billAmount;
    const billSavingsPercent = (billSavings / before.billAmount) * 100;

    const powerSavings = before.powerConsumption - after.powerConsumption;
    const powerSavingsPercent = (powerSavings / before.powerConsumption) * 100;

    // Calculate daily averages
    const dailyBillBefore = before.billAmount / before.workingDaysCount;
    const dailyBillAfter = after.billAmount / after.workingDaysCount;
    const dailyBillSavings = dailyBillBefore - dailyBillAfter;

    const dailyPowerBefore = before.powerConsumption / before.workingDaysCount;
    const dailyPowerAfter = after.powerConsumption / after.workingDaysCount;
    const dailyPowerSavings = dailyPowerBefore - dailyPowerAfter;

    return {
      period,
      before: {
        billAmount: before.billAmount,
        powerConsumption: before.powerConsumption,
        workingDays: before.workingDaysCount,
        dailyBill: dailyBillBefore,
        dailyPower: dailyPowerBefore,
      },
      after: {
        billAmount: after.billAmount,
        powerConsumption: after.powerConsumption,
        workingDays: after.workingDaysCount,
        dailyBill: dailyBillAfter,
        dailyPower: dailyPowerAfter,
      },
      savings: {
        billAmount: billSavings,
        billPercent: billSavingsPercent,
        powerConsumption: powerSavings,
        powerPercent: powerSavingsPercent,
        dailyBill: dailyBillSavings,
        dailyPower: dailyPowerSavings,
      },
    };
  }

  compareDataSets(beforeSet, afterSet, period) {
    const beforeTotal = beforeSet.reduce(
      (sum, data) => ({
        billAmount: sum.billAmount + data.billAmount,
        powerConsumption: sum.powerConsumption + data.powerConsumption,
        workingDays: sum.workingDays + data.workingDaysCount,
      }),
      { billAmount: 0, powerConsumption: 0, workingDays: 0 }
    );

    const afterTotal = afterSet.reduce(
      (sum, data) => ({
        billAmount: sum.billAmount + data.billAmount,
        powerConsumption: sum.powerConsumption + data.powerConsumption,
        workingDays: sum.workingDays + data.workingDaysCount,
      }),
      { billAmount: 0, powerConsumption: 0, workingDays: 0 }
    );

    // Calculate averages
    const beforeAvg = {
      billAmount: beforeTotal.billAmount / beforeSet.length,
      powerConsumption: beforeTotal.powerConsumption / beforeSet.length,
      workingDaysCount: beforeTotal.workingDays / beforeSet.length,
    };

    const afterAvg = {
      billAmount: afterTotal.billAmount / afterSet.length,
      powerConsumption: afterTotal.powerConsumption / afterSet.length,
      workingDaysCount: afterTotal.workingDays / afterSet.length,
    };

    return this.compareDataPoints(beforeAvg, afterAvg, period);
  }

  /**
   * DISPLAY COMPARISON RESULTS
   */
  displayComparisonResults() {
    const comparisonGrid = document.getElementById("comparison-grid");
    const comparisonResults = document.getElementById("comparison-results");

    if (!this.comparisonResults) {
      comparisonResults.style.display = "none";
      return;
    }

    let html = "";

    // Display all available comparisons
    Object.values(this.comparisonResults).forEach((comparison) => {
      if (comparison) {
        html += this.generateComparisonCardHTML(comparison);
      }
    });

    comparisonGrid.innerHTML = html;
    comparisonResults.style.display = "block";
  }

  generateComparisonCardHTML(comparison) {
    const isPositiveSavings = comparison.savings.billPercent > 0;
    const savingsClass = isPositiveSavings ? "positive" : "negative";
    const savingsIcon = isPositiveSavings ? "fa-arrow-down" : "fa-arrow-up";

    return `
      <div class="comparison-card">
        <div class="card-header">
          <div class="card-icon savings">
            <i class="fas ${savingsIcon}"></i>
          </div>
          <h4 class="card-title">So Sánh ${comparison.period}</h4>
        </div>
        
        <div class="card-metrics">
          <div class="metric-row">
            <span class="metric-label">Tiền điện trước:</span>
            <span class="metric-value">${this.formatCurrency(
              comparison.before.billAmount
            )}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Tiền điện sau:</span>
            <span class="metric-value">${this.formatCurrency(
              comparison.after.billAmount
            )}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Điện năng trước:</span>
            <span class="metric-value">${comparison.before.powerConsumption.toFixed(
              1
            )} kWh</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Điện năng sau:</span>
            <span class="metric-value">${comparison.after.powerConsumption.toFixed(
              1
            )} kWh</span>
          </div>
        </div>
        
        <div class="savings-percentage ${savingsClass}">
          ${
            isPositiveSavings ? "+" : ""
          }${comparison.savings.billPercent.toFixed(1)}%
        </div>
        
        <div class="card-metrics">
          <div class="metric-row">
            <span class="metric-label">Tiết kiệm tiền:</span>
            <span class="metric-value ${savingsClass}">
              ${this.formatCurrency(Math.abs(comparison.savings.billAmount))}
            </span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Tiết kiệm điện:</span>
            <span class="metric-value ${savingsClass}">
              ${Math.abs(comparison.savings.powerConsumption).toFixed(1)} kWh
            </span>
          </div>
          <div class="metric-row">
            <span class="metric-label">TB mỗi ngày:</span>
            <span class="metric-value ${savingsClass}">
              ${this.formatCurrency(Math.abs(comparison.savings.dailyBill))}
            </span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * EXCEL EXPORT FUNCTIONALITY
   */
  async exportToExcel(type) {
    this.showLoading(true);

    try {
      if (type === "detailed") {
        await this.exportDetailedReport();
      } else {
        await this.exportSummaryReport();
      }

      this.showNotification("Đã xuất báo cáo Excel thành công!", "success");
    } catch (error) {
      console.error("Export error:", error);
      this.showNotification("Lỗi khi xuất báo cáo Excel!", "error");
    } finally {
      this.showLoading(false);
    }
  }

  async exportDetailedReport() {
    // Import SheetJS library dynamically
    const XLSX = await this.loadXLSXLibrary();

    const workbook = XLSX.utils.book_new();

    // Raw Data Sheet
    const rawData = Array.from(this.billData.values()).map((data) => ({
      "Tháng/Năm": `${data.month + 1}/${data.year}`,
      "Số tiền điện (VND)": data.billAmount,
      "Điện năng tiêu thụ (kWh)": data.powerConsumption,
      "Ngày làm việc": data.workingDaysCount,
      "Giờ làm việc/ngày": data.hoursPerDay,
      "Tiền điện/ngày (VND)": data.billAmount / data.workingDaysCount,
      "Điện năng/ngày (kWh)": data.powerConsumption / data.workingDaysCount,
      "Ngày tạo": new Date(data.createdAt).toLocaleDateString("vi-VN"),
    }));

    const rawDataSheet = XLSX.utils.json_to_sheet(rawData);
    XLSX.utils.book_append_sheet(workbook, rawDataSheet, "Dữ liệu thô");

    // Comparison Sheet
    if (this.comparisonResults) {
      const comparisonData = [];

      Object.values(this.comparisonResults).forEach((comparison) => {
        if (comparison) {
          comparisonData.push({
            "Kỳ so sánh": comparison.period,
            "Tiền điện trước (VND)": comparison.before.billAmount,
            "Tiền điện sau (VND)": comparison.after.billAmount,
            "Tiết kiệm tiền (VND)": comparison.savings.billAmount,
            "Tiết kiệm tiền (%)": comparison.savings.billPercent,
            "Điện năng trước (kWh)": comparison.before.powerConsumption,
            "Điện năng sau (kWh)": comparison.after.powerConsumption,
            "Tiết kiệm điện (kWh)": comparison.savings.powerConsumption,
            "Tiết kiệm điện (%)": comparison.savings.powerPercent,
          });
        }
      });

      const comparisonSheet = XLSX.utils.json_to_sheet(comparisonData);
      XLSX.utils.book_append_sheet(workbook, comparisonSheet, "So sánh");
    }

    // Save file
    const fileName = `Bao_cao_tiet_kiem_dien_nang_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }

  async exportSummaryReport() {
    const XLSX = await this.loadXLSXLibrary();
    const workbook = XLSX.utils.book_new();

    // Summary statistics
    const billDataArray = Array.from(this.billData.values());
    const totalBill = billDataArray.reduce(
      (sum, data) => sum + data.billAmount,
      0
    );
    const totalPower = billDataArray.reduce(
      (sum, data) => sum + data.powerConsumption,
      0
    );
    const avgBill = totalBill / billDataArray.length;
    const avgPower = totalPower / billDataArray.length;

    const summaryData = [
      { "Chỉ số": "Tổng số tháng theo dõi", "Giá trị": billDataArray.length },
      { "Chỉ số": "Tổng tiền điện (VND)", "Giá trị": totalBill },
      { "Chỉ số": "Tổng điện năng (kWh)", "Giá trị": totalPower },
      { "Chỉ số": "Trung bình tiền điện/tháng (VND)", "Giá trị": avgBill },
      { "Chỉ số": "Trung bình điện năng/tháng (kWh)", "Giá trị": avgPower },
    ];

    if (this.comparisonResults?.monthly) {
      const monthly = this.comparisonResults.monthly;
      summaryData.push(
        {
          "Chỉ số": "Tiết kiệm tiền tháng gần nhất (%)",
          "Giá trị": monthly.savings.billPercent,
        },
        {
          "Chỉ số": "Tiết kiệm điện tháng gần nhất (%)",
          "Giá trị": monthly.savings.powerPercent,
        }
      );
    }

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Tóm tắt");

    const fileName = `Tom_tat_tiet_kiem_dien_nang_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }

  async loadXLSXLibrary() {
    if (window.XLSX) {
      return window.XLSX;
    }

    // Load SheetJS library
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    document.head.appendChild(script);

    return new Promise((resolve) => {
      script.onload = () => resolve(window.XLSX);
    });
  }

  /**
   * STORAGE METHODS
   */
  saveToStorage() {
    const data = {
      billData: Array.from(this.billData.entries()),
      workingConfig: this.workingConfig,
    };

    localStorage.setItem("electricityBillData", JSON.stringify(data));
  }

  async loadStoredData() {
    try {
      if (this.storageManager) {
        // Load from Firebase (hybrid storage)
        const firebaseData = await this.storageManager.loadBillData();
        if (firebaseData && firebaseData.size > 0) {
          this.billData = firebaseData;
          console.log(
            "Loaded data from Firebase:",
            this.billData.size,
            "bills"
          );

          // Log sample data for debugging
          if (this.billData.size > 0) {
            const firstEntry = this.billData.entries().next().value;
            console.log("Sample Firebase data:", firstEntry);
          }
        }
      } else {
        // Fallback to localStorage
        const stored = localStorage.getItem("electricityBillData");
        if (stored) {
          const data = JSON.parse(stored);
          this.billData = new Map(data.billData || []);
          this.workingConfig = { ...this.workingConfig, ...data.workingConfig };

          console.log("Loaded stored data from localStorage:", {
            bills: this.billData.size,
            config: this.workingConfig,
          });
        }
      }
    } catch (error) {
      console.error("Error loading stored data:", error);
      this.showNotification("Lỗi tải dữ liệu - khởi tạo mới", "warning");
    }
  }

  /**
   * UTILITY METHODS
   */
  formatCurrency(amount) {
    // Round to 2 decimal places to handle floating point precision
    const roundedAmount = Math.round(amount * 100) / 100;

    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(roundedAmount);
  }

  showNotification(message, type = "info") {
    // Create and show notification
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: 12px;
      color: var(--text-primary);
      backdrop-filter: blur(20px);
      z-index: 10000;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;

    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <i class="fas fa-${
          type === "success"
            ? "check-circle"
            : type === "error"
            ? "exclamation-circle"
            : "info-circle"
        }"></i>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = "translateX(0)";
    }, 100);

    // Auto remove
    setTimeout(() => {
      notification.style.transform = "translateX(100%)";
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  showLoading(show) {
    const overlay = document.getElementById("bill-loading-overlay");
    if (show) {
      overlay.classList.add("show");
    } else {
      overlay.classList.remove("show");
    }
  }

  /**
   * MONTHLY STATISTICS MANAGEMENT
   * Handle monthly stats modal and data visualization
   */
  async showMonthlyStats() {
    const statsModal = document.getElementById("monthly-stats-modal");
    statsModal.classList.add("show");
    document.body.style.overflow = "hidden";

    // Load and display statistics
    this.showStatsLoading(true);
    await this.loadMonthlyStatistics();
    this.showStatsLoading(false);
  }

  hideMonthlyStats() {
    const statsModal = document.getElementById("monthly-stats-modal");
    statsModal.classList.remove("show");
    document.body.style.overflow = "";
  }

  async loadMonthlyStatistics() {
    try {
      // Ensure we have the latest data
      if (this.storageManager) {
        const latestData = await this.storageManager.loadBillData();
        if (latestData && latestData.size > 0) {
          this.billData = latestData;
        }
      }

      const billDataArray = Array.from(this.billData.values());

      if (billDataArray.length === 0) {
        this.showStatsEmptyState();
        return;
      }

      // Calculate summary statistics
      this.updateSummaryCards(billDataArray);

      // Populate monthly data table
      this.populateMonthlyTable(billDataArray);

      // Create visualization chart
      this.createStatsChart(billDataArray);

      console.log(
        `✅ Monthly statistics loaded: ${billDataArray.length} months`
      );
    } catch (error) {
      console.error("Error loading monthly statistics:", error);
      this.showNotification("Lỗi tải thống kê tháng", "error");
    }
  }

  updateSummaryCards(billDataArray) {
    // Calculate totals and averages
    const totalBills = billDataArray.length;
    const totalAmount = billDataArray.reduce((sum, data) => {
      return sum + (data.amount || data.billAmount || 0);
    }, 0);
    const totalConsumption = billDataArray.reduce((sum, data) => {
      return sum + (data.kwh || data.powerConsumption || 0);
    }, 0);
    const averageMonthly = totalAmount / totalBills;

    // Update DOM elements
    document.getElementById("total-bills-count").textContent = totalBills;
    document.getElementById("total-amount-value").textContent =
      this.formatCurrency(totalAmount);
    document.getElementById(
      "total-consumption-value"
    ).textContent = `${totalConsumption.toFixed(1)} kWh`;
    document.getElementById("average-monthly-value").textContent =
      this.formatCurrency(averageMonthly);
  }

  populateMonthlyTable(billDataArray) {
    const container = document.getElementById("monthly-stats-list");

    console.log("📊 PopulateMonthlyTable called with data:", billDataArray);

    // Group data by year
    const dataByYear = {};
    billDataArray.forEach((data) => {
      const year = data.year;
      if (!dataByYear[year]) {
        dataByYear[year] = [];
      }
      dataByYear[year].push(data);
    });

    console.log("📅 Data grouped by year:", dataByYear);

    // Sort years (newest first)
    const sortedYears = Object.keys(dataByYear).sort((a, b) => b - a);

    let html = "";

    sortedYears.forEach((year) => {
      // Sort months within year
      const monthsData = dataByYear[year].sort((a, b) => a.month - b.month);

      console.log(`📊 Year ${year} months data:`, monthsData);
      console.log(`📊 Year ${year} - calling getYearSummary with:`, monthsData);
      console.log(
        `📊 Year ${year} - calling generateMonthsList with:`,
        monthsData
      );

      html += `
        <div class="year-group">
          <div class="year-header">
            <h3 class="year-title">
              <i class="fas fa-calendar-alt"></i>
              Năm ${year}
            </h3>
            <div class="year-summary">
              ${this.getYearSummary(monthsData)}
            </div>
          </div>
          <div class="months-list">
            ${this.generateMonthsList(monthsData)}
          </div>
        </div>
      `;
    });

    if (html === "") {
      html = `
        <div class="empty-state">
          <div class="empty-state-content">
            <i class="fas fa-chart-bar empty-state-icon"></i>
            <h4>Chưa Có Dữ Liệu</h4>
            <p>Hãy thêm hóa đơn điện để xem thống kê</p>
          </div>
        </div>
      `;
    }

    console.log("📝 Final HTML output:", html);
    container.innerHTML = html;
  }

  generateMonthsList(monthsData) {
    console.log("🔍 generateMonthsList called with:", monthsData);

    const monthNames = [
      "Tháng 1",
      "Tháng 2",
      "Tháng 3",
      "Tháng 4",
      "Tháng 5",
      "Tháng 6",
      "Tháng 7",
      "Tháng 8",
      "Tháng 9",
      "Tháng 10",
      "Tháng 11",
      "Tháng 12",
    ];

    let html = "";

    // Enhanced debug - inspect each month data structure
    monthsData.forEach((data, idx) => {
      console.log(`📊 Raw month data ${idx}:`, {
        fullData: data,
        month: data.month,
        amount: data.amount,
        billAmount: data.billAmount,
        kwh: data.kwh,
        powerConsumption: data.powerConsumption,
      });
    });

    // Create array for all 12 months with proper data mapping
    const allMonths = Array.from({ length: 12 }, (_, monthIndex) => {
      const existingData = monthsData.find((data) => {
        // Handle both 0-based and 1-based month indexing
        const dataMonth = data.month !== undefined ? data.month : -1;
        // Check both 0-based (monthIndex) and 1-based (monthIndex + 1) matching
        const isMatch =
          dataMonth === monthIndex || dataMonth === monthIndex + 1;

        if (isMatch) {
          console.log(
            `✅ Found match for month ${monthIndex}: dataMonth=${dataMonth}, data=`,
            data
          );
        }

        return isMatch;
      });

      if (existingData) {
        console.log(`✅ Month ${monthIndex} HAS DATA:`, existingData);
        return {
          ...existingData,
          hasData: true,
          month: monthIndex,
        };
      } else {
        console.log(`❌ Month ${monthIndex} NO DATA`);
        return {
          month: monthIndex,
          hasData: false,
          amount: 0, // Default amount for no-data months
          kwh: 0,
          workingDays: 0,
        };
      }
    });

    console.log("🔍 Processing months data:", {
      originalData: monthsData,
      processedMonths: allMonths,
    });

    allMonths.forEach((data, index) => {
      const monthName = monthNames[index];

      console.log(`🔍 Processing month ${index} (${monthName}):`, {
        hasData: data.hasData,
        amount: data.amount,
        kwh: data.kwh,
        fullData: data,
      });

      if (data.hasData === false) {
        // No data for this month - show 0 amount instead of "Chưa có dữ liệu"
        html += `
          <div class="month-item no-data">
            <span class="month-name">${monthName}:</span>
            <span class="month-data">
              <span class="amount-info">
                <i class="fas fa-money-bill-wave"></i>
                ${this.formatCurrency(0)}
              </span>
            </span>
          </div>
        `;
      } else {
        // Has data for this month - use flexible field mapping
        const amount = data.amount || data.billAmount || 0;
        const kwh = data.kwh || data.powerConsumption || 0;
        const workingDays =
          data.workingDaysCount ||
          (data.workingDays ? data.workingDays.length : 0) ||
          data.totalWorkingDays ||
          0;

        console.log(`📊 Month ${index + 1} data generation:`, {
          amount,
          kwh,
          workingDays,
          rawData: data,
        });

        html += `
          <div class="month-item has-data">
            <span class="month-name">${monthName}:</span>
            <span class="month-data">
              <span class="amount-info">
                <i class="fas fa-money-bill-wave"></i>
                ${this.formatCurrency(amount)}
              </span>
              <span class="consumption-info">
                <i class="fas fa-bolt"></i>
                ${kwh.toFixed(1)} kWh
              </span>
              <span class="days-info">
                <i class="fas fa-calendar-day"></i>
                ${workingDays} ngày
              </span>
            </span>
          </div>
        `;
      }
    });

    return html;
  }

  getYearSummary(monthsData) {
    const totalAmount = monthsData.reduce(
      (sum, data) => sum + (data.amount || data.billAmount || 0),
      0
    );
    const totalKwh = monthsData.reduce(
      (sum, data) => sum + (data.kwh || data.powerConsumption || 0),
      0
    );
    const monthsCount = monthsData.length;

    return `
      <span class="year-summary-item">
        <i class="fas fa-chart-line"></i>
        ${monthsCount} tháng
      </span>
      <span class="year-summary-item">
        <i class="fas fa-money-bill-wave"></i>
        ${this.formatCurrency(totalAmount)}
      </span>
      <span class="year-summary-item">
        <i class="fas fa-bolt"></i>
        ${totalKwh.toFixed(1)} kWh
      </span>
    `;
  }

  createStatsChart(billDataArray) {
    const canvas = document.getElementById("monthly-stats-chart");
    const ctx = canvas.getContext("2d");

    // Destroy existing chart if exists
    if (this.statsChart) {
      this.statsChart.destroy();
    }

    // Sort data by date for chart
    const sortedData = billDataArray.sort((a, b) => {
      const dateA = new Date(a.year, a.month);
      const dateB = new Date(b.year, b.month);
      return dateA - dateB;
    });

    const labels = sortedData.map(
      (data) => `${(data.month + 1).toString().padStart(2, "0")}/${data.year}`
    );

    const amountData = sortedData.map(
      (data) => data.amount || data.billAmount || 0
    );
    const consumptionData = sortedData.map(
      (data) => data.kwh || data.powerConsumption || 0
    );

    this.statsChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Tiền Điện (VND)",
            data: amountData,
            borderColor: "rgba(16, 185, 129, 1)",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "rgba(16, 185, 129, 1)",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            pointRadius: 6,
            hidden: false,
          },
          {
            label: "Điện Năng (kWh)",
            data: consumptionData,
            borderColor: "rgba(59, 130, 246, 1)",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "rgba(59, 130, 246, 1)",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            pointRadius: 6,
            hidden: true,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false, // We use custom toggle buttons
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            titleColor: "#ffffff",
            bodyColor: "#ffffff",
            borderColor: "rgba(255, 255, 255, 0.1)",
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: true,
          },
        },
        scales: {
          x: {
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
              borderColor: "rgba(255, 255, 255, 0.2)",
            },
            ticks: {
              color: "rgba(255, 255, 255, 0.7)",
              font: {
                size: 12,
              },
            },
          },
          y: {
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
              borderColor: "rgba(255, 255, 255, 0.2)",
            },
            ticks: {
              color: "rgba(255, 255, 255, 0.7)",
              font: {
                size: 12,
              },
              callback: function (value) {
                return new Intl.NumberFormat("vi-VN").format(value) + " VND";
              },
            },
          },
          y1: {
            type: "linear",
            display: false,
            position: "right",
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              color: "rgba(255, 255, 255, 0.7)",
              callback: function (value) {
                return value.toFixed(1) + " kWh";
              },
            },
          },
        },
        interaction: {
          intersect: false,
          mode: "index",
        },
      },
    });
  }

  toggleChart(chartType) {
    if (!this.statsChart) return;

    // Update button states
    document.querySelectorAll(".chart-toggle-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    document
      .querySelector(`[data-chart="${chartType}"]`)
      .classList.add("active");

    // Toggle dataset visibility
    if (chartType === "amount") {
      this.statsChart.data.datasets[0].hidden = false; // Amount
      this.statsChart.data.datasets[1].hidden = true; // Consumption
      this.statsChart.options.scales.y.display = true;
      this.statsChart.options.scales.y1.display = false;
    } else if (chartType === "consumption") {
      this.statsChart.data.datasets[0].hidden = true; // Amount
      this.statsChart.data.datasets[1].hidden = false; // Consumption
      this.statsChart.options.scales.y.display = false;
      this.statsChart.options.scales.y1.display = true;
    }

    this.statsChart.update();
  }

  showStatsEmptyState() {
    const container = document.getElementById("monthly-stats-list");
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-content">
          <i class="fas fa-chart-bar empty-state-icon"></i>
          <h4>Chưa Có Dữ Liệu</h4>
          <p>Hãy thêm hóa đơn điện để xem thống kê</p>
        </div>
      </div>
    `;

    // Clear summary cards
    document.getElementById("total-bills-count").textContent = "0";
    document.getElementById("total-amount-value").textContent = "0 VND";
    document.getElementById("total-consumption-value").textContent = "0 kWh";
    document.getElementById("average-monthly-value").textContent = "0 VND";
  }

  async refreshStats() {
    this.showStatsLoading(true);
    await this.loadMonthlyStatistics();
    this.showStatsLoading(false);
    this.showNotification("Đã làm mới thống kê!", "success");
  }

  async exportStatsToExcel() {
    try {
      this.showStatsLoading(true);

      // Use existing export functionality
      await this.exportToExcel("detailed");

      this.showNotification("Đã xuất thống kê Excel thành công!", "success");
    } catch (error) {
      console.error("Export stats error:", error);
      this.showNotification("Lỗi xuất thống kê Excel!", "error");
    } finally {
      this.showStatsLoading(false);
    }
  }

  showStatsLoading(show) {
    const overlay = document.getElementById("stats-loading-overlay");
    if (show) {
      overlay.classList.add("show");
    } else {
      overlay.classList.remove("show");
    }
  }

  /**
   * PUBLIC API METHODS
   */
  show() {
    const modal = document.getElementById("electricity-bill-modal");
    modal.classList.add("show");
    document.body.style.overflow = "hidden";

    // Update Firebase status UI when modal opens
    setTimeout(() => {
      this.updateFirebaseStatusUI();
    }, 100);
  }

  hide() {
    const modal = document.getElementById("electricity-bill-modal");
    modal.classList.remove("show");
    document.body.style.overflow = "";
  }

  // Observer pattern for external integrations
  subscribe(observer) {
    this.observers.push(observer);
  }

  unsubscribe(observer) {
    this.observers = this.observers.filter((obs) => obs !== observer);
  }

  notify(event, data) {
    this.observers.forEach((observer) => {
      if (typeof observer[event] === "function") {
        observer[event](data);
      }
    });
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Create global instance
  window.electricityBillManager = new ElectricityBillManager();
  window.electricityBillManager.init();

  console.log("✅ Electricity Bill Manager initialized and ready!");
});

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = ElectricityBillManager;
}
