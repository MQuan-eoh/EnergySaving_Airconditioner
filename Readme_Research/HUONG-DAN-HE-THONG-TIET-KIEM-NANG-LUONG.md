# HỆ THỐNG TIẾT KIỆM NĂNG LƯỢNG - TÀI LIỆU HƯỚNG DẪN CHI TIẾT

## TỔNG QUAN HỆ THỐNG

Hệ thống Tiết kiệm Năng lượng là một giải pháp toàn diện để tính toán và tối ưu hóa mức tiêu thụ năng lượng của điều hòa không khí dựa trên thông số kỹ thuật thực tế, thuật toán tiên tiến và tích hợp dữ liệu thiết bị theo thời gian thực.

### Hệ Thống Debug

Hệ thống bao gồm ba thành phần chính hoạt động cùng nhau:

1. **Energy Efficiency Manager** - Công cụ tính toán cốt lõi
2. **AC Configuration Manager** - Quản lý thông số kỹ thuật và cài đặt
3. **eRaServices Controls** - Tích hợp dữ liệu thiết bị theo thời gian thực

## KIẾN TRÚC LUỒNG DỮ LIỆU

### Luồng Thu Thập Dữ Liệu Thời Gian Thực

```
Nền tảng Thiết bị E-RA
        ↓
Callback onValues()
        ↓
GlobalDeviceDataManager (Singleton)
        ↓
TemperatureController + ACSpaManager
        ↓
Energy Efficiency Manager
        ↓
Giao diện Dashboard + Biểu đồ
```

### Kiến Trúc Hướng Sự Kiện (EDA)

Hệ thống sử dụng Kiến trúc Hướng Sự kiện để kết nối lỏng lẻo giữa các thành phần:

```javascript
// Luồng Hệ thống Sự kiện
Thay đổi Cấu hình AC → Phát sự kiện → Cập nhật Energy Manager
Thay đổi Nhiệt độ → Phát sự kiện → Tính toán lại Hiệu suất
Cập nhật Điện năng → Phát sự kiện → Làm mới Dashboard
```

## QUY TRÌNH TÍNH TOÁN HIỆU SUẤT NĂNG LƯỢNG

### Bước 1: Thiết Lập Cấu Hình AC

**Vị trí:** `ac-configuration-manager.js`

Người dùng cấu hình thông số kỹ thuật AC thông qua trang Cài đặt:

```javascript
// Cơ sở dữ liệu Thông số AC
acSpecifications = {
  "1HP": { nominalPower: 800W, maxPower: 1000W, minPower: 200W },
  "1.5HP": { nominalPower: 1200W, maxPower: 1500W, minPower: 300W },
  "2HP": { nominalPower: 1600W, maxPower: 2000W, minPower: 400W },
  "2.5HP": { nominalPower: 2000W, maxPower: 2500W, minPower: 500W }
}
```

**Hệ số Công nghệ:**

```javascript
technologyMultipliers = {
  "non-inverter": { efficiency: 0.7, powerPerDegree: 25W },
  "inverter": { efficiency: 0.85, powerPerDegree: 18W },
  "dual-inverter": { efficiency: 0.95, powerPerDegree: 15W }
}
```

**Hệ số Kích thước Phòng:**

```javascript
roomSizeFactors = {
  small: { area: "10-20m²", multiplier: 0.8 }, // Phòng ngủ
  medium: { area: "20-35m²", multiplier: 1.0 }, // Phòng khách
  large: { area: "35-50m²", multiplier: 1.3 }, // Không gian lớn
  xlarge: { area: "50+m²", multiplier: 1.6 }, // Thương mại
};
```

### Bước 2: Tích Hợp Dữ Liệu Thời Gian Thực

**Vị trí:** `eRaServices-controls.js`

Dữ liệu thiết bị chảy qua GlobalDeviceDataManager:

```javascript
// Thu thập Dữ liệu từ Nền tảng E-RA
onValues: (values) => {
  targetTempAir1 = values[configTargetTempAir1.id].value;
  currentTempAir1 = values[configCurrentTempAir1.id].value;
  powerAir1 = values[configPowerAir1.id].value;
  currentAir1_value = values[configCurrentAir1.id].value;
  voltageAir1_value = values[configVoltageAir1.id].value;

  // Cập nhật Global Device Data Manager
  globalDeviceDataManager.updateDeviceData({
    targetTemp: targetTempAir1,
    currentTemp: currentTempAir1,
    power: powerAir1,
    current: currentAir1_value,
    voltage: voltageAir1_value,
  });
};
```

