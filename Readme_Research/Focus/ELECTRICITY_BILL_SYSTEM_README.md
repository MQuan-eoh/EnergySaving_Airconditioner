# 📊 Hệ Thống Quản Lý Hóa Đơn Tiền Điện - Glass Effect

## 🎯 Tổng Quan Hệ Thống

Hệ thống quản lý hóa đơn tiền điện với giao diện Glass Effect hiện đại, được thiết kế để phân tích và so sánh hiệu quả tiết kiệm điện năng **trước và sau** khi áp dụng giải pháp thông minh.

### ✨ Tính Năng Chính

1. **📅 Glass Calendar Component**

   - Schedule calendar với month/year picker
   - Glassmorphism design tương thích hệ thống hiện tại
   - Chọn tháng để nhập/xem hóa đơn điện

2. **💰 Quản Lý Hóa Đơn**

   - Nhập số tiền điện và công suất tiêu thụ (kWh)
   - Cấu hình ngày làm việc linh hoạt (T2-CN)
   - Thiết lập giờ làm việc/ngày

3. **📈 So Sánh Before/After**

   - Phân tích theo tháng, quý, 6 tháng, năm
   - Tính toán phần trăm tiết kiệm
   - Hiển thị tiết kiệm theo ngày, tuần, tháng

4. **📋 Xuất Báo Cáo Excel**
   - Báo cáo chi tiết với thống kê đầy đủ
   - Tóm tắt hiệu quả tiết kiệm
   - Biểu đồ và analysis

## 🏗️ Kiến Trúc Hệ Thống

### 📁 Cấu Trúc File

```
Assets/css/
├── electricity-bill.css      # Glass effect CSS cho hóa đơn điện
├── styles.css               # CSS gốc của hệ thống
└── components.css           # Reusable glass components

js/
├── electricity-bill-manager.js  # Core business logic
├── spa-management.js           # SPA integration
└── spa-navigation.js           # Navigation handling

spa_app.html                    # Main application file
```

### 🔧 Design Patterns Sử Dụng

1. **Singleton Pattern** - ElectricityBillManager class
2. **Observer Pattern** - Event notification system
3. **Module Pattern** - Component isolation
4. **Event-Driven Architecture** - Real-time updates

## 🎨 Glass Effect Design System

### 🌟 CSS Variables

```css
/* Calendar Glass Effects */
--calendar-glass-bg: rgba(255, 255, 255, 0.08);
--calendar-glass-border: rgba(255, 255, 255, 0.15);
--calendar-glass-blur: blur(25px);

/* Comparison Colors */
--savings-positive: #10b981; /* Tiết kiệm tốt */
--savings-negative: #ef4444; /* Tăng chi phí */
--savings-neutral: #6b7280; /* Không đổi */
```

### 📱 Responsive Design

- **Desktop**: Full grid layout với 2 cột
- **Tablet**: Single column với header sections
- **Mobile**: Optimized form với compact calendar

## 🚀 Cách Sử Dụng

### 1. Khởi Động Hệ Thống

```javascript
// Hệ thống tự động khởi tạo khi DOM loaded
document.addEventListener("DOMContentLoaded", () => {
  window.electricityBillManager = new ElectricityBillManager();
  window.electricityBillManager.init();
});
```

### 2. Mở Modal Hóa Đơn

Từ Dashboard, click button **"Hóa Đơn Điện"** hoặc:

```javascript
window.electricityBillManager.show();
```

### 3. Nhập Dữ Liệu Hóa Đơn

1. **Chọn tháng/năm** từ Glass Calendar
2. **Nhập số tiền điện** (VND)
3. **Nhập công suất tiêu thụ** (kWh)
4. **Cấu hình ngày làm việc**:
   - Chọn các ngày trong tuần (T2-CN)
   - Thiết lập giờ làm việc/ngày
5. **Lưu hóa đơn**

### 4. Xem Kết Quả So Sánh

Sau khi có ít nhất 2 tháng dữ liệu:

- **So sánh tháng**: Tháng gần nhất vs tháng trước
- **So sánh quý**: 3 tháng gần nhất vs 3 tháng trước
- **So sánh 6 tháng**: 6 tháng gần nhất vs 6 tháng trước
- **So sánh năm**: 12 tháng gần nhất vs 12 tháng trước

### 5. Xuất Báo Cáo Excel

```javascript
// Báo cáo chi tiết
window.electricityBillManager.exportToExcel("detailed");

// Tóm tắt thống kê
window.electricityBillManager.exportToExcel("summary");
```

## 📊 Công Thức Tính Toán

### 💰 Tiết Kiệm Tiền Điện

