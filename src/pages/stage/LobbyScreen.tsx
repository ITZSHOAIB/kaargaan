import { useState } from "react";
import { CheckCircle2, Lock, QrCode, ScanLine, Send, UserPlus, X } from "lucide-react";
import { inviteLink, plural } from "../../lib/card";
import { lobbyReady, MAX_PLAYERS, MIN_PLAYERS, type Lobby, type LobbyAction, type LobbyPlayer } from "../../lib/lobby";
import { listNames } from "../../lib/words";
import { QrImage } from "../../ui/QrImage";
import { QrScan } from "../../ui/QrScan";
import { HostSongs } from "./HostSongs";

type Props = {
  lobby: Lobby;
  dispatch: (action: LobbyAction) => void;
  onImport: (text: string) => Promise<void>;
  onStart: () => void;
  onStartOver: () => void;
};

const PLAYER_COLOURS = ["--kg-p1", "--kg-p2", "--kg-p3", "--kg-p4", "--kg-p5", "--kg-p6"];

function startHint(lobby: Lobby): string {
  if (lobby.players.length < MIN_PLAYERS) return `Need at least ${MIN_PLAYERS} players. Send the invite to more friends.`;
  const waiting = lobby.players.filter((p) => !p.card || p.swap).map((p) => (p.id === lobby.hostId ? "your songs" : p.name));
  return waiting.length ? `Waiting for ${listNames(waiting)}.` : "";
}

export function LobbyScreen({ lobby, dispatch, onImport, onStart, onStartOver }: Props) {
  const { invite, notice } = lobby;
  const [addingSongs, setAddingSongs] = useState(false);

  if (addingSongs) {
    return <HostSongs songs={invite.songs} onSeal={(videoIds) => { dispatch({ type: "setHostSongs", videoIds }); setAddingSongs(false); }} onCancel={() => setAddingSongs(false)} />;
  }

  const cardsIn = lobby.players.filter((p) => p.card && !p.swap).length;
  const hint = startHint(lobby);
  const ok = notice && (notice.kind === "added" || notice.kind === "replaced" || notice.kind === "unchanged") ? notice.text : "";

  return <>
    <div>
      <p className="kg-eyebrow">{invite.theme} · {plural(invite.songs, "song")} each</p>
      <h1 className="kg-title">Collect the song cards</h1>
      <p className="kg-lede">{cardsIn} of {plural(lobby.players.length, "card")} in. Nobody's songs show here, not even yours.</p>
    </div>

    <p role="status" className={ok ? "kg-notice kg-notice--ok" : "sr-only"}>{ok ? <><CheckCircle2 size={20} aria-hidden="true" />{ok}</> : null}</p>
    {notice?.kind === "error" || notice?.kind === "swap" ? <p role="alert" className="kg-notice kg-notice--warn">{notice.text}</p> : null}
    {notice?.kind === "confirm-replace"
      ? <div role="alert" className="kg-notice kg-notice--warn kg-confirm">
          <p>{notice.text}</p>
          <div className="kg-row">
            <button type="button" className="kg-btn kg-btn--small kg-btn--pink" onClick={() => dispatch({ type: "confirmReplace" })}>Replace</button>
            <button type="button" className="kg-btn kg-btn--small" onClick={() => dispatch({ type: "cancelReplace" })}>Keep the old card</button>
          </div>
        </div>
      : null}

    <InvitePanel lobby={lobby} />

    <section className="kg-panel" aria-labelledby="players-heading">
      <h2 id="players-heading" className="kg-panel-title">Players</h2>
      <ul className="kg-roster" aria-label="Players">
        {lobby.players.map((player, i) => <RosterRow key={player.id} player={player} isHost={player.id === lobby.hostId} colour={PLAYER_COLOURS[i % PLAYER_COLOURS.length]} onAddSongs={() => setAddingSongs(true)} onRemove={() => dispatch({ type: "removePlayer", playerId: player.id })} />)}
      </ul>
      {lobby.players.length < MAX_PLAYERS ? <AddPlayer onAdd={(name) => dispatch({ type: "addPlayer", name })} /> : <p className="kg-small">The game is full at {MAX_PLAYERS} players.</p>}
    </section>

    <CardImport onImport={onImport} />

    <button type="button" className="kg-btn kg-btn--green kg-btn--big kg-btn--wide" disabled={!lobbyReady(lobby)} aria-describedby={hint ? "start-hint" : undefined} onClick={onStart}>Start the game</button>
    {hint ? <p id="start-hint" className="kg-small">{hint}</p> : null}
    <StartOver onConfirm={onStartOver} />
  </>;
}

