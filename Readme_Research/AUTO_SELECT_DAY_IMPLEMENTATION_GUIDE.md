# AUTO SELECT DAY 1 IMPLEMENTATION GUIDE

## Hướng Dẫn Implement Tính Năng Auto-Select Ngày 1 và User Selection

### 📋 MỤC TIÊU CỦA TÍNH NĂNG

1. **Auto-Select Day 1**: Khi user navigate tháng/năm, tự động chọn ngày 1
2. **User Freedom**: User có thể click chọn bất kỳ ngày nào khác
3. **State Management**: Quản lý trạng thái selection một cách chính xác
4. **UX Smooth**: Trải nghiệm mượt mà, không gây confusion

---

### 🎯 PHÂN TÍCH VẤN ĐỀ VÀ GIẢI PHÁP

#### **Problem Analysis**

```
User Journey:
1. User mở calendar → Cần auto-select day 1 của tháng hiện tại
2. User navigate month/year → Cần auto-select day 1 của tháng mới
3. User click vào ngày cụ thể → Respect user choice, đừng override
4. Form data → Load data theo tháng được chọn, không clear input của user
```

#### **Core Challenge**

- Làm thế nào phân biệt giữa "system navigation" vs "user explicit choice"?
- Timing issue: DOM cần được render xong trước khi select element
- State consistency: selectedDate phải sync với UI selection

---

### 🏗️ KIẾN TRÚC GIẢI PHÁP

#### **1. Separation of Concerns - Tách Biệt 2 Loại Action**

```javascript
// ❌ BEFORE - Confusing mixed responsibility
selectDate(year, month, day) {
  // Không biết đây là user click hay system auto-select
  this.selectedDate = new Date(year, month, day);
  this.updateUI();
}

// ✅ AFTER - Clear separation
selectDay(year, month, day) {
  // User explicitly clicked on a specific day
}

selectMonth(year, month) {
  // System auto-select day 1 for navigation
}
```

#### **2. Event Binding Strategy**

```javascript
// User click events - chỉ bind cho ngày current month
bindCalendarEvents() {
  document.querySelectorAll('.calendar-day:not(.other-month)')
    .forEach(dayEl => {
      dayEl.addEventListener('click', (e) => {
        const day = parseInt(e.target.dataset.day);
        const month = parseInt(e.target.dataset.month);
        const year = parseInt(e.target.dataset.year);

        // User explicitly clicked - respect their choice
        this.selectDay(year, month, day);
      });
    });
}
```

---

### 💡 IMPLEMENTATION STEP-BY-STEP

#### **Step 1: Create Separate Methods**

```javascript
/**
 * USER EXPLICIT SELECTION
 * Khi user click vào một ngày cụ thể
 */
selectDay(year, month, day) {
  // Set selectedDate to the clicked day
  this.selectedDate = new Date(year, month, day);

  // Update UI - Remove previous selections
  document.querySelectorAll('.calendar-day')
    .forEach(el => el.classList.remove('selected'));

  // Select the clicked day
  const clickedElement = document.querySelector(
    `[data-month="${month}"][data-year="${year}"][data-day="${day}"]:not(.other-month)`
  );

  if (clickedElement) {
    clickedElement.classList.add('selected');
    console.log(`User selected day ${day} of month ${month + 1}/${year}`);
  }

  // Update related UI
  this.updateSelectionInfo();
  this.loadBillDataForMonth(year, month);
}

/**
 * SYSTEM AUTO-SELECTION
 * Khi user navigate month/year, auto chọn ngày 1
 */
selectMonth(year, month) {
  // Always select day 1 when navigating
  this.selectedDate = new Date(year, month, 1);

  // Update UI
  document.querySelectorAll('.calendar-day')
    .forEach(el => el.classList.remove('selected'));

  // Auto-select day 1
  const day1Element = document.querySelector(
    `[data-month="${month}"][data-year="${year}"][data-day="1"]:not(.other-month)`
  );

  if (day1Element) {
    day1Element.classList.add('selected');
    console.log(`Auto-selected day 1 of month ${month + 1}/${year}`);
  }

  // Update related UI
  this.updateSelectionInfo();
  this.loadBillDataForMonth(year, month);
}
```

#### **Step 2: Handle DOM Timing Issues**

