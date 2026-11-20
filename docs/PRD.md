# KaarGaan v1 — product requirements

Status: Implemented (Buzzer Night, sealed cards, open voting); real-device checks pending  
Audience: A personal group of friends physically together

## Problem and outcome

Friends want to play the music bluffing format of “Play My Playlist Sumit” without requiring a coordinator who knows every answer or manually calculates scores. KaarGaan runs on one shared phone so everyone, including the host, can compete.

Success means the group completes an evening's game without lost progress, accidental ownership disclosure, or manual score calculations. Conversation and bluffing happen aloud; the interface supports them rather than replacing them.

## Agreed experience

1. The host sets up 3–10 players, a theme and 2 or 3 songs each (invites accept up to 5), then shares an invite link.
2. Each friend opens the invite on their own phone, pastes YouTube or YouTube Music links and sends back a **sealed song card**. The host seals their own songs on the host phone. Nobody, the host included, sees anyone else's songs.
3. The host phone collects the cards in a lobby, flags repeated songs without saying whose they clash with, and starts the game. The songs are shuffled once.
4. The host phone plays each song in a visible YouTube embed. Friends talk it over and bluff.
5. Anyone taps their name on the host phone and picks whose song it is. Votes can change or be taken back until the reveal.
6. The app reveals the owner, awards points, and ends with standings, awards, who picked what and the night's playlist.

## Requirements and acceptance

| ID | Requirement | Acceptance |
| --- | --- | --- |
| P01 | One host phone | The game runs on the host's phone; other phones only build and send sealed cards. The host plays too, and unrevealed ownership stays hidden on every screen. |
| P02 | Bounded setup | Enforce player/song limits and unique display names; freeze roster, theme, and submissions at game start. |
| P03 | Private submission | Songs are sealed on each player's own phone; the lobby, roster and play screens never show a song next to its owner before the reveal. |
| P04 | Song validation | Accept individual YouTube video links, including Music links carrying video IDs; privately reject repeated IDs without identifying an earlier owner. |
| P05 | Host playback | Play, pause and replay controls; a tap hint when the phone blocks autoplay; songs YouTube can't play skip themselves; other failures offer retry or skip. |
| P06 | Voting | Each player votes on the host phone for anyone but themselves, owner included as a bluff; votes can change until reveal; reveal without missing voters needs half the room and a confirmation. |
| P07 | Correct scoring | All 10/5-point branches match the rules; repeated reveals or reloads never award a round twice. |
| P08 | Recovery | Current game resumes with the same order, votes and results after reload or app switching. Storage failure is visible. |
| P09 | Static PWA | Application shell works after offline caching; no application server is needed. Music availability remains an internet dependency. |
| P10 | Device support | Validate Android Chrome and iPhone Safari, both browser and installed-PWA use. Camera denial retains link pasting. |
| P11 | Completion | Ties share the win; games containing no scored rounds have no winner. |

Controls are English. Use the KaarGaan name and optionally the Bengali wordmark; bilingual controls are not part of v1. Provide a few optional theme suggestions alongside custom text, such as “Guilty pleasures”, “School-day favourites”, and “Songs on repeat”.

## Boundaries

- One active game per game device; only its current/final state is retained.
- No networked phones: cards travel as links and votes happen on the host phone. No accounts, cloud state, history archive, analytics, or permanent leaderboard.
- No song search service, playlist import, metadata-service dependency, media proxy, audio extraction, or downloading.
- No promise of fully offline music, uninterrupted background playback, or universal embedding support.
- Duplicate detection compares video IDs, not acoustic recordings or different uploads of the same song.
- Local storage is inspectable. The privacy goal is preventing accidental disclosure within the interface, not preventing deliberate device inspection.

## Delivery

The [phased plan](plans/v1-phased-plan.md) records how v1 was first built. The real-device feasibility and pilot checks must be reported honestly; automated browser checks do not substitute for physical phone testing.

Detailed behavior is defined in [game rules](game-rules.md), implementation boundaries in [architecture](architecture.md), and acceptance scenarios in [testing](testing.md).
