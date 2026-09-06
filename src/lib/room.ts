export function roomCode(roomId: string): string {
  return roomId.replaceAll("-", "").slice(0, 8).toUpperCase();
}
