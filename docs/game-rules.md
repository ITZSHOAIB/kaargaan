# Game rules

## Setup and private submissions

- Use 3–10 players with distinct names, one theme, and an equal number of songs per player: 1–5, default 3.
- The host is a competing player and enters their own submissions privately too.
- Each player privately takes the game phone, selects their name, and imports a song slip or enters links manually. Completed selections are hidden on handoff.
- All players must have the required number of valid, distinct video IDs before play starts. A duplicate requires replacement, without disclosure of whose selection it duplicated.
- Setup edits require an intentional private handoff. The public setup overview shows only names and completion, not songs or import order.
- Starting freezes the roster, theme and submissions. Shuffle all submissions once and retain that order through reloads. Every submission is one round.

## A round

1. Show the current song's visible YouTube player and host controls, never the owner or future queue. Song titles and artists need not be hidden.
2. Host starts playback. Use the external link if necessary, then return to the same round. Playback completion does not automatically change the round.
3. Discuss the owner aloud. The owner participates and bluffs like everyone else.
4. Host records spoken votes in a displayed order. The first voter rotates by one roster position each round, including after skipped rounds. All players can see recorded votes.
5. Votes can change until reveal. Players cannot vote for themselves. The owner must cast a bluff vote; the UI must not treat that player differently before reveal.
6. Reveal is enabled only when every player has a vote. Revealing locks the votes, shows ownership and applies the result once.
7. The host advances to the next round when the group is ready.

There is no automatic discussion or voting timer. A player who cannot vote pauses completion; the host must not invent their vote. Roster changes require a new game.

## Scoring

Count correct votes from non-owners only.

| Correct guessers | Award |
| --- | --- |
| None | Owner receives 10 points. |
| Exactly one | That guesser receives 10 points; owner receives 0. |
| Two or more | Each correct guesser receives 5 points; owner receives 0. |

Incorrect guesses earn 0. The owner's bluff vote never earns points. Scores are not split from a fixed pool: three correct guessers each receive 5.

Example: Four players hear A's song. A votes for B. If B alone votes for A, B earns 10. If B and C vote for A, each earns 5. If nobody votes for A, A earns 10.

Once revealed, neither votes nor scoring can be edited. Repeated reveal actions and reloads must preserve the existing result.

## Skips and unavailable songs

The host can retry playback or skip an unresolved round after embedded/external attempts fail. Skip is available before reveal, closes the round, discards its scoring relevance, and awards no points. It does not reveal ownership. Skipped songs are not requeued or replaced during play.

This can leave a player with fewer owner-scoring opportunities; the group accepts this tradeoff to keep the game moving. If all rounds are skipped, show “No scored rounds” rather than declaring every player a winner.

## Finish and recovery

Highest score wins; tied leaders share the win. Display the final standings after the last resolved or skipped round. Do not disclose skipped ownership in the final screen.

The current game is saved after actions and resumes after reload. Private setup resumes covered. Keep the final result until an explicit deletion or confirmed replacement with a new game; no past-game archive is retained.
