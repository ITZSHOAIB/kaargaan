import { useEffect, useEffectEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { extractCardPayload, openCard } from "../../lib/card";
import { saveCurrentGame } from "../../lib/gamePersistence";
import { createLobby, lobbyReducer, lobbyToGame, type Lobby, type LobbyAction } from "../../lib/lobby";
import { clearLobby, latestLobby, LOBBY_KEY, loadCrew, loadLobby, saveCrew, saveLobby, saveSetup, type StageSetup } from "../../lib/stageStore";
import { KgScreen } from "../../ui/KgScreen";
import { LobbyScreen } from "./LobbyScreen";
import { SetupScreen } from "./SetupScreen";

const NOT_HERE = "This is a song card. Open it on the host's phone, the one running the game.";
const NO_CARD = "There's no song card in that. Paste the whole link the player sent you.";

function cardInHash(hash: string): string | null {
  return hash.includes("c=") ? extractCardPayload(hash) ?? "" : null;
}

/** Opens a pasted or tapped card into the lobby action it calls for. */
async function readCard(payload: string, lobby: Lobby): Promise<LobbyAction> {
  if (!payload) return { type: "showError", text: NO_CARD };
  const opened = await openCard(payload, lobby.invite);
  return opened.ok ? { type: "importCard", card: opened.card } : { type: "showError", text: opened.error };
}

/** Restores the lobby saved on this phone and picks up a card link the host just tapped. */
function boot(): { lobby: Lobby | null; payload: string | null; error: string } {
  const lobby = loadLobby();
  const payload = cardInHash(window.location.hash);
  return { lobby, payload, error: payload !== null && !lobby ? NOT_HERE : "" };
}

export function StagePage() {
  const navigate = useNavigate();
  const [initial] = useState(boot);
  const [lobby, setLobby] = useState(initial.lobby);
  const [error, setError] = useState(initial.error);

  function dispatch(action: LobbyAction) {
    if (!lobby) return;
    const next = lobbyReducer(latestLobby(lobby), action);
    setLobby(next);
    setError(saveLobby(next));
  }

  async function importCard(payload: string) {
    if (!lobby) { setError(NOT_HERE); return; }
    dispatch(await readCard(payload, lobby));
  }

  function open(setup: StageSetup) {
    const crew = setup.sameCrew ? loadCrew()?.names ?? [] : [];
    const next = createLobby({ theme: setup.theme, songs: setup.songs, hostName: setup.hostName, crew });
    setLobby(next);
    setError(saveLobby(next));
  }

  function start() {
    if (!lobby) return;
    const fresh = latestLobby(lobby);
    try {
      saveCurrentGame(lobbyToGame(fresh));
    } catch {
      dispatch({ type: "showError", text: "This phone couldn't save the game. Free up some space or leave private browsing, then try again." });
      return;
    }
    // The game is saved, so the lobby can go: leaving it would let the same cards start a second game.
    clearLobby();
    const host = fresh.players.find((p) => p.id === fresh.hostId)!;
    const names = fresh.players.filter((p) => p.id !== fresh.hostId).map((p) => p.name);
    saveCrew({ hostName: host.name, names, theme: fresh.invite.theme, songs: fresh.invite.songs });
    saveSetup({ hostName: host.name, theme: fresh.invite.theme, songs: fresh.invite.songs, sameCrew: true });
    navigate("/host");
  }

  function startOver() {
    clearLobby();
    setLobby(null);
  }

  // Card links tapped in the chat can open in other tabs; show what they saved.
  const syncFromStorage = useEffectEvent((event: StorageEvent) => {
    if (event.key !== LOBBY_KEY) return;
    setLobby((current) => (current ? (loadLobby() ? latestLobby(current) : null) : loadLobby()));
  });
  // A card link tapped while this page is already showing arrives as a hash change.
  const acceptLink = useEffectEvent(() => {
    const payload = cardInHash(window.location.hash);
    navigate("/stage", { replace: true });
    if (payload !== null) void importCard(payload);
  });
  const importOnLoad = useEffectEvent(() => {
    if (initial.payload !== null && initial.lobby) void readCard(initial.payload, initial.lobby).then(dispatch);
  });
  useEffect(() => {
    // Read the live hash, not the boot copy, so a second effect run doesn't import the card twice.
    const hash = window.location.hash;
    // The card is in the lobby now; drop it from the address bar.
    if (hash) navigate("/stage", { replace: true });
    if (hash.includes("c=")) importOnLoad();
    window.addEventListener("storage", syncFromStorage);
    window.addEventListener("hashchange", acceptLink);
    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener("hashchange", acceptLink);
    };
  }, [navigate]);

  return <KgScreen>
    {error ? <p role="alert" className="kg-notice kg-notice--warn">{error}</p> : null}
    {lobby
      ? <LobbyScreen lobby={lobby} dispatch={dispatch} onImport={(text) => importCard(extractCardPayload(text) ?? "")} onStart={start} onStartOver={startOver} />
      : <SetupScreen onOpen={(setup) => { setError(""); open(setup); }} />}
  </KgScreen>;
}
