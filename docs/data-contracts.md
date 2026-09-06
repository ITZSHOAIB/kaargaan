# Local data contracts

Status: v1 design contract; these are specifications, not implemented TypeScript declarations.

There is no public backend API. The two compatibility boundaries are song-slip QR data and the saved current game.

## Song links and slips

Accept HTTPS URLs for `youtube.com`, `www.youtube.com`, `m.youtube.com`, `music.youtube.com`, and `youtu.be`, using these individual-video paths:

- `/watch?v=<id>` on YouTube/YouTube Music hosts.
- `/<id>` on `youtu.be`.
- `/shorts/<id>` and `/embed/<id>` on YouTube hosts.

Extract an 11-character video ID matching `[A-Za-z0-9_-]{11}`. Reject missing/ambiguous IDs, credentials in URLs, unsupported hosts, non-HTTPS schemes, and playlist-only links. Discard other parameters; do not fetch or navigate to a submitted URL during validation. Syntax validation does not establish availability or embedding permission.

Normalize every accepted link to its video ID. Build embeds and external playback URLs from that ID. Duplicate checks use normalized IDs across all players. Different videos containing the same recording remain distinct.

Song-slip payload:

```json
{
  "format": "kaargaan-song-slip",
  "version": 1,
  "videoIds": ["abcdefghijk", "lmnopqrstuv", "12345678_-0"]
}
```

The IDs above are syntax examples, not playback fixtures. Generate QR data as JSON, not a link containing private selections. Accept 1–5 distinct valid IDs and at most 2 KB of UTF-8 payload. Reject unknown formats/versions and malformed fields before changing the game. A slip must contain exactly the current game's songs-per-player count when imported.

No owner, theme, script, HTML, network destination, or automatic navigation is supplied by the QR. The private setup screen chooses the target player. A confirmed valid import replaces that player's entire setup selection atomically. Duplicate checks exclude that player's replaced selection, so rescanning their same slip does not incorrectly clash with itself. Duplicates against another player's selection require replacement without naming that player.

Use the same validation functions for QR and manual entry. Partial invalid imports must never erase an earlier valid selection.

## Domain types

| Type | Minimum data and constraints |
| --- | --- |
| `Player` | Stable local ID and display name. Trim names; require 1–40 characters and case-insensitive uniqueness. |
| `Submission` | Stable local ID, owner player ID and normalized video ID. Exactly one owner. |
| `Vote` | Voter ID and guessed owner ID. Both must be current players; no self-vote. |
| `RoundResult` | Either revealed with awarded points by player, or skipped with no awards. At most one result per round. |
| `Round` | Stable ID, submission ID, phase, votes indexed by voter, and optional result. |
| `Game` | Stable ID, theme, song count, ordered roster, submissions, ordered rounds, active round index, status and save revision. |

Theme is nonempty trimmed text, maximum 120 characters. Stable IDs are locally generated; they are not authentication credentials. No display names, theme values or user content should be rendered as HTML.

## Current-game save

Use the key `kaargaan.current-game.v1` with a JSON envelope containing `format: "kaargaan-current-game"`, `version: 1`, `savedAt` and `game`. Personal preparation drafts are in-memory and not part of this save.

The game holds:

- Setup configuration and selections, including owner associations.
- A persisted round order generated once at start; no rerandomization on resume.
- Current phase and votes, including bluff votes.
- Revealed and skipped results. Standings are derived from revealed results, not maintained as a separate incrementing score.
- A monotonically increasing save revision to detect stale writes from another tab.

Round phases are `listening`, `voting`, `revealed`, and `skipped`. Game status is `setup`, `playing`, or `completed`. Private-screen visibility is not persisted as an unlocked state: resume through the handoff cover.

Validate references, limits, phases and result consistency when loading. Unsupported versions or corrupted state produce a visible recovery error without deleting the save. No historical migrations are needed initially; future incompatible changes must define a migration or explicit reset path before release.

## Actions and invariants

| Action | Required behavior |
| --- | --- |
| Configure setup | Allowed only before start; configuration changes that invalidate existing picks require explicit confirmation. |
| Replace player selections | Setup only; validate all picks before atomically replacing them. |
| Start game | Require 3–10 unique players and complete valid selections; freeze setup and persist the shuffled queue. |
| Begin voting | Current listening round only; playback status does not determine progress. |
| Record/change vote | Current voting round only; validate both players and reject self-votes. |
| Reveal | Require all votes; compute the result once, lock votes, and persist. Repeat reveal cannot add another result or award. |
| Skip | Current unresolved round only; retain no scoring award and never reveal ownership. |
| Next round | Current result must exist; advance once, or complete the game at the end. |
| Replace/delete game | Explicit user action; replacing existing progress requires confirmation. |

Save each state-changing action and before opening external playback. If saving fails, retain in-memory progress and surface the recovery limitation. If another tab changes the saved revision, block stale changes and request reload. Do not claim multi-tab coordination.

Public views receive only what the current phase needs. Owner IDs and future songs must not appear in public DOM, accessible text, navigation state, logs or shareable URLs. Full owner data remains in local storage under the agreed trusted-group model.
