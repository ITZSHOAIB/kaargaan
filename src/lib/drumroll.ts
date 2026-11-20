/** Milliseconds between drumroll steps, slowing to a stop. The total is the same for every reveal. */
export const DRUMROLL_DELAYS = [70, 70, 70, 75, 80, 90, 100, 115, 130, 150, 175, 205, 240, 285, 340];

/**
 * Seats the drumroll spotlight visits, one per delay, ending on the owner. Every reveal takes the same
 * number of steps, so its length says nothing about who the owner is. It's only built after the reveal is saved.
 */
export function drumrollPath(seats: number, ownerSeat: number): number[] {
  const steps = DRUMROLL_DELAYS.length;
  const start = (((ownerSeat - (steps - 1)) % seats) + seats) % seats;
  return Array.from({ length: steps }, (_, i) => (start + i) % seats);
}
