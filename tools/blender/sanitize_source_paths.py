"""Remove audited machine-local metadata from two source .blend files.

Run in an isolated process: node tools/blender/headless.mjs tools/blender/sanitize_source_paths.py
Does not rebuild geometry, alter rigs/actions, or export runtime GLBs.
"""
import os
import bpy

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
SOURCE = os.path.join(ROOT, 'assets', 'source', 'blender')
for filename in ('LEAD-characters-3D.blend', 'yatai-reference-board.blend'):
    path = os.path.join(SOURCE, filename)
    bpy.ops.wm.open_mainfile(filepath=path)
    before = (len(bpy.data.objects), len(bpy.data.meshes), len(bpy.data.actions))
    if filename == 'LEAD-characters-3D.blend':
        bpy.context.scene.render.filepath = '//../../../docs/screenshots/blender/characters-3d-front.png'
    else:
        for font in list(bpy.data.fonts):
            if font.users == 0 and font.filepath and not font.filepath.startswith('<'):
                bpy.data.fonts.remove(font)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=path)
    bpy.ops.wm.open_mainfile(filepath=path)
    assert before == (len(bpy.data.objects), len(bpy.data.meshes), len(bpy.data.actions)), filename
    if filename == 'LEAD-characters-3D.blend':
        assert bpy.context.scene.render.filepath.startswith('//')
    else:
        assert not any(font.users == 0 and os.path.isabs(font.filepath) for font in bpy.data.fonts)
    print('SANITIZED_SOURCE', filename, 'objects/meshes/actions preserved:', before, flush=True)
