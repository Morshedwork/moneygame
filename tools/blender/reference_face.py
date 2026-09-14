"""Build closed, volumetric facial details from the supplied character artwork.

The PNG is measured during the build only.  Every exported detail is a colored
mesh with a front, back and side walls; no image, texture or billboard is used.
Source coordinates are shared with reference_pixels and the continuous body.
"""
import math
from collections import deque

import bpy
import numpy as np


SOURCE_COLORS = {
    'lido': ('f76665', 'c12525', 'd25249'),
    'prena': ('50a6dd', '035393', '499bc6'),
    'oty': ('ffd800', 'ef9b0f', 'ffba00'),
    'diva': ('6bbc3b', '459122', '4aa325'),
}


def _rgb(hex_color):
    return np.array([int(hex_color[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.int16)


def _near(rgb, hex_color, tolerance=10):
    return np.max(np.abs(rgb.astype(np.int16) - _rgb(hex_color)), axis=2) <= tolerance


def _components(mask, minimum=5):
    """Four-connected components, retaining indices rather than full-size copies."""
    remaining = np.asarray(mask, dtype=bool).copy()
    height, width = remaining.shape
    result = []
    rows, columns = np.nonzero(remaining)
    for sy, sx in zip(rows.tolist(), columns.tolist()):
        if not remaining[sy, sx]:
            continue
        remaining[sy, sx] = False
        queue = deque([(sy, sx)])
        pixels = []
        while queue:
            y, x = queue.popleft()
            pixels.append(y * width + x)
            for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= yy < height and 0 <= xx < width and remaining[yy, xx]:
                    remaining[yy, xx] = False
                    queue.append((yy, xx))
        if len(pixels) >= minimum:
            indices = np.asarray(pixels, dtype=np.int32)
            py, px = np.divmod(indices, width)
            result.append({'indices': indices, 'area': len(pixels),
                           'cx': float(px.mean()), 'cy': float(py.mean()),
                           'bounds': (int(px.min()), int(py.min()), int(px.max()), int(py.max()))})
    return sorted(result, key=lambda component: component['area'], reverse=True)


def _component_mask(shape, component):
    mask = np.zeros(shape, dtype=bool)
    mask.reshape(-1)[component['indices']] = True
    return mask


def _palette(rgb, mask, required=(), limit=12):
    """Use measured flat fill colors; anti-alias mixtures do not add materials."""
    colors = list(required)
    samples = rgb[mask]
    if len(samples):
        values, counts = np.unique(samples, axis=0, return_counts=True)
        for index in np.argsort(counts)[::-1]:
            if counts[index] < max(8, len(samples) * .0025):
                break
            value = ''.join(f'{int(channel):02x}' for channel in values[index])
            if value not in colors and all(np.linalg.norm(_rgb(value) - _rgb(other)) > 14 for other in colors):
                colors.append(value)
            if len(colors) >= limit:
                break
    return colors or ['ffffff']


def _solid_mask(api, label, mask, art, materials, colors, *, front, depth=.025, step=2, curved=False):
    """Closed shared-vertex grid solid. Empty cells remain real open holes.

    The small source-pixel grid keeps complex gear holes, puzzle sockets and
    filament loops intact without replacing them with guessed primitives.
    Material boundaries occupy the same solid instead of overlapping panels.
    """
    rows, columns = np.nonzero(mask)
    if not len(rows):
        return None
    xmin, xmax = int(columns.min()), int(columns.max()) + 1
    ymin, ymax = int(rows.min()), int(rows.max()) + 1
    grid_height = math.ceil((ymax - ymin) / step)
    grid_width = math.ceil((xmax - xmin) / step)
    occupied = np.zeros((grid_height, grid_width), dtype=bool)
    slots = np.full((grid_height, grid_width), -1, dtype=np.int16)
    palette = np.asarray([_rgb(color) for color in colors], dtype=np.int16)
    rgb = art['rgb']
    for gy in range(grid_height):
        y0, y1 = ymin + gy * step, min(ymax, ymin + (gy + 1) * step)
        for gx in range(grid_width):
            x0, x1 = xmin + gx * step, min(xmax, xmin + (gx + 1) * step)
            cell = mask[y0:y1, x0:x1]
            if not cell.any():
                continue
            occupied[gy, gx] = True
            # Choose the dominant actual fill in this cell, not an average color.
            samples = rgb[y0:y1, x0:x1][cell].astype(np.int16)
            distances = ((samples[:, None, :].astype(np.int32) - palette[None, :, :]) ** 2).sum(axis=2)
            nearest = distances.argmin(axis=1)
            confident = distances[np.arange(len(samples)), nearest] <= 25 ** 2
            if confident.any():
                slots[gy, gx] = int(np.bincount(nearest[confident], minlength=len(colors)).argmax())
    # White paper antialiasing is not a new crown fill. Assigning those pale
    # boundary samples to the globally nearest palette produced rainbow stripes
    # down the extruded side walls. Flood only through occupied cells from actual
    # source-color samples, so each boundary inherits its own nearby solid fill.
    confident_cells = int((slots >= 0).sum())
    pending = deque((int(y), int(x)) for y, x in zip(*np.nonzero(slots >= 0)))
    inherited = np.zeros_like(occupied)
    while pending:
        gy, gx = pending.popleft()
        for ny, nx in ((gy - 1, gx), (gy + 1, gx), (gy, gx - 1), (gy, gx + 1)):
            if 0 <= ny < grid_height and 0 <= nx < grid_width and occupied[ny, nx] and slots[ny, nx] < 0:
                slots[ny, nx] = slots[gy, gx]
                inherited[ny, nx] = True
                pending.append((ny, nx))
    # Disconnected export-edge specks with no original fill are not modeled as
    # colored islands. Every retained cell now has a path to a measured fill.
    coreless = int((occupied & (slots < 0)).sum())
    occupied &= slots >= 0
    if not occupied.any():
        return None
    if 'crown' in label.lower():
        inherited_counts = np.bincount(slots[inherited], minlength=len(colors))
        print('LEAD_SOURCE_COLOR_STATS', {
            'character': art.get('filename', ''), 'part': label,
            'confident_cells': confident_cells, 'inherited_edge_cells': int(inherited.sum()),
            'discarded_coreless_cells': coreless,
            'edge_fill_colors': {color: int(count) for color, count in zip(colors, inherited_counts) if count},
        }, flush=True)
    vertices, faces, face_materials, smooth = [], [], [], []
    shared = {}
    pixel_positions = {}
    boundary = {}

    def vertex(gy, gx, side):
        key = (gy, gx, side)
        if key not in shared:
            px = min(xmax, xmin + gx * step) - .5
            py = min(ymax, ymin + gy * step) - .5
            pixel_positions[(gy, gx)] = (px, py)
            x = (px - art['cx']) * art['factor']
            y = (art['floor'] - py) * art['factor']
            z = front(px, py) - (depth if side else 0)
            shared[key] = len(vertices)
            vertices.append(api.at((x, y, z)))
        return shared[key]

    def face(indices, slot, is_front=False):
        faces.append(indices)
        face_materials.append(slot)
        smooth.append(bool(curved and is_front))

    for gy, gx in zip(*np.nonzero(occupied)):
        gy, gx = int(gy), int(gx)
        slot = int(slots[gy, gx])
        corners = [(gy, gx), (gy + 1, gx), (gy + 1, gx + 1), (gy, gx + 1)]
        f = [vertex(y, x, 0) for y, x in corners]
        b = [vertex(y, x, 1) for y, x in corners]
        face(tuple(f), slot, True)
        face(tuple(reversed(b)), slot)
        for edge, (ny, nx) in enumerate(((gy, gx - 1), (gy + 1, gx), (gy, gx + 1), (gy - 1, gx))):
            if 0 <= ny < grid_height and 0 <= nx < grid_width and occupied[ny, nx]:
                continue
            nxt = (edge + 1) % 4
            face((f[nxt], f[edge], b[edge], b[nxt]), slot)
            a, b_key = corners[edge], corners[nxt]
            boundary.setdefault(a, set()).add(b_key)
            boundary.setdefault(b_key, set()).add(a)
    # Round the subpixel stair-steps only along silhouette loops. Front and back
    # use the same adjusted outline, keeping every wall closed and every gear
    # hole open. The displacement is below one source pixel, so pointed crowns
    # retain their actual tips instead of becoming generic smoothed shapes.
    for _ in range(2):
        adjusted = {}
        for key, neighbors in boundary.items():
            if len(neighbors) != 2:
                continue
            a, b_key = tuple(neighbors)
            px, py = pixel_positions[key]
            ax, ay = pixel_positions[a]
            bx, by = pixel_positions[b_key]
            adjusted[key] = (.75 * px + .125 * (ax + bx), .75 * py + .125 * (ay + by))
        pixel_positions.update(adjusted)
    for (gy, gx, side), index in shared.items():
        if (gy, gx) not in boundary:
            continue
        px, py = pixel_positions[(gy, gx)]
        x = (px - art['cx']) * art['factor']
        y = (art['floor'] - py) * art['factor']
        vertices[index] = api.at((x, y, front(px, py) - (depth if side else 0)))
    mesh = bpy.data.meshes.new(label)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(label, mesh)
    bpy.context.collection.objects.link(obj)
    for mat in materials:
        mesh.materials.append(mat)
    for polygon, slot, shade in zip(mesh.polygons, face_materials, smooth):
        polygon.material_index = slot
        polygon.use_smooth = shade
    obj['source_geometry'] = 'Closed source-mask solid; no textures'
    obj['source_pixel_step'] = step
    obj['source_bounds'] = [xmin, ymin, xmax, ymax]
    return obj


def build_face(api, name, art, material):
    """Return existing-rig part groups; record measured pivots in ``art``.

    ``material(label, hex_color)`` is the parent builder's material factory.
    ``art`` provides top-first uint8 RGB, foreground mask, cx/cy, width, factor
    and floor. Optional ``head_ry`` is the measured source-space vertical radius.
    """
    if name not in SOURCE_COLORS:
        raise ValueError(f'No supplied reference face for {name!r}')
    rgb = np.asarray(art['rgb'], dtype=np.uint8)
    height, width = rgb.shape[:2]
    shape = (height, width)
    yy, xx = np.ogrid[:height, :width]
    cx, cy = float(art['cx']), float(art['cy'])
    radius_x = float(art['width']) / 2
    radius_y = float(art.get('ry_pixels', art.get('head_ry', art['width'] * .65 / 1.38)))
    # Accept the loader's explicitly named ratio without requiring it.
    if 'head_ratio' in art and 'head_ry' not in art and 'ry_pixels' not in art:
        radius_y = radius_x * float(art['head_ratio'])
    ellipse = ((xx - cx) / radius_x) ** 2 + ((yy - cy) / radius_y) ** 2
    center_y = (art['floor'] - cy) * art['factor']
    world_ry = radius_y * art['factor']
    parts = {'head': [], 'eye.L': [], 'eye.R': [], 'mouth': []}
    pivots = {}
    main_hex, dark_hex, shadow_hex = SOURCE_COLORS[name]
    skin = material('Skin', main_hex)
    white = material('Original pure white', 'ffffff')
    black = material('Original pure black', '000000')
    hair_mat = material('Original forelock', dark_hex)
    shadow_mat = material('Original head shadow', shadow_hex)
    parts['head'].append(api.sphere('Signature round head', (0, center_y, 0),
                                    (.69, world_ry, .48), skin, 64, 40))

    def curved(offset):
        def front(px, py):
            q = ((px - cx) / radius_x) ** 2 + ((py - cy) / radius_y) ** 2
            return .48 * math.sqrt(max(.008, 1 - q)) + offset
        return front

    def add(group, label, mask, colors, mats=None, offset=.012, depth=.020, step=2):
        materials = mats or [material(label + ' ' + color, color) for color in colors]
        obj = _solid_mask(api, label, mask, art, materials, colors,
                          front=curved(offset), depth=depth, step=step, curved=True)
        if obj is not None:
            parts[group].append(obj)
        return obj

    # Retain the visible side-shadow shape as geometry on the round head.
    shadow_mask = _near(rgb, shadow_hex, 5) & (ellipse < 1.003)
    shadows = _components(shadow_mask, max(20, int(art['width'] ** 2 * .0002)))
    if shadows:
        largest = shadows[0]
        if largest['area'] > art['width'] ** 2 * .003:
            add('head', 'Original head-side accent', _component_mask(shape, largest),
                [shadow_hex], [shadow_mat], offset=.0015, depth=.007, step=3)

    # Neutral eye pixels include black, white and their gray antialiased border.
    neutral = rgb.max(axis=2).astype(np.int16) - rgb.min(axis=2).astype(np.int16) < 18
    eye_zone = (ellipse < .84) & (yy > cy - art['width'] * .30) & (yy < cy + art['width'] * .07)
    eyes = _components(neutral & eye_zone, max(15, int(art['width'] ** 2 * .0007)))[:2]
    if len(eyes) != 2:
        raise ValueError(f'{name}: expected two measured source eyes, found {len(eyes)}')
    for side, component in zip(('L', 'R'), sorted(eyes, key=lambda item: item['cx'])):
        group = 'eye.' + side
        eye_mask = _component_mask(shape, component)
        add(group, 'Original eye white ' + side, eye_mask, ['ffffff'], [white], offset=.014, depth=.022, step=2)
        pupil_mask = eye_mask & (rgb.max(axis=2) < 90)
        add(group, 'Original round pupil ' + side, pupil_mask, ['000000'], [black], offset=.029, depth=.014, step=2)
        pivots[group] = ((component['cx'] - cx) * art['factor'],
                         (art['floor'] - component['cy']) * art['factor'],
                         curved(.014)(component['cx'], component['cy']))

    mouth_zone = (ellipse < .84) & (yy > cy + art['width'] * .10)
    mouths = _components(neutral & mouth_zone, max(15, int(art['width'] ** 2 * .0007)))
    if not mouths:
        raise ValueError(f'{name}: the supplied smile could not be measured')
    mouth = mouths[0]
    mouth_mask = _component_mask(shape, mouth)
    x0, y0, x1, y1 = mouth['bounds']
    margin = art['width'] * .055
    nearby = (xx >= x0 - margin) & (xx <= x1 + margin) & (yy >= y0 - art['width'] * .012) & (yy <= y1 + art['width'] * .012)
    mouth_mask |= _near(rgb, shadow_hex, 5) & nearby & (ellipse < .84)
    mouth_colors = _palette(rgb, mouth_mask, ('ffffff', 'edebeb', shadow_hex), limit=6)
    add('mouth', 'Original smile and tooth divisions', mouth_mask, mouth_colors, offset=.015, depth=.024, step=2)
    pivots['mouth'] = ((mouth['cx'] - cx) * art['factor'],
                       (art['floor'] - mouth['cy']) * art['factor'],
                       curved(.015)(mouth['cx'], mouth['cy']))

    # Hair is the actual original dark fill, including the complete crest tips.
    hair = _near(rgb, dark_hex, 12) & (yy < cy - art['width'] * .045)
    hair_components = _components(hair, max(10, int(art['width'] ** 2 * .0005)))
    if not hair_components:
        raise ValueError(f'{name}: the supplied forelock could not be measured')
    hair_mask = _component_mask(shape, hair_components[0])
    add('head', 'Original sculpted forelock', hair_mask, [dark_hex], [hair_mat], offset=.020, depth=.047, step=2)

    # A small actual source-color component near the center is the round nose.
    nose_zone = (np.abs(xx - cx) < art['width'] * .13) & (np.abs(yy - cy) < art['width'] * .13)
    # Prena's nose is a separate cyan fill, unlike its dark forelock and side
    # shadow. Measure any non-base colored island in the narrow nose zone.
    nose_mask = nose_zone & ~_near(rgb, main_hex, 18) & ~neutral
    nose_candidates = _components(nose_mask, max(10, int(art['width'] ** 2 * .00012)))
    if nose_candidates:
        nose = min(nose_candidates, key=lambda item: (item['cx'] - cx) ** 2 + (item['cy'] - cy) ** 2)
        nose_mask = _component_mask(shape, nose)
        nose_colors = _palette(rgb, nose_mask, limit=2)
        add('head', 'Original circular nose', nose_mask, nose_colors, offset=.034, depth=.044, step=1)

    # Visible crown silhouettes are outside the head ellipse. Same-color stars
    # and puzzle pieces remain included; original negative-space holes do not.
    foreground = np.asarray(art['mask'], dtype=bool)
    crown = foreground & (ellipse > 1.003) & (yy < cy - art['width'] * .075) & ~hair_mask
    # Exclude fringe antialias colors alongside the measured hair, not crown fills.
    crown &= ~(_near(rgb, dark_hex, 28) & (np.abs(xx - cx) < art['width'] * .34))
    crown_components = _components(crown, 4)
    crown_mask = np.zeros(shape, dtype=bool)
    for component in crown_components:
        # Tiny isolated export artifacts are not parts of the character.
        if component['area'] >= max(4, art['width'] ** 2 * .000012):
            crown_mask.reshape(-1)[component['indices']] = True
    crown_colors = _palette(rgb, crown_mask, limit=16)
    crown_materials = [material('Original crown ' + color, color) for color in crown_colors]
    crown_obj = _solid_mask(api, 'Original solid crown shapes and openings', crown_mask, art,
                            crown_materials, crown_colors, front=lambda _x, _y: .012,
                            depth=.145, step=2)
    if crown_obj is not None:
        parts['head'].append(crown_obj)
    art['face_pivots'] = pivots
    art['head_center_world'] = (0, center_y, 0)
    art['head_radii_world'] = (.69, world_ry, .48)
    return parts
