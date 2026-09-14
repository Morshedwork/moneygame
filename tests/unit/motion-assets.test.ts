import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AnimationMixer, PropertyBinding } from 'three';

function bytes(name: string) {
  const buffer = readFileSync(`public/models/${name}.glb`);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}
describe('Blender-authored locomotion libraries', () => {
  for (const name of ['lido', 'prena', 'oty', 'diva', 'sparko']) it(`${name} has small, looping clips that bind to the original character`, async () => {
    const loader = new GLTFLoader();
    const [original, motion] = await Promise.all([loader.parseAsync(bytes(name), ''), loader.parseAsync(bytes(`motion/${name}`), '')]);
    expect(motion.animations.map(clip => clip.name).sort()).toEqual(['Run', 'Walk']);
    expect(bytes(`motion/${name}`).byteLength).toBeLessThan(100_000);
    const mixer = new AnimationMixer(original.scene);
    for (const clip of motion.animations) {
      expect(clip.duration).toBeGreaterThan(.6); expect(clip.duration).toBeLessThanOrEqual(1.02);
      for (const track of clip.tracks) {
        const binding = PropertyBinding.parseTrackName(track.name);
        expect(PropertyBinding.findNode(original.scene, binding.nodeName), track.name).toBeTruthy();
        const size = track.getValueSize(), first = Array.from(track.values.slice(0, size)), last = Array.from(track.values.slice(-size));
        for (let i = 0; i < size; i++) expect(last[i], track.name).toBeCloseTo(first[i], 4);
      }
      const action = mixer.clipAction(clip).play();
      mixer.update(.2);
      const leg = original.scene.getObjectByName('legL') ?? original.scene.getObjectByName('leg.L');
      expect(leg).toBeTruthy();
      expect(Math.abs(leg!.quaternion.x)).toBeGreaterThan(.001);
      action.stop();
    }
  });
});
