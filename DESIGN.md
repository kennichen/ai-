# Design

<!-- impeccable:design-schema 2 -->

## Visual World

Apple Light Glassmorphism — 浅色毛玻璃风格, 灵感源自 macOS 和 iOS 的半透明界面。背景使用 Apple 官网同款浅灰 `#f5f5f7`，所有卡片和面板采用半透明白色玻璃质感。

## Core Tokens

### Background

- Page: `#f5f5f7`
- Glass card: `rgba(255,255,255,0.7)`, `backdrop-filter: blur(24px)`
- Glass card thin: `rgba(255,255,255,0.65)`, `backdrop-filter: blur(16px)`
- Glass sidebar: `rgba(255,255,255,0.5)`, `backdrop-filter: blur(20px)`
- Glass modal: `rgba(255,255,255,0.85)`, `backdrop-filter: blur(30px)`
- Glass filter: `rgba(255,255,255,0.6)`, `backdrop-filter: blur(12px)`
- Glass input: `rgba(255,255,255,0.5)`, `backdrop-filter: blur(8px)`

### Borders

- Glass edge: `0.5px solid rgba(0,0,0,0.06)`
- Glass edge hover: `0.5px solid rgba(0,0,0,0.12)`
- Divider: `0.5px solid rgba(0,0,0,0.06)`

### Shadows

- Card: `0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)`
- Card hover: `0 4px 12px rgba(0,0,0,0.06)`
- Modal: `0 8px 32px rgba(0,0,0,0.12)`

### Typography

- Family: `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'PingFang SC', sans-serif`
- Scale: 11px (badge) / 12px (nav/table) / 13px (body) / 14px (card title) / 22px (stat value) / 15px (modal title)
- Weights: 400 (regular), 500 (medium)
- Body color: `rgba(0,0,0,0.8)`
- Secondary text: `rgba(0,0,0,0.5)`
- Tertiary text: `rgba(0,0,0,0.35)`

### Colors

- Primary (revenue): `#1d4ed8` — blue
- Danger (expense): `#dc2626` — red
- Success (profit): `#059669` — green
- Warning (margin): `#d97706` — amber
- Info: `#6366f1` — indigo

### Radius

- Glass card: 16px
- Glass card thin: 14px
- Button: 10px
- Input: 10px
- Badge: 12px

### Spacing

- Page padding: 20px 24px
- Card padding: 16px 20px
- Card gap: 12px
- Section gap: 16px

## Component Definitions

### Glass Card
Background rgba(255,255,255,0.7), backdrop-filter blur(24px), border 0.5px rgba(0,0,0,0.06), border-radius 16px, padding 16px 20px.

### Glass Sidebar
Background rgba(255,255,255,0.5), backdrop-filter blur(20px), border-right 0.5px rgba(0,0,0,0.05), width 220px.

### Glass Table
Cards with semi-transparent rows, hover state slightly more opaque.

### Glass Modal
Background rgba(255,255,255,0.85), backdrop-filter blur(30px), border-radius 16px, max-width 520px.

### Badge
border-radius 12px, padding 2px 10px, font-size 11px, font-weight 500.

### Button
border-radius 10px, padding 8px 16px, font-size 13px, font-weight 500. Primary has solid bg. Outline has border 0.5px.

## States

- Hover: card opacity increases slightly, shadow deepens
- Active nav item: `background: rgba(0,0,0,0.06)`, slightly darker
- Focus: `box-shadow: 0 0 0 3px rgba(99,102,241,0.15)`
- Empty state: centered, muted text
- Income row: subtle blue left indicator
- Expense row: subtle red left indicator
