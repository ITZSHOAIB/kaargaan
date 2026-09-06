import type { Game } from "./types";

const KEY = "kaargaan.current-game.v1";

type GameEnvelope = {
  format: "kaargaan-current-game";
  version: 1;
  savedAt: string;
  game: Game;
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

  localStorage.setItem(KEY, JSON.stringify(envelope));
  return nextGame;
}

export function loadCurrentGameState(): LoadCurrentGameState {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    return { game: null, error: null };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<GameEnvelope>;
    if (parsed.format !== "kaargaan-current-game" || parsed.version !== 1 || !isGame(parsed.game)) {
      return { game: null, error: "A saved game could not be restored. Clear the current game and start over." };
    }

    return { game: parsed.game, error: null };
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
    const parsed = JSON.parse(raw) as Partial<GameEnvelope>;
    return parsed.format === "kaargaan-current-game" && parsed.version === 1 && isGame(parsed.game)
      ? parsed as GameEnvelope
      : null;
  } catch {
    return null;
  }
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
