

## Bug Fix: KitchenSelectDialog re-initialization issue

### Problem Found
In `src/components/pos/KitchenSelectDialog.tsx` (lines 49-60), there's a misuse of `useState` as a side-effect. The code calls `useState(() => { ... setSelections(...) })` which runs `setSelections` during render — this is incorrect React and can cause infinite re-renders or stale state. The intent was to re-initialize selections when the dialog opens with new items, but `useState` is not the right tool for that.

Additionally, the initial `useState` (lines 35-46) captures `pendingItems` and `kitchens` only on first mount. When the dialog reopens with different items, selections won't update.

### Fix
Replace the second `useState` block (lines 49-60) with a `useEffect` that re-initializes selections when `pendingItems` or `kitchens` change. Add `useEffect` to the import.

### Changes

**`src/components/pos/KitchenSelectDialog.tsx`**
- Add `useEffect` to the import from React
- Replace the broken `useState` block (lines 49-60) with a `useEffect` keyed on `pendingItems` and `kitchens`:
  ```ts
  useEffect(() => {
    const map: Record<string, string> = {};
    pendingItems.forEach(item => {
      const autoKitchen = productToKitchen.get(item.product_id);
      if (autoKitchen) {
        map[item.id] = autoKitchen;
      } else if (kitchens.length === 1) {
        map[item.id] = kitchens[0].id;
      }
    });
    setSelections(map);
  }, [pendingItems, kitchens]);
  ```

No other files need changes. The WaiterMobile and RestaurantPOS integration code is correct.

