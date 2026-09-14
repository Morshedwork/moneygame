/** Deterministic presentation math. Never advances a turn or draws a game die. */
export type Point3 = [number, number, number];
export const WALK_STRIDE = 1.1;
export const RUN_STRIDE = 1.8;
export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
export const smooth01 = (value: number) => { const t = clamp01(value); return t * t * (3 - 2 * t); };
export const angleDelta = (from: number, to: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
export function turnTowards(from: number, to: number, seconds: number, maxRate = 7) {
  const angle = angleDelta(from, to), dt = Math.max(0, seconds);
  return from + Math.sign(angle) * Math.min(Math.abs(angle) * (1 - Math.exp(-12 * dt)), maxRate * dt);
}

/** Velocity ramps only at departure/arrival, not once on every board tile. */
export function travelEnvelope(time: number, seconds: number) {
  const t = clamp01(time), r = Math.min(.18, .24 / Math.max(.1, seconds));
  const distance = t < r ? t * t / (2 * r) : t > 1 - r ? 1 - r - (1 - t) ** 2 / (2 * r) : t - r / 2;
  const speed = t < r ? t / r : t > 1 - r ? (1 - t) / r : 1;
  return { progress: distance / (1 - r), speed: speed / (1 - r) };
}

type PathSample = { point: Point3; facing: number; distance: number };
export type WalkPath = { samples: PathSample[]; length: number };
export function createWalkPath(points: Point3[]): WalkPath {
  const samples: PathSample[] = [], tangent = (i: number): Point3 => {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
    const scale = i === 0 || i === points.length - 1 ? 1 : .5;
    return [(b[0] - a[0]) * scale, (b[1] - a[1]) * scale, (b[2] - a[2]) * scale];
  };
  let distance = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1], m = tangent(i), n = tangent(i + 1);
    for (let j = i === 0 ? 0 : 1; j <= 32; j++) {
      const t = j / 32, t2 = t * t, t3 = t2 * t;
      const point = a.map((v, k) => (2 * t3 - 3 * t2 + 1) * v + (t3 - 2 * t2 + t) * m[k] + (-2 * t3 + 3 * t2) * b[k] + (t3 - t2) * n[k]) as Point3;
      const derivative = a.map((v, k) => (6 * t2 - 6 * t) * v + (3 * t2 - 4 * t + 1) * m[k] + (-6 * t2 + 6 * t) * b[k] + (3 * t2 - 2 * t) * n[k]);
      const previous = samples.at(-1)?.point;
      if (previous) distance += Math.hypot(...point.map((v, k) => v - previous[k]));
      samples.push({ point, facing: Math.atan2(derivative[0], derivative[2]), distance });
    }
  }
  if (!samples.length) samples.push({ point: points[0] ?? [0, 0, 0], facing: 0, distance: 0 });
  return { samples, length: distance };
}
export function sampleWalkPath(path: WalkPath, fraction: number): PathSample {
  const distance = clamp01(fraction) * path.length;
  let lo = 0, hi = path.samples.length - 1;
  while (lo < hi) { const mid = Math.floor((lo + hi) / 2); if (path.samples[mid].distance < distance) lo = mid + 1; else hi = mid; }
  const b = path.samples[lo], a = path.samples[Math.max(0, lo - 1)];
  const t = b.distance > a.distance ? (distance - a.distance) / (b.distance - a.distance) : 0;
  return { point: a.point.map((v, k) => v + (b.point[k] - v) * t) as Point3, facing: a.facing + angleDelta(a.facing, b.facing) * t, distance };
}

export type Collider = { x: number; z: number; w: number; d: number };
export type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };
export type Walker = { x: number; z: number; vx: number; vz: number; facing: number; distance: number; speed: number };
export function createWalker(x: number, z: number): Walker { return { x, z, vx: 0, vz: 0, facing: 0, distance: 0, speed: 0 }; }
/** Fixed-size collision substeps avoid thin-wall tunnelling and frame-rate drift. */
export function advanceWalker(state: Walker, desiredX: number, desiredZ: number, seconds: number, colliders: Collider[], bounds: Bounds, paused = false) {
  if (paused) { state.vx = state.vz = state.speed = 0; return state; }
  const dt = Math.min(.1, Math.max(0, seconds));
  if (!dt) return state;
  const steps = Math.ceil(dt / (1 / 120)), h = dt / steps;
  const before = state.distance;
  const free = (x: number, z: number) => !colliders.some(c => Math.abs(x - c.x) < c.w / 2 + .36 && Math.abs(z - c.z) < c.d / 2 + .36);
  for (let i = 0; i < steps; i++) {
    const damping = 1 - Math.exp(-h * (Math.hypot(desiredX, desiredZ) < .01 ? 20 : 11));
    state.vx += (desiredX - state.vx) * damping;
    state.vz += (desiredZ - state.vz) * damping;
    if (Math.hypot(state.vx, state.vz) < .008 && !desiredX && !desiredZ) state.vx = state.vz = 0;
    const x = Math.max(bounds.minX, Math.min(bounds.maxX, state.x + state.vx * h));
    const z = Math.max(bounds.minZ, Math.min(bounds.maxZ, state.z + state.vz * h));
    const oldX = state.x, oldZ = state.z;
    if (free(x, state.z)) state.x = x; else state.vx = 0;
    if (free(state.x, z)) state.z = z; else state.vz = 0;
    const dx = state.x - oldX, dz = state.z - oldZ;
    state.distance += Math.hypot(dx, dz);
    if (Math.hypot(dx, dz) > .0001) state.facing = turnTowards(state.facing, Math.atan2(dx, dz), h);
  }
  state.speed = (state.distance - before) / dt;
  return state;
}

/** Small analog inputs stay small; diagonal keyboard movement cannot run faster. */
export function cameraRelativeInput(x: number, z: number, forwardX: number, forwardZ: number, speed: number) {
  const magnitude = Math.hypot(x, z);
  if (magnitude < .12) return { x: 0, z: 0 };
  const factor = Math.min(1, magnitude) / magnitude;
  const forwardLength = Math.hypot(forwardX, forwardZ) || 1;
  const fx = forwardX / forwardLength, fz = forwardZ / forwardLength;
  return { x: (-z * fx - x * fz) * factor * speed, z: (-z * fz + x * fx) * factor * speed };
}
