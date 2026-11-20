import { useState } from "react";
import { ScanLine } from "lucide-react";
import { inviteFromText, type Invite } from "../../lib/card";
import { QrScan } from "../../ui/QrScan";

export function InviteGate({ onInvite }: { onInvite: (invite: Invite) => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);

  function accept(value: string) {
    const read = inviteFromText(value);
    if (!read.ok) { setError(read.error); return false; }
    onInvite(read.invite);
    return true;
  }

  return <>
    <h1 className="kg-title">Ask your host for the invite link</h1>
    <p className="kg-lede">The host sends it in your chat. Tap it there and this page fills itself in.</p>
    {error ? <p role="alert" className="kg-notice kg-notice--warn">{error}</p> : null}
    <section className="kg-panel" aria-label="Use an invite">
      <label className="kg-field">
        <span className="kg-label">Paste the invite link</span>
        <textarea className="kg-textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="https://kaargaan.sohab.dev/card#i=…" />
      </label>
      <button type="button" className="kg-btn kg-btn--yellow kg-btn--wide" onClick={() => accept(text)}>Use this invite</button>
      {scanning
        ? <QrScan label="Camera view for the host's invite QR" onResult={accept} onClose={() => setScanning(false)} />
        : <button type="button" className="kg-btn kg-btn--navy kg-btn--wide" onClick={() => { setError(""); setScanning(true); }}><ScanLine size={20} aria-hidden="true" />Scan the host's QR</button>}
    </section>
  </>;
}
