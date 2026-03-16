import { useEffect, useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, CameraOff, Keyboard, SwitchCamera } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (code: string) => void;
  continuous?: boolean;
}

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1800;
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch {}
}

export default function BarcodeScanner({ open, onOpenChange, onScan, continuous = false }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [activeCameraIdx, setActiveCameraIdx] = useState(0);
  const containerRef = useRef<string>('barcode-reader-' + Math.random().toString(36).slice(2));

  const stopScanner = useCallback(async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch {}
  }, []);

  const startScanner = useCallback(async (cameraId?: string) => {
    await stopScanner();
    setError(null);

    try {
      // On mobile, getCameras() may fail without prior permission.
      // Try enumerating first; if it fails, use facingMode fallback.
      let devices: { id: string; label: string }[] = [];
      try {
        devices = await Html5Qrcode.getCameras();
      } catch {
        // Permission not yet granted — we'll use facingMode instead
      }
      setCameras(devices);

      const scanner = new Html5Qrcode(containerRef.current);
      scannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.5,
      };

      const onSuccess = (decodedText: string) => {
        const now = Date.now();
        if (now - lastScanRef.current < 2000) return;
        lastScanRef.current = now;

        playBeep();
        try { navigator.vibrate?.(100); } catch {}

        onScan(decodedText);
        if (!continuous) {
          onOpenChange(false);
        }
      };

      if (cameraId) {
        // Explicit camera selected (e.g. switch camera)
        const idx = devices.findIndex(d => d.id === cameraId);
        if (idx >= 0) setActiveCameraIdx(idx);
        await scanner.start(cameraId, config, onSuccess, () => {});
      } else if (devices.length > 0) {
        const selectedCamera = devices.find(d => d.label.toLowerCase().includes('back'))?.id || devices[0].id;
        const idx = devices.findIndex(d => d.id === selectedCamera);
        if (idx >= 0) setActiveCameraIdx(idx);
        await scanner.start(selectedCamera, config, onSuccess, () => {});
      } else {
        // No devices enumerated — use facingMode (works on mobile without prior permission)
        await scanner.start(
          { facingMode: 'environment' },
          config,
          onSuccess,
          () => {}
        );
        // After starting, try to enumerate cameras for the switch button
        try {
          const devs = await Html5Qrcode.getCameras();
          setCameras(devs);
        } catch {}
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        setError('Camera permission denied. Please allow camera access in your browser settings and try again.');
      } else if (msg.includes('NotFound') || msg.includes('Requested device not found')) {
        setError('No camera found on this device.');
      } else {
        setError(msg || 'Failed to start camera.');
      }
    }
  }, [stopScanner, onScan, continuous, onOpenChange]);

  useEffect(() => {
    if (open) {
      // Longer delay on mobile to ensure DOM is fully mounted
      const timer = setTimeout(() => startScanner(), 500);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }
  }, [open, startScanner, stopScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopScanner(); };
  }, [stopScanner]);

  function switchCamera() {
    if (cameras.length <= 1) return;
    const nextIdx = (activeCameraIdx + 1) % cameras.length;
    setActiveCameraIdx(nextIdx);
    startScanner(cameras[nextIdx].id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan Barcode
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {error ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CameraOff className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={() => startScanner()}>
                Retry
              </Button>
            </div>
          ) : (
            <>
              <div
                id={containerRef.current}
                className="w-full rounded-lg overflow-hidden bg-black min-h-[200px]"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Point camera at a barcode
                </p>
                {cameras.length > 1 && (
                  <Button variant="outline" size="sm" onClick={switchCamera}>
                    <SwitchCamera className="h-4 w-4 mr-1" />
                    Switch
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
