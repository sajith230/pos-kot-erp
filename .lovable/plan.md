

# Barcode Scanner Integration

## Overview
Add camera-based barcode scanning (for phone users) and physical scanner support across all POS and Inventory pages. Uses `html5-qrcode` library for camera access.

## New Files

### 1. `src/components/barcode/BarcodeScanner.tsx`
Reusable camera scanner dialog component:
- Uses `html5-qrcode` for camera-based scanning (Code-128, EAN-13, EAN-8, UPC-A, UPC-E, Code-39, QR)
- Opens as a Dialog with live camera feed
- Auto-selects rear camera on mobile, allows switching
- Audio beep via Web Audio API + haptic vibration on scan
- Continuous scan mode with 2-second cooldown to prevent double-scans
- Graceful camera permission handling with fallback message
- Props: `open`, `onOpenChange`, `onScan(code: string)`, `continuous?: boolean`

### 2. `src/hooks/useBarcodeScanner.ts`
Global physical scanner detection hook:
- Listens for rapid keystrokes (< 50ms between characters) on `window`
- Buffers input, auto-submits on Enter key
- Clears buffer after 200ms of no input
- Calls `onScan(code)` callback when barcode detected
- Prevents interference with focused text inputs (only fires when no input is focused, or when the search input is focused)

## Modified Files

### 3. `src/pages/pos/RetailPOS.tsx`
- Add camera scan button (📷 icon) next to the search input (line ~604-614)
- Import and use `BarcodeScanner` component
- Import and use `useBarcodeScanner` hook for global physical scanner detection
- On scan: lookup product by `barcode` or `sku`, if found call `addItem()` + toast, if not found show "not found" toast with scanned code
- Replace existing `handleSearchKeyDown` with the hook-based approach

### 4. `src/pages/pos/RestaurantPOS.tsx`
- Add camera scan button next to search input (line ~578-581)
- Import and use `BarcodeScanner` + `useBarcodeScanner`
- On scan: lookup product by barcode/sku, call `addItemToOrder(product)` if found
- Only active when menu view is showing (order is active)

### 5. `src/pages/inventory/StockOverview.tsx`
- Add camera scan button next to search input (line ~219)
- Import `BarcodeScanner` component
- On scan: find matching inventory item by product barcode/sku, auto-open the adjust stock dialog for that product
- Also filter/highlight the scanned product in the list

### 6. `src/pages/inventory/Products.tsx`
- Add camera scan button next to search input (line ~424)
- On scan in search: find and open edit dialog for the scanned product
- Add "Scan Barcode" button next to the barcode input field in the product create/edit dialog to populate the barcode value via camera

## New Dependency
- `html5-qrcode` — lightweight camera barcode scanner, MIT license, ~180KB

## No Database Changes Required
The `products` table already has a `barcode` column.

## Production Considerations
- Camera requires HTTPS (preview and published URLs are HTTPS)
- Permission denied → clear message, no crash
- Debounced DB lookups to prevent rapid-fire queries
- Audio feedback via Web Audio API (no external files)
- Haptic feedback via `navigator.vibrate()` on supported devices
- Physical scanner detection ignores normal typing speed

