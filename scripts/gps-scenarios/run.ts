// Headless GPS scenarios for the ride recorder and navigation (CLAUDE.md "GPS sağlığı").
// Run: npm run test:gps — exits non-zero when a scenario breaks its expectation.
import { buildPlan } from '@/features/navigation/directions/planBuilder';
import { NavigationTracker } from '@/features/navigation/navigationTracker';
import { LocationPowerController } from '@/features/navigation/standingPower';
import type { LocationFix, LocationPowerMode } from '@/features/navigation/types';
import { RideRecorder } from '@/features/rides/rideRecorder';

type Second = { speedMps: number; send: boolean; accuracyM: number };
type Expectation = {
  /** Whether the recording may auto-pause ("GPS zayıf" band) at all. */
  autoPause: boolean;
  /** When it may auto-pause: the first second it may happen, and the latest it must have. */
  autoPauseWithin?: [number, number];
  /** Track segments at the end (a gap starts a new one). */
  segments?: number;
  /** Recorded seconds at least (time keeps counting at a light). */
  minDurationS?: number;
  navigationStates: ('ok' | 'weak' | 'lost')[];
};

const T0 = 1_700_000_000_000;
const LAT = 36.89;
const METRES_PER_DEG_LNG = 111_320 * Math.cos((LAT * Math.PI) / 180);
const RIDING = 19.4; // 70 km/h

function run(name: string, seconds: number, at: (s: number) => Second, expect: Expectation) {
  const recorder = new RideRecorder(T0);
  const line = Array.from({ length: 300 }, (_, i) => [30.7 + (i * 100) / METRES_PER_DEG_LNG, LAT] as [number, number]);
  const navigation = new NavigationTracker(buildPlan(line, [], 2000), [], T0);
  let travelled = 0;
  const autoPausedAt: number[] = [];
  const navStates = new Set<string>();
  let shownSpeed = 0;
  for (let s = 0; s <= seconds; s += 1) {
    const now = T0 + s * 1000;
    const second = at(s);
    travelled += second.speedMps;
    if (second.send) {
      const fix: LocationFix = {
        coordinates: [30.7 + travelled / METRES_PER_DEG_LNG, LAT],
        accuracyM: second.accuracyM,
        speedMps: second.speedMps,
        headingDeg: 90,
        timestamp: now,
        receivedAt: now,
      };
      recorder.addFix(fix);
      navigation.update(fix);
    }
    recorder.tick(now);
    navStates.add(navigation.tick(now).gps);
    const snapshot = recorder.snapshot();
    if (snapshot.autoPaused) autoPausedAt.push(s);
    if (s === seconds) shownSpeed = snapshot.speedMps * 3.6;
  }
  const snapshot = recorder.snapshot();
  const problems: string[] = [];
  if (!expect.autoPause && autoPausedAt.length > 0) problems.push(`auto-paused at ${autoPausedAt[0]} s`);
  if (expect.autoPause && autoPausedAt.length === 0) problems.push('never auto-paused');
  if (expect.autoPauseWithin && autoPausedAt.length > 0) {
    const [from, to] = expect.autoPauseWithin;
    if (autoPausedAt[0] < from || autoPausedAt[0] > to) problems.push(`auto-paused at ${autoPausedAt[0]} s, expected ${from}–${to} s`);
  }
  if (expect.segments !== undefined && recorder.track().length !== expect.segments) {
    problems.push(`${recorder.track().length} segments, expected ${expect.segments}`);
  }
  if (expect.minDurationS !== undefined && snapshot.stats.durationS < expect.minDurationS) {
    problems.push(`duration ${Math.round(snapshot.stats.durationS)} s < ${expect.minDurationS} s`);
  }
  const navProblems = [...navStates].filter((state) => !expect.navigationStates.includes(state as never));
  if (navProblems.length > 0) problems.push(`navigation showed ${navProblems.join(', ')}`);
  if (Math.abs(shownSpeed - RIDING * 3.6) > 1) problems.push(`shown speed ${shownSpeed.toFixed(0)} km/h at the end`);
  console.log(`${problems.length === 0 ? 'ok  ' : 'FAIL'} ${name}${problems.length ? ` — ${problems.join('; ')}` : ''}`);
  return problems.length === 0;
}

