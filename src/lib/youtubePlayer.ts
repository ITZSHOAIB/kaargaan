/** The slice of YouTube's iframe API the stage uses. */
export type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  cueVideoById(videoId: string): void;
  getVideoData?(): { video_id?: string };
  destroy(): void;
};
type YTEvent = { target: YTPlayer; data: number };
type YTOptions = {
  videoId: string;
  width: string;
  height: string;
  playerVars: Record<string, number>;
  events: { onReady(event: { target: YTPlayer }): void; onStateChange(event: YTEvent): void; onError(event: YTEvent): void };
};
export type YTNamespace = { Player: new (element: HTMLElement, options: YTOptions) => YTPlayer };

declare global {
  interface Window { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void }
}

export const PLAYING = 1;
/** Error codes for a video that can't be found or won't play outside YouTube. Others may pass on a retry. */
export const UNPLAYABLE = [100, 101, 150];

let api: Promise<YTNamespace> | null = null;

export function loadYouTubeApi(): Promise<YTNamespace> {
  api ??= new Promise((resolve, reject) => {
    if (window.YT?.Player) { resolve(window.YT); return; }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { previous?.(); resolve(window.YT!); };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => { api = null; reject(new Error("YouTube didn't load.")); };
    document.head.append(script);
  });
  return api;
}
