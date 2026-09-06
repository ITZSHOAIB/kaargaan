# KaarGaan — phased implementation plan

Implement one phase at a time and validate its exit criteria before starting the next. Keep the PRD, rules and architecture aligned as implementation lands.

## Phase 0 — Project layout and documentation

**Status:** Complete.

Create the project README, domain glossary, PRD, rules, architecture, local data contracts, testing checklist, phased plan and three architectural decisions.

Record the agreed design: personal use, one shared phone, static PWA, 3–10 players, one theme, 1–5 songs each (default 3), English controls, public editable votes, and 10/5-point scoring.

**Exit:** Documentation agrees on terminology, behavior and acceptance scenarios. No application implementation, repository publication or deployment in this phase.

## Phase 1 — Frontend foundation and mobile feasibility

**Status:** In progress.

Scaffold React + TypeScript + Vite, Tailwind CSS, linting, Vitest and Playwright. Establish Home, Prepare Songs and Game navigation. Set up a minimal installable shell using `vite-plugin-pwa` for device checks; production cache/update hardening belongs to Phase 4.

Build focused feasibility screens for:

- Visible YouTube embedding with explicit play and external fallback.
- Browser-side QR generation/scanning using `qrcode` and `qr-scanner`.
- Saving and restoring a small local snapshot after reload or app switching.

Use actual Android Chrome and iPhone Safari, including installed-PWA behavior. Test representative Hindi, Bengali and English links, denied camera permissions and videos that refuse embedding. A deployment to supply device-test HTTPS remains subject to explicit authorization; use an existing authorized test environment if available.

**Exit:** Both phone platforms have a viable submission and playback path, with observed limitations recorded. Do not mark real-device checks passed based on browser emulation. If devices are unavailable, report the missing evidence before advancing past the phase gate.

Current implementation state: the app shell, song-slip generation/import path, visible YouTube playback check, and local recovery demo are implemented and validated in Chromium. Real Android Chrome and iPhone Safari verification remains pending.

## Phase 2 — Complete game using manual entry

**Status:** In progress.

Build the first complete playable slice before QR convenience:

- Setup, private player handoffs and manual link entry with shared validation.
- Complete immutable-at-start roster and selections; one persisted shuffle order.
- Host-controlled listening, discussion, public vote recording and reveal.
- Rotating first voter, editable votes until reveal, no self-votes, and mandatory owner bluff vote.
- All scoring branches, unscored skips, final standings and shared ties.
- Basic current-game persistence after actions, so the playable slice preserves ordering/results across reloads. Comprehensive error handling and PWA recovery hardening follow in Phase 4.

Keep the game engine pure TypeScript and playback/UI callbacks separate from scoring.

Current implementation state: the manual setup and round UI are wired to a pure game engine. The
slice supports 3–10 players, 1–5 songs per player, duplicate/link validation, a staged private
handoff for one player at a time, a frozen shuffled queue, visible playback, rotated vote order,
editable votes, reveal ownership, scoring, skips and final standings. Current games are saved
after state-changing actions and restored after reload. Save revisions now reject stale writes and
corrupt saves surface a recovery screen. QR imports remain future work in this phase.

**Exit:** Three people can finish a game on one phone. Automated tests verify scoring branches, invalid votes, skips, ties, fixed queue recovery and repeated-reveal protection.

## Phase 3 — Private QR song preparation

**Status:** Not started.

Add the personal “Prepare my songs” view and compact versioned song slips. Preparation happens locally, without a room or upload. Theme and count are communicated verbally.

Implement private scanning, player association, review and atomic import. Validate payload type/version/size, expected count, video IDs and duplicates before any state mutation. Retain manual entry for denied/unavailable camera and game-device preparation.

**Exit:** Complete a mixed QR/manual setup. Verify camera denial, repeated scans, invalid import rollback, private duplicate replacement and safe back-navigation.

## Phase 4 — Recovery and PWA hardening

**Status:** Not started.

Harden current-game persistence and private resume. Handle corrupt/unsupported saves, storage failures, stale-tab writes and confirmed game replacement. Retain only the current/final game, without history.

Cache first-party shell assets only; defer service-worker updates during active games. Preserve game state before external playback. Add accessible controls, clear status/errors and usable narrow-screen layouts.

**Exit:** Reload/app-switch recovery works during setup, voting and results on both supported phone platforms. Scores remain unchanged by replayed actions. Offline shell controls work without implying offline YouTube music. Private setup never resumes uncovered.

## Phase 5 — Personal pilot and deployment

**Status:** Not started.

Run a complete evening's game with friends. Resolve blockers affecting private imports, playback, vote recording or scoring. Record completion, interruptions and any manual workarounds; no analytics service is needed.

Run production build, type checks, lint and relevant automated tests. Prepare static Cloudflare Pages deployment and `kaargaan.sohab.dev` instructions without Functions or Workers. Publish only with explicit authorization.

After authorized deployment, verify installation, QR scanning, embedded/external playback and resume on the real HTTPS domain.

**Exit:** Friends can finish a game without manual score calculations, lost progress or accidental ownership disclosure. Report any unverified platform behavior rather than describing it as complete.

## Phase discipline

- Scope stays within the [PRD](../PRD.md); no accounts, backend, synchronized rooms, song downloading or history archive.
- Use agreed fallbacks first. Revisit architecture only if those fallbacks cannot meet the acceptance criteria.
- Record meaningful design changes in the appropriate document and supersede an ADR when necessary.
- Initial implementation was Phase 0 only. Phase 1 is now implemented locally but still needs real-device verification before the phase gate is fully closed.