const riding = (accuracyM = 5): Second => ({ speedMps: RIDING, send: true, accuracyM });
const results = [
  run('red light 90 s, phone sends no fixes while standing', 200, (s) =>
    s >= 60 && s < 150 ? { speedMps: 0, send: s === 60, accuracyM: 5 } : riding(),
    { autoPause: false, segments: 1, minDurationS: 199, navigationStates: ['ok'] }),
  run('red light 90 s, fixes keep coming, 8 s accuracy wobble', 200, (s) =>
    s >= 60 && s < 150 ? { speedMps: 0, send: true, accuracyM: s >= 100 && s < 108 ? 70 : 8 } : riding(),
    { autoPause: false, segments: 1, minDurationS: 199, navigationStates: ['ok'] }),
  run('riding, one 90 m fix', 120, (s) => riding(s === 50 ? 90 : 5),
    { autoPause: false, segments: 1, navigationStates: ['ok'] }),
  run('riding, 20 s at 80 m accuracy (real weak GPS)', 120, (s) => riding(s >= 50 && s < 70 ? 80 : 5),
    { autoPause: true, autoPauseWithin: [54, 56], segments: 2, navigationStates: ['ok', 'weak'] }),
  run('tunnel: riding, no fixes for 40 s', 150, (s) => ({ ...riding(), send: !(s >= 50 && s < 90) }),
    { autoPause: true, autoPauseWithin: [78, 80], segments: 2, navigationStates: ['ok', 'lost'] }),
  run('standing 4 min with no fixes at all', 320, (s) =>
    s >= 30 && s < 270 ? { speedMps: 0, send: s === 30, accuracyM: 5 } : riding(),
    { autoPause: true, autoPauseWithin: [149, 151], navigationStates: ['ok', 'lost'] }),
];

// Power levels (CLAUDE.md "GPS profili"): the source follows the controller, so in `standing`
// fixes come as an Android phone sends them (every 3 s) unless the case says otherwise.
type PowerSecond = Second & { fixSpeedMps?: number | null };
type PowerExpectation = {
  /** Mode changes in order: the mode and the window (seconds) it must happen in. */
  transitions: [LocationPowerMode, number, number][];
  autoPause: boolean;
  navigationStates: ('ok' | 'weak' | 'lost')[];
};

