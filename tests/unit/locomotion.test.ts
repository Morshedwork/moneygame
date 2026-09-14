import { describe, it, expect } from 'vitest';
import { advanceWalker, angleDelta, cameraRelativeInput, createWalker, createWalkPath, sampleWalkPath, travelEnvelope, turnTowards } from '../../apps/client/locomotion';
import { DIE_MS, STEP_MS, sampleRoll } from '../../apps/client/board-presentation';

const bounds = { minX: -30, maxX: 30, minZ: -30, maxZ: 30 };
describe('grounded locomotion', () => {
  it('has consistent distance at 30, 60 and 120 fps', () => {
    const results = [30, 60, 120].map(fps => {
      const walker = createWalker(0, 0);
      for (let i = 0; i < fps * 2; i++) advanceWalker(walker, 0, -3.2, 1 / fps, [], bounds);
      return walker;
    });
    expect(results[0].distance).toBeCloseTo(results[2].distance, 4);
    expect(results[1].distance).toBeCloseTo(results[2].distance, 4);
  });
  it('accelerates, brakes, and measures displacement rather than held keys', () => {
    const walker = createWalker(0, 0);
    advanceWalker(walker, 3.2, 0, 1 / 60, [], bounds);
    expect(walker.speed).toBeGreaterThan(0); expect(walker.speed).toBeLessThan(1);
    for (let i = 0; i < 120; i++) advanceWalker(walker, 3.2, 0, 1 / 60, [], bounds);
    const distance = walker.distance;
    advanceWalker(walker, 0, 0, 1 / 60, [], bounds);
    expect(walker.distance).toBeGreaterThan(distance);
    for (let i = 0; i < 60; i++) advanceWalker(walker, 0, 0, 1 / 60, [], bounds);
    expect(walker.speed).toBe(0);
  });
  it('does not tunnel through a thin wall or walk in place while blocked', () => {
    const walker = createWalker(0, 0), wall = [{ x: 1, z: 0, w: .02, d: 20 }];
    for (let i = 0; i < 50; i++) advanceWalker(walker, 6, 0, .1, wall, bounds);
    expect(walker.x).toBeLessThanOrEqual(.63); expect(walker.speed).toBe(0);
    const z = walker.z;
    for (let i = 0; i < 10; i++) advanceWalker(walker, 4, 4, .05, wall, bounds);
    expect(walker.x).toBeLessThanOrEqual(.63); expect(walker.z).toBeGreaterThan(z);
  });
  it('freezes on pause and bounds do not count as travelled distance', () => {
    const walker = createWalker(30, 0);
    advanceWalker(walker, 6, 0, .1, [], bounds);
    expect(walker.distance).toBe(0); expect(walker.speed).toBe(0);
    advanceWalker(walker, -6, 2, .1, [], bounds, true);
    expect(walker).toMatchObject({ x: 30, z: 0, speed: 0, vx: 0, vz: 0 });
  });
  it('normalizes diagonals and keeps camera-relative analog movement', () => {
    expect(cameraRelativeInput(0, -1, 0, -1, 3.2)).toEqual({ x: 0, z: -3.2 });
    const diagonal = cameraRelativeInput(1, -1, 0, -1, 3.2);
    expect(Math.hypot(diagonal.x, diagonal.z)).toBeCloseTo(3.2);
    expect(Math.hypot(...Object.values(cameraRelativeInput(.5, 0, 0, -1, 3.2)))).toBeCloseTo(1.6);
    expect(cameraRelativeInput(.05, 0, 0, -1, 3.2)).toEqual({ x: 0, z: 0 });
  });
  it('uses a bounded shortest-angle turn rather than snapping through 180 degrees', () => {
    expect(turnTowards(0, Math.PI, 1 / 60)).toBeLessThan(.12);
    const facing = turnTowards(Math.PI - .01, -Math.PI + .01, .1);
    expect(Math.abs(angleDelta(Math.PI - .01, facing))).toBeLessThan(.021);
  });
});
describe('board travel presentation', () => {
  it('starts and ends with zero speed, monotonic travel and a continuous cruise', () => {
    expect(travelEnvelope(0, 2).speed).toBe(0); expect(travelEnvelope(1, 2).speed).toBe(0);
    expect(travelEnvelope(1, 2).progress).toBeCloseTo(1);
    let before = 0;
    for (let i = 0; i <= 100; i++) { const value = travelEnvelope(i / 100, 2).progress; expect(value).toBeGreaterThanOrEqual(before); before = value; }
    expect(travelEnvelope(.5, 2).progress).toBeCloseTo(.5);
  });
  it('rounds a corner with a continuous heading and stays within the board corridor', () => {
    const path = createWalkPath([[-10, .31, -6], [-10, .31, -10], [-6, .31, -10]]);
    expect(sampleWalkPath(path, 0).point).toEqual([-10, .31, -6]);
    expect(sampleWalkPath(path, 1).point).toEqual([-6, .31, -10]);
    let before = sampleWalkPath(path, 0);
    for (let i = 1; i <= 100; i++) {
      const sample = sampleWalkPath(path, i / 100);
      expect(Math.abs(angleDelta(before.facing, sample.facing))).toBeLessThan(.15);
      expect(Math.min(sample.point[0], sample.point[2])).toBeGreaterThan(-10.5);
      expect(sample.distance - before.distance).toBeCloseTo(path.length / 100);
      before = sample;
    }
  });
  it('uses the authoritative path and finishes without a second die or position change', () => {
    const event = { id: 'motion', from: 4, path: [5, 6], value: 2, replacement: false, started: 0 };
    const frozen = JSON.stringify(event);
    const first = sampleRoll(event, DIE_MS, 6);
    expect(first.moveSpeed).toBe(0); expect(first.motionPoint).toEqual([-10, .31, -6]);
    const corner = sampleRoll(event, DIE_MS + STEP_MS, 6);
    expect(corner.motionFacing).toBeCloseTo(Math.PI * .75, 1);
    const end = sampleRoll(event, DIE_MS + STEP_MS * 2, 6);
    expect(end.motionPoint).toEqual([-6, .31, -10]); expect(end.moveSpeed).toBe(0);
    expect(JSON.stringify(event)).toBe(frozen);
    expect(sampleRoll(event, 0, 6, true).motionPoint).toEqual(end.motionPoint);
  });
});
