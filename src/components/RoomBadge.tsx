import { roomCode } from "../lib/room";

export function RoomSubheader({ roomId }: { roomId: string }) {
  return (
    <div className="room-subheader" title={`Full room ID: ${roomId}`} aria-label={`Room ID ${roomCode(roomId)}`}>
      <span>Room</span>
      <strong>{roomCode(roomId)}</strong>
    </div>
  );
}
