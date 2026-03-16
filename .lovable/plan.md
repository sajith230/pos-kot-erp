

# Make the Full System Mobile and Tablet Responsive

## Overview
The app has several responsive issues across pages. The main problems are fixed-width layouts that break on small screens, tables that overflow, and the POS layout requiring side-by-side panels that don't fit on mobile. Here's the plan to fix all pages systematically.

## Changes

### 1. `src/components/layout/DashboardLayout.tsx` — Mobile header
- Hide the search bar on small screens (`hidden sm:block`) or make it collapsible
- Reduce header padding on mobile

### 2. `src/pages/pos/RetailPOS.tsx` — Major rework (biggest change)
- The products panel and cart panel (`w-80 lg:w-96`) are side-by-side via `flex`. On mobile, switch to a tabbed layout: "Products" tab and "Cart" tab with a floating cart badge showing item count
- Shift header bar: stack vertically on mobile (`flex-wrap`)
- Product grid: `grid-cols-2` on mobile (already done), keep as-is
- Cart section: full-width on mobile when active tab

### 3. `src/pages/pos/RestaurantPOS.tsx` — Similar POS responsive fixes
- Stack floor plan and order panel vertically on mobile
- Use responsive grid for table floor plan

### 4. `src/pages/Dashboard.tsx` — Minor tweaks
- Page title: `text-2xl md:text-3xl`
- Stats grid already responsive (`md:grid-cols-2 lg:grid-cols-4`)
- Charts row: change `md:grid-cols-3` to stack on mobile (already handled)
- Skeleton loading: same responsive treatment

### 5. `src/pages/inventory/Products.tsx` — Table overflow
- Wrap the table in a horizontal scroll container (`overflow-x-auto`)
- Page header: stack title and buttons vertically on mobile (`flex-col sm:flex-row`)
- Filter row: stack on mobile

### 6. `src/pages/inventory/StockOverview.tsx` — Table overflow
- Same horizontal scroll wrapper for tables
- Stack header controls on mobile

### 7. `src/pages/customers/Customers.tsx` — Table overflow
- Horizontal scroll wrapper for the customer table
- Hide less-important columns (email, loyalty) on mobile using `hidden md:table-cell`
- KPI cards: already using responsive grid

### 8. `src/pages/reports/Reports.tsx` — Charts and tables
- Wrap tables in overflow-x-auto
- Ensure charts use `ResponsiveContainer` (already done)
- Stack filter controls on mobile

### 9. `src/pages/settings/GeneralSettings.tsx` — Form layout
- Ensure form fields stack on mobile (mostly already single-column)

### 10. `src/index.css` or `src/App.css` — Remove conflicting styles
- Remove `max-width: 1280px` and `padding: 2rem` from `#root` in App.css — these constrain the layout

## Technical Approach
- Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) throughout
- For RetailPOS, add a `mobileView` state (`'products' | 'cart'`) controlled by `useIsMobile()` hook, switching between tabs on small screens
- For tables, use `overflow-x-auto` wrappers and selectively hide columns with `hidden md:table-cell`
- No database changes needed

## Key Files Modified
1. `src/App.css` — Remove constraining root styles
2. `src/components/layout/DashboardLayout.tsx` — Mobile header
3. `src/pages/pos/RetailPOS.tsx` — Tabbed mobile layout for POS
4. `src/pages/pos/RestaurantPOS.tsx` — Stack layout on mobile
5. `src/pages/Dashboard.tsx` — Minor text sizing
6. `src/pages/inventory/Products.tsx` — Responsive header + table scroll
7. `src/pages/inventory/StockOverview.tsx` — Responsive header + table scroll
8. `src/pages/customers/Customers.tsx` — Hidden columns + table scroll
9. `src/pages/reports/Reports.tsx` — Table scroll + filter stacking
10. `src/pages/settings/GeneralSettings.tsx` — Minor form adjustments

