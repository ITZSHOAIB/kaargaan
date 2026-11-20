# ADR 0007: Open voting on the host phone, embed-only playback

**Status:** Accepted. Replaces the round flow in [ADR 0003](0003-youtube-playback.md) and in the game rules before 2026-11.
**Date:** 2026-11-20

## Context

In the old round flow the host pressed "Begin voting" after listening, then read out a fixed voting order and entered each spoken vote. That made the host a referee and slowed every round. When embedding failed, the host also left the app to play the song on YouTube.

## Decision

- **Voting opens with the song.** A round has three phases: `voting`, `revealed` and `skipped`. Anyone walks up to the host phone, taps their own name tile and picks whose song it is, at any time until the reveal. They can change or take back their vote. The owner votes too, as a bluff.
- **Nothing leaks while votes are open.** The tiles show only "Voted" or "Not voted". The pick sheet never highlights a current choice, so nobody learns a vote by looking over a shoulder.
- **Reveal** needs every vote, or at least half the room (minimum 2) plus the host's confirmation. Missing players score nothing that round and are listed as "stepped out".
- **One embedded player per game.** Each round cues its song into the same player. There's no external "Open in YouTube" fallback any more:
  - The card builder warns about songs YouTube won't embed before anyone seals a card.
  - At play time, songs that are unavailable or not embeddable (errors 100, 101, 150) skip themselves. Nobody scores and the owner isn't revealed.
  - Other load errors offer "Try again" or "Skip this song".
- If the phone ignores a scripted play, the screen says "Tap the video to start it."

## Consequences

- Rounds are quicker and the host plays like everyone else. Saved games still in the old `listening` phase move to `voting` on load.
- A song can still fail at play time, for example through regional blocks. It costs that player a round, which the group accepts.
- Voting order no longer rotates; the room decides who votes when.
