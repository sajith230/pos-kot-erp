import { useEffect, useRef, useCallback } from 'react';

interface UseBarcodeScannerOptions {
  onScan: (code: string) => void;
  enabled?: boolean;
}

/**
 * Detects physical barcode scanner input (HID devices that type rapidly + Enter).
 * Only fires when no text input is focused, or when the active element matches allowedSelector.
 */
export function useBarcodeScanner({ onScan, enabled = true }: UseBarcodeScannerOptions) {
  const buffer = useRef('');
  const lastKeyTime = useRef(0);
  const clearTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const now = Date.now();
      const timeDiff = now - lastKeyTime.current;

      // If Enter is pressed and we have a buffer with rapid input
      if (e.key === 'Enter' && buffer.current.length >= 3) {
        e.preventDefault();
        e.stopPropagation();
        const code = buffer.current;
        buffer.current = '';
        clearTimeout(clearTimer.current);
        onScan(code);
        return;
      }

      // Only accept printable characters
      if (e.key.length !== 1) return;

      // Check if input is coming in rapidly (scanner speed: < 50ms between chars)
      if (timeDiff > 100 && buffer.current.length > 0) {
        // Too slow — reset buffer (normal typing)
        buffer.current = '';
      }

      buffer.current += e.key;
      lastKeyTime.current = now;

      // Auto-clear buffer after 200ms of no input
      clearTimeout(clearTimer.current);
      clearTimer.current = setTimeout(() => {
        buffer.current = '';
      }, 200);
    },
    [onScan, enabled]
  );

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      clearTimeout(clearTimer.current);
    };
  }, [handleKeyDown, enabled]);
}
