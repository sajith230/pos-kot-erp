

# Add Barcode Format Validation

## Changes

**`src/components/barcode/BarcodeScanner.tsx`** (lines 184-213)

Add validation before submission with an inline error message:

- Create a `validateBarcode(code)` helper that checks against common barcode formats:
  - **UPC-A**: 12 digits
  - **UPC-E**: 8 digits  
  - **EAN-13**: 13 digits
  - **EAN-8**: 8 digits
  - **Code-128/Code-39**: 1-48 alphanumeric characters (letters, digits, hyphens, dots, spaces)
  - **Custom SKU**: Allow alphanumeric + hyphens/dots, 3-50 chars
- Combined regex: `/^[A-Za-z0-9\-\.\s]{3,50}$/` — rejects empty, too short (<3), too long (>50), or strings with special characters like `<>&"'`
- Add `validationError` state; show red error text below the input when invalid
- Validate on submit; also clear the error on input change
- Button stays disabled when input is empty or fails validation

This is lightweight client-side validation that prevents garbage input while remaining flexible enough for real-world barcode/SKU formats.

