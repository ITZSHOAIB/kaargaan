# ADR 0002: Private local QR submissions

**Status:** Accepted  
**Date:** 2026-09-06

Players prefer preparing links on their own phones, but the game has no synchronized room or backend. Generate a compact local song-slip QR containing video IDs. Each player privately takes the game phone, selects their name, scans and confirms their slip, then returns to a covered handoff screen. Manual entry remains available.

## Alternatives and consequences

Having the host collect links or scan every slip in public could teach the host the answers. Network transfer would reintroduce shared infrastructure. Private scanning preserves the agreed single-device game while reducing repeated typing.

The QR is unencrypted data, not an authentication mechanism. Its contents must be validated before atomic import and must never trigger arbitrary navigation or execution. Camera compatibility needs physical-device testing; manual entry covers denied or unavailable scanning. Duplicate video IDs require private replacement without identifying the earlier owner.