```javascript
/**
 * DOM TIMING SOLUTION
 * Calendar cần được render xong trước khi select elements
 */
autoSelectDay1() {
  // ⚠️ KEY INSIGHT: setTimeout để đợi DOM render xong
  setTimeout(() => {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    // Set selectedDate to day 1
    this.selectedDate = new Date(year, month, 1);

    // Clear previous selections
    document.querySelectorAll('.calendar-day')
      .forEach(el => el.classList.remove('selected'));

    // Find and select day 1 element
    const day1Element = document.querySelector(
      `[data-month="${month}"][data-year="${year}"][data-day="1"]:not(.other-month)`
    );

    if (day1Element) {
      day1Element.classList.add('selected');
      console.log(`Auto-selected day 1 of ${month + 1}/${year}`);

      this.updateSelectionInfo();
      this.loadBillDataForMonth(year, month);
    } else {
      console.warn(`Could not find day 1 element for ${month + 1}/${year}`);
    }
  }, 150); // ⚠️ Timing critical - 150ms đủ cho DOM render
}
```

#### **Step 3: Navigation Methods Integration**

```javascript
navigateMonth(direction) {
  // Update calendar date
  this.currentDate.setMonth(this.currentDate.getMonth() + direction);

  // Re-render calendar
  this.updateCalendar();
  this.updateNavigationDisplay();

  // 🎯 KEY POINT: Call autoSelectDay1 sau khi calendar updated
  this.autoSelectDay1();
}

navigateYear(direction) {
  // Update calendar date
  this.currentDate.setFullYear(this.currentDate.getFullYear() + direction);

  // Re-render calendar
  this.updateCalendar();
  this.updateNavigationDisplay();

  // 🎯 KEY POINT: Call autoSelectDay1 sau khi calendar updated
  this.autoSelectDay1();
}
```

#### **Step 4: Form Data Preservation**

```javascript
/**
 * FORM DATA PRESERVATION STRATEGY
 * Không clear form nếu user đã nhập data
 */
loadBillDataForMonth(year, month) {
  const monthKey = this.getMonthKey(year, month);
  const data = this.billData.get(monthKey);

  if (data) {
    // Có data sẵn - populate form
    document.getElementById('bill-amount').value = data.billAmount;
    document.getElementById('power-consumption').value = data.powerConsumption;
    // ... populate other fields
  } else {
    // 🎯 KEY INSIGHT: Check if user has entered data before clearing
    const billAmount = document.getElementById('bill-amount').value.trim();
    const powerConsumption = document.getElementById('power-consumption').value.trim();

    if (!billAmount && !powerConsumption) {
      // Form empty - safe to clear and set defaults
      this.clearForm();
    } else {
      // User has data - preserve it, only reset working days
      console.log('Preserving user input - not clearing form');
      this.resetWorkingDaysToDefault();
    }
  }
}
```

---

### 🔧 TECHNICAL DEEP DIVE

#### **DOM Selector Strategy**

```javascript
// ✅ BEST PRACTICE - Specific selector
const day1Element = document.querySelector(
  `[data-month="${month}"][data-year="${year}"][data-day="1"]:not(.other-month)`
);

// Breakdown:
// - [data-month="${month}"] : Chỉ ngày thuộc tháng target
// - [data-year="${year}"]   : Chỉ ngày thuộc năm target
// - [data-day="1"]          : Chỉ ngày 1
// - :not(.other-month)      : Loại trừ ngày của tháng khác
```

#### **State Management Pattern**

```javascript
class CalendarManager {
  constructor() {
    this.currentDate = new Date(); // Calendar display date
    this.selectedDate = null; // User/system selected date
    this.updateTimeout = null; // Debouncing
  }

  // 🎯 PATTERN: Always sync selectedDate với UI
  updateSelectedDateAndUI(year, month, day) {
    // 1. Update internal state
    this.selectedDate = new Date(year, month, day);

    // 2. Update UI to reflect state
    this.highlightSelectedDay();

    // 3. Update dependent components
    this.updateSelectionInfo();
    this.loadFormData();
  }
}
```

#### **Event Delegation Best Practice**

```javascript
// ✅ EFFICIENT - Single event listener với delegation
bindCalendarEvents() {
  const calendarGrid = document.getElementById('calendar-grid');

  calendarGrid.addEventListener('click', (e) => {
    if (e.target.classList.contains('calendar-day') &&
        !e.target.classList.contains('other-month')) {

      const day = parseInt(e.target.dataset.day);
      const month = parseInt(e.target.dataset.month);
      const year = parseInt(e.target.dataset.year);

      this.selectDay(year, month, day);
    }
  });
}
```

---

### 🚨 COMMON PITFALLS & SOLUTIONS

#### **Pitfall 1: Race Conditions**

```javascript
// ❌ PROBLEM
updateCalendar() {
  this.regenerateCalendarHTML();
  this.autoSelectDay1(); // DOM chưa ready!
}

// ✅ SOLUTION
updateCalendar() {
  this.regenerateCalendarHTML();

  // Wait for DOM to be ready
  setTimeout(() => {
    this.autoSelectDay1();
  }, 150);
}
```

