import { readFileSync, existsSync } from "node:fs";
import assert from "node:assert/strict";
const manifest = JSON.parse(
  readFileSync("public/models/manifest.json", "utf8"),
);
for (const asset of manifest.assets) {
  const data = readFileSync("public" + asset.file);
  assert.equal(data.toString("utf8", 0, 4), "glTF");
  const length = data.readUInt32LE(12);
  const json = JSON.parse(data.toString("utf8", 20, 20 + length));
  assert.ok(json.meshes?.length, asset.id + " contains real meshes");
  assert.ok(existsSync(asset.source));
  if (asset.animations.length) {
    assert.ok(json.skins?.length, asset.id + " is rigged");
    const clips = (json.animations || []).map((a) => a.name);
    for (const expected of asset.animations)
      assert.ok(
        clips.some((n) => n === expected || n.includes(expected)),
        asset.id + " missing " + expected,
      );
  }
  assert.ok(data.length < 20_000_000, asset.id + " exceeds 20MB budget");
  console.log(
    `${asset.id}: ${json.meshes.length} meshes, ${(json.animations || []).length} clips, ${(data.length / 1048576).toFixed(2)} MB`,
  );
}
for (const required of ["lido", "prena", "oty", "diva", "sparko", "yatai-village", "yatai-board", "lead-die", "lead-coin"])
  assert.ok(manifest.assets.some((asset) => asset.id === required), required + " is in the manifest");
assert.ok(manifest.colliders.length > 15);
console.log("All Blender exports validated.");
