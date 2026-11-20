# Testing and acceptance

Every change is built test-first: write the failing unit or browser test, then make it pass. Every frontend change ends with axe and a manual keyboard pass.

```sh
npm test           # Vitest unit tests
npm run test:e2e   # Playwright: builds, serves on :4173, runs Chromium
npm run lint       # ESLint incl. React Compiler hook rules
npx tsc -b
```

## Unit tests (`tests/unit`)

| Area | Covers |
| --- | --- |
| `gameEngine`, `engineOpenVoting` | Shuffle keeps owners; votes open from the start; change and take back a vote; no self-votes; reveal needs every vote or half the room; every scoring branch; no double award; skip; next round; completion. |
| `awards`, `revealMoment` | Award leaders with shared ties, missing awards left out; perfect bluff, solo guess and room-read moments. |
| `card`, `cardDraft` | Invite round trip; sealing and opening; wrong game, damaged card, wrong song count and repeated songs rejected; finding `kg2.` codes in pasted text; draft save and restore. |
| `lobby`, `stageStore` | Add and remove players; clashes name only the incoming player; same-name replace prompt; resend from the same phone; host songs; start rules; lobby, setup and crew persistence; `latestLobby` across tabs. |
| `gamePersistence` | Encoded save and load; stale-tab revision check; back-to-back saves; corrupted saves kept for recovery; `listening` → `voting` migration. |
| `youtube`, `oembed`, `qrScanRegion` | Link normalisation and rejection; oEmbed status mapping; scan square. |
| `appUpdate`, `updateBanner` | An update waits while a game is playing; the banner applies it. |

## Browser tests (`tests/e2e`)

YouTube and oEmbed are stubbed (`mockYouTube`, `mockOEmbed` in `helpers.ts`). The fake player can fail on demand or ignore Play, so no test depends on real YouTube. Multi-phone flows use separate browser contexts.

- **Smoke:** every screen loads without console errors; old pass-the-phone saves are forgotten; manifest and theme colour.
- **Card builder:** build, seal and share a card; share-sheet and clipboard paths; pasting an invite; switching invites keeps the name; 320px layout.
- **Stage and lobby:** home routes; collecting cards from other phones and starting; card links from several tabs; clashes and look-alike names with no song leaks; a card opened on the wrong phone; 320px layout.
- **Play:**
  - Open voting with change and take-back.
  - Tiles that are identical in the DOM, and no ids in the markup.
  - Reveal-without, unplayable auto-skip, the tap hint, and the scores, skip and end sheets.
  - Final scores with a shared crown, a scoreless night and long names.
  - A whole night from lobby to rematch.

`expectAccessible` runs axe (WCAG 2.2 AA tags) on each screen, including with sheets open. `expectNoSideScroll` checks for no sideways scrolling at 320px.

## Manual checks per frontend change

- Keyboard: logical tab order, visible focus on every surface (blue, yellow, white, sheet), Escape closes sheets and focus returns to the opener.
- Before and after screenshots at 390px and 1024px for anything visual.

## Still needs real phones

Emulated browsers can't sign off these. Record device, OS, browser, date and result.

- Android Chrome and iPhone Safari, in the browser and installed as a PWA.
- Share sheet and QR scanning of invites and cards between two phones; camera denied falls back to paste.
- Hindi, Bengali and English songs from YouTube and YouTube Music links play in the embed after a tap. A blocked song skips itself.
- Lock, background and reload the host phone mid-round; the game resumes on the same round with the same votes.
- The wake lock keeps the screen on during play.

## Pilot

Three or more players, the host included, playing a full game with a theme and 2 or 3 songs each. Record whether the group finished, any failed songs, any ownership leak, any score disputes, and whether they wanted another game.