function InvitePanel({ lobby }: { lobby: Lobby }) {
  const { invite } = lobby;
  const link = inviteLink(window.location.origin, invite);
  const [status, setStatus] = useState("");
  const [manual, setManual] = useState(false);
  const [showQr, setShowQr] = useState(false);

  async function share() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "KaarGaan invite", text: `Make your song card for ${invite.host}'s KaarGaan game`, url: link });
        setStatus("Invite sent. Cards show up here as players send them back.");
        return;
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setStatus("Invite link copied. Paste it in the group chat.");
    } catch {
      setManual(true);
      setStatus("Copy the invite link below and send it to the group chat.");
    }
  }

  return <section className="kg-panel kg-panel--yellow kg-on-yellow" aria-labelledby="invite-heading">
    <h2 id="invite-heading" className="kg-panel-title">Invite players</h2>
    <p>Everyone makes a sealed card on their own phone and sends it back to you.</p>
    <button type="button" className="kg-btn kg-btn--navy kg-btn--wide" onClick={() => void share()}><Send size={20} aria-hidden="true" />Invite players</button>
    <p role="status" className="kg-status">{status}</p>
    {manual ? <label className="kg-field"><span className="kg-label">Invite link</span><textarea className="kg-textarea" readOnly value={link} onFocus={(e) => e.currentTarget.select()} /></label> : null}
    {showQr
      ? <QrImage text={link} alt="QR code of the game invite" />
      : <button type="button" className="kg-btn kg-btn--wide" onClick={() => setShowQr(true)}><QrCode size={20} aria-hidden="true" />Show the invite QR</button>}
  </section>;
}

function RosterRow({ player, isHost, colour, onAddSongs, onRemove }: { player: LobbyPlayer; isHost: boolean; colour: string; onAddSongs: () => void; onRemove: () => void }) {
  const state = player.swap ? "swap" : player.card ? "sealed" : "waiting";
  const label = isHost
    ? state === "sealed" ? "Sealed" : state === "swap" ? "Swap needed" : "Not in yet"
    : state === "sealed" ? "Sealed" : state === "swap" ? "Swap needed" : "Waiting for a card";
  return <li className="kg-roster-row">
    <span className="kg-avatar" style={{ background: `var(${colour})` }} aria-hidden="true">{player.name.slice(0, 1).toUpperCase()}</span>
    <span className="kg-roster-name">
      <strong>{player.name}{isHost ? " (you)" : ""}</strong>
      <span className={`kg-pill kg-pill--${state}`}>{state === "sealed" ? <Lock size={13} aria-hidden="true" /> : null}{label}</span>
    </span>
    {isHost
      ? <button type="button" className="kg-btn kg-btn--small kg-btn--yellow" onClick={onAddSongs}>{state === "waiting" ? "Add my songs" : "Change my songs"}</button>
      : <button type="button" className="kg-btn kg-btn--icon" aria-label={`Remove ${player.name}`} onClick={onRemove}><X size={20} aria-hidden="true" /></button>}
  </li>;
}

function AddPlayer({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = useState("");
  return <form className="kg-field" onSubmit={(e) => { e.preventDefault(); onAdd(name); setName(""); }}>
    <label className="kg-label" htmlFor="add-player">Add a player</label>
    <div className="kg-input-row">
      <input id="add-player" className="kg-input" value={name} autoComplete="off" placeholder="Name" aria-describedby="add-player-hint" onChange={(e) => setName(e.target.value)} />
      <button type="submit" className="kg-btn kg-btn--small kg-btn--yellow"><UserPlus size={18} aria-hidden="true" />Add</button>
    </div>
    <p id="add-player-hint" className="kg-small">Players who send a card join on their own. Add names to see who's still missing.</p>
  </form>;
}

function CardImport({ onImport }: { onImport: (text: string) => Promise<void> }) {
  const [text, setText] = useState("");
  const [scanning, setScanning] = useState(false);

  return <section className="kg-panel" aria-labelledby="cards-heading">
    <h2 id="cards-heading" className="kg-panel-title">Got a card?</h2>
    <p className="kg-small">Tap a card link in your chat and it lands here. You can also paste one or scan a player's QR.</p>
    <label className="kg-field">
      <span className="kg-label">Paste a card link</span>
      <textarea className="kg-textarea" value={text} placeholder="https://kaargaan.sohab.dev/stage#c=…" onChange={(e) => setText(e.target.value)} />
    </label>
    <div className="kg-row">
      <button type="button" className="kg-btn kg-btn--yellow" onClick={() => { const value = text; setText(""); void onImport(value); }}>Add card</button>
      {scanning ? null : <button type="button" className="kg-btn kg-btn--navy" onClick={() => setScanning(true)}><ScanLine size={20} aria-hidden="true" />Scan a card</button>}
    </div>
    {scanning ? <QrScan label="Camera view for a player's card QR" onResult={(value) => { if (!value.includes("kg2.")) return false; void onImport(value); setScanning(false); return true; }} onClose={() => setScanning(false)} /> : null}
  </section>;
}

function StartOver({ onConfirm }: { onConfirm: () => void }) {
  const [asking, setAsking] = useState(false);
  if (!asking) return <button type="button" className="kg-btn kg-btn--quiet" onClick={() => setAsking(true)}>Start over</button>;
  return <div className="kg-notice kg-notice--warn kg-confirm" role="group" aria-label="Start over?">
    <p>Throw away this lobby? Cards already in are lost, and players need the new invite.</p>
    <div className="kg-row">
      <button type="button" className="kg-btn kg-btn--small kg-btn--pink" onClick={onConfirm}>Yes, start over</button>
      <button type="button" className="kg-btn kg-btn--small" onClick={() => setAsking(false)}>Keep the lobby</button>
    </div>
  </div>;
}
