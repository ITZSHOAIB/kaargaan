import { useEffect, useEffectEvent, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { qrScanRegion } from "../lib/qrScanRegion";

QrScanner.WORKER_PATH = new URL("qr-scanner/qr-scanner-worker.min.js", import.meta.url).toString();

/** Camera scanner. `onResult` returns true once it has what it needs, which stops the camera. */
export function QrScan({ label, onResult, onClose }: { label: string; onResult: (text: string) => boolean; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState("");
  const handle = useEffectEvent((text: string) => onResult(text));

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let done = false;
    const scanner = new QrScanner(video, (result) => {
      if (!done && handle(result.data)) { done = true; scanner.stop(); }
    }, { highlightScanRegion: true, calculateScanRegion: qrScanRegion, preferredCamera: "environment" });
    scanner.start().catch((caught: unknown) => setError(caught instanceof Error && caught.message ? `The camera didn't start: ${caught.message}` : "The camera didn't start. Paste the link instead."));
    return () => { done = true; scanner.destroy(); };
  }, []);

  return <div className="kg-scan">
    <video ref={videoRef} muted playsInline aria-label={label} />
    {error ? <p role="alert" className="kg-notice kg-notice--warn">{error}</p> : <p className="kg-small">Fill the square with the QR. Move closer if it doesn't pick it up.</p>}
    <button type="button" className="kg-btn kg-btn--wide" onClick={onClose}>Stop scanning</button>
  </div>;
}
