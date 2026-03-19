

# Customer Auto-Complete in WhatsApp Share Dialogs

## Overview
When typing a phone number or name in the WhatsApp sharing dialog (both Retail and Restaurant POS), search the `customers` table in real-time and show matching suggestions. Selecting a match auto-fills the fields. If no match, the user can still add a new customer via the existing "Save as new customer" checkbox.

## Changes

### 1. `src/pages/pos/RetailPOS.tsx` — WhatsApp dialog with customer search

- Add state: `customerSuggestions` (array), `isSearching` (boolean)
- Add a `useEffect` (or debounced callback) that fires when `whatsAppPhone` or `whatsAppName` changes (min 3 chars), querying `customers` table filtered by `business_id` with `.ilike('phone', '%search%')` or `.ilike('name', '%search%')`, limited to 5 results
- Below the phone input, render a dropdown/list of matching customers (name + phone). Clicking one fills both `whatsAppPhone` and `whatsAppName`, sets `saveAsCustomer = false`, and clears suggestions
- Keep the existing "Customer Name" input and "Save as new customer" checkbox — these appear when no existing customer is selected
- Add a small "clear selection" link if a customer was auto-filled, allowing the user to switch back to manual entry

### 2. `src/pages/pos/RestaurantPOS.tsx` — Same pattern

- Mirror the same customer search logic and suggestion UI in the Restaurant POS WhatsApp dialog
- Identical behavior: type phone or name → see matches → select or add new

### UI Behavior
- Suggestions appear as a compact list below the phone input field (like an autocomplete dropdown)
- Each suggestion row shows: customer name and phone number
- Selecting a suggestion fills both fields and hides the "Save as new customer" option (since the customer already exists)
- If the user clears or changes the auto-filled value, suggestions reappear and the save option returns

### No database changes needed
Uses existing `customers` table with existing RLS policies.