### Bước 3: Tính Toán Công Suất Tối Ưu

**Vị trí:** `energy-efficiency-manager.js`

Tính toán thực tế tiên tiến dựa trên thông số kỹ thuật AC:

```javascript
// CÔNG THỨC TÍNH TOÁN CÔNG SUẤT TỐI ƯU
calculateRealisticEfficiency(acConfig, targetTemp, currentPower, outdoorTemp) {
  // Tính toán chênh lệch nhiệt độ
  const tempDifference = Math.abs(outdoorTemp - targetTemp);

  // Tính công suất tối ưu sử dụng thông số AC cụ thể
  const optimalPower = acConfig.adjustedMinPower +
                      (tempDifference * acConfig.adjustedPowerPerDegree);

  // Đảm bảo công suất tối ưu không vượt quá khả năng AC
  const finalOptimalPower = Math.min(optimalPower, acConfig.adjustedMaxPower);

  return finalOptimalPower;
}
```

**Tính Toán Thông Số Công Suất:**

```javascript
// Thông số điều chỉnh dựa trên kích thước phòng và công nghệ
adjustedMinPower = acSpec.minPower * roomMultiplier;
adjustedMaxPower = acSpec.maxPower * roomMultiplier;
adjustedNominalPower = acSpec.nominalPower * roomMultiplier;
adjustedPowerPerDegree = techMultiplier.powerPerDegree * roomMultiplier;
```

### Bước 4: Tính Điểm Hiệu Suất

**Vị trí:** `energy-efficiency-manager.js`

Hệ thống chấm điểm hiệu suất đa yếu tố:

```javascript
// TÍNH ĐIỂM HIỆU SUẤT (thang điểm 0-100)
let efficiencyScore = 100;

// Phạt nhiệt độ
if (targetTemp < 18) efficiencyScore -= (18 - targetTemp) * 12; // Cực lạnh
if (targetTemp < 20) efficiencyScore -= (20 - targetTemp) * 8; // Rất lạnh
if (targetTemp > 28) efficiencyScore -= (targetTemp - 28) * 6; // Quá nóng
if (targetTemp > 30) efficiencyScore -= (targetTemp - 30) * 10; // Cực nóng

// Phạt tiêu thụ điện năng
if (currentPower > finalOptimalPower) {
  const powerWasteRatio =
    (currentPower - finalOptimalPower) / finalOptimalPower;
  const powerPenalty = Math.min(powerWasteRatio * 60, 40);
  efficiencyScore -= powerPenalty;
}

// Thưởng hiệu suất công nghệ
const technologyBonus = (acConfig.efficiency - 0.7) * 20;
efficiencyScore += technologyBonus;

// Thưởng dải nhiệt độ tối ưu
if (targetTemp >= 22 && targetTemp <= 25) {
  efficiencyScore += 10;
}

// Phạt sử dụng vượt công suất
const capacityUtilization = currentPower / acConfig.adjustedNominalPower;
if (capacityUtilization > 1.2) {
  const capacityPenalty = (capacityUtilization - 1.2) * 15;
  efficiencyScore -= capacityPenalty;
}
```

### Bước 5: Phân Tích Chi Phí

**Vị trí:** `energy-efficiency-manager.js`

Tính toán chi phí thời gian thực với tiềm năng tiết kiệm:

```javascript
// TÍNH TOÁN CHI PHÍ
const hourlyCost = ((currentPower / 1000) * acConfig.energyCostPerKWh).toFixed(
  3
);
const optimalHourlyCost = (
  (finalOptimalPower / 1000) *
  acConfig.energyCostPerKWh
).toFixed(3);

// TÍNH TOÁN TIẾT KIỆM
const potentialSavings =
  currentPower > finalOptimalPower
    ? (((currentPower - finalOptimalPower) / currentPower) * 100).toFixed(1)
    : 0;
```

### Bước 6: Tạo Khuyến Nghị Thông Minh

**Vị trí:** `energy-efficiency-manager.js`

