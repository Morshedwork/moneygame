"""Assemble the playable board's source meshes into one portable Blender scene.

Run after build_board_village.py and build_reference_board.py. The reference
is a visual guide only: every visible village detail is actual mesh geometry.
"""
import bpy
import os
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
SOURCE = os.path.join(ROOT, 'assets', 'source', 'blender')
OUT = os.path.join(ROOT, 'public', 'models')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def at(point):
    return (point[0], -point[2], point[1])

def append(name):
    with bpy.data.libraries.load(os.path.join(SOURCE, name + '.blend'), link=False) as (source, target):
        target.objects = [name for name in source.objects]
        target.actions = source.actions
    objects = [obj for obj in target.objects if obj and obj.type not in {'CAMERA', 'LIGHT'}]
    for obj in objects:
        bpy.context.scene.collection.objects.link(obj)
    return objects, target.actions

append('yatai-board-village')
append('yatai-reference-board')
for name, position, scale, animation in [
    ('lido', (-10, .31, 8.95), 1.2, 'Idle'),
    ('diva', (-3.1, .08, 4.3), 1.1, 'Idle'),
    ('oty', (3.1, .08, 4.3), 1.1, 'Idle'),
    ('sparko', (10, .747, 9.55), 1.05, 'Sit'),
]:
    objects, actions = append(name)
    rig = next(obj for obj in objects if obj.type == 'ARMATURE')
    rig.location = at(position)
    rig.scale = (scale, scale, scale)
    clip = next((action for action in actions if action and action.name.split('.')[0] == animation), None)
    if clip:
        rig.animation_data_create()
        rig.animation_data.action = clip
        if len(clip.slots):
            rig.animation_data.action_slot = clip.slots[0]

scene = bpy.context.scene
scene.frame_set(1)
scene.render.engine = 'CYCLES'
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.resolution_x = 1416
scene.render.resolution_y = 767
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'AgX'
world = bpy.data.worlds.new('Clear blue village afternoon')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (.55, .77, 1, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = .65
scene.world = world

def aim(obj, target):
    obj.rotation_euler = (Vector(at(target)) - obj.location).to_track_quat('-Z', 'Y').to_euler()

bpy.ops.object.light_add(type='AREA', location=at((-16, 30, 18)))
key = bpy.context.object
key.name = 'Warm afternoon softbox'
key.data.energy = 5000
key.data.shape = 'DISK'
key.data.size = 8
key.data.color = (1, .88, .69)
aim(key, (0, 0, 0))
bpy.ops.object.light_add(type='SUN', location=at((-16, 30, 18)))
sun = bpy.context.object
sun.name = 'Gentle sunshine'
sun.data.energy = 1.6
sun.data.angle = .16
aim(sun, (0, 0, 0))

bpy.ops.object.camera_add()
camera = bpy.context.object
camera.name = 'Reference board composition'
direction = Vector((0, 25, 32)).normalized() * 39
camera.location = at((direction.x, direction.y, direction.z - .4))
aim(camera, (0, 0, -.4))
camera.data.type = 'PERSP'
camera.data.lens = 32
camera.data.sensor_fit = 'VERTICAL'
camera.data.sensor_height = 20.18
scene.camera = camera
scene['design'] = 'LEAD Money Quest: reference village board'
scene['contents'] = '20 numbered mesh spaces, market kiosks, river, bridge, gate, village, four rigged mascots'
scene['source_image'] = 'User-supplied visual reference; no image planes'
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == 'VIEW_3D':
            area.spaces.active.region_3d.view_perspective = 'CAMERA'

blend = os.path.join(SOURCE, 'lead-money-quest-reference.blend')
bpy.ops.wm.save_as_mainfile(filepath=blend)
glb = os.path.join(OUT, 'lead-money-quest-reference.glb')
bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', export_animations=False,
    export_skins=True, export_yup=True, export_materials='EXPORT', export_extras=True,
    export_current_frame=True, export_rest_position_armature=False)
scene.render.filepath = os.path.join(ROOT, 'docs', 'screenshots', 'blender', 'reference-board.png')
bpy.ops.render.render(write_still=True)
print('REFERENCE_BOARD_ASSEMBLED', blend, glb, scene.render.filepath, flush=True)
