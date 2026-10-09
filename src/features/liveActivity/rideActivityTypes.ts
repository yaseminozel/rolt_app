/** What the ride Live Activity shows; plain values only (they cross into the widget extension). */
export type RideActivityStatus = 'recording' | 'weak' | 'paused';

export type RideActivityProps = {
  status: RideActivityStatus;
  statusLabel: string;
  /** "ROLT", or the route's name while navigating. */
  title: string;
  /** When the ride clock would have started had it never paused (now − counted time). */
  timerStartMs: number;
  /** The system runs the clock by itself; while false it stands still at `pausedAtMs`. */
  timerRunning: boolean;
  pausedAtMs: number;
  distance: string;
  distanceLabel: string;
  durationLabel: string;
  speed: string;
  speedLabel: string;
  /** Next maneuver while navigating ("400 m sonra sağa dön"); empty in a free ride. */
  instruction: string;
  /** Road or stop under the maneuver. */
  instructionDetail: string;
  accent: string;
  warning: string;
  muted: string;
};
