import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { shopContents, shopViews, shopZoom, type ShopView } from '../../apps/client/shop/showroom';

const metadata = JSON.parse(readFileSync('public/models/bento-showroom.json', 'utf8'));
const bytes = readFileSync('public/models/bento-showroom.glb');
const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));

describe('the complete Blender shop', () => {
  it('ships a reproducible, genuine 3D Blender asset within the preview budget', () => {
    expect(bytes.toString('utf8', 0, 4)).toBe('glTF');
    expect(gltf.asset.generator).toContain('Blender');
    expect(existsSync(metadata.source)).toBe(true);
    expect(existsSync(metadata.generator)).toBe(true);
    expect(statSync('public' + metadata.file).size).toBe(metadata.bytes);
    expect(metadata.bytes).toBeLessThan(4 * 1024 * 1024);
    expect(metadata.triangles).toBeLessThan(70000);
    expect(gltf.meshes.length).toBeGreaterThan(20);
    expect(gltf.images?.length || 0).toBe(0);
  });
  it('retains editable sign and price meshes, noren material, and independently removable front roof', () => {
    const names = gltf.nodes.map((node: { name: string }) => node.name);
    for (const name of metadata.dynamicLabels) {
      const node = gltf.nodes.find((node: { name: string }) => node.name === name);
      expect(node).toBeDefined();
      expect(gltf.meshes[node.mesh].primitives[0].attributes.TEXCOORD_0).toBeDefined();
    }
    expect(names.some((name: string) => name.startsWith('RoofFront'))).toBe(true);
    expect(names.some((name: string) => name.startsWith('RoofBack'))).toBe(true);
    expect(names.some((name: string) => name.startsWith(metadata.interiorCutawayPrefix))).toBe(true);
    expect(gltf.materials.some((m: { name: string }) => m.name === metadata.bannerMaterial)).toBe(true);
  });
  it('models bento service, stocked shelves, kitchen supplies, and produce', () => {
    expect(metadata.inventory).toHaveLength(8);
    expect(new Set(metadata.inventory.map((item: { category: string }) => item.category))).toEqual(new Set(['Counter', 'Shelves', 'Kitchen']));
    for (const material of ['Shop Rice', 'Shop Salmon', 'Shop Egg', 'Shop Edamame', 'Shop Tea ceramic', 'Shop Paper', 'Shop Lantern']) {
      expect(gltf.materials.some((m: { name: string }) => m.name === material)).toBe(true);
    }
    expect(new Set(shopContents.map(item => item.view))).toEqual(new Set(Object.keys(shopViews)));
  });
});

describe('responsive shop camera framing', () => {
  for (const view of Object.keys(shopViews) as ShopView[]) {
    it(`fits the ${view} composition on phone, tablet, and desktop without stretching`, () => {
      for (const [width, height] of [[290, 365], [660, 500], [980, 650], [1920, 1080]]) {
        const zoom = shopZoom(view, width, height);
        expect(zoom).toBeGreaterThan(0);
        expect(shopViews[view].width * zoom).toBeLessThanOrEqual(width + .001);
        expect(shopViews[view].height * zoom).toBeLessThanOrEqual(height + .001);
      }
    });
  }
  it('remains finite before the canvas has been laid out', () => {
    expect(shopZoom('whole', 0, 0)).toBe(1);
  });
});
