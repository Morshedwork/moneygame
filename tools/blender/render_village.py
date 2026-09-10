"""Render the actual saved Japan-inspired village and rigged mascots in Blender."""
import bpy, os, math
from mathutils import Vector
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'assets/source/blender/yatai-village.blend'))
scene=bpy.context.scene
scene.render.engine='CYCLES'; scene.cycles.samples=24; scene.cycles.use_denoising=True
scene.render.resolution_x=1440; scene.render.resolution_y=960; scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'; scene.render.image_settings.file_format='PNG'
world=bpy.data.worlds.new('Blue hour'); world.use_nodes=True; scene.world=world
world.node_tree.nodes['Background'].inputs[0].default_value=(.32,.43,.62,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.65
def at(p): return (p[0],-p[2],p[1])
for name,position,animation in [('prena',(0,.12,5),'Wave'),('lido',(-3,.12,4),'Explain'),('diva',(3,.12,5),'Ask'),('oty',(1.5,.12,8),'Celebrate')]:
    with bpy.data.libraries.load(os.path.join(ROOT,'assets/source/blender',name+'.blend'),link=False) as (source,target):
        target.objects=source.objects; target.actions=source.actions
    for obj in target.objects:
        if obj: scene.collection.objects.link(obj)
    rig=next(o for o in target.objects if o and o.type=='ARMATURE')
    rig.location=at(position); rig.rotation_euler.z=math.radians(22)
    action=next(a for a in target.actions if a.name.split('.')[0]==animation)
    rig.animation_data.action=action; rig.animation_data.action_slot=action.slots[0]
scene.frame_set(13)
bpy.ops.object.light_add(type='AREA',location=at((-8,24,12))); light=bpy.context.object
light.data.energy=6000; light.data.shape='DISK'; light.data.size=18
light.rotation_euler=(Vector(at((0,0,0)))-light.location).to_track_quat('-Z','Y').to_euler()
for x,z in [(0,0),(-18,7),(18,-6),(0,18)]:
    bpy.ops.object.light_add(type='POINT',location=at((x,3.5,z+1.5)))
    bpy.context.object.data.energy=90; bpy.context.object.data.color=(1,.56,.25); bpy.context.object.data.shadow_soft_size=2
bpy.ops.object.camera_add(location=at((29,27,43))); camera=bpy.context.object
camera.rotation_euler=(Vector(at((0,1,2)))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO'; camera.data.ortho_scale=52; scene.camera=camera
out=os.path.join(ROOT,'docs/screenshots/blender/japan-festival.png'); scene.render.filepath=out
bpy.ops.render.render(write_still=True)
print('LEAD_JAPAN_RENDER_COMPLETE',out,flush=True)
