# KaarGaan

**কার গান? — Whose song?**

A music bluffing game for friends in the same room. One shared phone plays songs, records spoken votes, reveals who submitted each song, and calculates scores. Players can prepare their songs on their own phones and transfer them privately using QR codes.

## Project status

Phase 0 — documentation foundation is complete. Application implementation starts with Phase 1.

Phase 1 — frontend foundation and mobile feasibility is implemented locally. The app now has a runnable React + TypeScript + Vite PWA shell, a private song-slip prep screen, a visible playback check, and a local recovery demo. Phase 2 adds a manual three-player game slice with visible playback, voting, reveal, scoring, skips, and standings. The production visual direction is now the accepted tabletop score-sheet system in [ADR 0004](docs/adr/0004-tabletop-score-sheet-ui.md). Real-device Android and iPhone verification is still pending.

The application is a React + TypeScript + Vite PWA, statically hosted on Cloudflare Pages at `kaargaan.sohab.dev`. Room codes identify a local setup invite; they do not create a server room or synchronized multiplayer connection. There is no application backend, Workers, or account system. YouTube playback requires internet.

## Reading order

1. [Product requirements](docs/PRD.md)
2. [Game rules](docs/game-rules.md)
3. [Domain glossary](CONTEXT.md)
4. [Architecture](docs/architecture.md)
5. [Data contracts](docs/data-contracts.md)
6. [Phased implementation plan](docs/plans/v1-phased-plan.md)
7. [Testing and acceptance](docs/testing.md)
8. [Architectural decisions](docs/adr/README.md)

## Development boundaries

- Implement and validate one phase at a time; update its documentation as behavior lands.
- Prioritize a complete manual-entry game, with QR and encrypted-code handoffs as convenience paths.
- Keep ownership hidden in ordinary use, including from the host. This is a trusted-group game, not an anti-cheating security system.
- Do not introduce accounts, server infrastructure, music downloads, or a history archive into v1.
- Repository publication and deployment require explicit authorization. Phase 1 builds locally but does not publish or deploy.

## Setup recovery and corrected entries

- **Room & players** is available throughout host setup. Reopen the same QR/invite without changing the room ID, rules, or accepted songs. Choose a particular player to collect or replace their entry; names are display labels, not identifiers.
- Host setup and player song drafts are saved locally on their respective devices. Reload or return from home to continue. Accepted songs stay on the host even when a player loses their local state. If browser data is cleared, use the host's same invite to rejoin; local storage is not a remote backup.
- An import reports every conflicting incoming song number and never discloses the earlier owner. Replace only those songs, generate a fresh QR/code, and retry. Different URLs pointing to the same YouTube video are still the same song.
- Editing a name, song, or room immediately retires generated output. Older encryption/QR work cannot publish over a newer edit. A host replacement stays pending until confirmation; discarding it preserves the original accepted entry.
- Starting a game removes the host setup draft after the game is saved. Starting over is a separate, explicit action in Room & players.
