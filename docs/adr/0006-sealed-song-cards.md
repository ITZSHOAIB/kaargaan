# ADR 0006: Sealed song cards

**Status:** Accepted. Supersedes [ADR 0002](0002-private-qr-submissions.md).
**Date:** 2026-11-20

## Context

ADR 0002 had each player take the game phone in turn and scan a plain QR song slip in private. That was slow, it needed a covered handoff screen between players, and the host still held the phone through every private step. The group wanted the host to play as an equal and to collect songs without the phone changing hands.

## Decision

1. **Invite.** The host opens the lobby and shares an invite link, `/card#i=<base64url JSON>`. It holds the game id, a random 128-bit key, the theme, songs per player and the host's name. It lives in the URL fragment, so it never reaches a server.
2. **Card.** Each player opens the invite on their own phone, types their name and pastes their YouTube links. The card is sealed with AES-GCM using a key derived from the invite, then shared back as `/stage#c=kg2.<base64url>`: a link, a QR or plain text.
3. **Lobby.** The host's phone opens or pastes each card. It accepts only cards for this game and shows a name and "Sealed" status, never the songs. The host seals their own songs the same way, on the host phone.
4. **Clashes.**
   - The same video in two cards asks only the incoming player to swap. It never names who already has the song.
   - The same name asks the host to confirm a replacement.
   - A resend from the same phone (same player key) updates that player's slot.

## Consequences

- The seal keeps songs off every screen and out of chat previews until the reveal. It is **not** protection against the host. The host phone holds the key, and the saved game sits in local storage. This is the same trusted-group boundary as ADR 0001.
- Starting the game freezes the roster and songs into the saved game, and the lobby is cleared.
- Cards made for an old invite (wrong game id or song count) are rejected with a message that names the fix.
- Card links opened anywhere other than the host phone say where they belong instead of failing silently.
