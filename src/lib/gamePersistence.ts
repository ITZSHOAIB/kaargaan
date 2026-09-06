import type { Game } from "./types";

const KEY = "kaargaan.current-game.v1";

type GameEnvelope = {
  format: "kaargaan-current-game";
  version: 1;
  savedAt: string;
  game: Game;
};

type StoredGameEnvelope = {
  format: "kaargaan-current-game-encoded";
  version: 1;
  encoding: "base64";
  savedAt: string;
  payload: string;
};

type LoadCurrentGameState = {
  game: Game | null;
  error: string | null;
};

export function saveCurrentGame(game: Game): Game {
  const existing = readEnvelope();
  if (existing && existing.game.id === game.id && existing.game.saveRevision !== game.saveRevision) {
    throw new Error("This game changed in another tab. Reload before saving.");
  }

  const nextGame = { ...game, saveRevision: game.saveRevision + 1 };
  const envelope: GameEnvelope = {
    format: "kaargaan-current-game",
    version: 1,
    savedAt: new Date().toISOString(),
    game: nextGame
  };

  const stored: StoredGameEnvelope = {
    format: "kaargaan-current-game-encoded",
    version: 1,
    encoding: "base64",
    savedAt: envelope.savedAt,
    payload: encodeText(JSON.stringify(envelope))
  };
  localStorage.setItem(KEY, JSON.stringify(stored));
  return nextGame;
}

export function loadCurrentGameState(): LoadCurrentGameState {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    return { game: null, error: null };
  }

  try {
    const envelope = decodeStoredEnvelope(raw);
    if (!envelope) {
      return { game: null, error: "A saved game could not be restored. Clear the current game and start over." };
    }

    return { game: envelope.game, error: null };
  } catch {
    return { game: null, error: "A saved game could not be restored. Clear the current game and start over." };
  }
}

export function loadCurrentGame(): Game | null {
  return loadCurrentGameState().game;
}

export function clearCurrentGame(): void {
  localStorage.removeItem(KEY);
}

export function currentGameKey(): string {
  return KEY;
}

function readEnvelope(): GameEnvelope | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    return null;
  }

  try {
    return decodeStoredEnvelope(raw);
  } catch {
    return null;
  }
}

function decodeStoredEnvelope(raw: string): GameEnvelope | null {
  try {
    const parsed = JSON.parse(raw) as Partial<GameEnvelope> & Partial<StoredGameEnvelope>;
    if (parsed.format === "kaargaan-current-game" && parsed.version === 1 && isGame(parsed.game)) {
      return parsed as GameEnvelope;
    }

    if (parsed.format !== "kaargaan-current-game-encoded" || parsed.version !== 1 || parsed.encoding !== "base64" || typeof parsed.payload !== "string") {
      return null;
    }

    const decoded = JSON.parse(decodeText(parsed.payload)) as Partial<GameEnvelope>;
    return decoded.format === "kaargaan-current-game" && decoded.version === 1 && isGame(decoded.game)
      ? decoded as GameEnvelope
      : null;
  } catch {
    return null;
  }
}

function encodeText(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeText(value: string): string {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function isGame(value: Game | undefined): value is Game {
  return Boolean(
    value &&
      typeof value.id === "string" &&
      typeof value.theme === "string" &&
      typeof value.saveRevision === "number" &&
      value.status &&
      Array.isArray(value.players) &&
      Array.isArray(value.submissions) &&
      Array.isArray(value.rounds) &&
      Number.isInteger(value.activeRoundIndex)
  );
}
