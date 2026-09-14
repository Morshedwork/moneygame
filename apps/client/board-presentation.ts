import { boardPosition } from "../../packages/game-rules";
import { createWalkPath, sampleWalkPath, travelEnvelope, type WalkPath } from "./locomotion";
import { DIE_MS, DIE_ROLL_MS } from "./dice-animation";
export { DIE_MS, DIE_ROLL_MS, DIE_HOLD_MS, DIE_NORMALS, dieRotation } from "./dice-animation";

const routes = new WeakMap<RollEvent, WalkPath>();

// Give every accepted die step enough visible time for a complete, synced stride.
export const STEP_MS = 800;
// The exported LEAD Walk clip is just over two seconds long.
export const CHOICE_STEP_MS = 2200;
export const WALK_TURN_MS = 180;
export const WALK_LAND_MS = 220;
export const TILE_TOP = .31;
export function pawnPosition(tile: number): [number, number, number] {
  const [x, , z] = boardPosition(tile);
  return [x, TILE_TOP, z];
}
export type RollEvent = {
  id: string;
  value: number;
  from: number;
  path: number[];
  replacement: boolean;
  started: number;
  kind?: 'walk';
};
export function sampleRoll(event: RollEvent | null, elapsed: number, position: number, reduced = false) {
  const choiceWalk = event?.kind === 'walk';
  const leadIn = choiceWalk ? event.path.length ? WALK_TURN_MS : 0 : DIE_MS;
  const stepMs = choiceWalk ? CHOICE_STEP_MS : STEP_MS;
  const walkingEnd = leadIn + (event?.path.length ?? 0) * stepMs;
  const duration = event ? walkingEnd + (choiceWalk && event.path.length ? WALK_LAND_MS : 0) : 0;
  const time = reduced ? duration : Math.max(0, elapsed);
  const complete = !event || time >= duration;
  const rolling = !!event && !choiceWalk && !complete && time < leadIn;
  const turning = choiceWalk && !complete && time < leadIn;
  const arriving = choiceWalk && !complete && time >= walkingEnd;
  const walking = !!event && !complete && time >= leadIn && time < walkingEnd;
  const step = Math.max(0, Math.floor((time - leadIn) / stepMs));
  const tile = complete ? position : arriving ? event!.path.at(-1)! : step === 0 ? event!.from : event!.path[step - 1];
  let point = pawnPosition(tile);
  let facing = 0;
  let walkProgress = arriving ? 1 : 0;
  if (choiceWalk && !complete && event.path.length) {
    const directionStep = Math.min(step, event.path.length - 1);
    const from = pawnPosition(directionStep === 0 ? event.from : event.path[directionStep - 1]);
    const to = pawnPosition(event.path[directionStep]);
    facing = Math.atan2(to[0] - from[0], to[2] - from[2]);
  }
  if (walking) {
    const next = boardPosition(event!.path[step]);
    const t = ((time - leadIn) % stepMs) / stepMs;
    walkProgress = t;
    facing = Math.atan2(next[0] - point[0], next[2] - point[2]);
    point = [point[0] + (next[0] - point[0]) * t, TILE_TOP, point[2] + (next[2] - point[2]) * t];
  }
  // Preserve tile timing for the rule/UI clock. Rendering follows the same route
  // by arc length, easing at the ends and rounding corners without stopping.
  let motionPoint = point, motionFacing = facing, travelDistance = 0, moveSpeed = 0;
  if (event?.path.length) {
    let route = routes.get(event);
    if (!route) { route = createWalkPath([event.from, ...event.path].map(pawnPosition)); routes.set(event, route); }
    const seconds = event.path.length * stepMs / 1000;
    const envelope = travelEnvelope((time - leadIn) / (seconds * 1000), seconds);
    const motion = sampleWalkPath(route, envelope.progress);
    motionPoint = complete ? point : motion.point;
    motionFacing = motion.facing;
    travelDistance = motion.distance;
    moveSpeed = walking ? route.length / seconds * envelope.speed : 0;
  }
  return { complete, rolling, walking, turning, arriving, choiceWalk, walkProgress, tile, point, facing, motionPoint, motionFacing, travelDistance, moveSpeed, dieProgress: rolling ? Math.min(1, time / DIE_ROLL_MS) : 1, duration };
}
/** Spend visible animation time only; a delayed frame must not skip a stride. */
export function advanceWalkElapsed(elapsed: number, delta: number, active = true) {
  return elapsed + (active ? Math.min(80, Math.max(0, delta)) : 0);
}
export type BoardPresentation = ReturnType<typeof sampleRoll> & { value: number; replacement: boolean };
