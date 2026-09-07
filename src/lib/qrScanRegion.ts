/** Match the centered square shown by object-fit: cover, including its outer edges. */
export function qrScanRegion(video: Pick<HTMLVideoElement, "videoWidth" | "videoHeight">) {
  const size = Math.min(video.videoWidth, video.videoHeight);
  return {
    x: Math.round((video.videoWidth - size) / 2),
    y: Math.round((video.videoHeight - size) / 2),
    width: size,
    height: size,
    downScaledWidth: Math.min(size, 1024),
    downScaledHeight: Math.min(size, 1024)
  };
}
