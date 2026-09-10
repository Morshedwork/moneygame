"""Small reusable Blender-authored props; preserves the main asset manifest."""
import os, json, math
import build_assets as b
from mathutils import Vector

manifest_path = os.path.join(b.OUT, 'manifest.json')
with open(manifest_path, encoding='utf-8') as source:
    combined = json.load(source)
combined['assets'] = [a for a in combined['assets'] if a['id'] not in ['lead-die', 'lead-coin']]
b.manifest = combined
b.clear()
ivory = b.mat('Porcelain ivory', (.91, .86, .72))
ink = b.mat('Indigo inlaid pips', (.015, .035, .095))
b.box('Rounded six-sided die', (0, 0, 0), (1.4, 1.4, 1.4), ivory, .13)
patterns = {
    1: [(0, 0)],
    2: [(-1, 1), (1, -1)],
    3: [(-1, 1), (0, 0), (1, -1)],
    4: [(-1, -1), (-1, 1), (1, -1), (1, 1)],
    5: [(-1, -1), (-1, 1), (0, 0), (1, -1), (1, 1)],
    6: [(-1, -1), (-1, 0), (-1, 1), (1, -1), (1, 0), (1, 1)]
}
# Opposing sides sum to seven. The runtime rotates the trusted result upward.
faces = [(1, (0, 1, 0)), (6, (0, -1, 0)), (2, (0, 0, 1)),
         (5, (0, 0, -1)), (3, (1, 0, 0)), (4, (-1, 0, 0))]
for value, normal in faces:
    axis = next(i for i, n in enumerate(normal) if n)
    other = [i for i in range(3) if i != axis]
    for u, v in patterns[value]:
        pos = [0., 0., 0.]
        pos[axis] = normal[axis] * .696
        pos[other[0]] = u * .29
        pos[other[1]] = v * .29
        scale = [.09, .09, .09]
        scale[axis] = .018
        b.sphere('Face %d pip' % value, pos, scale, ink, 12, 8)
b.export('lead-die')
b.clear()
gold = b.mat('LEAD gold', (.96, .58, .045), metal=.65)
bright = b.mat('Raised gold', (1., .79, .21), metal=.45)
coin = b.cyl('Coin body', (0, 0, 0), .6, .13, gold, 48)
coin.rotation_euler.x = math.pi / 2
b.star('Raised LEAD star', 0, 0, .086, .37, bright)
for side in [-1, 1]:
    b.bpy.ops.mesh.primitive_torus_add(major_radius=.51, minor_radius=.025,
        major_segments=48, minor_segments=8, location=b.at((0, 0, side*.075)),
        rotation=(math.pi/2, 0, 0))
    b.finish(b.bpy.context.object, 'Coin rim', bright)
b.export('lead-coin')
with open(manifest_path, 'w', encoding='utf-8') as target:
    json.dump(combined, target, indent=2)
print('LEAD_PROPS_COMPLETE', flush=True)
