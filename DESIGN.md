# KaarGaan interface

The accepted direction is retro tabletop with restrained neubrutalism. See
[ADR 0004](docs/adr/0004-tabletop-score-sheet-ui.md) for the rationale.

## Implemented system

- Paper background `#eee9dd`, sheet `#faf8f0`, ink `#18211f`, secondary text `#536056`.
- Coral `#ef7657` for primary actions; lime `#d5e467` for active navigation and round/reveal controls.
- Blue `#c7d2ed` frames playback. A pale green vote sheet separates public votes from playback.
- Compact brand and navigation, followed immediately by the current task. No status-card header.
- Crisp sheet borders, modest corner radii, and a small offset shadow on the home primary action.
- Home pairs the invitation with house rules. Game pairs playback with votes on desktop and stacks
  them on phones. Preparation uses the same sheet surfaces and readable form controls.
- Focus outlines, native selects, readable input text, and text labels alongside navigation icons.

Tokens and shared layout classes live in `src/index.css`. Do not reintroduce global overrides
that reinterpret unrelated Tailwind color classes. Extend the explicit sheet and action styles.

## Verification scope

Chromium checks cover 390px and 1280px layouts, voting, reveal, and reveal recovery. YouTube is
stubbed in the browser test; real mobile playback and camera behavior still require device checks.
Private setup handoffs and comprehensive save validation remain separate functional work.
