

# Share Invoice via WhatsApp

## Overview
Add a "Share on WhatsApp" button to the receipt dialog after a sale is completed. If the customer has a WhatsApp number, share directly. If no customer is linked or the customer has no phone number, prompt for a WhatsApp number and optionally create a new customer record.

## How It Works

1. **Receipt Dialog** — Add a WhatsApp share button (green, with WhatsApp icon) next to the existing Print button
2. **WhatsApp Number Flow**:
   - If a customer is already linked and has a phone number, pre-fill that number
   - If no customer or no phone, show a small dialog to enter the WhatsApp number + customer name
   - Option to save as new customer if not in the database
3. **Invoice Text** — Generate a plain-text invoice summary (business name, items, totals, transaction number) and open `https://wa.me/{phone}?text={encodedInvoice}` in a new tab
4. **Auto-create Customer** — If the user enters a new number/name and checks "Save as customer", insert into the `customers` table and link to the transaction

## Changes

### `src/pages/pos/RetailPOS.tsx`
- Add state: `isWhatsAppOpen`, `whatsAppPhone`, `whatsAppName`, `saveAsCustomer`
- Add `handleShareWhatsApp()` function:
  - Builds a formatted text invoice from `receiptData`
  - Cleans phone number to digits (strips spaces, dashes, leading zeros, adds country code if needed)
  - Opens `https://wa.me/{cleanPhone}?text={encodeURIComponent(invoiceText)}`
- Add `handleWhatsAppSend()`:
  - If `saveAsCustomer` is checked and customer doesn't exist, insert into `customers` table with `business_id`, name, phone
  - Then call `handleShareWhatsApp()`
- In the Receipt Dialog footer (line ~973-983), add a green WhatsApp button between Print and Done
- Add a small WhatsApp dialog with phone input, name input (if no customer), and a "Save as customer" checkbox

### No database changes needed
The existing `customers` table already has `name`, `phone`, and `business_id` columns — sufficient for creating new customers inline.

### No edge functions needed
WhatsApp Web sharing uses a simple URL scheme (`wa.me`) that opens directly in the browser — no API keys or backend calls required.

## Invoice Text Format
```
*{Business Name}*
{Address}
Tel: {Phone}

Invoice #{TXN-Number}
Date: {date}

{Item1} x{qty} — {price}
{Item2} x{qty} — {price}

Subtotal: {subtotal}
Tax: {tax}
Discount: -{discount}
*Total: {total}*

Payment: {method}
Thank you for your purchase!
```

