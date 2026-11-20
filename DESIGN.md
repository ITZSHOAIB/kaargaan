# KaarGaan interface

The accepted direction is **Buzzer Night**, a game-show look for a noisy room at night. See [ADR 0005](docs/adr/0005-buzzer-night-interface.md) for why.

## System

- Tokens and every component live in `src/styles/buzzer.css`. It's plain CSS: no utility framework or component library.
  - Stage blue `#2430d9`, navy outlines `#14185c`.
  - Yellow `#ffd23f` and pink `#ff4f8b` for actions, green `#3ddc97` for done.
  - Six player colours, assigned by `nth-child`.
- Font: Baloo Da 2, for both the Latin text and the Bengali wordmark কার গান?
- Chunky 3px navy borders and a "lift" shadow on primary buttons; the button presses down on tap.
- Components: `kg-panel` (white card), `kg-btn` (yellow, pink, quiet, small and icon variants), `kg-notice`, `kg-sheet` (native `<dialog>`), `kg-tile` (vote tile), `kg-sealed` (the tilted song card), `kg-avatar`.
- Layout: one centred column up to 560px, phone first. Each screen has an eyebrow, a big title and one main action.

## Screens

| Route | Screen |
| --- | --- |
| `/` | Home: host a game or answer an invite, plus how to play. Offers to return to a game in progress. |
| `/card` | Card builder on a player's phone: name, song slots with live YouTube checks, seal, then share the card link or QR. |
| `/stage` | Host setup, then the lobby: invite, roster with sealed status, add or remove players, paste or scan cards, the host's own songs, start. |
| `/play` | One YouTube player, name tiles for voting, reveal, skip and end sheets, final scores with awards and the playlist. |

Old routes (`/host`, `/game`, `/player`, `/prepare`) redirect.

## Rules for new UI

- Never let markup, colour or order hint at a song's owner before the reveal. Vote tiles stay identical apart from name, initial and voted state.
- Every interactive element is at least 44px, has a visible focus ring on its surface and has an accessible name.
- Sheets are native `<dialog>` elements named by their title. Escape closes them and focus returns to the opener.
- Motion is part of the game show, not decoration only, so it follows these rules:
  - Animate `transform` and `opacity` only. Progress bars use `scaleX`, and button presses move without animating their shadow.
  - Never wrap or remount the YouTube dock. Animate the panels around it.
  - Before a reveal, motion, sound and buzz are the same whoever was picked. No per-tile stagger.
  - `MotionConfig reducedMotion="user"` and the global CSS rule turn movement off under reduced motion. Reveals then jump straight to the result.
  - The stage backdrop (`StageBackdrop`) is `aria-hidden`, ignores pointers, pauses when the page is hidden, quietens while a song plays and disappears under forced colours.
  - Play: each round opens with a stamp and a round track. Voted tiles get a stamp, a meter fills, and a ring pulses round **Reveal!** once everyone has voted, while the button itself stays still. Every vote gets the same sound and buzz.
  - Reveal: after the save, a drumroll (`Drumroll.tsx`, `lib/drumroll.ts`) with a fixed number of steps and fixed timing, then the reveal card springs in with rays, confetti and staggered points. A perfect bluff turns the card pink and plays a "wah". Focus moves to the reveal heading. A reload never drums or celebrates again.
  - Illustrations are inline SVG in `src/ui/art` (and small CSS drawings such as the wax seal, slot disc and envelope tally), coloured with the `.ha-*` palette classes. They're `aria-hidden`, hidden under forced colours, and never carry information that isn't also in text.
  - Card: a song slot shows a spinning disc once its link checks out; sealing stamps the card with wax and clicks the locks shut, once (not after a reload).
  - Lobby: a mailbox in the invite panel, an envelope tally of cards in, roster rows slide in, a chime when a card lands, and the ready ring on **Start the game**.
  - The motion engine (`motion`, through `LazyMotion` with `m` components) loads after first paint. Nothing may wait on it to become visible.
- Sound and buzz are one switch in the header (`SoundToggle`), on by default. Cues are synthesised with Web Audio (`src/lib/sfx.ts`), so there are no sound files.
- Forced colours keep borders and states visible.
- Every frontend change ends with axe (in the e2e suite) plus a manual keyboard pass.
