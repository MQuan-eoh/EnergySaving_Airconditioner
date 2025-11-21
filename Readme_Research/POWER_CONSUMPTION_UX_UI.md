# Power Consumption Analytics - UX/UI Design Concept

## 1. Design Philosophy

- **Style:** Modern Glassmorphism (Dark Glass Theme).
- **Theme:** Dark Mode (High contrast, neon accents on dark backgrounds).
- **Core Concept:** "Liquid Glass" - Translucent layers with blur effects, glowing borders, and fluid animations to represent energy flow.

## 2. Color Palette

### Backgrounds

- **Global Background:** `#0c0c0c` (Deep Black) with overlay gradients.
- **Glass Panels:** `rgba(255, 255, 255, 0.05)` to `rgba(255, 255, 255, 0.12)`.
- **Overlay Gradient:** Radial gradient (Green tint) + Linear gradient (Dark overlay).

### Typography Colors

- **Primary Text:** `#ffffff` (White) - Headings, Values.
- **Secondary Text:** `rgba(255, 255, 255, 0.7)` or `#e0e0e0` - Labels, Subtitles.
- **Muted Text:** `rgba(255, 255, 255, 0.5)` - Units, inactive states.

### Accent Colors (Neon/Glow)

- **Primary Brand (Orange/Pink Gradient):**
  - Start: `#d75a2a` (Burnt Orange)
  - End: `#9b3a5a` (Deep Pink/Berry)
  - _Usage:_ Active buttons, primary highlights, navigation active state.
- **Blue (Info/Cooling):**
  - Primary: `#3b82f6`
  - Dark: `#1d4ed8`
  - _Usage:_ Energy stats, cooling mode, charts.
- **Green (Success/Efficiency):**
  - Primary: `#10b981`
  - Bright: `#34c759`
  - _Usage:_ "Low Usage", "Online", "Savings", positive trends.
- **Red (Danger/High Usage):**
  - Primary: `#ef4444`
  - Dark: `#dc2626`
  - _Usage:_ "High Usage", "Offline", alerts.
- **Orange/Yellow (Warning/Medium Usage):**
  - Primary: `#f59e0b`
  - _Usage:_ "Normal Usage", target temperature.
- **Purple (Fan/Special):**
  - Primary: `#8b5cf6`
  - _Usage:_ Fan controls, special features.

### Gradients

- **Primary Action:** `linear-gradient(90deg, #d75a2a 0%, #9b3a5a 100%)`
- **Success Badge:** `linear-gradient(45deg, #10b981, #34d399)`
- **Warning Badge:** `linear-gradient(135deg, #f59e0b, #d97706)`
- **Info Badge:** `linear-gradient(45deg, #3b82f6, #60a5fa)`

## 3. Typography

- **Font Family:** `"Inter", -apple-system, BlinkMacSystemFont, sans-serif`.
- **Weights:**
  - Light (300)
  - Regular (400)
  - Medium (500)
  - Semi-Bold (600)
  - Bold (700)

## 4. Component Styling

### Glass Panels (Cards)

- **Background:** `rgba(255, 255, 255, 0.05)`
- **Border:** `1px solid rgba(255, 255, 255, 0.1)` (Subtle white border)
- **Backdrop Filter:** `blur(20px)` (Strong blur for depth)
- **Border Radius:** `16px` (Rounded corners)
- **Shadow:** `0 8px 32px rgba(0, 0, 0, 0.3)`

### Buttons ("Liquid Glass")

- **Default State:**
  - Background: `rgb(104 104 104 / 8%)`
  - Border: `rgba(29, 28, 28, 0.3)`
  - Shadow: Inset highlights (`inset 2px 2px 5px rgba(255,255,255,0.3)`)
- **Hover State:**
  - Glow effect: `box-shadow: 0 0 20px rgba(215, 90, 42, 0.4)`
  - Transform: `translateY(-2px)`
- **Active State:**
  - Background: Primary Gradient (`#d75a2a` to `#9b3a5a`)
  - Border: `#9b3a5a`

### Charts

- **Background:** Transparent (blends with glass panel).
- **Grid Lines:** `rgba(255, 255, 255, 0.1)` (Very subtle).
- **Text/Labels:** White/Light Gray.
- **Data Colors:**
  - Low: Green (`rgba(40, 167, 69, 0.8)`)
  - Medium: Yellow (`rgba(255, 193, 7, 0.8)`)
  - High: Red (`rgba(220, 53, 69, 0.8)`)
  - Empty/Zero: Gray (`rgba(108, 117, 125, 0.3)`)

### Status Indicators

- **Online/On:** Glowing Green Dot (`#34c759` with `box-shadow`).
- **Offline/Off:** Dimmed or Red Dot.
- **Real-time Update:** Pulsing animation on data change.

## 5. Visual Effects & Animations

- **Hover Glows:** Elements emit a colored glow matching their function (Orange for primary, Blue for info).
- **Pulse:** Critical alerts or real-time indicators pulse gently.
- **Transitions:** Smooth `0.3s ease` for all interactive states.
- **Loading:** Spinning loader with Blue accent.