Khuyến nghị được hỗ trợ AI dựa trên công suất AC và cách sử dụng:

```javascript
// KHUYẾN NGHỊ NHIỆT ĐỘ
if (targetTemp < optimalTempRange.min) {
  recommendations.push({
    type: "temperature",
    action: "increase",
    message: `Tăng nhiệt độ lên ${suggestedTemp}°C để tiết kiệm ${savings}% năng lượng`,
    suggestedTemp: suggestedTemp,
    estimatedSavings: savings,
    priority: "high"
  });
}

// KHUYẾN NGHỊ CÔNG SUẤT
const capacityUtilization = currentPower / acConfig.adjustedNominalPower;
if (capacityUtilization > 1.1) {
  recommendations.push({
    type: "capacity",
    action: "upgrade",
    message: `AC ${acConfig.type} đang chạy ở ${Math.round(capacityUtilization * 100)}% công suất`,
    suggestedUpgrade: suggestACUpgrade(acConfig.type),
    priority: "medium"
  });
}

// KHUYẾN NGHỊ CÔNG NGHỆ
if (acConfig.technology === "non-inverter" && powerWaste > 20%) {
  recommendations.push({
    type: "technology",
    action: "upgrade",
    message: "Xem xét nâng cấp lên AC inverter để tiết kiệm 15-30% năng lượng",
    estimatedSavings: "15-30",
    priority: "low"
  });
}
```

## VÍ DỤ TÍNH TOÁN

### Ví dụ 1: AC 1.5HP Inverter, Phòng Trung Bình (25m²)

**Tham Số Đầu Vào:**

- Loại AC: 1.5HP Inverter
- Kích thước Phòng: Trung bình (25m²)
- Nhiệt độ Ngoài trời: 32°C
- Nhiệt độ Đặt: 22°C
- Công Suất Hiện tại: 1100W

**Quy Trình Tính Toán:**

```javascript
// Bước 1: Lấy thông số AC
acSpec = { nominalPower: 1200W, maxPower: 1500W, minPower: 300W }
techMultiplier = { efficiency: 0.85, powerPerDegree: 18W }
roomMultiplier = 1.0

// Bước 2: Tính thông số điều chỉnh
adjustedMinPower = 300W * 1.0 = 300W
adjustedPowerPerDegree = 18W * 1.0 = 18W/°C

// Bước 3: Tính công suất tối ưu
tempDifference = |32 - 22| = 10°C
optimalPower = 300W + (10 * 18W) = 480W

// Bước 4: Tính điểm hiệu suất
efficiencyScore = 100
// Thưởng dải tối ưu: +10 (22°C nằm trong dải 22-25°C)
// Phạt lãng phí điện: -((1100-480)/480)*60 = -77.5 (giới hạn tại -40)
// Thưởng công nghệ: +(0.85-0.7)*20 = +3
finalScore = 100 + 10 - 40 + 3 = 73%

// Bước 5: Tính tiết kiệm
potentialSavings = ((1100-480)/1100)*100 = 56.4%
```

**Kết Quả:**

- Điểm Hiệu suất: 73%
- Công Suất Tối ưu: 480W
- Công Suất Hiện tại: 1100W
- Tiềm năng Tiết kiệm: 56.4%
- Mức độ: Tốt
- Khuyến nghị: "Xem xét bảo dưỡng - AC tiêu thụ điện quá mức"

### Ví dụ 2: AC 2HP Không Inverter, Phòng Lớn (40m²)

**Tham Số Đầu Vào:**

- Loại AC: 2HP Không Inverter
- Kích thước Phòng: Lớn (40m²)
- Nhiệt độ Ngoài trời: 30°C
- Nhiệt độ Đặt: 18°C
- Công Suất Hiện tại: 1800W

**Quy Trình Tính Toán:**

