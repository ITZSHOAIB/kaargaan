# ADR 0005: Buzzer Night interface

**Status:** Accepted. Supersedes [ADR 0004](0004-tabletop-score-sheet-ui.md).
**Date:** 2026-11-20

## Context

The paper score-sheet look from ADR 0004 read well, but the game felt like a form. It also packed setup, handoff and round controls into one dense page. KaarGaan is played at night, in a noisy room, around one phone held at arm's length. The screen needs to be readable from across a table and feel like a party game.

Three directions were prototyped. The group picked **Buzzer Night**: a game-show look with a saturated blue stage, yellow and pink action buttons, chunky navy outlines, and one colour per player.

## Decision

- **One screen, one job.** Home, card builder, setup, lobby, play, reveal and final scores are separate screens. Each has one big next action.
- **Tokens in `src/styles/buzzer.css`.** Main colours:
  - stage blue `#2430d9`
  - navy outline `#14185c`
  - yellow `#ffd23f` and pink `#ff4f8b` for actions
  - green `#3ddc97` for done states
  - six player colours

  Font: Baloo Da 2, which also covers the Bengali wordmark কার গান?
- **Plain CSS.** No component library and no utility framework. A small layered reset sits at the top of `buzzer.css`, so component rules always win.
- **Tiles that give nothing away.** Player colours come from CSS `nth-child`. Every vote tile has identical markup, so neither the DOM nor the colours hint at the owner.
- **Accessibility is part of done.** Every screen:
  - passes axe in the e2e suite
  - has 44px or larger touch targets and visible focus rings on every surface
  - uses native `<dialog>` sheets that return focus to the control that opened them
  - honours reduced motion and works in forced-colours mode

## Consequences

The old `index.css`, Tailwind and the Radix Select wrapper are gone. New screens should reuse the `kg-` components (panel, button, notice, sheet, tile) rather than invent new surfaces. The interface is phone-first: wide screens get the same centred 560px column.
