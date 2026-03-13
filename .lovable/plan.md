

## Plan: Multiple Kitchens with Displays, User Assignments, and Unassigned Product Alerts

This is an update to the previously approved plan, with point 6 changed per your feedback.

### Database Changes (3 new tables, 1 column addition)

**1. `kitchens` table**
- `id` (uuid PK), `branch_id`, `business_id`, `name`, `description`, `is_active`, `created_at`, `updated_at`
- RLS: same business can view; admins can manage

**2. `kitchen_product_assignments` table**
- `id` (uuid PK), `kitchen_id` (FK → kitchens), `product_id` (FK → products)
- Unique constraint on (kitchen_id, product_id)
- RLS: same business can view; admins can manage

**3. `kitchen_user_assignments` table**
- `id` (uuid PK), `kitchen_id` (FK → kitchens), `user_id` (uuid)
- Unique constraint on (kitchen_id, user_id)
- RLS: same business can view; admins can manage

**4. `kot_tickets` — add nullable `kitchen_id` column** (FK → kitchens)

### Code Changes

**New: `src/pages/settings/KitchenManagement.tsx`**
- Admin page: CRUD kitchens, assign products and users per kitchen
- Multi-select UI for products and staff
- Added to sidebar under Settings and to App.tsx routes

**Modified: `src/pages/pos/RestaurantPOS.tsx`**
- When sending KOT, check if any items in the order have **no kitchen assignment**
- If unassigned products exist: show an **alert dialog** listing the unassigned products and blocking KOT submission, prompting the admin to assign them to a kitchen first (with a link/button to Kitchen Management)
- If all products are assigned: split items by kitchen and create separate KOT tickets per kitchen with the correct `kitchen_id`

**Modified: `src/pages/pos/KitchenDisplay.tsx`**
- On load, fetch current user's assigned kitchens
- Add kitchen selector dropdown (auto-select if only one)
- Filter KOT tickets by `kitchen_id`
- Show kitchen name in header

**Modified: `src/App.tsx`** — add `/settings/kitchens` route

**Modified: `src/components/layout/AppSidebar.tsx`** — add "Kitchens" nav item under Settings

### Key Behavior Change (Point 6)

Products with **no kitchen assignment** will NOT appear on any kitchen display or be silently sent. Instead, when a waiter tries to send a KOT containing unassigned products, an **alert dialog** will appear listing those products and asking the user to assign them to a kitchen before proceeding. This prevents orders from being lost or misrouted.

