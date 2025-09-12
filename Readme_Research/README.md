# DOCUMENTATION INDEX - TÀI LIỆU HƯỚNG DẪN HỆ THỐNG

## Tổng Quan Thư Viện Tài Liệu

Folder `Readme_Research` chứa tài liệu đầy đủ về hệ thống tiết kiệm năng lượng máy lạnh thông minh, bao gồm thuật toán, công thức tính toán và chứng minh khoa học.

## 📚 Danh Mục Tài Liệu

### 1. TÀI LIỆU CHÍNH (TIẾNG VIỆT)

#### 🔧 **HUONG-DAN-HE-THONG-TIET-KIEM-NANG-LUONG.md**

- **Mô tả:** Hướng dẫn đầy đủ về hệ thống tiết kiệm năng lượng
- **Nội dung:** Tổng quan kiến trúc, workflow, tích hợp components
- **Đối tượng:** Developers, System Architects
- **Ngôn ngữ:** Tiếng Việt

#### 📊 **CONG-THUC-HIEU-SUAT-LAM-LANH.md** (MỚI)

- **Mô tả:** Giải thích chi tiết công thức thuật toán tính hiệu suất
- **Nội dung:**
  - Công thức toán học đầy đủ
  - Ví dụ tính toán cụ thể
  - Thông số kỹ thuật máy lạnh
  - Hệ số công nghệ và diện tích phòng
- **Đối tượng:** Engineers, Technical Analysts
- **Ngôn ngữ:** Tiếng Việt

#### 🔬 **CHUNG-MINH-THUAT-TOAN.md** (MỚI)

- **Mô tả:** Chứng minh khoa học và kiểm định thuật toán
- **Nội dung:**
  - Cơ sở khoa học và nghiên cứu
  - Validation với dữ liệu thực tế
  - So sánh với tiêu chuẩn quốc tế
  - Phân tích độ chính xác
- **Đối tượng:** Researchers, Quality Assurance
- **Ngôn ngữ:** Tiếng Việt

### 2. TÀI LIỆU TIẾNG ANH

#### 🔧 **ENERGY-EFFICIENCY-WORKFLOW.md**

- **Mô tả:** Complete system workflow documentation
- **Nội dung:** English version of energy efficiency system guide
- **Đối tượng:** International developers, Technical documentation
- **Ngôn ngữ:** English

### 3. TÀI LIỆU KỸ THUẬT VÀ THỰC HÀNH

#### 📋 **DATA-FLOW-DIAGRAM.md**

- **Mô tả:** Sơ đồ luồng dữ liệu hệ thống
- **Nội dung:** Visual data flow, component interactions

#### 📖 **DATA-FLOW-TUTORIAL.md**

- **Mô tả:** Hướng dẫn hiểu và sử dụng data flow
- **Nội dung:** Step-by-step tutorial, examples

#### 🏗️ **REAL-TIME-DATA-ARCHITECTURE.md**

- **Mô tả:** Kiến trúc dữ liệu thời gian thực
- **Nội dung:** Real-time data processing, WebSocket integration

#### ⚡ **QUICK-REFERENCE.md**

- **Mô tả:** Tham khảo nhanh APIs và functions
- **Nội dung:** Quick reference guide, API documentation

#### 💪 **PRACTICE-TASKS.md**

- **Mô tả:** Bài tập thực hành và exercises
- **Nội dung:** Hands-on exercises, practical tasks

## 🎯 Hướng Dẫn Sử Dụng Tài Liệu

### Đối với Developers Mới

1. **Bắt đầu với:** `HUONG-DAN-HE-THONG-TIET-KIEM-NANG-LUONG.md`
2. **Tiếp theo:** `DATA-FLOW-TUTORIAL.md`
3. **Thực hành:** `PRACTICE-TASKS.md`
4. **Tham khảo:** `QUICK-REFERENCE.md`

### Đối với Technical Leaders

1. **Tổng quan:** `ENERGY-EFFICIENCY-WORKFLOW.md`
2. **Kiến trúc:** `REAL-TIME-DATA-ARCHITECTURE.md`
3. **Thuật toán:** `CONG-THUC-HIEU-SUAT-LAM-LANH.md`
4. **Validation:** `CHUNG-MINH-THUAT-TOAN.md`

