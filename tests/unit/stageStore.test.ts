// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { createLobby, lobbyReducer } from "../../src/lib/lobby";
import { clearLobby, clearSetup, CREW_KEY, latestLobby, LOBBY_KEY, loadCrew, loadLobby, loadSetup, saveCrew, saveLobby, saveSetup, SETUP_KEY } from "../../src/lib/stageStore";

beforeEach(() => localStorage.clear());

describe("stage storage", () => {
  it("restores a lobby after a reload, cards and all", () => {
    const lobby = createLobby({ theme: "t", songs: 2, hostName: "Sohab", crew: ["Rupa", "Arjun"] });
    saveLobby(lobby);
    expect(loadLobby()).toEqual({ ...lobby, notice: null, pendingCard: null });
  });

  it("ignores old or broken saves instead of crashing", () => {
    localStorage.setItem("kaargaan.host-setup.v1", JSON.stringify({ version: 1 }));
    expect(loadLobby()).toBeNull();
    localStorage.setItem(LOBBY_KEY, "{not json");
    expect(loadLobby()).toBeNull();
    localStorage.setItem(LOBBY_KEY, JSON.stringify({ v: 2, players: "nope" }));
    expect(loadLobby()).toBeNull();
  });

  it("remembers the crew for next time", () => {
    saveCrew({ hostName: "Sohab", names: ["Rupa", "Arjun"], theme: "t", songs: 3 });
    expect(loadCrew()).toEqual({ hostName: "Sohab", names: ["Rupa", "Arjun"], theme: "t", songs: 3 });
    localStorage.setItem(CREW_KEY, "[]");
    expect(loadCrew()).toBeNull();
  });
});

describe("stage setup and stale tabs", () => {
  it("keeps the half-filled setup form across a reload", () => {
    expect(loadSetup()).toBeNull();
    saveSetup({ hostName: "Sohab", theme: "Monsoon night", songs: 3, sameCrew: false });
    expect(loadSetup()).toEqual({ hostName: "Sohab", theme: "Monsoon night", songs: 3, sameCrew: false });
    localStorage.setItem(SETUP_KEY, JSON.stringify({ hostName: 4 }));
    expect(loadSetup()).toBeNull();
    clearSetup();
    expect(localStorage.getItem(SETUP_KEY)).toBeNull();
  });

  it("builds on the lobby another tab saved, keeping this tab's open question", () => {
    const lobby = createLobby({ theme: "t", songs: 2, hostName: "Sohab", crew: [] });
    const stale = { ...lobby, notice: { kind: "confirm-replace" as const, text: "Replace?" }, pendingCard: null };
    const newer = lobbyReducer(lobby, { type: "addPlayer", name: "Rupa" });
    saveLobby(newer);
    expect(latestLobby(stale)).toEqual({ ...newer, notice: stale.notice, pendingCard: null });
  });

  it("ignores a saved lobby from another game", () => {
    const lobby = createLobby({ theme: "t", songs: 2, hostName: "Sohab", crew: [] });
    saveLobby(createLobby({ theme: "u", songs: 2, hostName: "Other", crew: ["Rupa"] }));
    expect(latestLobby(lobby)).toBe(lobby);
    clearLobby();
    expect(latestLobby(lobby)).toBe(lobby);
  });
});
