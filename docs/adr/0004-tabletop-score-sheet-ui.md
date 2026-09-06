# ADR 0004: Tabletop score-sheet interface

## Status

Accepted

## Context

KaarGaan is played on one shared phone in a noisy room. The host needs to see the current
round, playback action, public votes and score state at a glance. The interface must feel like a
social game rather than a private dashboard, while remaining readable on a narrow phone screen.

Three visual directions were prototyped in `prototype/kaargaan-ui.html`. The group selected the
tabletop score-sheet direction (Variant A).

## Decision

The visual direction is **retro tabletop party game with restrained neubrutalism**. Variant A
remains the foundation: the score sheet supplies the structure, and music supplies the personality.
This direction fits people playing together around one phone and keeps the host's controls readable.

Use a warm paper-like surface with dark ink text, a lime round marker, coral primary actions and a
blue playback panel. Organize the round as a record sheet: the current song and host controls are
the main working area, while the public vote ledger and standings sit beside or below it.

The production UI should preserve these principles:

- The current round is the visual anchor.
- Round number and theme remain visible without competing with the song.
- Playback, voting and reveal are explicit actions with clear state changes.
- The vote ledger is public and editable until reveal.
- Scores are visible context, not the primary screen on every action.
- Mobile layout stacks the song record before votes and standings.
- On phones, the current round and next action take priority over branding and status panels.
- Use bold, slightly playful headings with straightforward labels and readable player names.
- Use crisp borders and small offset shadows selectively on key controls; avoid heavy shadows
  or oversized decoration competing with the game.
- Keep playback compact, voting easy to scan, and the owner reveal celebratory.
- Use Bengali branding naturally: **কার গান?** alongside KaarGaan.

Retro futurism is not the governing style. Avoid neon console treatments, decorative meters,
tiny technical labels, and excessive paper textures that reduce readability. These are visual
guardrails, not changes to the agreed game rules.

## Consequences

The existing dark gradient shell will be replaced as the production UI is migrated. The prototype
is a visual reference only; its inline markup is not production code. Future screens should extend
the paper-and-ink system instead of introducing a separate visual language.

This document records the intended design. It does not imply that the current React screens
already meet every guideline; implementation and mobile verification remain separate work.
