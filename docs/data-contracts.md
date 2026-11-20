# Local data contracts

There's no backend API. The compatibility boundaries are the invite link, the sealed card link, and what the host phone and the players' phones keep in `localStorage`.

## Song links

Accepted: HTTPS links on `youtube.com`, `www.youtube.com`, `m.youtube.com`, `music.youtube.com` and `youtu.be` that point at one video:

- `/watch?v=<id>` on YouTube and YouTube Music.
- `/<id>` on `youtu.be`.
- `/shorts/<id>` and `/embed/<id>`.

Each link is reduced to its 11-character video id (`[A-Za-z0-9_-]{11}`). Other parameters are dropped. Playlist-only links, other hosts, non-HTTPS links and links with credentials are rejected. Duplicate checks compare video ids, so two uploads of the same song are different songs.

The card builder also asks YouTube's oEmbed endpoint about each video. This is only advisory:

| oEmbed answer | Meaning |
| --- | --- |
| 401 / 403 | Embedding switched off: warn |
| 400 / 404 | Private or gone: warn |
| Anything else | Unknown: allow |

## Invite (`/card#i=…`)

The fragment holds base64url JSON:

```json
{ "v": 2, "roomId": "<uuid>", "key": "<16 random bytes, base64url>", "theme": "Songs on repeat", "songs": 2, "host": "Rupa" }
```

`songs` is 1–5. Anything else, or any other `v`, is rejected as a broken invite. The fragment never reaches a server.

## Sealed song card (`/stage#c=kg2.…`)

The plaintext card:

```json
{ "v": 2, "roomId": "<invite roomId>", "playerKey": "<uuid kept on the player's phone>", "name": "Arjun", "videoIds": ["abcdefghijk", "lmnopqrstuv"] }
```

Sealing:
- **Key:** `SHA-256("kaargaan-card:" + roomId + ":" + key)`, imported as an AES-GCM key.
- **Payload:** `"kg2." + base64url(12-byte IV ‖ ciphertext)`.

The host finds `kg2.` codes in a full link, in shared text or as a bare code, then opens them with the lobby's invite. A card is rejected when:
- it fails to decrypt, or its `roomId` is wrong ("different game");
- its name or video ids are malformed ("damaged");
- it has the wrong number of songs, naming the fix;
- it repeats a song within itself.

`playerKey` identifies a resend from the same phone, so the new card replaces that player's songs.

## Game types

| Type | Shape |
| --- | --- |
| `Player` | `{ id, name }`, name 1–20 characters after trimming, unique ignoring case |
| `Submission` | `{ id, ownerId, videoId }` |
| `Round` | `{ id, submissionId, phase: "voting" \| "revealed" \| "skipped", votes: { [voterId]: ownerId }, result? }` |
| `RoundResult` | `{ kind: "revealed", ownerId, awards: { [playerId]: points }, absentIds? }` or `{ kind: "skipped" }` |
| `Game` | `{ id, roomId?, theme, songsPerPlayer, players, submissions, rounds, activeRoundIndex, status: "setup" \| "playing" \| "completed", endedEarly?, saveRevision }` |

Standings and awards are worked out from round results; they're never stored.

## Storage keys

| Key | Phone | Holds |
| --- | --- | --- |
| `kaargaan.current-game.v1` | host | The game, as `{ format: "kaargaan-current-game-encoded", version: 1, encoding: "base64", savedAt, payload }`, so owners don't show at a glance in dev tools. The plain `kaargaan-current-game` envelope is still read. |
| `kaargaan.stage-setup.v2` | host | Setup form: host name, theme, songs, same crew. |
| `kaargaan.stage-lobby.v2` | host | Lobby: invite, host id, players with sealed status and card contents, pending replacement. Cleared on start. |
| `kaargaan.crew.v1` | host | Last game's host name, other names, theme and song count, for a rematch. |
| `kaargaan.card-draft.v2` | player | The invite, player key, name, links and last sealed card. |

Saves from the old pass-the-phone flow are deleted on load: `kaargaan.host-setup.v1`, `kaargaan.player-setup.v1` and `kaargaan.phase1.snapshot.v1`.

## Actions and invariants

| Action | Rule |
| --- | --- |
| Import card | Must be for this game, with the right song count. A video already in the game marks the incoming player "swap needed" without naming the other owner. A same-name card from a different phone waits for confirmation. |
| Start | 3–10 players, all sealed, no swaps. Shuffle once, save the game, then clear the lobby. |
| Record vote / clear vote | Current round in `voting` only; both players must exist; no self-votes. |
| Reveal | Every player voted, or `withoutMissing` with at least `max(2, ceil(n/2))` votes. Computes the result once; voters left out go into `absentIds`. |
| Skip | Current `voting` round only. No points, no owner. |
| Next round | The current round must be resolved. Advances, or completes the game after the last round. |
| End early | Marks the game `completed` with `endedEarly`. |

Every save bumps `saveRevision`. Saving over a different revision of the same game throws "changed in another tab", and the UI asks for a reload. Games saved while a round was in the retired `listening` phase load with that round in `voting`.
