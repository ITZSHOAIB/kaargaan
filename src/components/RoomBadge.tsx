import { roomCode } from "../lib/room";

export function RoomBadge({ roomId }: { roomId: string }) {
  return (
    <div className="room-badge" title={`Full room ID: ${roomId}`} aria-label={`Room ID ${roomCode(roomId)}`}>
      <span>Room ID</span>
      <strong>{roomCode(roomId)}</strong>
      <small>Match this code before sharing songs</small>
    </div>
  );
}

export function RoomSubheader({ roomId }: { roomId: string }) {
  return (
    <div className="room-subheader" title={`Full room ID: ${roomId}`} aria-label={`Room ID ${roomCode(roomId)}`}>
      <span>Room ID</span>
      <strong>{roomCode(roomId)}</strong>
      <small>Match this code with everyone before sharing songs</small>
    </div>
  );
}
