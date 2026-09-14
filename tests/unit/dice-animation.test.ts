import { describe, expect, it } from 'vitest';
import { Euler, Quaternion, Vector3 } from 'three';
import { DIE_HOLD_MS, DIE_MS, DIE_NORMALS, DIE_ROLL_MS, sampleDiceRoll } from '../../apps/client/dice-animation';
import { pawnPosition, sampleRoll, STEP_MS, type RollEvent } from '../../apps/client/board-presentation';

const roll: RollEvent = { id: 'accepted-one', value: 1, from: 0, path: [1], replacement: false, started: 0 };

describe('the full visible dice tumble', () => {
  it('reserves a full tumble and a readable result hold before movement', () => {
    expect(DIE_ROLL_MS).toBe(1700);
    expect(DIE_HOLD_MS).toBe(500);
    expect(DIE_MS).toBe(DIE_ROLL_MS + DIE_HOLD_MS);
  });

  for (let value = 1; value <= 6; value++) it(`settles the accepted ${value} face upward and at rest`, () => {
    const pose = sampleDiceRoll(value, 1);
    const normal = new Vector3().fromArray(DIE_NORMALS[value - 1]).applyEuler(new Euler(...pose.rotation));
    expect(normal.y).toBeCloseTo(1, 6);
    expect(Math.hypot(normal.x, normal.z)).toBeLessThan(.00001);
    expect(pose).toMatchObject({ lift: 0, scale: 1 });
    expect(pose.offsetX).toBeCloseTo(0);
    expect(pose.offsetZ).toBeCloseTo(0);
    expect(pose.shadowScale).toBeGreaterThan(0);
    expect(pose.shadowOpacity).toBeGreaterThan(0);
    expect(pose.shadowOpacity).toBeLessThanOrEqual(1);
  });

  it('shows distinct three-dimensional rotations, several bounces, and a soft landing', () => {
    const poses = Array.from({ length: 201 }, (_, index) => sampleDiceRoll(4, index / 200));
    for (const pose of poses) {
      for (const value of [...pose.rotation, pose.lift, pose.offsetX, pose.offsetZ, pose.scale, pose.shadowScale, pose.shadowOpacity]) {
        expect(Number.isFinite(value)).toBe(true);
      }
      expect(pose.lift).toBeGreaterThanOrEqual(0);
      expect(pose.scale).toBeGreaterThan(0);
      expect(pose.shadowScale).toBeGreaterThan(0);
      expect(pose.shadowOpacity).toBeGreaterThanOrEqual(0);
      expect(pose.shadowOpacity).toBeLessThanOrEqual(1);
    }
    const orientations = [.1, .27, .46, .65, .84].map(progress => new Quaternion().setFromEuler(new Euler(...sampleDiceRoll(4, progress).rotation)));
    for (let index = 1; index < orientations.length; index++) {
      expect(orientations[index].angleTo(orientations[index - 1])).toBeGreaterThan(.2);
    }
    const rotationRange = [0, 1, 2].map(axis => Math.max(...poses.map(pose => pose.rotation[axis])) - Math.min(...poses.map(pose => pose.rotation[axis])));
    expect(Math.max(...rotationRange)).toBeGreaterThan(Math.PI * 2);
    const bouncePeaks = poses.filter((pose, index) => index > 0 && index < poses.length - 1 && pose.lift > .02 && pose.lift > poses[index - 1].lift && pose.lift >= poses[index + 1].lift);
    expect(bouncePeaks.length).toBeGreaterThanOrEqual(2);
    expect(bouncePeaks[0].lift).toBeGreaterThan(bouncePeaks.at(-1)!.lift);
    expect(Math.max(...poses.map(pose => Math.hypot(pose.offsetX, pose.offsetZ)))).toBeGreaterThan(.05);
    const almost = sampleDiceRoll(4, .999), end = sampleDiceRoll(4, 1);
    expect(new Quaternion().setFromEuler(new Euler(...almost.rotation)).angleTo(new Quaternion().setFromEuler(new Euler(...end.rotation)))).toBeLessThan(.03);
    expect(almost.lift).toBeLessThan(.02);
  });

  it('clamps progress and repeats the same accepted value without randomness', () => {
    expect(sampleDiceRoll(3, -1)).toEqual(sampleDiceRoll(3, 0));
    expect(sampleDiceRoll(3, 2)).toEqual(sampleDiceRoll(3, 1));
    for (const progress of [0, .15, .4, .7, 1]) {
      expect(sampleDiceRoll(1, progress)).toEqual(sampleDiceRoll(1, progress));
    }
  });
});

