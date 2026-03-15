

# Fix: Products not showing in Stock Overview

## Problem
When a product is created on the Products page, only a `products` table record is created. The Stock Overview page queries the `inventory` table, which has no corresponding row for new products. Products only appear in Stock Overview after a manual stock adjustment creates the inventory record.

## Solution
When a product is created (and `track_inventory` is enabled), automatically insert a corresponding `inventory` record with quantity 0 for the current branch. Also, when viewing Stock Overview, show all products that have `track_inventory = true` — even those without an inventory row yet — by doing a left-join style query or by ensuring inventory rows always exist.

### Changes

**1. `src/pages/inventory/Products.tsx`** — After successfully inserting a new product, if `track_inventory` is true, also insert an `inventory` row with `quantity: 0` for the current branch. This ensures every new trackable product immediately appears in Stock Overview.

**2. `src/pages/inventory/StockOverview.tsx`** — Add a fallback: after fetching inventory, also fetch all products with `track_inventory = true` that do NOT have an inventory record for the current branch, and display them with quantity 0 (with an option to initialize stock). This handles any existing products that were created before this fix.

### Technical Detail
- Products insert handler (around line ~180-220 in Products.tsx) will add a secondary insert to `inventory` table after the product is created
- StockOverview `fetchInventory` will be augmented to also query products missing from inventory and merge them in with `quantity: 0`
- No database migration needed — uses existing tables and RLS policies

