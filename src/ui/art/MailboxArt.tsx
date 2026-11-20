/** Lobby illustration: a mailbox with its flag up, waiting for sealed cards. Decoration only. */
export function MailboxArt() {
  return <svg className="kg-mailbox" aria-hidden="true" viewBox="0 0 80 80" focusable="false">
    <rect x="37" y="46" width="8" height="32" className="ha-navy" />
    <path d="M10 30a16 16 0 0 1 32 0v22H10z" className="ha-white ha-stroke" />
    <path d="M26 14h26a16 16 0 0 1 16 16v22H42V30a16 16 0 0 0-16-16z" className="ha-pink ha-stroke" />
    <g className="mb-flag"><rect x="64" y="20" width="4" height="24" className="ha-navy" /><rect x="64" y="20" width="13" height="9" className="ha-yellow ha-stroke" /></g>
    <g className="mb-letter"><rect x="16" y="26" width="22" height="15" rx="2" className="ha-yellow ha-stroke" /><path d="M17 27l10 7 10-7" className="ha-flap" /></g>
  </svg>;
}
