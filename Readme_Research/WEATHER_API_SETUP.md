# Hướng dẫn cấu hình Weather API

## Tổng quan

Hệ thống đã được tích hợp với nhiều nguồn API thời tiết để lấy nhiệt độ ngoài trời chính xác cho khu vực **Vạn Phúc City, Thủ Đức, Hồ Chí Minh**.

## Các API được hỗ trợ

### 1. OpenWeatherMap (Khuyến nghị)

- **Website**: https://openweathermap.org/api
- **Gói miễn phí**: 1,000 lượt gọi/ngày
- **Độ chính xác**: Cao
- **Cập nhật**: Mỗi 10 phút

#### Cách đăng ký:

1. Truy cập https://openweathermap.org/api
2. Tạo tài khoản miễn phí
3. Xác nhận email
4. Lấy API key từ dashboard
5. Thay thế `YOUR_OPENWEATHER_API_KEY` trong code

### 2. WeatherAPI.com (Dự phòng)

- **Website**: https://www.weatherapi.com/
- **Gói miễn phí**: 1 triệu lượt gọi/tháng
- **Độ chính xác**: Cao
- **Cập nhật**: Realtime

#### Cách đăng ký:

1. Truy cập https://www.weatherapi.com/signup.aspx
2. Đăng ký tài khoản miễn phí
3. Lấy API key
4. Thay thế `YOUR_WEATHERAPI_KEY` trong code

### 3. Wttr.in (Dự phòng không cần API key)

- **Website**: https://wttr.in/
- **Miễn phí**: Hoàn toàn không cần đăng ký
- **Độ chính xác**: Trung bình
- **Cập nhật**: Mỗi giờ

## Cấu hình trong Code

### File: `js/energy-efficiency-manager.js`

```javascript
// Tìm và thay thế các dòng sau:

// OpenWeatherMap API Key
const API_KEY = "YOUR_OPENWEATHER_API_KEY"; // Thay bằng key thực tế của bạn

// WeatherAPI Key
const API_KEY = "YOUR_WEATHERAPI_KEY"; // Thay bằng key thực tế của bạn
```

## Ví dụ cấu hình

```javascript
// OpenWeatherMap
const API_KEY = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"; // Key thực tế của bạn

// WeatherAPI
const API_KEY = "x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8"; // Key thực tế của bạn
```

## Tính năng

### ✅ Đã triển khai:

- **Multi-source API**: Tự động thử các nguồn API khác nhau
- **Fallback thông minh**: Sử dụng dữ liệu dự phóng nếu API không khả dụng
- **Auto refresh**: Cập nhật tự động mỗi 30 phút
- **Manual refresh**: Nút làm mới thủ công
- **Location-specific**: Tối ưu hóa cho Vạn Phúc City, Thủ Đức
- **Weather info display**: Hiển thị thông tin thời tiết chi tiết
- **User feedback**: Thông báo trạng thái cập nhật

### 🔄 Cách hoạt động:

1. **Ưu tiên 1**: OpenWeatherMap API (nếu có key)
2. **Ưu tiên 2**: WeatherAPI.com (nếu có key)
3. **Ưu tiên 3**: Wttr.in (không cần key)
4. **Ưu tiên 4**: Dữ liệu dự phóng thông minh (dựa trên thời gian/mùa)

### 📍 Vị trí mặc định:

```
Vạn Phúc City, Thủ Đức, Hồ Chí Minh, Vietnam
```

## Kiểm tra hoạt động

### 1. Mở Console (F12)

```javascript
// Kiểm tra weather manager
console.log(window.acEnergyManager.weatherInfo);

// Test manual refresh
window.acEnergyManager.refreshOutdoorTemp();

// Kiểm tra outdoor temperature
console.log(window.acEnergyManager.getCurrentOutdoorTemp());
```

### 2. UI Feedback

- **Thành công**: Notification màu xanh với nhiệt độ mới
- **Lỗi**: Notification màu đỏ với thông báo lỗi
- **Đang tải**: Notification màu xanh dương

### 3. Kiểm tra trong Modal

- Mở modal "Xem chi tiết"
- Xem thông tin "Nhiệt độ ngoài trời" và "Thông tin thời tiết"

## Troubleshooting

### ❌ Lỗi thường gặp:

#### 1. "API key chưa được cấu hình"

- **Nguyên nhân**: Chưa thay thế API key trong code
- **Giải pháp**: Đăng ký API và cập nhật key trong code

#### 2. "HTTP 401: Unauthorized"

- **Nguyên nhân**: API key không hợp lệ
- **Giải pháp**: Kiểm tra lại API key, đảm bảo account được activate

#### 3. "HTTP 429: Too Many Requests"

- **Nguyên nhân**: Vượt quá giới hạn gọi API
- **Giải pháp**: Đợi reset quota hoặc upgrade plan

#### 4. Hiển thị "Sử dụng nhiệt độ dự phóng"

- **Nguyên nhân**: Tất cả API đều không khả dụng
- **Giải pháp**: Bình thường, hệ thống sẽ sử dụng dữ liệu dự phóng thông minh

## Monitoring & Logs

### Console Logs:

```
✅ "Đã lấy được nhiệt độ từ OpenWeatherMap: 32.5°C"
✅ "Đã bật cập nhật thời tiết tự động (mỗi 30 phút)"
⚠️  "OpenWeatherMap không khả dụng: API key chưa được cấu hình"
❌ "Lỗi khi lấy dữ liệu thời tiết: HTTP 401"
```

### Performance:

- **Tần suất cập nhật**: 30 phút/lần
- **Timeout**: 10 giây/API call
- **Cache**: Data được cache trong 1 giờ
- **Bandwidth**: ~1KB/request

## Bảo mật

### ⚠️ Lưu ý quan trọng:

- **Không commit API keys** lên git repository public
- **Sử dụng environment variables** trong production
- **Monitor usage** để tránh vượt quota
- **Rotate keys** định kỳ cho bảo mật

### 🔒 Best practices:

```javascript
// Production: Sử dụng environment variables
const API_KEY = process.env.OPENWEATHER_API_KEY || "fallback_key";

// Development: Sử dụng config file không được commit
const API_KEY = config.weather.openweather.apiKey;
```

---

**📧 Hỗ trợ**: Nếu gặp vấn đề, kiểm tra console logs và thử refresh thủ công trước.
