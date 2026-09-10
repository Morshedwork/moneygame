import { boardPosition } from "../../packages/game-rules";

export const DIE_MS = 700;
export const STEP_MS = 340;
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
};
// These are the actual normals exported by tools/blender/build_props.py.
export const DIE_NORMALS = [[0, 1, 0], [0, 0, 1], [1, 0, 0], [-1, 0, 0], [0, 0, -1], [0, -1, 0]];
export function dieRotation(value: number): [number, number, number] {
  return ([
    [0, 0, 0], [-Math.PI / 2, 0, 0], [0, 0, Math.PI / 2],
    [0, 0, -Math.PI / 2], [Math.PI / 2, 0, 0], [Math.PI, 0, 0],
  ] as [number, number, number][])[Math.max(1, Math.min(6, value)) - 1];
}
export function sampleRoll(event: RollEvent | null, elapsed: number, position: number, reduced = false) {
  const duration = event ? DIE_MS + event.path.length * STEP_MS : 0;
  const time = reduced ? duration : Math.max(0, elapsed);
  const complete = !event || time >= duration;
  const rolling = !!event && !complete && time < DIE_MS;
  const walking = !!event && !complete && !rolling;
  const step = Math.max(0, Math.floor((time - DIE_MS) / STEP_MS));
  const tile = complete ? position : step === 0 ? event!.from : event!.path[step - 1];
  let point = pawnPosition(tile);
  let facing = 0;
  if (walking) {
    const next = boardPosition(event!.path[step]);
    const t = ((time - DIE_MS) % STEP_MS) / STEP_MS;
    facing = Math.atan2(next[0] - point[0], next[2] - point[2]);
    point = [point[0] + (next[0] - point[0]) * t, TILE_TOP + Math.sin(t * Math.PI) * .13, point[2] + (next[2] - point[2]) * t];
  }
  return { complete, rolling, walking, tile, point, facing, dieProgress: rolling ? time / DIE_MS : 1, duration };
}
export type BoardPresentation = ReturnType<typeof sampleRoll> & { value: number; replacement: boolean };