```javascript
// Bước 1: Lấy thông số AC
acSpec = { nominalPower: 1600W, maxPower: 2000W, minPower: 400W }
techMultiplier = { efficiency: 0.7, powerPerDegree: 25W }
roomMultiplier = 1.3

// Bước 2: Tính thông số điều chỉnh
adjustedMinPower = 400W * 1.3 = 520W
adjustedMaxPower = 2000W * 1.3 = 2600W
adjustedPowerPerDegree = 25W * 1.3 = 32.5W/°C

// Bước 3: Tính công suất tối ưu
tempDifference = |30 - 18| = 12°C
optimalPower = 520W + (12 * 32.5W) = 910W
finalOptimalPower = min(910W, 2600W) = 910W

// Bước 4: Tính điểm hiệu suất
efficiencyScore = 100
// Phạt cực lạnh: -(18-18)*12 = 0
// Phạt rất lạnh: -(20-18)*8 = -16
// Phạt lãng phí điện: -((1800-910)/910)*60 = -58.6 (giới hạn tại -40)
// Thưởng công nghệ: +(0.7-0.7)*20 = 0
finalScore = 100 - 16 - 40 + 0 = 44%

// Bước 5: Tính tiết kiệm
potentialSavings = ((1800-910)/1800)*100 = 49.4%
```

**Kết Quả:**

- Điểm Hiệu suất: 44%
- Công Suất Tối ưu: 910W
- Công Suất Hiện tại: 1800W
- Tiềm năng Tiết kiệm: 49.4%
- Mức độ: Trung bình
- Khuyến nghị:
  - "Tăng nhiệt độ lên 22°C để tiết kiệm 35% năng lượng"
  - "Xem xét nâng cấp lên AC inverter để tiết kiệm 15-30% năng lượng"

## CƠ SỞ NGHIÊN CỨU & THUẬT TOÁN

### Nghiên Cứu Công Thức Hiệu Suất Năng Lượng

Các thuật toán tính toán dựa trên:

1. **Tiêu chuẩn ASHRAE** - Hiệp hội Kỹ sư Sưởi ấm, Làm lạnh và Điều hòa không khí Mỹ
2. **Xếp hạng Energy Star** - Tiêu chuẩn hiệu suất năng lượng của EPA Mỹ
3. **Tính toán Tải Nhiệt** - Thực hành kỹ thuật HVAC tiêu chuẩn
4. **Nghiên cứu Công nghệ Inverter** - So sánh tiêu thụ năng lượng
5. **Hệ số Tải Nhiệt Kích thước Phòng** - Phân tích nhiệt tòa nhà

### Nghiên Cứu Tiêu Thụ Điện Năng

**Tính Toán Công Suất Cơ Bản:**

- Tiêu thụ điện tối thiểu dựa trên chế độ chờ AC + làm lạnh tối thiểu
- Điện năng trên mỗi độ dựa trên yêu cầu làm lạnh nhiệt động học
- Công suất tối đa giới hạn bởi công suất AC và thông số điện

**Hệ Số Hiệu Suất Công Nghệ:**

- Không Inverter: Hiệu suất 70% (máy nén tốc độ không đổi)
- Inverter: Hiệu suất 85% (máy nén tốc độ biến đổi)
- Dual-Inverter: Hiệu suất 95% (tốc độ biến đổi tiên tiến + tối ưu hóa)

**Hệ Số Tải Kích Thước Phòng:**

- Phòng nhỏ: Hệ số 0.8x (khối lượng nhiệt ít hơn, làm lạnh nhanh hơn)
- Phòng trung bình: Hệ số 1.0x (tính toán cơ sở)
- Phòng lớn: Hệ số 1.3x (tải nhiệt cao hơn)
- Cực lớn: Hệ số 1.6x (không gian thương mại/công nghiệp)

### Nghiên Cứu Tối Ưu Hóa Nhiệt Độ

**Dải Nhiệt Độ Tối Ưu (22-25°C):**

- Dựa trên nghiên cứu về sự thoải mái của con người và đường cong tiêu thụ năng lượng
- Điểm ngọt ngào nơi hiệu suất làm lạnh cao nhất
- Cân bằng giữa sự thoải mái và tiết kiệm năng lượng

**Tính Toán Phạt Nhiệt Độ:**

- Nhiệt độ cực đoan cần năng lượng tăng theo cấp số nhân
- Mức phạt dựa trên dữ liệu tiêu thụ năng lượng thực tế
- Hệ thống phạt từng bậc để khuyến khích điều chỉnh dần dần

## QUY TRÌNH TÍCH HỢP

### Các Bước Tích Hợp Hệ Thống

1. **Thiết Lập Ban Đầu**

   - Người dùng cấu hình thông số AC trong Cài đặt
   - Hệ thống xác thực và lưu trữ cấu hình trong localStorage
   - Energy Efficiency Manager nhận cấu hình

