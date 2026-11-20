import { useEffect, useState, type CSSProperties } from "react";
import { Lock, Pencil, QrCode, Send } from "lucide-react";
import { cardLink } from "../../lib/card";
import type { CardDraft } from "../../lib/cardDraft";
import { buzz, cue } from "../../lib/sfx";
import { QrImage } from "../../ui/QrImage";

export function SealedCard({ draft, sealed, fresh = false, onEdit }: { draft: CardDraft; sealed: string; fresh?: boolean; onEdit: () => void }) {
  const { invite, name } = draft;
  const link = cardLink(window.location.origin, sealed);
  const [status, setStatus] = useState("");
  const [manual, setManual] = useState(false);
  const [showQr, setShowQr] = useState(false);
  useEffect(() => {
    if (!fresh) return;
    cue("seal");
    buzz([30, 50, 80]);
  }, [fresh]);

  async function send() {
    if (typeof navigator.share === "function") {
      try {
        // The text names the sender only. Songs stay inside the sealed link.
        await navigator.share({ title: "My KaarGaan song card", text: `${name}'s sealed song card for ${invite.host}'s game`, url: link });
        setStatus(`Sent? You're all set. Now practise your poker face.`);
        return;
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setStatus(`Card link copied. Paste it in your chat with ${invite.host}, not the group chat.`);
    } catch {
      setManual(true);
      setStatus(`Copy the link below and send it to ${invite.host}.`);
    }
  }

  return <>
    <div>
      <p className="kg-eyebrow">{invite.theme}</p>
      <h1 className="kg-title">Your song card is <em>ready!</em></h1>
    </div>
    <section className={`kg-sealed${fresh ? " kg-sealed--fresh" : ""}`} aria-label={`${name}'s sealed card`}>
      <span className="kg-wax" aria-hidden="true" data-fresh={fresh || undefined}>K</span>
      <div className="kg-sealed-head">
        <span className="kg-avatar" style={{ background: "var(--kg-p2)" }} aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
        <div><p className="kg-sealed-name">{name}</p><p>{invite.host}'s game</p></div>
      </div>
      <ol>
        {draft.links.map((_, i) => <li key={i} style={{ "--kg-i": i } as CSSProperties}><span>Song {i + 1}</span><span className="kg-dots" aria-hidden="true" /><Lock size={18} aria-hidden="true" /><span className="sr-only">hidden</span></li>)}
      </ol>
      <span className="kg-seal-badge"><Lock size={14} aria-hidden="true" />Sealed</span>
    </section>
    <p className="kg-lede">Sealed: nobody sees what's inside, not even {invite.host}. Send it to {invite.host} directly, not in the group chat.</p>
    <button type="button" className="kg-btn kg-btn--pink kg-btn--big kg-btn--wide" onClick={() => void send()}><Send size={22} aria-hidden="true" />Send to {invite.host}</button>
    <p role="status" className="kg-small">{status}</p>
    {manual ? <label className="kg-field"><span className="kg-label">Your card link</span><textarea className="kg-textarea" readOnly value={link} onFocus={(e) => e.currentTarget.select()} /></label> : null}
    {showQr
      ? <QrImage text={link} alt="QR code of your sealed card" />
      : <button type="button" className="kg-btn kg-btn--wide" onClick={() => setShowQr(true)}><QrCode size={20} aria-hidden="true" />Host is right here? Show a QR</button>}
    <button type="button" className="kg-btn kg-btn--quiet" onClick={onEdit}><Pencil size={16} aria-hidden="true" />Edit my songs</button>
  </>;
}
