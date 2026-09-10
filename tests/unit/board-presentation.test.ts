import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { DIE_MS, STEP_MS, dieRotation, sampleRoll, RollEvent, pawnPosition as boardPosition } from "../../apps/client/board-presentation";
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
describe("one shared dice and movement clock", () => {
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
    expect(sampleRoll(replacement, DIE_MS - 1, 13)).toMatchObject({ rolling: true, point: boardPosition(13) });
    expect(sampleRoll(replacement, DIE_MS, 13)).toMatchObject({ complete: true, walking: false, point: boardPosition(13) });
  });
  it("snaps reduced motion at startup, during dice roll and during walking", () => {
    for (const ms of [0, 300, 900]) expect(sampleRoll(event, ms, 2, true)).toMatchObject({ complete: true, dieProgress: 1, point: boardPosition(2) });
  });
  it("does not animate a saved board without a new event", () => {
    expect(sampleRoll(null, 0, 14)).toMatchObject({ complete: true, rolling: false, walking: false, point: boardPosition(14) });
  });
});