2. **Hoạt Động Thời Gian Thực**

   - Nền tảng E-RA gửi dữ liệu thiết bị qua WebSocket
   - GlobalDeviceDataManager xử lý và phân phối dữ liệu
   - Temperature Controller cập nhật giao diện và kích hoạt tính toán

3. **Tính Toán Hiệu Suất**

   - Energy Efficiency Manager tính toán sử dụng công thức thực tế
   - Kết quả bao gồm điểm số, khuyến nghị và phân tích chi phí
   - Giao diện cập nhật với huy hiệu hiệu suất và widget khuyến nghị

4. **Tương Tác Người Dùng**
   - Người dùng có thể áp dụng khuyến nghị nhiệt độ bằng một cú nhấp chuột
   - Hệ thống gửi lệnh trở lại nền tảng E-RA
   - Phản hồi thời gian thực và tính toán lại hiệu suất

### Tích Hợp Hệ Thống Sự Kiện

```javascript
// Luồng Kiến trúc Hướng Sự kiện
window.acEventSystem.on("ac-data-updated", (data) => {
  // Kích hoạt tính toán lại hiệu suất
  energyEfficiencyManager.calculateEfficiencyForAC(data.acId, data.acData);
});

window.acEventSystem.on("temperature-changed", (data) => {
  // Cập nhật tính toán hiệu suất
  energyEfficiencyManager.triggerEnergyEfficiencyUpdate(data.acId, data);
});

window.acEventSystem.on("energy-efficiency-calculated", (data) => {
  // Cập nhật giao diện với dữ liệu hiệu suất mới
  acSpaManager.updateEfficiencyDisplay(data.acId, data.efficiency);
});
```

## TỐI ƯU HÓA HIỆU SUẤT

### Hiệu Suất Tính Toán

1. **Thông Số Tính Sẵn**: Thông số AC được tính sẵn trong quá trình cấu hình để tránh tính toán lặp lại
2. **Cập Nhật Debounced**: Thay đổi nhiệt độ được debounced để ngăn tính toán quá mức
3. **Kết Quả Cached**: Kết quả hiệu suất được cached cho các tham số đầu vào giống hệt nhau
4. **Tải Lười**: Biểu đồ và thành phần giao diện nặng chỉ được tải khi cần thiết

### Quản Lý Bộ Nhớ

1. **Mẫu Singleton**: GlobalDeviceDataManager sử dụng singleton để ngăn rò rỉ bộ nhớ
2. **Dọn Dẹp Sự Kiện**: Event listener được dọn dẹp đúng cách khi các thành phần bị hủy
3. **Cắt Bớt Dữ Liệu**: Dữ liệu lịch sử được cắt bớt tự động để ngăn phình to bộ nhớ
4. **Cập Nhật DOM Hiệu Quả**: Cập nhật giao diện sử dụng thao tác DOM có mục tiêu thay vì render lại toàn bộ

## TÍNH NĂNG UI/UX

### Chỉ Báo Hiệu Suất Trực Quan

**Huy Hiệu Hiệu Suất:**

- Hiển thị điểm hiệu suất thời gian thực (0-100%)
- Mức hiệu suất mã hóa màu (Xuất sắc/Tốt/Trung bình/Kém)
- Phần trăm tiết kiệm tiềm năng
- Chỉ báo hiệu suất công nghệ

**Khuyến Nghị Thông Minh:**

- Tối ưu hóa nhiệt độ một cú nhấp chuột
- Gợi ý nâng cấp công suất AC
- Khuyến nghị cải tiến công nghệ
- Cảnh báo bảo dưỡng dựa trên tiêu thụ điện

**Dashboard Tương Tác:**

- Giám sát tiêu thụ năng lượng thời gian thực
- Xu hướng hiệu suất lịch sử
- Phân tích chi phí và theo dõi tiết kiệm
- Số liệu hiệu suất so sánh

### Trực Quan Hóa Dữ Liệu

**Biểu Đồ Sử Dụng Nhiệt Độ:**

- Tích hợp Highcharts cho trực quan hóa chuyên nghiệp
- Phân tích hiệu suất theo thời gian
- Tương quan tiêu thụ năng lượng vs nhiệt độ
- Trực quan hóa tiềm năng tiết kiệm

