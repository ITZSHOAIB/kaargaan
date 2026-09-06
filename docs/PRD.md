# KaarGaan v1 — product requirements

Status: Accepted for implementation  
Audience: A personal group of friends physically together  
Current milestone: Phase 0 — documentation only

## Problem and outcome

Friends want to play the music bluffing format of “Play My Playlist Sumit” without requiring a coordinator who knows every answer or manually calculates scores. KaarGaan runs on one shared phone so everyone, including the host, can compete.

Success means the group completes an evening's game without lost progress, accidental ownership disclosure, or manual score calculations. Conversation and bluffing happen aloud; the interface supports them rather than replacing them.

## Agreed experience

1. The host chooses 3–10 players, one nonempty custom theme, and 1–5 songs each (default 3).
2. Friends prepare individual YouTube or YouTube Music links. They can use a local song-slip generator on their own phones or enter links directly on the game phone.
3. Each player privately takes the game phone and imports or enters their selections. A covered handoff screen conceals the selections before the next person takes over.
4. The app shuffles submissions. The host plays the current song using a visible YouTube embed, with an external playback fallback.
5. Friends discuss and bluff. The host records their public, spoken votes. Votes remain editable until reveal.
6. The app reveals ownership and awards points, then continues to the next round and final standings.

The theme and song count are communicated verbally. Personal preparation phones do not join or connect to the game.

## Requirements and acceptance

| ID | Requirement | Acceptance |
| --- | --- | --- |
| P01 | Shared-device game | A full game operates on one phone; host participates and unrevealed ownership stays hidden in normal screens. |
| P02 | Bounded setup | Enforce player/song limits and unique display names; freeze roster, theme, and submissions at game start. |
| P03 | Private submission | Scanning, manual entry, reload, and back navigation do not reopen another player's picks without an intentional private handoff. |
| P04 | Song validation | Accept individual YouTube video links, including Music links carrying video IDs; privately reject repeated IDs without identifying an earlier owner. |
| P05 | Host playback | Explicit play, replay, external-link and skip actions exist; unavailable embedding does not prevent an external attempt. |
| P06 | Voting | Host records every player's non-self vote, including the owner's bluff; public votes may change before reveal. |
| P07 | Correct scoring | All 10/5-point branches match the rules; repeated reveals or reloads never award a round twice. |
| P08 | Recovery | Current game resumes with the same order, votes and results after reload or app switching. Storage failure is visible. |
| P09 | Static PWA | Application shell works after offline caching; no application server is needed. Music availability remains an internet dependency. |
| P10 | Device support | Validate Android Chrome and iPhone Safari, both browser and installed-PWA use. Camera denial retains manual entry. |
| P11 | Completion | Ties share the win; games containing no scored rounds have no winner. |

Controls are English. Use the KaarGaan name and optionally the Bengali wordmark; bilingual controls are not part of v1. Provide a few optional theme suggestions alongside custom text, such as “Guilty pleasures”, “School-day favourites”, and “Songs on repeat”.

## Boundaries

- One active game per game device; only its current/final state is retained.
- No synchronized personal-phone voting, accounts, rooms, cloud state, history archive, analytics, or permanent leaderboard.
- No song search service, playlist import, metadata-service dependency, media proxy, audio extraction, or downloading.
- No promise of fully offline music, uninterrupted background playback, or universal embedding support.
- Duplicate detection compares video IDs, not acoustic recordings or different uploads of the same song.
- Local storage is inspectable. The privacy goal is preventing accidental disclosure within the interface, not preventing deliberate device inspection.

## Delivery

Follow the [phased plan](plans/v1-phased-plan.md). First prove phone playback and QR feasibility, then deliver the complete game with manual entry, then add QR preparation and recovery hardening. The real-device feasibility and pilot checks must be reported honestly; automated browser checks do not substitute for physical phone testing.

Detailed behavior is defined in [game rules](game-rules.md), implementation boundaries in [architecture](architecture.md), and acceptance scenarios in [testing](testing.md).
