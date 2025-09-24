# 📊 DATABASE STRUCTURE GUIDE - AIR CONDITIONER ELECTRICITY BILLS

## 🎯 **Cấu Trúc Database Mới**

Cấu trúc lưu trữ được thiết kế theo hierarchy logic và dễ quản lý:

```
Firebase Realtime Database:
Air_Conditioner/
├── $userId (Authentication UID)/
│   └── Electricity_bill/
│       ├── 2024/
│       │   ├── 01/
│       │   │   ├── kwh: 150
│       │   │   ├── amount: 350000
│       │   │   ├── lastModified: timestamp
│       │   │   ├── workingDays: 22
│       │   │   └── notes: "Tháng đầu năm"
│       │   ├── 02/
│       │   │   ├── kwh: 180
│       │   │   ├── amount: 420000
│       │   │   ├── lastModified: timestamp
│       │   │   ├── workingDays: 20
│       │   │   └── notes: "Tết nghỉ nhiều"
│       │   └── ...
│       ├── 2025/
│       │   ├── 01/
│       │   ├── 02/
│       │   └── ...
│       └── ...
└── $anotherUserId/
    └── Electricity_bill/
        └── ...
```

---

## 🏗️ **Chi Tiết Cấu Trúc**

### **1. Root Level: `Air_Conditioner`**

- **Mục đích**: Container chính cho tất cả dữ liệu điều hòa
- **Lý do**: Phân biệt rõ ràng với các module khác trong ứng dụng

### **2. User Level: `$userId`**

- **Mục đích**: Phân tách dữ liệu theo từng người dùng
- **Bảo mật**: Mỗi user chỉ có thể truy cập dữ liệu của mình
- **Scale**: Hỗ trợ multi-user trong tương lai

### **3. Category Level: `Electricity_bill`**

- **Mục đích**: Phân loại dữ liệu điện (có thể mở rộng thêm Water_bill, Gas_bill...)
- **Mở rộng**: Dễ dàng thêm các loại hóa đơn khác

### **4. Year Level: `YYYY`**

- **Format**: 4 chữ số (2024, 2025...)
- **Lợi ích**: Dễ truy vấn theo năm, báo cáo annual
- **Performance**: Phân tách data theo năm để tối ưu load time

### **5. Month Level: `MM`**

- **Format**: 2 chữ số với padding (01, 02, ..., 12)
- **Consistency**: Đảm bảo sắp xếp đúng thứ tự
- **Validation**: Firebase rules validate format MM

---

## 📋 **Dữ Liệu Trong Mỗi Tháng**

### **Required Fields (Bắt buộc):**

```json
{
  "kwh": 150, // Số điện tiêu thụ (KiloWatt hour)
  "amount": 350000 // Số tiền phải trả (VND)
}
```

### **Optional Fields (Tùy chọn):**

```json
{
  "lastModified": 1672531200000, // Timestamp cập nhật cuối
  "workingDays": 22, // Số ngày làm việc trong tháng
  "notes": "Ghi chú đặc biệt" // Ghi chú bổ sung
}
```

### **Data Types & Validation:**

- `kwh`: Number, >= 0
- `amount`: Number, >= 0
- `lastModified`: Timestamp (tự động)
- `workingDays`: Number, 0-31
- `notes`: String, max 500 chars

---

## 🔒 **Firebase Security Rules**

```json
{
  "rules": {
    "Air_Conditioner": {
      "$userId": {
        ".read": "$userId === auth.uid",
        ".write": "$userId === auth.uid",
        "Electricity_bill": {
          "$year": {
            ".validate": "$year.matches(/^20[0-9]{2}$/)",
            "$month": {
              ".validate": "$month.matches(/^(0[1-9]|1[0-2])$/)",
              ".validate": "newData.hasChildren(['kwh', 'amount'])",
              "kwh": {
                ".validate": "newData.isNumber() && newData.val() >= 0"
              },
              "amount": {
                ".validate": "newData.isNumber() && newData.val() >= 0"
              },
              "lastModified": {
                ".validate": "newData.isNumber()"
              },
              "workingDays": {
                ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 31"
              },
              "notes": {
                ".validate": "newData.isString() && newData.val().length <= 500"
              }
            }
          }
        }
      }
    }
  }
}
```

---

## 🚀 **API Methods Mới**

### **1. Save Single Month**

```javascript
await firebaseStorageManager.saveSingleMonthBill(2024, 1, {
  kwh: 150,
  amount: 350000,
  workingDays: 22,
  notes: "Tháng đầu năm",
});
```

### **2. Load Single Month**

```javascript
const monthData = await firebaseStorageManager.loadSingleMonthFromFirebase(
  2024,
  1
);
```

### **3. Load Full Year**

```javascript
const yearData = await firebaseStorageManager.loadYearFromFirebase(2024);
```

### **4. Delete Month**

```javascript
await firebaseStorageManager.deleteFromFirebase("2024-01");
```

---

## 📊 **Lợi Ích Của Cấu Trúc Mới**

### **1. Performance**

- ✅ Load data theo tháng/năm thay vì toàn bộ
- ✅ Giảm bandwidth khi sync
- ✅ Cache hiệu quả hơn

### **2. Scalability**

- ✅ Hỗ trợ unlimited users
- ✅ Data isolated theo user
- ✅ Dễ mở rộng thêm bill types

### **3. Maintainability**

- ✅ Cấu trúc logic dễ hiểu
- ✅ Validation chặt chẽ
- ✅ Backup/restore by year

### **4. Analytics**

- ✅ Query theo year/month dễ dàng
- ✅ Aggregation data hiệu quả
- ✅ Trending analysis

---

## 🔄 **Migration từ Cấu Trúc Cũ**

System tự động detect và migrate data từ format cũ:

```javascript
// Old Format (version 1)
{
  "electricity_bills": {
    "data": {
      "2024-01": { kwh: 150, amount: 350000 }
    }
  }
}

// New Format (version 2)
{
  "Air_Conditioner": {
    "Electricity_bill": {
      "2024": {
        "01": { kwh: 150, amount: 350000 }
      }
    }
  }
}
```

---

## 🎯 **Best Practices**

### **1. Data Input**

- Luôn validate input trước khi save
- Sử dụng proper data types
- Thêm error handling

### **2. Performance**

- Load data theo nhu cầu (lazy loading)
- Cache frequently used data
- Batch operations khi có thể

### **3. Security**

- Không expose sensitive data
- Validate trên client và server
- Monitor unusual access patterns

---

## 📝 **Example Usage**

```javascript
// Initialize
const storage = window.firebaseStorageManager;

// Save electricity bill for January 2024
await storage.saveSingleMonthBill(2024, 1, {
  kwh: 150,
  amount: 350000,
  workingDays: 22,
  notes: "Tháng đầu năm, tiết kiệm điện",
});

// Load all data for 2024
const year2024 = await storage.loadYearFromFirebase(2024);

// Export backup
await storage.exportAllData();
```

---

## 🏆 **Kết Luận**

Cấu trúc database mới đảm bảo:

- ✅ **Organized**: Dữ liệu có tổ chức logic
- ✅ **Scalable**: Dễ mở rộng và maintain
- ✅ **Secure**: Bảo mật đa lớp
- ✅ **Performant**: Tối ưu truy xuất data
- ✅ **Future-proof**: Sẵn sàng cho tính năng mới

> 💡 **Tip**: Luôn backup data trước khi test migration!