**Giám Sát Thời Gian Thực:**

- Hiển thị tiêu thụ điện trực tiếp
- Cập nhật điểm hiệu suất
- Theo dõi chi phí theo giờ/ngày/tháng
- Số liệu tác động môi trường

## BẢO DƯỠNG & KHẮC PHỤC SỰ CỐ

### Các Vấn Đề Thường Gặp

1. **Không có Dữ liệu Hiệu suất**: Kiểm tra cấu hình AC trong Cài đặt
2. **Tính Toán Không Chính xác**: Xác minh kết nối dữ liệu thiết bị E-RA
3. **Giao diện Không Cập nhật**: Đảm bảo Event System được khởi tạo đúng cách
4. **Thiếu Khuyến nghị**: Kiểm tra xem thông số AC có đầy đủ không

### Thông Tin Debug

Bật chế độ debug bằng cách đặt:

```javascript
window.energyEfficiencyDebug = true;
```

Thông tin debug bao gồm:

- Các bước tính toán thời gian thực
- Theo dõi luồng dữ liệu
- Giám sát hệ thống sự kiện
- Số liệu hiệu suất

### Hệ Thống Logging

Logging toàn diện ở nhiều cấp độ:

- **INFO**: Luồng hoạt động bình thường
- **WARN**: Các vấn đề không nghiêm trọng và fallback
- **ERROR**: Lỗi hệ thống và thất bại
- **DEBUG**: Các bước tính toán chi tiết và luồng dữ liệu

## CẢI TIẾN TƯƠNG LAI

### Kế Hoạch Tích Hợp AI

1. **Học Máy**: Học tùy chọn người dùng và tối ưu hóa tự động
2. **Phân Tích Dự Đoán**: Dự đoán cài đặt tối ưu dựa trên thời tiết và mẫu sử dụng
3. **Lập Lịch Thông Minh**: Tự động điều chỉnh cài đặt AC dựa trên mức độ sử dụng
4. **Phát Hiện Bất Thường**: Phát hiện mẫu tiêu thụ năng lượng bất thường

### Mở Rộng IoT

1. **Hỗ Trợ Đa Thiết Bị**: Hỗ trợ nhiều đơn vị AC đồng thời
2. **Tích Hợp Thời Tiết**: Dữ liệu thời tiết thời gian thực cho tính toán tốt hơn
3. **Tích Hợp Nhà Thông Minh**: Tích hợp với các thiết bị nhà thông minh khác
4. **Ứng Dụng Di Động**: Ứng dụng di động chuyên dụng để giám sát từ xa

### Phân Tích Nâng Cao

1. **Đánh Giá Năng Lượng**: So sánh hiệu suất với các thiết lập tương tự
2. **Máy Tính ROI**: Tính toán lợi tức đầu tư cho nâng cấp AC
3. **Tác Động Môi Trường**: Theo dõi dấu chân carbon và lợi ích môi trường
4. **Tích Hợp Tiện Ích**: Tích hợp với dữ liệu công ty tiện ích và hóa đơn

---

## TÓM TẮT

Hệ thống Tiết kiệm Năng lượng đại diện cho một cách tiếp cận toàn diện để tối ưu hóa năng lượng AC, kết hợp:

- **Thông Số AC Thực Tế**: Dựa trên HP thực tế, công nghệ và kích thước phòng
- **Thuật Toán Tiên Tiến**: Tính toán hiệu suất đa yếu tố với hệ thống phạt/thưởng
- **Tích Hợp Thời Gian Thực**: Tích hợp liền mạch với nền tảng IoT E-RA
- **Khuyến Nghị Thông Minh**: Gợi ý được hỗ trợ AI để tối ưu hóa
- **UI/UX Chuyên Nghiệp**: Dashboard tương tác và công cụ trực quan hóa
- **Kiến Trúc Hướng Sự Kiện**: Thiết kế hệ thống có thể mở rộng và bảo trì

Hệ thống cung cấp cho người dùng những hiểu biết chính xác, có thể hành động để giảm tiêu thụ năng lượng trong khi duy trì sự thoải mái, được hỗ trợ bởi các nguyên tắc kỹ thuật vững chắc và dữ liệu thử nghiệm thực tế.