function runPower(
  name: string,
  seconds: number,
  at: (s: number, mode: LocationPowerMode) => PowerSecond,
  expect: PowerExpectation,
  manualPause?: { from: number; to: number },
) {
  const recorder = new RideRecorder(T0);
  const line = Array.from({ length: 300 }, (_, i) => [30.7 + (i * 100) / METRES_PER_DEG_LNG, LAT] as [number, number]);
  const navigation = new NavigationTracker(buildPlan(line, [], 2000), [], T0);
  const changes: [LocationPowerMode, number][] = [];
  let second = 0;
  const power = new LocationPowerController((mode) => changes.push([mode, second]));
  let travelled = 0;
  let autoPaused = false;
  const navStates = new Set<string>();
  for (let s = 0; s <= seconds; s += 1) {
    second = s;
    const now = T0 + s * 1000;
    if (manualPause && s === manualPause.from) {
      recorder.pause(now);
      power.setPaused(true, now);
    }
    if (manualPause && s === manualPause.to) {
      recorder.resume(now);
      power.setPaused(false, now);
    }
    const input = at(s, power.mode);
    travelled += input.speedMps;
    if (input.send) {
      const fix: LocationFix = {
        coordinates: [30.7 + travelled / METRES_PER_DEG_LNG, LAT],
        accuracyM: input.accuracyM,
        speedMps: input.fixSpeedMps === undefined ? input.speedMps : input.fixSpeedMps,
        headingDeg: 90,
        timestamp: now,
        receivedAt: now,
      };
      recorder.addFix(fix);
      power.addFix(fix, recorder.gpsQuality === 'good');
      navigation.update(fix);
    }
    recorder.tick(now);
    power.tick(now, recorder.gpsQuality === 'good');
    navStates.add(navigation.tick(now).gps);
    autoPaused ||= recorder.snapshot().autoPaused;
  }
  const problems: string[] = [];
  const shown = changes.map(([mode, s]) => `${mode}@${s}`).join(' ') || 'none';
  const matches =
    changes.length === expect.transitions.length &&
    changes.every(([mode, s], index) => {
      const [expected, from, to] = expect.transitions[index];
      return mode === expected && s >= from && s <= to;
    });
  if (!matches) problems.push(`modes ${shown}, expected ${expect.transitions.map(([m, a, b]) => `${m}@${a}–${b}`).join(' ') || 'none'}`);
  if (autoPaused !== expect.autoPause) problems.push(autoPaused ? 'auto-paused' : 'never auto-paused');
  const navProblems = [...navStates].filter((state) => !expect.navigationStates.includes(state as never));
  if (navProblems.length > 0) problems.push(`navigation showed ${navProblems.join(', ')}`);
  console.log(`${problems.length === 0 ? 'ok  ' : 'FAIL'} power: ${name}${problems.length ? ` — ${problems.join('; ')}` : ''}`);
  return problems.length === 0;
}

/** Standing: Android sends a fix every 3 s in `standing` (iOS cases override). */
const standing = (s: number, mode: LocationPowerMode, accuracyM = 8): PowerSecond => ({
  speedMps: 0,
  send: mode !== 'standing' || s % 3 === 0,
  accuracyM,
});
const powerResults = [
  runPower('stop 3 min: standing after 90 s, Android 3 s fixes, awake on the first move', 300, (s, mode) =>
    s >= 60 && s < 240 ? standing(s, mode) : riding(),
    { transitions: [['standing', 150, 150], ['active', 240, 240]], autoPause: false, navigationStates: ['ok'] }),
  runPower('red light 60 s: stays active', 200, (s, mode) => (s >= 60 && s < 120 ? standing(s, mode) : riding()),
    { transitions: [], autoPause: false, navigationStates: ['ok'] }),
  runPower('iOS standing: 1 Hz at 25 m (accuracy one step down) stays good', 300, (s, mode) =>
    s >= 60 && s < 240 ? { speedMps: 0, send: true, accuracyM: mode === 'standing' ? 25 : 8 } : riding(),
    { transitions: [['standing', 150, 150], ['active', 240, 240]], autoPause: false, navigationStates: ['ok'] }),
  runPower('creeping without GPS speed: 15 m from the stop wakes it', 260, (s, mode) =>
    s >= 60 && s < 200 ? standing(s, mode)
      : s >= 200 && s < 230 ? { ...standing(s, mode), speedMps: 1.5, fixSpeedMps: null }
        : riding(),
    { transitions: [['standing', 150, 150], ['active', 205, 212]], autoPause: false, navigationStates: ['ok'] }),
  runPower('manual pause: idle wins over standing, "Devam et" straight to active', 320, (s, mode) =>
    s >= 60 && s < 250 ? { speedMps: 0, send: mode === 'idle' ? s % 5 === 0 : true, accuracyM: 30 } : riding(),
    { transitions: [['idle', 60, 60], ['active', 250, 250]], autoPause: false, navigationStates: ['ok'] },
    { from: 60, to: 250 }),
  runPower('weak GPS while standing: back to full power', 300, (s, mode) =>
    s >= 60 && s < 260 ? standing(s, mode, s >= 200 ? 80 : 8) : riding(),
    { transitions: [['standing', 150, 150], ['active', 219, 222]], autoPause: true, navigationStates: ['ok', 'weak'] }),
];

if ([...results, ...powerResults].some((passed) => !passed)) {
  process.exitCode = 1;
}
