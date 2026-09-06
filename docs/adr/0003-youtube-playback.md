# ADR 0003: Visible YouTube playback with external fallback

**Status:** Accepted  
**Date:** 2026-09-06

Players submit familiar YouTube or YouTube Music links. Use an explicitly started, visible official YouTube iframe for the current video and provide an external YouTube link when embedding fails. The host controls progression; playback events never reveal ownership, score or advance a round.

## Alternatives and consequences

External-only playback simplifies integration but requires frequent app switching. Embedded-only playback cannot handle every video. Audio extraction or a media proxy would introduce infrastructure and conflict with the selected official-player approach, so neither is part of the design.

Embedding can be disabled or unavailable, and mobile autoplay/background behavior varies. Persist the round before external playback and resume on return. Unplayable rounds can be skipped without points or ownership reveal. Do not promise automatic playback, uninterrupted background audio or offline songs. Validate actual YouTube Music selections during Phase 1.

Sources: [YouTube iframe API](https://developers.google.com/youtube/iframe_api_reference), [developer policy guide](https://developers.google.com/youtube/terms/developer-policies-guide), [YouTube Music background playback](https://support.google.com/youtubemusic/answer/6313552?hl=en).