#### **Pitfall 2: Event Binding Issues**

```javascript
// ❌ PROBLEM - Events bị lost sau re-render
updateCalendar() {
  calendarGrid.innerHTML = this.generateHTML();
  // Events đã bị mất!
}

// ✅ SOLUTION - Re-bind events after re-render
updateCalendar() {
  calendarGrid.innerHTML = this.generateHTML();
  this.bindCalendarEvents(); // Re-bind events
}
```

#### **Pitfall 3: State Inconsistency**

```javascript
// ❌ PROBLEM - selectedDate không match UI
selectDay(year, month, day) {
  // Update UI nhưng quên update selectedDate
  element.classList.add('selected');
  // this.selectedDate = ??? // Missing!
}

// ✅ SOLUTION - Always sync state và UI
selectDay(year, month, day) {
  // 1. Update state
  this.selectedDate = new Date(year, month, day);

  // 2. Update UI to match state
  this.updateUISelection();
}
```

---

### 📱 RESPONSIVE & ACCESSIBILITY

#### **Touch Device Support**

```javascript
bindCalendarEvents() {
  document.querySelectorAll('.calendar-day:not(.other-month)')
    .forEach(dayEl => {
      // Mouse events
      dayEl.addEventListener('click', this.handleDaySelection);

      // Touch events for mobile
      dayEl.addEventListener('touchend', (e) => {
        e.preventDefault(); // Prevent double-firing
        this.handleDaySelection(e);
      });

      // Keyboard support
      dayEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.handleDaySelection(e);
        }
      });
    });
}
```

#### **Screen Reader Support**

```javascript
updateSelectedDay(element) {
  // Remove previous aria-selected
  document.querySelectorAll('.calendar-day[aria-selected="true"]')
    .forEach(el => el.setAttribute('aria-selected', 'false'));

  // Set new selection
  element.setAttribute('aria-selected', 'true');
  element.focus(); // Move focus for screen readers
}
```

---

### 🧪 TESTING SCENARIOS

#### **Manual Testing Checklist**

```javascript
// Test Case 1: Initial Load
// ✅ Page load → Day 1 của tháng hiện tại được chọn
// ✅ selectedDate state correct
// ✅ UI highlight correct

// Test Case 2: Month Navigation
// ✅ Click prev/next month → Day 1 của tháng mới được auto-chọn
// ✅ selectedDate updated correctly
// ✅ Previous selection cleared

// Test Case 3: User Selection
// ✅ Click vào ngày bất kỳ → Ngày đó được chọn
// ✅ selectedDate matches clicked day
// ✅ UI updated correctly

// Test Case 4: Form Preservation
// ✅ User nhập data → Navigate month → Data được preserve
// ✅ User không nhập data → Navigate month → Form clear + defaults

// Test Case 5: Edge Cases
// ✅ Tháng có 28/29/30/31 ngày
// ✅ Navigate từ ngày 31 sang tháng có ít ngày hơn
// ✅ Leap year February
```

#### **Automated Testing Template**

```javascript
describe("Auto Select Day 1 Feature", () => {
  beforeEach(() => {
    calendar = new CalendarManager();
    calendar.init();
  });

  test("should auto-select day 1 on initial load", () => {
    expect(calendar.selectedDate.getDate()).toBe(1);
    expect(document.querySelector(".calendar-day.selected").textContent).toBe(
      "1"
    );
  });

  test("should auto-select day 1 when navigating months", () => {
    calendar.navigateMonth(1);

    setTimeout(() => {
      expect(calendar.selectedDate.getDate()).toBe(1);
      expect(document.querySelector(".calendar-day.selected").textContent).toBe(
        "1"
      );
    }, 200);
  });

  test("should respect user day selection", () => {
    const day15 = document.querySelector('[data-day="15"]');
    day15.click();

    expect(calendar.selectedDate.getDate()).toBe(15);
    expect(day15.classList.contains("selected")).toBe(true);
  });
});
```

---

### 🎨 UI/UX ENHANCEMENTS

#### **Visual Feedback**

```css
/* Auto-selected day 1 styling */
.calendar-day.selected.auto-selected {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

/* User-selected day styling */
.calendar-day.selected.user-selected {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  box-shadow: 0 4px 15px rgba(240, 147, 251, 0.4);
}

/* Hover states */
.calendar-day:hover:not(.selected) {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
  transition: all 0.2s ease;
}
```

#### **Animation Sequence**