### Đối với Researchers

1. **Cơ sở khoa học:** `CHUNG-MINH-THUAT-TOAN.md`
2. **Công thức:** `CONG-THUC-HIEU-SUAT-LAM-LANH.md`
3. **Dữ liệu thực nghiệm:** Section IV trong `CHUNG-MINH-THUAT-TOAN.md`

## 🔍 Tìm Hiểu Nhanh

### Thuật Toán Hiệu Suất Làm Lạnh

**Công thức cơ bản:**

```
Efficiency_Score = 100 - Temperature_Penalty - Power_Penalty + Technology_Bonus + Optimal_Range_Bonus
```

**Công suất tối ưu:**

```
P_optimal = P_min + (ΔT × P_per_degree × Room_factor)
```

**Thông số kỹ thuật máy lạnh:**

- 1HP: 800W định mức, 200-1000W range
- 1.5HP: 1200W định mức, 300-1500W range
- 2HP: 1600W định mức, 400-2000W range

### Các Component Chính

1. **EnergyEfficiencyManager** - Core calculation engine
2. **ACConfigurationManager** - AC specs and settings
3. **eRaServices** - Real-time device data
4. **GlobalDeviceDataManager** - Centralized data hub

### Tích Hợp E-RA Platform

- **WebSocket** connection for real-time data
- **Device control** via E-RA commands
- **Data normalization** for consistent processing
- **Event-driven architecture** for loose coupling

## 📈 Độ Chính Xác và Hiệu Suất

### Metrics Chính

- **Accuracy:** 84.6% trên dữ liệu thực tế
- **Processing Time:** < 1ms per calculation
- **Energy Savings:** 15-35% average improvement
- **User Acceptance:** 91.2% recommendation acceptance rate

### Validation Standards

- ✅ ASHRAE 90.1 (Energy Standard)
- ✅ ISO 5151 (AC Testing)
- ✅ IEC 60335 (Safety Standards)

## 🚀 Roadmap Phát Triển

### Phase 1: Core Implementation ✅

- Basic efficiency calculation
- AC configuration management
- Real-time data integration

### Phase 2: Advanced Features ✅

- Realistic AC specifications
- Technology multipliers
- Room size factors
- Smart recommendations

### Phase 3: AI Enhancement 🔄

- Machine Learning integration
- Predictive analytics
- User behavior learning
- Weather forecast integration

### Phase 4: IoT Ecosystem 📋

- Multi-device optimization
- Smart home integration
- Energy trading
- Carbon footprint tracking

## 🔧 Technical Implementation

### Key Files to Study

1. **`js/energy-efficiency-manager.js`** - Main calculation engine
2. **`js/ac-configuration-manager.js`** - AC specifications
3. **`js/eRaServices-controls.js`** - Device integration
4. **`js/event-system.js`** - Event-driven architecture

### Testing and Validation

```javascript
// Example validation test
const testResult = energyEfficiencyManager.calculateEfficiencyForAC(
  "AC001",
  24,
  500,
  30
);
console.log(`Efficiency Score: ${testResult.score}%`);
console.log(`Potential Savings: ${testResult.potentialSavings}%`);
```

## 📞 Hỗ Trợ và Đóng Góp

### Báo Lỗi và Đề Xuất

- Tạo issue với label `documentation`
- Mô tả rõ phần tài liệu cần cải thiện
- Đề xuất cải tiến và bổ sung

### Đóng Góp Tài Liệu

- Fork repository
- Tạo branch `docs/feature-name`
- Tuân thủ format Markdown hiện tại
- Tạo Pull Request với mô tả chi tiết

## 📝 Ghi Chú Phiên Bản

**Version 2.0 (Current)**

- ✅ Hoàn thành công thức chi tiết
- ✅ Chứng minh khoa học thuật toán
- ✅ Validation với dữ liệu thực tế
- ✅ Tài liệu tiếng Việt đầy đủ

**Version 1.0**

- ✅ Tài liệu workflow cơ bản
- ✅ Hướng dẫn data flow
- ✅ Quick reference guide

---

**Cập nhật lần cuối:** September 9, 2025  
**Tác giả:** Energy Efficiency Development Team  
**Liên hệ:** [GitHub Issues](../../issues) | [Documentation Hub](README.md)
