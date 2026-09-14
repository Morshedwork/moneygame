/** Validate the four modeled Blender character exports without third-party dependencies. */
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CHARACTERS = ['lido', 'prena', 'oty', 'diva'];
const ANIMATIONS = [
  'Idle', 'Walk', 'Run', 'Wave', 'Talk', 'Explain', 'Point', 'Think', 'Ask',
  'Encourage', 'Celebrate', 'GentleConcern', 'Sit', 'Stand', 'LookAtPlayer',
  'LookAtBoard', 'Serve', 'Interact',
];

function parseGlb(path) {
  const data = readFileSync(path);
  assert.equal(data.toString('ascii', 0, 4), 'glTF', `${path}: GLB magic`);
  assert.equal(data.readUInt32LE(4), 2, `${path}: glTF 2.0 required`);
  assert.equal(data.readUInt32LE(8), data.length, `${path}: complete GLB file`);
  let json;
  let binary;
  for (let offset = 12; offset < data.length;) {
    assert.ok(offset + 8 <= data.length, `${path}: complete chunk header`);
    const length = data.readUInt32LE(offset);
    const type = data.readUInt32LE(offset + 4);
    const start = offset + 8;
    assert.ok(start + length <= data.length, `${path}: complete chunk payload`);
    if (type === 0x4e4f534a) json = JSON.parse(data.toString('utf8', start, start + length));
    if (type === 0x004e4942) binary = data.subarray(start, start + length);
    offset = start + length;
  }
  assert.ok(json && binary, `${path}: embedded JSON and geometry required`);
  return { json, binary, bytes: data.length };
}

function positionsBounds(gltf, binary, accessorIndex, description) {
  const accessor = gltf.accessors?.[accessorIndex];
  assert.ok(accessor, `${description}: POSITION accessor exists`);
  assert.equal(accessor.type, 'VEC3', `${description}: three-dimensional positions`);
  assert.equal(accessor.componentType, 5126, `${description}: float32 positions`);
  assert.ok(accessor.count >= 4, `${description}: actual mesh vertices`);
  assert.ok(!accessor.sparse, `${description}: dense modeled geometry`);
  const view = gltf.bufferViews?.[accessor.bufferView];
  assert.ok(view && view.buffer === 0, `${description}: embedded vertex buffer`);
  const stride = view.byteStride ?? 12;
  assert.ok(stride >= 12, `${description}: valid vertex stride`);
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const end = start + (accessor.count - 1) * stride + 12;
  assert.ok(end <= binary.length && end <= (view.byteOffset ?? 0) + view.byteLength, `${description}: position buffer bounds`);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let vertex = 0; vertex < accessor.count; vertex++) {
    for (let axis = 0; axis < 3; axis++) {
      const value = binary.readFloatLE(start + vertex * stride + axis * 4);
      assert.ok(Number.isFinite(value), `${description}: finite mesh coordinates`);
      min[axis] = Math.min(min[axis], value);
      max[axis] = Math.max(max[axis], value);
    }
  }
  for (let axis = 0; axis < 3; axis++) {
    assert.ok(Math.abs(min[axis] - accessor.min?.[axis]) < .0001, `${description}: accurate accessor minimum`);
    assert.ok(Math.abs(max[axis] - accessor.max?.[axis]) < .0001, `${description}: accurate accessor maximum`);
  }
  return { min, max };
}

