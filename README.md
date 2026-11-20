# KaarGaan

**কার গান? — Whose song?**

A music bluffing game for friends in the same room. Everyone secretly picks songs on their own phone. One phone (the host's) plays them one by one. The room argues, votes on whose song it is, and the owner tries to throw everyone off.

## How a game goes

1. **Host a game.** The host opens KaarGaan, sets a theme and 2 or 3 songs each, and shares the invite link.
2. **Seal a card.** Each player opens the invite on their own phone, pastes YouTube links and sends back a sealed card link. Nobody can see the songs inside, not even the host.
3. **Collect the cards.** The host's phone gathers every card in the lobby. The host seals their own songs there too, and then starts the game.
4. **Play.** The host phone plays each song. Anyone taps their name and picks whose song it is, changing their mind as often as they like until the reveal.
5. **Reveal.** The owner and the song title are shown, along with who guessed what and the points. After the last song come final scores, awards and the night's playlist.

Scoring: the owner gets 10 if nobody guesses them. A lone correct guesser gets 10. Two or more correct guessers get 5 each. Full rules are in [docs/game-rules.md](docs/game-rules.md).

## Tech

React 19 + TypeScript + Vite PWA with plain CSS (`src/styles/buzzer.css`). There is no backend: the game lives in the host phone's local storage, and cards travel as AES-GCM sealed links. It's hosted statically on Cloudflare Pages at `kaargaan.sohab.dev`. Songs need an internet connection because playback uses the official YouTube embed.

```sh
npm install
npm run dev        # local dev server
npm test           # unit tests (Vitest)
npm run test:e2e   # browser tests (Playwright; builds and serves the app)
npm run lint
npm run build
```

## Reading order

1. [Product requirements](docs/PRD.md)
2. [Game rules](docs/game-rules.md)
3. [Domain glossary](CONTEXT.md)
4. [Architecture](docs/architecture.md)
5. [Data contracts](docs/data-contracts.md)
6. [Testing and acceptance](docs/testing.md)
7. [Interface](DESIGN.md)
8. [Architectural decisions](docs/adr/README.md)

## Boundaries

- Ownership stays hidden in ordinary use, including from the host. This is a trusted-group game, not anti-cheat: the host phone's storage holds every answer.
- No accounts, servers, music downloads or history archive.
- Deployment needs explicit authorization.
