import { roomCode } from "../lib/room";
import { useContext } from "react";
import { createPortal } from "react-dom";
import { RoomHeaderTarget } from "../lib/roomHeader";

export function RoomSubheader({ roomId }: { roomId: string }) {
  const target = useContext(RoomHeaderTarget);
  if (!target || !roomId) return null;
  return createPortal(
    <div className="room-subheader" title={`Full room ID: ${roomId}`} aria-label={`Room ID ${roomCode(roomId)}`}>
      <span>Room</span>
      <strong>{roomCode(roomId)}</strong>
    </div>, target
  );
}
