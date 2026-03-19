

# Add WhatsApp Invoice Sharing to Restaurant POS

## Overview
Port the same WhatsApp invoice sharing pattern from Retail POS into the Restaurant POS. Since the Restaurant POS uses `SplitPaymentDialog` (which closes after payment), we need to add a post-payment receipt dialog with WhatsApp sharing capability.

## Changes

### `src/pages/pos/RestaurantPOS.tsx`

1. **Add state variables** for receipt and WhatsApp sharing:
   - `receiptData` (transaction number, order items, totals, payment method, delivery customer info)
   - `isReceiptOpen`, `isWhatsAppOpen`, `whatsAppPhone`, `whatsAppName`, `saveAsCustomer`

2. **Update `handlePayment`** — after successful payment, instead of just resetting state, populate `receiptData` and open the receipt dialog. Delay the table/order reset until the user closes the receipt.

3. **Add helper functions** (mirrored from RetailPOS):
   - `buildWhatsAppInvoiceText()` — formats order items, totals, table/order info as plain text
   - `handleWhatsAppClick()` — pre-fills phone from delivery customer if available, opens WhatsApp dialog
   - `handleWhatsAppSend()` — optionally saves new customer, cleans phone number, opens `wa.me` URL
   - `handleReceiptDone()` — resets all state (order, table, receipt)

4. **Add Receipt Dialog** — after the SplitPaymentDialog, add a `Dialog` showing:
   - Transaction summary (items, totals)
   - Footer with WhatsApp button (green, `MessageCircle` icon) and Done button

5. **Add WhatsApp Dialog** — phone input, name input, "Save as customer" checkbox, Send button (same pattern as RetailPOS)

6. **Update imports** — add `MessageCircle`, `Save`, `Checkbox`, `Label` imports

### No database changes needed
Uses existing `customers` table for auto-creation.

