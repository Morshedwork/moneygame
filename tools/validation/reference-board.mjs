import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';

for (const id of ['yatai-reference-board', 'yatai-board-village', 'lead-money-quest-reference']) {
  const bytes = readFileSync(`public/models/${id}.glb`);
  assert.equal(bytes.toString('utf8', 0, 4), 'glTF');
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const model = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
  assert.ok(model.meshes?.length > 10, `${id} must contain real geometry`);
  assert.ok(existsSync(`assets/source/blender/${id}.blend`));
  assert.ok((model.images || []).every(image => !image.uri || !/^https?:/i.test(image.uri)), 'Model must work offline');
  if (id !== 'lead-money-quest-reference') {
    assert.ok(model.meshes.length < 80, 'Live board scenery must remain batched');
    assert.ok(bytes.length < 20_000_000, 'Live asset must fit its transfer budget');
  } else {
    assert.ok(model.skins?.length === 4, 'Complete source export contains four rigged mascots');
  }
  console.log(`${id}: ${model.meshes.length} meshes, ${model.skins?.length || 0} rigs, ${(bytes.length / 1048576).toFixed(2)} MB`);
}

const metadata = JSON.parse(readFileSync('public/models/yatai-reference-board.json', 'utf8'));
assert.equal(metadata.positions.length, 20);
assert.equal(metadata.boardNames.length, 20);
assert.equal(metadata.tileTop, .305);
assert.equal(new Set(metadata.positions.map(position => position.join(','))).size, 20);
console.log('Reference board assets validated.');
