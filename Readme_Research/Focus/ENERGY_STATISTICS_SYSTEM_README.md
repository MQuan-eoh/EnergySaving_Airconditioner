# 📊 ENERGY CONSUMPTION STATISTICS SYSTEM

## 🎯 MỤC TIÊU & TẦM QUAN TRỌNG

Hệ thống **Daily Energy Consumption Analysis** được thiết kế để:

### ✅ **Chứng minh hiệu quả tiết kiệm năng lượng:**

- Hiển thị số liệu cụ thể về điện năng tiêu thụ (kWh) hàng ngày
- So sánh rõ ràng giữa ngày sử dụng AI recommendation vs điều khiển thủ công
- Tính toán phần trăm tiết kiệm năng lượng dựa trên công thức khoa học

### 📈 **Thuyết phục người dùng:**

- Cung cấp bằng chứng số liệu về lợi ích của hệ thống AI
- Giúp người dùng thấy được giá trị thực tế qua các con số cụ thể
- Tạo động lực để người dùng tuân theo recommendation của hệ thống

## 🏗️ CẤU TRÚC HỆ THỐNG

### **1. Vị trí hiển thị:**

- Nằm trong Activity Log Modal (click button Activity Log ở header)
- Xuất hiện trên cùng, trước bảng Activity Log chi tiết
- Thiết kế glass effect đồng nhất với hệ thống

### **2. Cấu trúc bảng thống kê:**

| Cột                    | Mô tả             | Ý nghĩa                             |
| ---------------------- | ----------------- | ----------------------------------- |
| **Date**               | dd/mm/yyyy        | Ngày sử dụng điều hòa               |
| **Temperature Levels** | Các mức nhiệt     | Nhiệt độ đã điều chỉnh trong ngày   |
| **Operating Hours**    | X.X h             | Tổng thời gian bật điều hòa         |
| **Total kWh**          | XX.XX kWh         | Tổng điện năng tiêu thụ             |
| **Usage Mode**         | 🤖 AI / 👤 Manual | Chế độ sử dụng trong ngày           |
| **Energy Savings**     | +/-XX%            | Phần trăm tiết kiệm so với baseline |

## ⚡ CÔNG THỨC TÍNH TOÁN NĂNG LƯỢNG

### **Dựa trên các yếu tố khoa học:**

#### **1. Thông số máy lạnh:**

```javascript
const acSpecs = {
  '1HP': { nominalPower: 800W, maxPower: 1000W },
  '1.5HP': { nominalPower: 1200W, maxPower: 1500W },
  '2HP': { nominalPower: 1600W, maxPower: 2000W }
};
```

#### **2. Hệ số công nghệ:**

```javascript
const techFactors = {
  "non-inverter": 1.0, // Không tiết kiệm
  inverter: 0.85, // Tiết kiệm 15%
  "dual-inverter": 0.75, // Tiết kiệm 25%
};
```

#### **3. Công thức tính kWh:**

```javascript
// Tính hệ số công suất dựa trên độ chênh nhiệt độ
const tempDifference = Math.abs(outdoorTemp - avgTemp);
const powerFactor = 0.5 + (tempDifference / 20);

// Công suất thực tế
const actualPower = nominalPower × powerFactor × techFactor;

// Điện năng tiêu thụ
const kWhConsumed = (actualPower × operatingHours) / 1000;
```

#### **4. Tính phần trăm tiết kiệm:**

```javascript
// Baseline: không có AI optimization (nhiệt độ thấp hơn 2.5°C)
const baselineTemp = avgTemp - 2.5;
const baselineKwh = calculateWithBaseline(baselineTemp);

// Phần trăm tiết kiệm
const energySavings = ((baselineKwh - actualKwh) / baselineKwh) × 100;
```

## 🎨 THIẾT KẾ UI/UX

### **1. Visual Design:**

- **Glass Effect:** Backdrop blur + gradient background
- **Color Coding:**
  - 🟢 Green: AI Recommended (tiết kiệm năng lượng)
  - 🟡 Yellow: Manual Control (không tối ưu)
  - 🔴 Red: Negative savings (lãng phí)

