import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { CHOICE_STEP_MS, WALK_TURN_MS, WALK_LAND_MS, advanceWalkElapsed, DIE_MS, STEP_MS, dieRotation, sampleRoll, RollEvent, pawnPosition as boardPosition } from "../../apps/client/board-presentation";
import { angleDelta, travelEnvelope } from "../../apps/client/locomotion";
const event: RollEvent = { id: "1:move", value: 2, from: 0, path: [1, 2], replacement: false, started: 0 };

describe("Blender die agrees with the trusted result", () => {
  const bytes = readFileSync("public/models/lead-die.glb");
  const gltf = JSON.parse(bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)));
  const positions: Record<number, Vector3[]> = {};
  function visit(index: number, parent = new Matrix4()) {
    const n = gltf.nodes[index];
    const local = n.matrix ? new Matrix4().fromArray(n.matrix) : new Matrix4().compose(
      new Vector3(...(n.translation || [0, 0, 0])), new Quaternion(...(n.rotation || [0, 0, 0, 1])), new Vector3(...(n.scale || [1, 1, 1])));
    const world = parent.clone().multiply(local);
    const face = /^Face ([1-6]) pip/.exec(n.name || "");
    if (face) (positions[+face[1]] ||= []).push(new Vector3().setFromMatrixPosition(world));
    for (const child of n.children || []) visit(child, world);
  }
  for (const root of gltf.scenes[gltf.scene || 0].nodes) visit(root);
  for (let value = 1; value <= 6; value++) {
    it(`shows ${value} actual Blender pips on top for a result of ${value}`, () => {
      expect(positions[value]).toHaveLength(value);
      const outward = positions[value].reduce((sum, p) => sum.add(p), new Vector3()).normalize();
      outward.applyEuler(new Euler(...dieRotation(value)));
      expect(outward.y).toBeCloseTo(1, 6);
      expect(Math.abs(outward.x) + Math.abs(outward.z)).toBeLessThan(.00001);
    });
  }
});
describe('a complete visible choice walk', () => {
  const walk: RollEvent = { ...event, kind: 'walk', value: 0, path: [1] };
  it('keeps the walk pace long enough for the exported Walk clips', () => {
    for (const name of ['lido', 'prena', 'oty', 'diva', 'sparko']) {
      const bytes = readFileSync(`public/models/${name}.glb`);
      const model = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
      const clip = model.animations.find((animation: {name: string}) => animation.name === 'Walk');
      const seconds = Math.max(...clip.samplers.map((sampler: {input: number}) => model.accessors[sampler.input].max[0]));
      expect(seconds).toBeGreaterThan(0);
      expect(CHOICE_STEP_MS).toBeGreaterThanOrEqual(seconds * 1000);
    }
  });
  it('turns, travels the grounded route, then lands before revealing the outcome', () => {
    expect(sampleRoll(walk, 0, 1)).toMatchObject({ turning: true, rolling: false, walking: false, complete: false, motionPoint: boardPosition(0), travelDistance: 0, moveSpeed: 0 });
    expect(sampleRoll(walk, WALK_TURN_MS, 1)).toMatchObject({ walking: true, walkProgress: 0, complete: false });
    const middle = sampleRoll(walk, WALK_TURN_MS + CHOICE_STEP_MS / 2, 1);
    expect(middle).toMatchObject({ walking: true, walkProgress: .5, complete: false });
    const halfway = boardPosition(0).map((coordinate, axis) => (coordinate + boardPosition(1)[axis]) / 2);
    middle.motionPoint.forEach((coordinate, axis) => expect(coordinate).toBeCloseTo(halfway[axis]));
    expect(middle.travelDistance).toBeCloseTo(2);
    expect(middle.moveSpeed).toBeGreaterThan(0);
    expect(sampleRoll(walk, WALK_TURN_MS + 1900, 1).walking).toBe(true);
    const arriving = sampleRoll(walk, WALK_TURN_MS + CHOICE_STEP_MS, 1);
    expect(arriving).toMatchObject({ arriving: true, walking: false, walkProgress: 1, complete: false, point: boardPosition(1), moveSpeed: 0 });
    arriving.motionPoint.forEach((coordinate, axis) => expect(coordinate).toBeCloseTo(boardPosition(1)[axis]));
    expect(sampleRoll(walk, WALK_TURN_MS + CHOICE_STEP_MS + WALK_LAND_MS, 1)).toMatchObject({ complete: true, motionPoint: boardPosition(1), moveSpeed: 0 });
  });
  it('walks every space across the Start corner before finishing', () => {
    const corner = { ...walk, from: 18, path: [19, 0] };
    expect(sampleRoll(corner, WALK_TURN_MS + CHOICE_STEP_MS, 0)).toMatchObject({ tile: 19, walking: true, walkProgress: 0, point: boardPosition(19) });
    expect(sampleRoll(corner, WALK_TURN_MS + CHOICE_STEP_MS * 2, 0)).toMatchObject({ tile: 0, arriving: true, complete: false });
  });
  it('cannot skip the walk because one frame was delayed or the page was hidden', () => {
    expect(advanceWalkElapsed(400, 16)).toBe(416);
    expect(advanceWalkElapsed(400, 60000)).toBe(480);
    expect(advanceWalkElapsed(400, 60000, false)).toBe(400);
    expect(advanceWalkElapsed(400, -20)).toBe(400);
  });
  it('still honors reduced motion and never replays a restored move', () => {
    expect(sampleRoll(walk, 0, 1, true)).toMatchObject({ complete: true, walking: false, arriving: false, point: boardPosition(1) });
    expect(sampleRoll(null, 0, 1)).toMatchObject({ complete: true, walking: false, point: boardPosition(1) });
  });
});
describe("one shared dice and movement clock", () => {
  it("keeps the readable die-step clock while easing the grounded render path", () => {
    expect(STEP_MS).toBeGreaterThanOrEqual(600);
    expect(STEP_MS).toBeLessThanOrEqual(850);
    const seconds = event.path.length * STEP_MS / 1000;
    for (const progress of [0, .25, .5, .75, .99]) {
      const sample = sampleRoll(event, DIE_MS + progress * STEP_MS, 2);
      expect(sample).toMatchObject({ rolling: false, walking: true, walkProgress: progress, tile: 0, complete: false });
      const envelope = travelEnvelope(progress / event.path.length, seconds);
      expect(sample.motionPoint[1]).toBeCloseTo(boardPosition(0)[1]);
      expect(sample.motionPoint[0]).toBeCloseTo(-10);
      expect(sample.travelDistance).toBeCloseTo(8 * envelope.progress);
      expect(sample.motionPoint[2]).toBeCloseTo(10 - sample.travelDistance);
      expect(sample.moveSpeed).toBeCloseTo(8 / seconds * envelope.speed);
    }
    // Tile bookkeeping still advances on schedule; the render speed does not
    // restart at every tile, so the gait can follow continuous distance.
    expect(sampleRoll(event, DIE_MS + STEP_MS, 2)).toMatchObject({ walking: true, walkProgress: 0, tile: 1, point: boardPosition(1) });
    expect(sampleRoll(event, DIE_MS + STEP_MS * 1.5, 2)).toMatchObject({ walking: true, walkProgress: .5, tile: 1 });
    const before = sampleRoll(event, DIE_MS + STEP_MS - 1, 2);
    const after = sampleRoll(event, DIE_MS + STEP_MS + 1, 2);
    expect(after.moveSpeed).toBeCloseTo(before.moveSpeed);
    expect(after.travelDistance).toBeGreaterThan(before.travelDistance);
  });
  it("accelerates and brakes once while covering the complete accepted one-space route", () => {
    const one = { ...event, value: 1, path: [1] };
    const frozen = JSON.stringify(one);
    const departure = sampleRoll(one, DIE_MS, 1);
    const early = sampleRoll(one, DIE_MS + STEP_MS * .05, 1);
    const cruise = sampleRoll(one, DIE_MS + STEP_MS * .5, 1);
    const late = sampleRoll(one, DIE_MS + STEP_MS * .95, 1);
    expect(departure.moveSpeed).toBe(0);
    expect(early.moveSpeed).toBeGreaterThan(0);
    expect(early.moveSpeed).toBeLessThan(cruise.moveSpeed);
    expect(late.moveSpeed).toBeCloseTo(early.moveSpeed);
    let previousDistance = 0;
    for (let elapsed = 0; elapsed <= STEP_MS; elapsed += 16) {
      const sample = sampleRoll(one, DIE_MS + elapsed, 1);
      expect(sample.motionPoint[1]).toBeCloseTo(boardPosition(0)[1]);
      expect(sample.travelDistance).toBeGreaterThanOrEqual(previousDistance);
      expect(sample.travelDistance).toBeLessThanOrEqual(4);
      expect(sample.moveSpeed).toBeGreaterThanOrEqual(0);
      expect(sample.moveSpeed).toBeLessThan(7);
      previousDistance = sample.travelDistance;
    }
    expect(sampleRoll(one, DIE_MS + STEP_MS, 1)).toMatchObject({ complete: true, motionPoint: boardPosition(1), travelDistance: 4, moveSpeed: 0 });
    expect(JSON.stringify(one)).toBe(frozen);
  });
  it("rounds a board corner continuously without leaving the grounded route", () => {
    const corner = { ...event, from: 4, path: [5, 6] };
    let previous = sampleRoll(corner, DIE_MS, 6);
    for (let elapsed = 16; elapsed <= STEP_MS * 2; elapsed += 16) {
      const sample = sampleRoll(corner, DIE_MS + elapsed, 6);
      expect(sample.motionPoint[1]).toBeCloseTo(boardPosition(4)[1]);
      expect(sample.motionPoint[0]).toBeGreaterThan(-10.5);
      expect(sample.motionPoint[2]).toBeGreaterThan(-10.5);
      expect(sample.travelDistance).toBeGreaterThanOrEqual(previous.travelDistance);
      expect(Math.abs(angleDelta(previous.motionFacing, sample.motionFacing))).toBeLessThan(.16);
      previous = sample;
    }
    expect(previous).toMatchObject({ complete: true, motionPoint: boardPosition(6), moveSpeed: 0 });
  });
  it("restarts the die and stride for repeated identical accepted values", () => {
    const first = { ...event, id: 'first-one', value: 1, path: [1] };
    expect(sampleRoll(first, DIE_MS + STEP_MS, 1)).toMatchObject({ complete: true, point: boardPosition(1) });
    const repeated = { ...first, id: 'second-one', from: 1, path: [2], started: 5000 };
    expect(sampleRoll(repeated, 0, 2)).toMatchObject({ rolling: true, walking: false, dieProgress: 0, motionPoint: boardPosition(1), travelDistance: 0, moveSpeed: 0, complete: false });
    expect(sampleRoll(repeated, DIE_MS, 2)).toMatchObject({ rolling: false, walking: true, walkProgress: 0, point: boardPosition(1), complete: false });
    expect(sampleRoll(repeated, DIE_MS + STEP_MS, 2)).toMatchObject({ complete: true, motionPoint: boardPosition(2), travelDistance: 4, moveSpeed: 0 });
  });
  it("settles the die before the first step, including one-space rolls", () => {
    const one = { ...event, value: 1, path: [1] };
    expect(sampleRoll(one, DIE_MS - 1, 1)).toMatchObject({ rolling: true, walking: false, complete: false, point: boardPosition(0) });
    expect(sampleRoll(one, DIE_MS, 1)).toMatchObject({ rolling: false, walking: true, complete: false, dieProgress: 1 });
    expect(sampleRoll(one, DIE_MS + STEP_MS - 1, 1).complete).toBe(false);
    expect(sampleRoll(one, DIE_MS + STEP_MS, 1)).toMatchObject({ complete: true, tile: 1, point: boardPosition(1) });
  });
  it("visits each clockwise space and reaches Start before completion", () => {
    const final = { ...event, from: 18, path: [19, 0], value: 6 };
    expect(sampleRoll(final, DIE_MS + STEP_MS, 0).tile).toBe(19);
    expect(sampleRoll(final, DIE_MS + STEP_MS * 2 - 1, 0).complete).toBe(false);
    expect(sampleRoll(final, DIE_MS + STEP_MS * 2, 0)).toMatchObject({ complete: true, point: boardPosition(0) });
  });
  it("handles 10fps and background-tab time jumps without drift", () => {
    for (let ms = 0; ms < DIE_MS + 2 * STEP_MS; ms += 100) expect(sampleRoll(event, ms, 2).complete).toBe(false);
    expect(sampleRoll(event, 60000, 2)).toMatchObject({ complete: true, rolling: false, walking: false, point: boardPosition(2) });
  });
  it("rolls for replacement without moving the pawn", () => {
    const replacement = { ...event, replacement: true, from: 13, path: [] };
    expect(sampleRoll(replacement, DIE_MS - 1, 13)).toMatchObject({ rolling: true, motionPoint: boardPosition(13), travelDistance: 0, moveSpeed: 0 });
    expect(sampleRoll(replacement, DIE_MS, 13)).toMatchObject({ complete: true, walking: false, motionPoint: boardPosition(13), travelDistance: 0, moveSpeed: 0 });
  });
  it("snaps reduced motion at startup, during dice roll and during walking", () => {
    for (const ms of [0, 300, 900]) expect(sampleRoll(event, ms, 2, true)).toMatchObject({ complete: true, dieProgress: 1, point: boardPosition(2) });
  });
  it("does not animate a saved board without a new event", () => {
    expect(sampleRoll(null, 0, 14)).toMatchObject({ complete: true, rolling: false, walking: false, point: boardPosition(14) });
  });
});
