import { useEffect, useEffectEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { readInviteFragment } from "../../lib/card";
import { loadCardDraft, saveCardDraft, startDraft, type CardDraft } from "../../lib/cardDraft";
import { KgScreen } from "../../ui/KgScreen";
import { CardBuilder } from "./CardBuilder";
import { InviteGate } from "./InviteGate";
import { SealedCard } from "./SealedCard";

/** Reads an invite from the link the player tapped, falling back to the card saved on this phone. */
function boot(): { draft: CardDraft | null; error: string } {
  const saved = loadCardDraft();
  if (!window.location.hash.includes("i=")) return { draft: saved, error: "" };
  const read = readInviteFragment(window.location.hash);
  return read.ok ? { draft: startDraft(read.invite, saved), error: "" } : { draft: saved, error: read.error };
}

export function CardPage() {
  const navigate = useNavigate();
  const [initial] = useState(boot);
  const [draft, setDraft] = useState(initial.draft);
  const [linkError, setLinkError] = useState(initial.error);
  const [saveError, setSaveError] = useState("");

  function update(next: CardDraft) {
    setDraft(next);
    setSaveError(saveCardDraft(next));
  }

  // A new invite link opened while this page is already showing arrives as a hash change.
  const acceptLink = useEffectEvent(() => {
    const read = readInviteFragment(window.location.hash);
    if (read.ok) { update(startDraft(read.invite, loadCardDraft())); setLinkError(""); }
    else setLinkError(read.error);
    navigate("/card", { replace: true });
  });
  useEffect(() => {
    // The invite is saved on this phone now; drop it from the address bar so it isn't shared by accident.
    if (window.location.hash) navigate("/card", { replace: true });
    window.addEventListener("hashchange", acceptLink);
    return () => window.removeEventListener("hashchange", acceptLink);
  }, [navigate]);

  return <KgScreen>
    {saveError ? <p role="alert" className="kg-notice kg-notice--warn">{saveError}</p> : null}
    {linkError ? <p role="alert" className="kg-notice kg-notice--warn">{linkError}</p> : null}
    {!draft
      ? <InviteGate onInvite={(invite) => { setLinkError(""); update(startDraft(invite, loadCardDraft())); }} />
      : draft.sealed
        ? <SealedCard draft={draft} sealed={draft.sealed} onEdit={() => update({ ...draft, sealed: null })} />
        : <CardBuilder draft={draft} onChange={update} />}
  </KgScreen>;
}
