import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrImage({ text, alt }: { text: string; alt: string }) {
  const [rendered, setRendered] = useState<{ text: string; url: string } | null>(null);
  useEffect(() => {
    let live = true;
    QRCode.toDataURL(text, { errorCorrectionLevel: "M", margin: 2, scale: 8, color: { dark: "#14185C", light: "#FFFFFF" } })
      .then((url: string) => { if (live) setRendered({ text, url }); })
      .catch(() => { if (live) setRendered(null); });
    return () => { live = false; };
  }, [text]);
  return <div className="kg-qr">
    {rendered?.text === text ? <img src={rendered.url} alt={alt} /> : <p className="kg-small">Drawing the QR…</p>}
  </div>;
}