function validateVolume(gltf, binary, matcher, description) {
  const matching = gltf.nodes.filter(node => node.mesh !== undefined && matcher.test(node.name ?? ''));
  assert.ok(matching.length, `${description}: named modeled mesh is present`);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const node of matching) {
    assert.ok(Number.isInteger(node.skin) && gltf.skins[node.skin], `${description}: mesh is bound to its armature`);
    for (const primitive of gltf.meshes[node.mesh].primitives) {
      assert.ok(primitive.attributes.JOINTS_0 !== undefined && primitive.attributes.WEIGHTS_0 !== undefined, `${description}: skinned vertices`);
      const bounds = positionsBounds(gltf, binary, primitive.attributes.POSITION, description);
      for (let axis = 0; axis < 3; axis++) {
        min[axis] = Math.min(min[axis], bounds.min[axis]);
        max[axis] = Math.max(max[axis], bounds.max[axis]);
      }
    }
  }
  // The exporter is explicitly Y-up. Z is actual forward/back depth in its
  // POSITION buffers, independently of the camera angle or surface shading.
  const dimensions = max.map((value, axis) => value - min[axis]);
  assert.ok(dimensions[2] > .35, `${description}: physical Z depth ${dimensions[2].toFixed(4)} must exceed 0.35`);
  assert.ok(dimensions[0] > .35 && dimensions[1] > .35, `${description}: complete three-dimensional volume`);
  return dimensions.map(value => Number(value.toFixed(4)));
}

function validateCharacter(name) {
  const source = join(ROOT, 'assets', 'source', 'blender', `${name}.blend`);
  assert.ok(statSync(source).isFile() && statSync(source).size > 1024, `${name}: editable source .blend exists`);
  const { json: gltf, binary, bytes } = parseGlb(join(ROOT, 'public', 'models', `${name}.glb`));
  assert.ok(gltf.meshes?.length && gltf.nodes?.length, `${name}: real modeled meshes and scene nodes`);
  assert.equal(gltf.images?.length ?? 0, 0, `${name}: no character image planes or image textures`);
  assert.equal(gltf.textures?.length ?? 0, 0, `${name}: modeled colors require no texture images`);
  assert.ok(gltf.skins?.length, `${name}: rigged skin exists`);
  for (const skin of gltf.skins) {
    assert.ok(skin.joints?.length >= 10, `${name}: complete character skeleton`);
    assert.ok(skin.joints.every(index => gltf.nodes[index]), `${name}: joint node references exist`);
    assert.ok(gltf.accessors[skin.inverseBindMatrices], `${name}: inverse bind matrices exist`);
  }
  const clips = gltf.animations ?? [];
  assert.equal(clips.length, 18, `${name}: exactly 18 animation actions exported`);
  assert.deepEqual(clips.map(clip => clip.name).sort(), [...ANIMATIONS].sort(), `${name}: all named animation clips`);
  for (const clip of clips) {
    assert.ok(clip.channels?.length && clip.samplers?.length, `${name}/${clip.name}: actual animation data`);
    for (const channel of clip.channels) {
      const sampler = clip.samplers[channel.sampler];
      assert.ok(gltf.nodes[channel.target.node] && sampler, `${name}/${clip.name}: valid animated target`);
      assert.ok(gltf.accessors[sampler.input]?.count > 1 && gltf.accessors[sampler.output]?.count > 1, `${name}/${clip.name}: keyed motion`);
    }
  }
  const head = validateVolume(gltf, binary, /Signature round head/i, `${name} head`);
  const body = validateVolume(gltf, binary, /Continuous soft silhouette/i, `${name} body`);
  return { character: name, meshes: gltf.meshes.length, skins: gltf.skins.length, animations: clips.length, head, body, megabytes: Number((bytes / 1048576).toFixed(2)) };
}

let failures = 0;
for (const name of CHARACTERS) {
  try {
    const report = validateCharacter(name);
    console.log(`${name}: ${report.meshes} meshes, ${report.skins} skin(s), ${report.animations} clips; head ${report.head.join(' × ')}, body ${report.body.join(' × ')}; ${report.megabytes} MB`);
  } catch (error) {
    failures++;
    console.error(`${name}: ${error.message}`);
  }
}
if (failures) {
  process.exitCode = 1;
  console.error(`${failures} character export(s) failed 3D validation.`);
} else {
  console.log('All four Blender characters have modeled volume, editable sources, rigged skins, and 18 animation clips.');
}
