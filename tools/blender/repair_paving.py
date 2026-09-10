"""Update only our generated paving batch, removing coplanar corner overlaps."""
import os, json, random
import build_assets as b
path=os.path.join(b.OUT,'manifest.json')
with open(path,encoding='utf-8') as source: b.manifest=json.load(source)
b.manifest['assets']=[a for a in b.manifest['assets'] if a['id']!='yatai-village']
b.bpy.ops.wm.open_mainfile(filepath=os.path.join(b.SOURCE,'yatai-village.blend'))
old=b.bpy.data.objects.get('Village_Sandstone')
assert old and old.type=='MESH'
paving=old.data.materials[0]
b.bpy.data.objects.remove(old,do_unlink=True)
b.box('Main village lane',(0,.01,4),(9,.09,50),paving,.15)
b.box('Market cross street',(0,.02,1),(54,.10,8),paving,.15)
for z in [-10,10]: b.box('Quarter path',(0,.03,z),(24,.12,3.7),paving)
for x in [-10,10]: b.box('Quarter path',(x,.03,0),(3.7,.12,16.3),paving)
random.seed(27)
for i in range(270):
    x=random.uniform(-26,26); z=random.uniform(-22,24)
    if abs(x)<4 or abs(z-1)<3.5:
        w=random.uniform(.5,1.1); d=random.uniform(.4,.8)
        if i%3: b.box('Hand laid paving',(x,.08,z),(w,.035,d),paving,.045)
b.bpy.ops.object.select_all(action='DESELECT')
objects=[o for o in b.bpy.context.scene.objects if o.type=='MESH' and len(o.data.materials)==1 and o.data.materials[0]==paving]
for o in objects: o.select_set(True)
b.bpy.context.view_layer.objects.active=objects[0]; b.bpy.ops.object.join(); b.bpy.context.object.name='Village_Sandstone'
b.export('yatai-village')
with open(path,'w',encoding='utf-8') as target: json.dump(b.manifest,target,indent=2)
print('LEAD_PAVING_REPAIRED',flush=True)
