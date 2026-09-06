# Testing and acceptance

Application checks below are planned, not executed. Phase 0 validates the documentation only.

## Automated tests

Use Vitest for pure game engine, URL, QR and save validation. Use Playwright for meaningful browser flows; stub playback outcomes where deterministic tests are needed. Real YouTube availability must not make ordinary automated tests flaky.

| Area | Scenarios | Requirements |
| --- | --- | --- |
| Setup | Player/count boundaries; empty theme; duplicate names; incomplete selections; frozen setup after start. | P02 |
| Links | YouTube/Music/share variants normalize; tracking ignored; duplicate video IDs caught; unsupported schemes/hosts and playlist-only links rejected. | P04 |
| Slips | Round-trip generation/decoding; invalid JSON/type/version; oversized payload; wrong count; repeated scan; duplicate replacement; no partial mutation on failure. | P03, P04 |
| Shuffle | Every submission appears exactly once; owners preserved; deterministic injected randomness; reload retains queue. | P01, P08 |
| Votes | Complete roster including owner; no self-votes; public changes before reveal; rotating first voter; no changes after reveal. | P06 |
| Scoring | Zero correct → owner 10; one correct → guesser 10; two/three correct → 5 each; wrong/owner votes earn no guessing points. | P07 |
| Round actions | Incomplete reveal rejected; repeat reveal does not award twice; skip has no points or public owner; resolved rounds cannot be skipped or scored again. | P05, P07 |
| Finish | Unique winner; shared ties; all-skipped game has no winner; skipped owners remain undisclosed. | P11 |
| Recovery | Resume setup/voting/revealed/final state; unchanged standings; corrupted/unsupported save retained; storage failure shown; stale tab blocked. | P08 |

Browser coverage should include a complete three-player manual game, a mixed QR/manual setup, public view ownership checks, private handoff/back navigation, reload recovery and external-playback return.

Inspect both rendered and accessible content for accidental ownership disclosure. Do not treat local storage visibility as a failing anti-cheating test: this is an explicitly trusted-group design.

## Device feasibility — Phase 1

Requirements: P05, P08, P10.

Run on physical Android Chrome and iPhone Safari, in browser and installed-PWA modes. Record device, OS, browser version, test date, result and limitation in the phase notes.

- Generate a slip on one phone and scan it privately from the other; reverse roles.
- Deny camera permission and complete manual entry. Stop camera capture on leaving import.
- Play representative Hindi, Bengali and English video/Music links through a visible embed after a tap.
- Exercise blocked embedding and unavailable video outcomes with external fallback, retry and skip.
- Switch to YouTube and back; verify the saved state resumes without automatically revealing or advancing.
- Lock/background/reload the game phone and record actual playback and recovery behavior.

**Gate:** Every platform has a usable import and playback path. Emulated mobile browsers are useful for layout but cannot sign off physical camera, external-app or installed-PWA behavior.

## PWA and usability — Phase 4

Requirements: P03, P08, P09, P10.

- After initial caching, open the shell offline; local controls work and unavailable music is explained.
- An available update never interrupts an active game or silently reloads private setup.
- Refresh before/after reveal and confirm identical points and queue position.
- Private setup always resumes covered; public overview contains only completion status.
- Controls have accessible names, adequate touch targets, visible focus and readable contrast.
- Support narrow portrait screens without clipped vote choices or score tables. Keep the YouTube player at or above its documented minimum size.
- Browser back navigation does not expose private selections or revert scored rounds.
- Explicit new-game/reset actions explain the loss of current progress before replacement.

## Personal pilot — Phase 5

Use at least three players, including the host. Run one full game with a theme and three songs each. Include both QR and manual preparation if possible.

Record whether the group finished, whether any songs failed, whether ownership leaked, whether scoring needed correction and whether players wanted another game. Use notes, not a telemetry service.

**Acceptance:** No manual score calculation, lost progress or accidental ownership disclosure. Playback failures use the documented fallback/skip path without breaking the game.

## Documentation verification — Phase 0

- All relative Markdown links resolve.
- PRD requirements have test scenarios and phase ownership.
- Rules, architecture and data contracts agree on scoring, vote changes, skips and privacy.
- The only completed phase is documentation; application tests, device checks and deployment remain pending.
- Superseded networked-room proposals are not presented as current architecture.