```javascript
selectDayWithAnimation(element) {
  // 1. Clear previous selections with fade out
  document.querySelectorAll('.calendar-day.selected')
    .forEach(el => {
      el.style.transform = 'scale(0.9)';
      el.style.opacity = '0.7';
      setTimeout(() => el.classList.remove('selected'), 150);
    });

  // 2. Animate new selection with fade in
  setTimeout(() => {
    element.classList.add('selected');
    element.style.transform = 'scale(1.1)';
    element.style.opacity = '1';

    setTimeout(() => {
      element.style.transform = 'scale(1)';
    }, 200);
  }, 150);
}
```

---

### 🔄 INTEGRATION WITH OTHER FEATURES

#### **Form Data Loading Integration**

```javascript
selectDay(year, month, day) {
  // Standard selection logic
  this.updateSelectedDateAndUI(year, month, day);

  // 🎯 INTEGRATION POINT: Load form data
  this.loadBillDataForMonth(year, month);

  // 🎯 INTEGRATION POINT: Update statistics
  this.updateStatisticsPanel();

  // 🎯 INTEGRATION POINT: Notify other components
  this.notifySelectionChange({
    year, month, day,
    source: 'user_click'
  });
}

selectMonth(year, month) {
  // Auto-selection logic
  this.updateSelectedDateAndUI(year, month, 1);

  // 🎯 INTEGRATION POINT: Same integrations as selectDay
  this.loadBillDataForMonth(year, month);
  this.updateStatisticsPanel();
  this.notifySelectionChange({
    year, month, day: 1,
    source: 'navigation'
  });
}
```

#### **Observer Pattern for Loose Coupling**

```javascript
class CalendarManager {
  constructor() {
    this.observers = [];
  }

  subscribe(observer) {
    this.observers.push(observer);
  }

  notifySelectionChange(data) {
    this.observers.forEach((observer) => {
      if (typeof observer.onDateSelection === "function") {
        observer.onDateSelection(data);
      }
    });
  }
}

// Other components subscribe
calendar.subscribe({
  onDateSelection: (data) => {
    console.log("Date changed:", data);
    if (data.source === "user_click") {
      analytics.track("user_selected_date", data);
    }
  },
});
```

---

### 📚 REUSABLE PATTERN SUMMARY

#### **Core Pattern for Other Projects**

```javascript
class GenericCalendarSelector {
  constructor(config = {}) {
    this.autoSelectDefault = config.autoSelectDefault ?? true;
    this.defaultDay = config.defaultDay ?? 1;
    this.preserveUserInput = config.preserveUserInput ?? true;
  }

  // 1. Separate user vs system actions
  userSelectDate(year, month, day) {
    this.updateSelection(year, month, day, "user");
  }

  systemSelectDate(year, month, day = this.defaultDay) {
    if (this.autoSelectDefault) {
      this.updateSelection(year, month, day, "system");
    }
  }

  // 2. Handle DOM timing
  updateSelection(year, month, day, source) {
    setTimeout(() => {
      this.selectedDate = new Date(year, month, day);
      this.updateUI();
      this.triggerEvents(source);
    }, this.getDOMDelay());
  }

  // 3. Navigation triggers auto-selection
  navigate(direction) {
    this.updateCalendar(direction);
    this.systemSelectDate(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth()
    );
  }
}
```

---

### ✅ BEST PRACTICES CHECKLIST

- [ ] **Separation of Concerns**: Tách biệt user action vs system action
- [ ] **DOM Timing**: Sử dụng setTimeout cho DOM render
- [ ] **State Consistency**: selectedDate luôn sync với UI
- [ ] **Event Binding**: Re-bind events sau mỗi calendar re-render
- [ ] **User Experience**: Preserve user input, don't clear unexpectedly
- [ ] **Error Handling**: Graceful fallback khi element không tìm thấy
- [ ] **Performance**: Debounce rapid updates, efficient selectors
- [ ] **Accessibility**: Keyboard navigation, screen reader support
- [ ] **Testing**: Cover edge cases, automated testing
- [ ] **Documentation**: Clear comments explaining timing và logic

---

### 🎯 KẾT LUẬN

Tính năng Auto-Select Day 1 thành công nhờ:

1. **Clear Mental Model**: Phân biệt rõ user action vs system action
2. **Timing Management**: Hiểu và handle DOM rendering timing
3. **State Management**: Consistent state between logic và UI
4. **User Respect**: Preserve user input, don't override unnecessarily
5. **Integration**: Loose coupling với other features thông qua events

Pattern này có thể áp dụng cho bất kỳ calendar selection nào trong các project khác với chỉ cần adjust config và styling.

---

_Created by: Smart Air Conditioner Development Team_  
_Last Updated: September 2025_