```javascript
const billSavings = beforeAmount - afterAmount;
const billSavingsPercent = (billSavings / beforeAmount) * 100;
```

### ⚡ Tiết Kiệm Điện Năng

```javascript
const powerSavings = beforePower - afterPower;
const powerSavingsPercent = (powerSavings / beforePower) * 100;
```

### 📅 Trung Bình Hàng Ngày

```javascript
const dailyBillSavings = billSavings / workingDaysCount;
const dailyPowerSavings = powerSavings / workingDaysCount;
```

## 🔧 API Reference

### ElectricityBillManager Class

#### Khởi Tạo

```javascript
const manager = new ElectricityBillManager();
manager.init();
```

#### Methods Chính

| Method                     | Description       | Parameters                    |
| -------------------------- | ----------------- | ----------------------------- |
| `show()`                   | Hiển thị modal    | None                          |
| `hide()`                   | Ẩn modal          | None                          |
| `selectMonth(year, month)` | Chọn tháng        | year: number, month: number   |
| `saveBillData(data)`       | Lưu hóa đơn       | data: Object                  |
| `calculateComparison()`    | Tính toán so sánh | None                          |
| `exportToExcel(type)`      | Xuất Excel        | type: 'detailed' \| 'summary' |

#### Events

```javascript
// Subscribe to data changes
manager.subscribe({
  onBillSaved: (data) => console.log("Bill saved:", data),
  onComparisonCalculated: (results) => console.log("Comparison:", results),
});
```

## 📱 Responsive Breakpoints

```css
/* Desktop */
@media (min-width: 1025px) {
  /* Full 2-column layout */
}

/* Tablet */
@media (max-width: 1024px) {
  /* Single column */
}

/* Mobile */
@media (max-width: 768px) {
  /* Compact design */
}

/* Small Mobile */
@media (max-width: 480px) {
  /* Full screen modal */
}
```

## 🔒 Data Storage

### LocalStorage Schema

```javascript
{
  "electricityBillData": {
    "billData": [
      ["2024-01", {
        "year": 2024,
        "month": 0,
        "billAmount": 500000,
        "powerConsumption": 120.5,
        "hoursPerDay": 8,
        "workingDays": [1,2,3,4,5],
        "workingDaysCount": 22,
        "createdAt": "2024-01-15T10:30:00.000Z"
      }]
    ],
    "workingConfig": {
      "workingDays": [1,2,3,4,5],
      "hoursPerDay": 8,
      "isFlexible": false
    }
  }
}
```

## 🎯 Use Cases

### 1. Văn Phòng Làm Việc

- **Ngày làm việc**: T2-T6 (8 giờ/ngày)
- **So sánh**: Hiệu quả tiết kiệm sau khi lắp đặt hệ thống thông minh
- **Báo cáo**: Quarterly reports cho management

### 2. Nhà Ở Gia Đình

- **Ngày làm việc**: 7 ngày/tuần (8-12 giờ/ngày)
- **So sánh**: Before/after thay đổi thói quen sử dụng
- **Báo cáo**: Monthly analysis

### 3. Cửa Hàng/Shop

- **Ngày làm việc**: T2-CN (10-12 giờ/ngày)
- **So sánh**: Seasonal comparison
- **Báo cáo**: Business efficiency reports

## 🐛 Troubleshooting

### Common Issues

1. **Modal không hiển thị**

   ```javascript
   // Check if manager is initialized
   if (!window.electricityBillManager) {
     console.error("Electricity Bill Manager not initialized");
   }
   ```

2. **Calendar không load**

   ```javascript
   // Check CSS loading
   const cssLoaded = document.querySelector(
     'link[href*="electricity-bill.css"]'
   );
   if (!cssLoaded) {
     console.error("Electricity bill CSS not loaded");
   }
   ```

3. **Excel export fails**
   ```javascript
   // Check XLSX library
   if (!window.XLSX) {
     console.error("XLSX library not available");
   }
   ```

## 🔄 Update History

### Version 1.0.0 (Current)

- ✅ Glass Calendar Component
- ✅ Bill Input Management
- ✅ Before/After Comparison Engine
- ✅ Excel Export Functionality
- ✅ Responsive Design
- ✅ SPA Integration

### Planned Features

- 📈 Advanced Chart Integration
- 🌍 Weather Data Correlation
- 🤖 AI Prediction Engine
- 📧 Email Reports
- 🔔 Smart Notifications

## 📞 Support

Để được hỗ trợ về hệ thống:

1. Check console logs cho error messages
2. Verify tất cả dependencies loaded correctly
3. Test với sample data trước khi production
4. Review responsive design trên different devices

---

**Made with ❤️ using Glassmorphism Design System**
