import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { loadYouTubeApi, PLAYING, UNPLAYABLE, type YTPlayer } from "../../lib/youtubePlayer";

type Props = { videoId: string; hidden: boolean; onUnplayable: (videoId: string) => void; onSkip: () => void };

/**
 * One YouTube player for the whole game; each round cues its song into it. Phones often ignore a scripted
 * play until someone has tapped the video itself, so the video stays visible and tappable.
 */
export function PlayerDock({ videoId, hidden, onUnplayable, onSkip }: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const [firstVideo] = useState(videoId);
  const [player, setPlayer] = useState<YTPlayer | null>(null);
  const [apiFailed, setApiFailed] = useState(false);
  const [shown, setShown] = useState(videoId);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [tapHint, setTapHint] = useState(false);
  const [trouble, setTrouble] = useState(false);

  // A new round starts its song from a clean slate.
  if (shown !== videoId) {
    setShown(videoId);
    setPlaying(false);
    setProgress(0);
    setTapHint(false);
    setTrouble(false);
  }

  const handleError = useEffectEvent((target: YTPlayer, code: number) => {
    // A late error from the previous song must not skip this one.
    const failed = target.getVideoData?.().video_id || videoId;
    if (failed !== videoId) return;
    if (UNPLAYABLE.includes(code)) onUnplayable(failed);
    else setTrouble(true);
  });
  const handleState = useEffectEvent((state: number) => {
    setPlaying(state === PLAYING);
    if (state === PLAYING) { setTapHint(false); setTrouble(false); }
  });

  useEffect(() => {
    const box = holder.current!;
    const mount = document.createElement("div");
    box.append(mount);
    let cancelled = false;
    let created: YTPlayer | null = null;
    loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      created = new YT.Player(mount, {
        videoId: firstVideo,
        width: "100%",
        height: "100%",
        playerVars: { playsinline: 1, rel: 0 },
        events: {
          onReady: (event) => { if (!cancelled) setPlayer(event.target); },
          onStateChange: (event) => handleState(event.data),
          onError: (event) => handleError(event.target, event.data)
        }
      });
    }, () => { if (!cancelled) setApiFailed(true); });
    return () => {
      cancelled = true;
      created?.destroy();
      box.replaceChildren();
    };
  }, [firstVideo]);

  useEffect(() => {
    if (player && player.getVideoData?.().video_id !== videoId) player.cueVideoById(videoId);
  }, [player, videoId]);

  useEffect(() => {
    if (!player) return;
    const timer = setInterval(() => {
      const duration = player.getDuration();
      setProgress(duration > 0 ? Math.min(100, Math.round((player.getCurrentTime() / duration) * 100)) : 0);
    }, 500);
    return () => clearInterval(timer);
  }, [player]);

  function play() {
    if (!player) return;
    player.playVideo();
    setTimeout(() => { if (player.getPlayerState() !== PLAYING) setTapHint(true); }, 1500);
  }

  return <section className="kg-dock" aria-label="Now playing" hidden={hidden}>
    <div className="kg-video" ref={holder} />
    {apiFailed ? <p role="alert" className="kg-notice kg-notice--warn">YouTube didn't load. Check the connection, then reload this page.</p> : null}
    {trouble
      ? <div role="alert" className="kg-notice kg-notice--warn kg-confirm">
          <p>This song didn't load. Try again, or skip it if it keeps failing.</p>
          <div className="kg-row">
            <button type="button" className="kg-btn kg-btn--small kg-btn--yellow" onClick={() => { setTrouble(false); player?.cueVideoById(videoId); }}>Try again</button>
            <button type="button" className="kg-btn kg-btn--small" onClick={onSkip}>Skip this song</button>
          </div>
        </div>
      : null}
    {player
      ? <div className="kg-dock-controls">
          {playing
            ? <button type="button" className="kg-btn kg-btn--yellow kg-btn--wide" onClick={() => player.pauseVideo()}><Pause size={22} aria-hidden="true" />Pause</button>
            : <button type="button" className="kg-btn kg-btn--yellow kg-btn--wide" onClick={play}><Play size={22} aria-hidden="true" />Play song</button>}
          <button type="button" className="kg-btn kg-btn--icon" aria-label="Play from the start" onClick={() => { player.seekTo(0, true); play(); }}><RotateCcw size={20} aria-hidden="true" /></button>
        </div>
      : apiFailed ? null : <p className="kg-small">Loading the player…</p>}
    <div className="kg-progress" role="progressbar" aria-label="Song progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>
    <p role="status" className="kg-small">{tapHint ? "Tap the video to start it." : ""}</p>
  </section>;
}
