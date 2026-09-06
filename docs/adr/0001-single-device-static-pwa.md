# ADR 0001: Single-device static PWA

**Status:** Accepted  
**Date:** 2026-09-06

KaarGaan is for friends physically together and should not need operated backend infrastructure. The game runs entirely on one shared phone, with the host recording spoken votes and browser storage retaining the current game. Deploy static assets on Cloudflare Pages without Functions or Workers.

## Alternatives and consequences

The earlier individual-phone voting design needed synchronized state, for which a Worker and Durable Object per room were considered. That design was rejected in favor of one-device play. Peer-to-peer synchronization would add connection and recovery complexity without benefiting the chosen experience.

Everyone can compete, including the host, because ordinary screens conceal answers. Full ownership is necessarily present on the game device, so deliberate storage inspection can reveal it. The trusted friend group accepts that boundary. Music still needs internet; “no backend” does not mean fully offline playback.
