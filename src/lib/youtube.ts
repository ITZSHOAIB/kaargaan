import type { YouTubeLinkCheck } from "./types";

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const ALLOWED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be"
]);

export function normalizeYouTubeLink(input: string): YouTubeLinkCheck {
  const trimmed = extractLink(input.trim());
  if (!trimmed) {
    return { ok: false, error: "Paste a YouTube or YouTube Music link first." };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: "The link must be a valid https URL." };
  }

  if (url.protocol !== "https:") {
    return { ok: false, error: "Only https links are accepted." };
  }

  if (!ALLOWED_HOSTS.has(url.hostname)) {
    return { ok: false, error: "Only YouTube and YouTube Music links are supported." };
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return { ok: false, error: "Could not find a single 11-character video id in the link." };
  }

  return {
    ok: true,
    videoId,
    canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
    sourceUrl: trimmed
  };
}

function extractVideoId(url: URL): string | null {
  const host = url.hostname;
  if (host === "youtu.be") {
    const candidate = trimCandidate(url.pathname.slice(1));
    return validateCandidate(candidate);
  }

  const paths = url.pathname.split("/").filter(Boolean);
  if (paths[0] === "watch") {
    return validateCandidate(trimCandidate(url.searchParams.get("v")));
  }
  if (paths[0] === "shorts" || paths[0] === "embed" || paths[0] === "live") {
    return validateCandidate(trimCandidate(paths[1]));
  }
  if (host === "music.youtube.com" && paths[0] === "watch") {
    return validateCandidate(trimCandidate(url.searchParams.get("v")));
  }

  return null;
}

/** Pulls the link out of shared text and adds a missing scheme, so "youtu.be/…" works. */
function extractLink(input: string): string {
  const found = input.match(/(?:https?:\/\/)?(?:[a-z0-9-]+\.)*(?:youtube\.com|youtu\.be)\/\S+/i)?.[0] ?? input;
  return /^[a-z]+:\/\//i.test(found) ? found : found ? `https://${found}` : "";
}

function trimCandidate(candidate: string | null): string {
  return candidate?.trim() ?? "";
}

function validateCandidate(candidate: string): string | null {
  return VIDEO_ID_RE.test(candidate) ? candidate : null;
}

export function canonicalEmbedUrl(videoId: string) {
  return `https://www.youtube.com/embed/${videoId}`;
}