describe('roll, readable result, then movement', () => {
  it('keeps the pawn at its origin during the entire tumble and result hold', () => {
    const frozen = JSON.stringify(roll);
    for (const elapsed of [0, 300, 900, DIE_ROLL_MS - 1, DIE_ROLL_MS, DIE_ROLL_MS + DIE_HOLD_MS / 2, DIE_MS - 1]) {
      const sample = sampleRoll(roll, elapsed, 1);
      expect(sample).toMatchObject({ rolling: true, walking: false, complete: false, tile: 0, motionPoint: pawnPosition(0), travelDistance: 0, moveSpeed: 0 });
      expect(sample.dieProgress).toBeCloseTo(Math.min(1, elapsed / DIE_ROLL_MS));
    }
    expect(sampleRoll(roll, DIE_ROLL_MS, 1).dieProgress).toBe(1);
    expect(JSON.stringify(roll)).toBe(frozen);
    expect(sampleRoll(roll, DIE_MS, 1)).toMatchObject({ rolling: false, walking: true, complete: false, dieProgress: 1, travelDistance: 0 });
    expect(sampleRoll(roll, DIE_MS + STEP_MS / 2, 1).travelDistance).toBeGreaterThan(0);
    expect(sampleRoll(roll, DIE_MS + STEP_MS, 1)).toMatchObject({ complete: true, motionPoint: pawnPosition(1) });
  });

  it('restarts the full roll for repeated accepted ones without changing either event', () => {
    const repeat: RollEvent = { ...roll, id: 'accepted-one-again', from: 1, path: [2], started: 5000 };
    const originals = JSON.stringify([roll, repeat]);
    for (const elapsed of [0, 350, DIE_ROLL_MS, DIE_MS - 1]) {
      const first = sampleRoll(roll, elapsed, 1), next = sampleRoll(repeat, elapsed, 2);
      expect(next.dieProgress).toBe(first.dieProgress);
      expect(next).toMatchObject({ rolling: true, motionPoint: pawnPosition(1), travelDistance: 0 });
      expect(sampleDiceRoll(repeat.value, next.dieProgress)).toEqual(sampleDiceRoll(roll.value, first.dieProgress));
    }
    expect(JSON.stringify([roll, repeat])).toBe(originals);
  });

  it('uses the whole roll for a replacement and never starts walking', () => {
    const replacement: RollEvent = { ...roll, from: 13, path: [], replacement: true };
    for (const elapsed of [0, DIE_ROLL_MS, DIE_MS - 1, DIE_MS, DIE_MS + STEP_MS]) {
      const sample = sampleRoll(replacement, elapsed, 13);
      expect(sample).toMatchObject({ walking: false, motionPoint: pawnPosition(13), travelDistance: 0, moveSpeed: 0 });
      expect(sample.complete).toBe(elapsed >= DIE_MS);
    }
  });

  it('snaps directly to the accepted result and destination for reduced motion', () => {
    for (const elapsed of [0, 500, DIE_ROLL_MS + 100, DIE_MS + 100]) {
      const sample = sampleRoll(roll, elapsed, 1, true);
      expect(sample).toMatchObject({ rolling: false, walking: false, complete: true, dieProgress: 1, motionPoint: pawnPosition(1), moveSpeed: 0 });
      expect(sampleDiceRoll(roll.value, sample.dieProgress)).toEqual(sampleDiceRoll(1, 1));
    }
  });
});
