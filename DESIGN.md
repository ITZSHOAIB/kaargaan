# KaarGaan interface

The accepted direction is retro tabletop with bold neubrutalism. See
[ADR 0004](docs/adr/0004-tabletop-score-sheet-ui.md) for the rationale.

## Implemented system

- Paper background `#eee9dd`, sheet `#faf8f0`, ink `#18211f`, secondary text `#536056`.
- Coral `#ef7657` for primary actions; lime `#d5e467` for active navigation and round/reveal controls.
- Blue `#c7d2ed` frames playback and reveals. Listening and voting use paper sheets with explicit ink text; colored controls never inherit their foreground.
- Sticky brand header with a compact room ID at the right, mounted by the current host or player screen. Every post-creation/join step includes it.
- Crisp sheet borders, modest corner radii, and a small offset shadow on the home primary action.
- Listening, voting, and reveal are separate steps. Desktop places the live score sheet beside the active step; phones place it below.
- Collection is a centered single column on every device. Accepted entries replace scanning with confirmation and a discard action.
- Final standings use a lime winner banner, trophy seal, real tied ranks, and a short confetti burst. Zero-point games do not crown a winner.
- Motion is finite and decorative, with reduced-motion support. Step changes restore focus and scroll to the current heading.
- Focus outlines, native selects, readable input text, and text labels alongside navigation icons.

Tokens and shared layout classes live in `src/index.css`. Do not reintroduce global overrides
that reinterpret unrelated Tailwind color classes. Extend the explicit sheet and action styles.

## Verification scope

Chromium checks cover 320px, 390px, 768px, and 1280px layouts, import/confirm/discard, room identity, voting, reveal, and reload recovery. Rendered text contrast is measured against its surface, including disabled controls. YouTube is
stubbed in the browser test; real mobile playback and camera behavior still require device checks.
Private setup handoffs and comprehensive save validation remain separate functional work.
