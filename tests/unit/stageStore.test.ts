// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { createLobby } from "../../src/lib/lobby";
import { CREW_KEY, LOBBY_KEY, loadCrew, loadLobby, saveCrew, saveLobby } from "../../src/lib/stageStore";

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
