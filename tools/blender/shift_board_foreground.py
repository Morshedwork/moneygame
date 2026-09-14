"""One-time exact-component spacing update for the modeled foreground props."""
import bpy, os, json
from mathutils import Vector

ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
BUILDER=os.path.join(ROOT,'tools','blender','build_board_village.py')
SOURCE=os.path.join(ROOT,'assets','source','blender','yatai-board-village.blend')

# Share the established connected-component matching implementation without
# executing the earlier booth migration again.
with open(os.path.join(os.path.dirname(__file__),'shift_board_stalls.py'),encoding='utf8') as handle:
    helper=handle.read().split('def components(obj):',1)[1].split("namespace={'__file__'",1)[0]
exec('def components(obj):'+helper)
with open(BUILDER,encoding='utf8') as handle:builder=handle.read()
namespace={'__file__':BUILDER,'__name__':'board_foreground_template'}
exec(compile(builder.split('# A continuous handcrafted sandstone plaza')[0],BUILDER,'exec'),namespace)
block=builder.split('# Fortune stand and a budding wish tree toward the front of the center square.',1)[1]
block=block.split('# Forward spacing keeps the mascot bodies visible;',1)[0]
exec(compile(block,BUILDER,'exec'),namespace)
bpy.context.view_layer.update()
templates=[component for obj in bpy.context.scene.objects if obj.type=='MESH' for component in components(obj)]
templates=[{'bounds':r['bounds'],'key':r['key']} for r in templates]
print('FOREGROUND_SHIFT template components',len(templates),flush=True)
bpy.ops.wm.open_mainfile(filepath=SOURCE)
if bpy.context.scene.get('foreground_props_forward_shift'):
    raise RuntimeError('Foreground spacing is already applied; refusing a duplicate translation.')
lookup={}
for obj in bpy.context.scene.objects:
    if obj.type!='MESH':continue
    for record in components(obj):lookup.setdefault(record['key'],[]).append(record)
selected=[];claimed=set();missing=[]
for template in templates:
    matches=[r for r in lookup.get(template['key'],[]) if max(abs(a-c) for a,c in zip(r['bounds'],template['bounds']))<.0005]
    if len(matches)!=1:
        missing.append({'template':template,'matches':len(matches)})
        continue
    record=matches[0];identity=(record['object'].name,record['vertices'][0])
    if identity in claimed:raise RuntimeError('Template matched a component twice: '+str(identity))
    claimed.add(identity);selected.append(record)
if missing:
    print('FOREGROUND_SHIFT unmatched',json.dumps(missing[:20]),flush=True)
    raise RuntimeError(f'Unsafe partial match: {len(missing)} of {len(templates)} components are unmatched.')
print('FOREGROUND_SHIFT verified exact component matches',len(selected),flush=True)
changed_vertices=0
for record in selected:
    obj=record['object'];delta=obj.matrix_world.inverted().to_3x3()@Vector((0,-1.65,0))
    for i in record['vertices']:obj.data.vertices[i].co+=delta;changed_vertices+=1
for obj in bpy.context.scene.objects:
    if obj.type=='MESH':obj.data.update()
bpy.context.scene['foreground_props_forward_shift']=1.65
bpy.context.view_layer.update()
import build_assets as b
b.export('yatai-board-village')
metadata=os.path.join(ROOT,'assets','source','blender','yatai-board-village.json')
with open(metadata,encoding='utf8') as handle:details=json.load(handle)
details['foregroundPropsBrowserZShift']=1.65
details['foregroundShiftedComponents']=len(selected)
details['foregroundShiftedVertices']=changed_vertices
with open(metadata,'w',encoding='utf8') as handle:json.dump(details,handle,indent=2)
print('FOREGROUND_SHIFT_COMPLETE',len(selected),changed_vertices,flush=True)
