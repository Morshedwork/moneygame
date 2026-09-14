"""Export additive motion libraries from existing rigs without rewriting character art.

Run: node tools/blender/headless.mjs tools/blender/build_locomotion.py
The source .blend files and original mesh GLBs remain untouched.
"""
import json
import math
import os
import struct
import bpy

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
OUT = os.path.join(ROOT, 'public', 'models', 'motion')
SOURCE = os.path.join(ROOT, 'assets', 'source', 'blender')
os.makedirs(OUT, exist_ok=True)
manifest = {'version': 1, 'blender': bpy.app.version_string, 'characters': {}}


def reset(rig):
    for bone in rig.pose.bones:
        bone.rotation_mode = 'XYZ'
        bone.rotation_euler = (0, 0, 0)
        bone.location = (0, 0, 0)
        bone.scale = (1, 1, 1)


for name in ['lido', 'prena', 'oty', 'diva', 'sparko']:
    bpy.ops.wm.open_mainfile(filepath=os.path.join(SOURCE, name + '.blend'))
    rigs = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
    assert len(rigs) == 1, f'{name}: expected one rig'
    rig = rigs[0]
    required = ['root', 'body', 'head', 'leg.L', 'leg.R', 'arm.L', 'arm.R']
    assert all(key in rig.pose.bones for key in required), f'{name}: unexpected bone naming'
    print('MOTION_RIG', name, rig.name, list(rig.scale), flush=True)
    # Only the in-memory background scene is modified. Never save over source art.
    rig.animation_data_clear()
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)
    rig.animation_data_create()
    scene = bpy.context.scene
    scene.render.fps = 60
    clips = {}
    for label, duration, stride, lift, stance in [
        ('Walk', 1.0, 1.1, .13, .62),
        ('Run', .7, 1.8, .22, .44),
    ]:
        action = bpy.data.actions.new(label)
        rig.animation_data.action = action
        end = round(duration * 60)
        scene.frame_start = 1
        scene.frame_end = end + 1
        for frame in range(end + 1):
            reset(rig)
            phase = frame / end
            running = label == 'Run'
            sway = math.sin(phase * math.tau)
            bounce = (.024 if running else .009) * (1 - math.cos(phase * math.tau * 2))
            rig.pose.bones['root'].location.y = bounce
            rig.pose.bones['body'].rotation_euler.z = sway * (.04 if running else .025)
            rig.pose.bones['body'].rotation_euler.x = -.09 if running else -.025
            rig.pose.bones['head'].rotation_euler.z = -sway * .018
            rig.pose.bones['head'].rotation_euler.x = .035 if running else .01
            for side, offset in [('L', 0), ('R', .5)]:
                p = (phase + offset) % 1
                # Constant backward velocity through stance, smooth airborne return.
                # stance * stride is the distance travelled by the body while planted.
                reach = stance * stride / 2
                if p < stance:
                    foot = reach - stride * p
                    clearance = 0
                else:
                    q = (p - stance) / (1 - stance)
                    eased = q * q * (3 - 2 * q)
                    foot = -reach + 2 * reach * eased
                    clearance = lift * math.sin(q * math.pi) ** 2
                leg = rig.pose.bones['leg.' + side]
                height = max(.35, leg.bone.head_local.z)
                angle = -math.asin(max(-.65, min(.65, foot / height)))
                leg.rotation_euler.x = angle
                leg.location.z = foot + height * math.sin(angle)
                leg.location.y = height * (math.cos(angle) - 1) + clearance - bounce
                arm = rig.pose.bones['arm.' + side]
                arm.rotation_euler.x = -angle * .7 - (.17 if running else .025)
                arm.rotation_euler.z = (-1 if side == 'L' else 1) * .035
            for key in required:
                bone = rig.pose.bones[key]
                bone.keyframe_insert(data_path='rotation_euler', frame=frame + 1)
                bone.keyframe_insert(data_path='location', frame=frame + 1)
        action.use_fake_user = True
        clips[label] = {'seconds': duration, 'stride': stride, 'stance': stance}
    rig.animation_data.action = None
    reset(rig)
    scene.frame_set(1)
    bpy.ops.object.select_all(action='DESELECT')
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    destination = os.path.join(OUT, name + '.glb')
    bpy.ops.export_scene.gltf(
        filepath=destination, export_format='GLB', use_selection=True,
        export_animations=True, export_animation_mode='ACTIONS',
        export_skins=True, export_yup=True, export_force_sampling=True,
        export_anim_single_armature=True, export_extras=True,
    )
    with open(destination, 'rb') as exported:
        data = exported.read()
    document = json.loads(data[20:20 + struct.unpack_from('<I', data, 12)[0]])
    assert {a['name'] for a in document.get('animations', [])} == {'Walk', 'Run'}
    assert len(document.get('nodes', [])) >= len(required)
    assert not document.get('meshes'), 'Motion library must not duplicate character geometry'
    manifest['characters'][name] = {
        'file': '/models/motion/' + name + '.glb',
        'rigScale': rig.scale.x, 'clips': clips, 'bytes': len(data),
    }
    print('MOTION_EXPORTED', name, len(data), flush=True)

with open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8') as output:
    json.dump(manifest, output, indent=2)
print('LEAD_LOCOMOTION_COMPLETE', flush=True)