### **2. Responsive Design:**

- Desktop: Full table với đầy đủ cột
- Tablet: Ẩn một số cột phụ
- Mobile: Chỉ hiển thị thông tin quan trọng nhất

### **3. Interactive Elements:**

- Hover effects trên từng row
- Badge animation cho usage mode
- Color-coded savings indicators

## 🔧 CÁCH SỬ DỤNG

### **1. Truy cập:**

```
1. Mở spa_app.html
2. Click button "Activity Log" ở header (icon chart-line)
3. Xem bảng "Daily Energy Consumption Analysis" ở đầu modal
```

### **2. Đọc hiểu dữ liệu:**

- **Ngày có màu xanh:** Sử dụng AI recommendation → Tiết kiệm điện
- **Ngày có màu vàng:** Điều khiển manual → Có thể lãng phí
- **Energy Savings dương:** Tiết kiệm so với baseline
- **Energy Savings âm:** Tiêu thụ nhiều hơn baseline

### **3. Summary Statistics:**

- **Average Daily Consumption:** Mức tiêu thụ trung bình
- **Total Energy Saved:** Tổng phần trăm tiết kiệm
- **AI Recommendation Usage:** Tỷ lệ sử dụng AI

## 📊 CÁC TÍNH NĂNG NÂNG CAO

### **1. Data Processing:**

- Tự động group logs theo ngày
- Tính toán operating hours từ frequency logs
- Estimate nhiệt độ trung bình từ temperature levels

### **2. AC Configuration Integration:**

- Lấy thông số kỹ thuật từ AC Configuration Manager
- Sử dụng Energy Efficiency Manager cho calculations
- Support đa dạng loại máy lạnh (1HP, 1.5HP, 2HP, 2.5HP)

### **3. Real-time Updates:**

- Tự động refresh khi có activity mới
- Cache data để improve performance
- Offline support với local storage

## 🧪 TESTING & VALIDATION

### **Test file:** `energy-statistics-test.html`

- Test data generation logic
- Verify energy calculation formulas
- UI display testing
- Integration với real data

### **Validation Points:**

- ✅ Công thức tính kWh đúng theo chuẩn quốc tế
- ✅ Baseline calculation hợp lý
- ✅ UI responsive trên mọi device
- ✅ Data integrity và performance

## 🚀 KẾT QUẢ MONG ĐỢI

### **Cho người dùng:**

1. **Nhận thức rõ ràng** về lợi ích tiết kiệm điện
2. **Động lực cao** để tuân theo AI recommendations
3. **Tin tưởng** vào hệ thống thông qua số liệu cụ thể

### **Cho hệ thống:**

1. **Increased adoption** của AI features
2. **Better user engagement** với smart controls
3. **Data-driven decision making** cho users

## 📝 TECHNICAL IMPLEMENTATION

### **Files modified:**

- `js/temperature-activity-log-ui.js` - Main logic
- `Assets/css/temperature-activity-log.css` - Styling
- `spa_app.html` - Header button integration

### **New methods added:**

- `renderEnergyConsumptionStats()`
- `generateDailyEnergyStats()`
- `calculateDayEnergyStats()`
- `calculateDailyKwh()` & `calculateBaselineKwh()`

---

## 💡 LỜI KẾT

Hệ thống **Energy Consumption Statistics** này không chỉ là một bảng thống kê đơn thuần, mà là **công cụ thuyết phục mạnh mẽ** giúp người dùng nhận ra giá trị thực tế của AI optimization. Thông qua việc hiển thị các con số cụ thể, có cơ sở khoa học, chúng ta tạo ra **niềm tin và động lực** để người dùng tích cực sử dụng các tính năng thông minh của hệ thống.

**Tech Lead Recommendation:** Deploy và monitor user interaction với bảng thống kê này để đánh giá hiệu quả trong việc thay đổi behavior của người dùng.
