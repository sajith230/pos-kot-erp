

## Feature: Manual Kitchen Selection for KOT in Restaurant POS & Waiter Mobile

### Current Behavior
- **Restaurant POS**: Auto-routes items to kitchens based on `kitchen_product_assignments`. Blocks if items are unassigned.
- **Waiter Mobile**: No kitchen routing at all — sends a single KOT with no `kitchen_id`.

### Proposed Behavior
When clicking "Send to Kitchen" (KOT), a **kitchen selection dialog** appears letting the user:
1. See pending items grouped by their auto-assigned kitchen (if any)
2. Override or assign a kitchen for unassigned items via a dropdown per item
3. Confirm and send — KOTs are split per kitchen as before

If only one kitchen exists, it auto-selects. If no kitchens are configured, it falls back to legacy (no kitchen) behavior without showing the dialog.

### Changes

**1. New component: `src/components/pos/KitchenSelectDialog.tsx`**
- Dialog that shows pending items with kitchen assignment dropdowns
- Each item shows its auto-assigned kitchen (from `kitchen_product_assignments`) as default
- User can override any assignment via a `<Select>` per item
- "Send" button groups items by selected kitchen and returns the mapping
- Props: `open`, `onClose`, `pendingItems`, `kitchens`, `productToKitchen` (auto-map), `onConfirm(kitchenGroups)`

**2. Update `src/pages/pos/RestaurantPOS.tsx`**
- Fetch kitchens and assignments when KOT is clicked
- Instead of auto-sending, open `KitchenSelectDialog` with the auto-mapped defaults
- On confirm, create KOT tickets per kitchen as before
- Remove the unassigned alert dialog (replaced by the selection UI)

**3. Update `src/pages/pos/WaiterMobile.tsx`**
- Add kitchen fetching and the same `KitchenSelectDialog` integration
- On confirm, create KOT tickets per kitchen (currently missing entirely)

### UI Layout (Kitchen Select Dialog)
```text
┌─────────────────────────────────────┐
│  Select Kitchen for Items           │
├─────────────────────────────────────┤
│  Burger (x2)        [▼ Hot Kitchen] │
│  Mojito (x1)        [▼ Bar       ] │
│  Fries (x1)         [▼ Select... ] │
├─────────────────────────────────────┤
│              [Cancel]  [Send KOT]   │
└─────────────────────────────────────┘
```

Items with no auto-assignment show "Select kitchen..." and must be assigned before sending.

