

## Admin Access to All Kitchens on Kitchen Display

### Problem
Currently, the Kitchen Display filters kitchens based on `kitchen_user_assignments`. If an admin is not explicitly assigned to kitchens, they happen to see all (line 160-161), but if they ARE assigned to some kitchens, they only see those. Admins should always see all kitchens regardless of assignments.

### Changes

**`src/pages/pos/KitchenDisplay.tsx`**

1. Destructure `isAdmin` from `useAuth()` (line 119)
2. Line 406 — kitchen selector options: if admin, always use `allKitchens`; otherwise use assigned kitchens (falling back to all if none assigned)
3. Lines 348-353 — `getFilteredTickets`: if admin and `selectedKitchenId === 'all'`, skip the assigned-kitchen filter entirely so all tickets are visible

This is a 3-line logic change. No database or component changes needed.

