"""Render the actual saved Blender assets, with pose and skin sanity checks."""
import bpy, os, math, json
from mathutils import Vector
from reference_mascots import linear, COLORS
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
OUT=os.path.join(ROOT,'docs','screenshots','blender')
os.makedirs(OUT,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=True
scene.render.resolution_x=1600;scene.render.resolution_y=860;scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard'
scene.render.image_settings.file_format='PNG'
world=bpy.data.worlds.new('Soft studio');world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.8,.85,1,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.4;scene.world=world
def material(name,color):
    m=bpy.data.materials.new(name);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*linear(color),1);p.inputs['Roughness'].default_value=.85
    return m
floor_mat=material('Studio warm white','f5f4fc');ink=material('Lettering','27263f')
bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;floor.data.materials.append(floor_mat);floor.location.z=-.15
def area(label,location,power,size):
    bpy.ops.object.light_add(type='AREA',location=location);o=bpy.context.object;o.name=label;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,1.4))-o.location).to_track_quat('-Z','Y').to_euler()
area('Large soft key',(-4,-6,9),850,7);area('Gentle fill',(6,-2,6),450,6);area('Crown rim',(1,4,7),750,5)
rigs=[];report=[]
for index,name in enumerate(['lido','prena','oty','diva']):
    with bpy.data.libraries.load(os.path.join(ROOT,'assets','source','blender',name+'.blend'),link=False) as (source,target):
        target.objects=source.objects;target.actions=source.actions
    objects=[o for o in target.objects if o]
    for o in objects:scene.collection.objects.link(o)
    rig=next(o for o in objects if o.type=='ARMATURE')
    body=next(o for o in objects if o.name.startswith('Continuous soft silhouette'))
    # Every skinned vertex has normalized positive weights, and all references
    # are real meshes; no image planes are used for the character designs.
    for vertex in body.data.vertices:
        assert abs(sum(g.weight for g in vertex.groups)-1)<.001
        if vertex.co.x>.56 and .74<vertex.co.z<.96:
            arm_weight=sum(g.weight for g in vertex.groups if body.vertex_groups[g.group].name=='arm.R')
            assert arm_weight>.99, (name,'Right mitten must follow only its arm',arm_weight)
    assert len(rig.pose.bones)==10
    actions={a.name.split('.')[0]:a for a in target.actions}
    assert len(actions)==18
    rig.animation_data.action=actions['Celebrate'];rig.animation_data.action_slot=actions['Celebrate'].slots[0]
    scene.frame_set(13);bpy.context.view_layer.update()
    hand=rig.pose.bones['arm.R'].matrix @ rig.data.bones['arm.R'].matrix_local.inverted() @ Vector((.65,-.01,.87))
    assert hand.z>1.8, (name,'Wave must lift the hand',list(hand))
    jump=rig.pose.bones['root'].matrix.translation
    assert jump.z>.12 and abs(jump.y)<.001, (name,'Jump must move upward, not in depth',list(jump))
    rig.animation_data.action=actions['Wave'];rig.animation_data.action_slot=actions['Wave'].slots[0]
    scene.frame_set(13);bpy.context.view_layer.update()
    # Skin deformation must not make the model explode in its raised-arm pose.
    evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    assert all(math.isfinite(v.co.length) and v.co.length<4 for v in evaluated.data.vertices)
    hand_vertices=[evaluated.data.vertices[v.index].co for v in body.data.vertices if v.co.x>.56 and .74<v.co.z<.96]
    assert hand_vertices and min(v.z for v in hand_vertices)>1.64, (name,'Raised mitten skin must rise with its bone')
    longest_edge=max((evaluated.data.vertices[e.vertices[0]].co-evaluated.data.vertices[e.vertices[1]].co).length for e in body.data.edges)
    assert longest_edge<.22, (name,'Pose stretches a skin edge too far',longest_edge)
    rig.animation_data.action=actions['Idle'];rig.animation_data.action_slot=actions['Idle'].slots[0]
    scene.frame_set(1);bpy.context.view_layer.update()
    rig.location.x=(index-1.5)*2.2;rig.location.z=.035
    rigs.append((rig,actions))
    report.append({'character':name,'bones':len(rig.pose.bones),'actions':len(actions),'normalized_weights':True,'vertical_jump':True,'finite_wave_skin':True,'hand_weights_and_raised_skin':True,'longest_wave_edge':round(longest_edge,4)})
    bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=.91,depth=.08,location=(rig.location.x,0,-.035));plinth=bpy.context.object
    plinth.data.materials.append(material(name+' podium',COLORS[name]))
    mod=plinth.modifiers.new('Rounded edge','BEVEL');mod.width=.035;mod.segments=3
    bpy.ops.object.text_add(location=(rig.location.x,-1.02,-.10),rotation=(math.pi/2,0,0));label=bpy.context.object
    label.data.body=name.upper();label.data.align_x='CENTER';label.data.size=.19;label.data.extrude=.001;label.data.materials.append(ink)
bpy.ops.object.camera_add(location=(0,-15,5.2));camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=9.45
camera.rotation_euler=(Vector((0,0,1.40))-camera.location).to_track_quat('-Z','Y').to_euler();scene.camera=camera
scene.render.filepath=os.path.join(OUT,'reference-lineup.png');bpy.ops.render.render(write_still=True)
for (rig,actions),animation in zip(rigs,['Wave','Explain','Celebrate','Ask']):
    rig.animation_data.action=actions[animation];rig.animation_data.action_slot=actions[animation].slots[0]
    rig.rotation_euler.z=math.radians(-12)
scene.frame_set(13)
scene.render.filepath=os.path.join(OUT,'animated-poses.png');bpy.ops.render.render(write_still=True)
for (rig,actions),animation in zip(rigs,['Talk','GentleConcern','Talk','GentleConcern']):
    rig.animation_data.action=actions[animation];rig.animation_data.action_slot=actions[animation].slots[0]
    rig.rotation_euler.z=math.radians(-12)
scene.frame_set(22)
scene.render.filepath=os.path.join(OUT,'facial-poses.png');bpy.ops.render.render(write_still=True)
with open(os.path.join(OUT,'model-checks.json'),'w',encoding='utf-8') as f:json.dump({'blender':bpy.app.version_string,'models':report},f,indent=2)
print('LEAD_STUDIO_RENDER_COMPLETE',flush=True)
