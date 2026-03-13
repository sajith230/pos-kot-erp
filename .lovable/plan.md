

## Plan: Add Stock Adjustment History Per Product

### What we're building
A "History" button on each inventory row that opens a dialog showing all past stock movements for that specific product, with date, type, quantity change, reason, and notes.

### Changes

**File: `src/pages/inventory/StockOverview.tsx`**

1. Add new state: `historyDialogOpen`, `historyProductId`, `historyProductName`, `productMovements`, `historyLoading`
2. Add `fetchProductHistory(productId, productName)` function that queries `stock_movements` filtered by `product_id` and `branch_id`, ordered by `created_at desc`
3. Add a **History** button (with `History` icon) next to the existing **Adjust** button in each inventory table row
4. Add a new `Dialog` that displays a table of movements for the selected product:
   - Columns: Date, Type (badge), Qty Change (color-coded +/-), Reason, Notes
   - Empty state when no movements exist
   - Dialog title shows the product name

### UI layout
Each inventory row's Actions cell will have two buttons: `History` and `Adjust`. The history dialog will be a read-only table inside a scrollable dialog, similar in style to the existing "Recent Movements" tab but scoped to one product.

