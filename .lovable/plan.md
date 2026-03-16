

# Add Manual Barcode Entry Fallback

## What
Add a text input field at the bottom of the BarcodeScanner dialog so users can manually type/paste a barcode when the camera is unavailable or not working.

## Changes

**`src/components/barcode/BarcodeScanner.tsx`**
- Add an `Input` field + submit button below the camera view (and also below the error state)
- Local state `manualCode` for the input value
- On submit (button click or Enter key): call `onScan(manualCode)`, clear input, close dialog if not continuous
- Always visible regardless of camera state — serves as fallback and convenience for known codes
- Uses a `Keyboard` icon and placeholder "Enter barcode manually"

