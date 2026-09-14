"""One-time exact component migration for the first generated board environment.

Recreates only the original booth/bunting templates, matches their disconnected
mesh components in the material-batched source, and moves those pieces +2.5 Z.
The ordinary builder now emits the adjusted layout directly.
"""
import bpy, os, json, math
from mathutils import Vector

ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
BUILDER=os.path.join(ROOT,'tools','blender','build_board_village.py')
SOURCE=os.path.join(ROOT,'assets','source','blender','yatai-board-village.blend')

def components(obj):
    mesh=obj.data
    parent=list(range(len(mesh.vertices)))
    def root(i):
        while parent[i]!=i:
            parent[i]=parent[parent[i]];i=parent[i]
        return i
    for edge in mesh.edges:
        a,c=edge.vertices;ra,rc=root(a),root(c)
        if ra!=rc:parent[rc]=ra
    groups={}
    for i in range(len(parent)):groups.setdefault(root(i),[]).append(i)
    material=obj.data.materials[0].name
    result=[]
    for vertices in groups.values():
        points=[obj.matrix_world@mesh.vertices[i].co for i in vertices]
        bounds=tuple(min(p[k] for p in points) for k in range(3))+tuple(max(p[k] for p in points) for k in range(3))
        result.append({'object':obj,'vertices':vertices,'bounds':bounds,'key':(material,len(vertices))})
    return result

namespace={'__file__':BUILDER,'__name__':'board_stall_template'}
with open(BUILDER,encoding='utf8') as handle:prefix=handle.read().split('# A continuous handcrafted sandstone plaza')[0]
exec(compile(prefix,BUILDER,'exec'),namespace)
namespace['stall'](0,-1.25,4.9,2.15,namespace['red'],True)
namespace['stall'](-5.10,-2.0,2.55,1.80,namespace['blue'])
namespace['stall'](5.10,-2.0,2.55,1.80,namespace['yellow'])
for x in [-6.55,6.55]:namespace['box']('Bunting post',(x,2.0,-4.3),(.17,4,.17),namespace['cedar'],.025)
namespace['bunting']((-6.55,3.95,-4.3),(6.55,3.95,-4.3),16)
namespace['bunting']((-6.55,3.95,-4.3),(-3.15,2.90,-2.6),5)
namespace['bunting']((3.15,2.90,-2.6),(6.55,3.95,-4.3),5)
bpy.context.view_layer.update()
templates=[component for obj in bpy.context.scene.objects if obj.type=='MESH' for component in components(obj)]
# Keep plain numeric template records before replacing the scene.
templates=[{'bounds':r['bounds'],'key':r['key']} for r in templates]
print('STALL_SHIFT template components',len(templates),flush=True)
bpy.ops.wm.open_mainfile(filepath=SOURCE)
if bpy.context.scene.get('central_stalls_forward_shift'):
    raise RuntimeError('This environment already has its central stalls adjusted; refusing a duplicate shift.')
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
    print('STALL_SHIFT unmatched',json.dumps(missing[:20]),flush=True)
    raise RuntimeError(f'Unsafe partial match: {len(missing)} of {len(templates)} components are unmatched.')
print('STALL_SHIFT verified exact component matches',len(selected),flush=True)
changed_vertices=0
for record in selected:
    obj=record['object'];delta=obj.matrix_world.inverted().to_3x3()@Vector((0,-2.5,0))
    for i in record['vertices']:obj.data.vertices[i].co+=delta;changed_vertices+=1
for obj in bpy.context.scene.objects:
    if obj.type=='MESH':obj.data.update()
bpy.context.scene['central_stalls_forward_shift']=2.5
bpy.context.view_layer.update()
import build_assets as b
b.export('yatai-board-village')
metadata=os.path.join(ROOT,'assets','source','blender','yatai-board-village.json')
with open(metadata,encoding='utf8') as handle:details=json.load(handle)
details['centralStallsBrowserZShift']=2.5
details['shiftedComponents']=len(selected)
details['shiftedVertices']=changed_vertices
details['note']='Y-up browser coordinates. Central counter at (0,1.25), river at z=-18.1. Entirely modeled 3D; no photographic planes.'
with open(metadata,'w',encoding='utf8') as handle:json.dump(details,handle,indent=2)
print('STALL_SHIFT_COMPLETE',len(selected),changed_vertices,flush=True)
