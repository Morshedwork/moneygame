"""Original Blender bento-shop cutaway, scoped to the business setup preview.
node tools/blender/headless.mjs tools/blender/build_shop_showroom.py
No changes to village, board, character models, or their manifests.
"""
import bpy, math, json, os, random
from mathutils import Vector
import build_assets as b

b.clear()
random.seed(152)
def linear(value):
    c=[int(value[i:i+2],16)/255 for i in [1,3,5]]
    return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in c)
palette={'Cedar':'#70432e','Honey timber':'#c58b56','End grain':'#b57848','Cream plaster':'#fff0d4','Roof slate':'#29485c','Roof edge':'#456b7c','Foundation':'#c9b79a','Grout':'#9b8f7a','Paper':'#fff5dc','Banner':'#52a7da','Vermilion':'#be4b3f','Lantern':'#ffe2a0','Brass':'#caa35e','Dark lacquer':'#57332d','Rice':'#fff8df','Nori':'#243b34','Salmon':'#ec906c','Egg':'#f6cc5f','Carrot':'#e97e36','Edamame':'#86ae57','Tea ceramic':'#698a80','Tea':'#7b9361','Pink flower':'#f3b6c0','Leaves':'#769559','Chalkboard':'#293d40','Label':'#ffffff'}
m={key:b.mat('Shop '+key,linear(value),metal=.45 if key=='Brass' else 0,emit=.5 if key=='Lantern' else 0) for key,value in palette.items()}
inventory=[]
def item(category, name, pos): inventory.append({'category':category,'name':name,'position':list(pos)})

def label(name,pos,w,h):
    x,y,z=pos
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata([b.at((x-w/2,y-h/2,z)),b.at((x+w/2,y-h/2,z)),b.at((x+w/2,y+h/2,z)),b.at((x-w/2,y+h/2,z))],[],[(0,1,2,3)])
    mesh.update();uv=mesh.uv_layers.new(name='LabelUV')
    for loop,co in zip(mesh.polygons[0].loop_indices,[(0,0),(1,0),(1,1),(0,1)]):uv.data[loop].uv=co
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);b.finish(obj,name,m['Label'])
    return obj
def torus(name,pos,r,minor,material):
    bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=minor,major_segments=20,minor_segments=6,location=b.at(pos))
    return b.finish(bpy.context.object,name,material)
def lantern(x,y,z):
    b.sphere('Pleated paper lantern',(x,y,z),(.31,.5,.31),m['Lantern'],20,12)
    for dy in [-.39,-.26,-.13,0,.13,.26,.39]:
        torus('Paper lantern bamboo ribs',(x,y+dy,z),.30*math.sqrt(1-(dy/.52)**2),.012,m['Honey timber'])
    for dy in [-.5,.5]:b.cyl('Lantern cap',(x,y+dy,z),.17,.055,m['Cedar'])
    b.beam('Lantern hanging cord',(x,y+.53,z),(x,y+.88,z),.013,m['Cedar'])
    b.text('Lantern shop crest','B',(x,y,z+.316),.24,m['Vermilion'])
def cup(x,y,z,ceramic='Tea ceramic'):
    b.cyl('Tea cup',(x,y+.14,z),.15,.27,m[ceramic],20)
    b.cyl('Tea in cup',(x,y+.283,z),.125,.008,m['Tea'],20)
    torus('Cup ceramic rim',(x,y+.29,z),.14,.021,m[ceramic])
def teapot(x,y,z):
    b.sphere('Glazed teapot body',(x,y+.23,z),(.34,.28,.30),m['Tea ceramic'],20,12)
    b.cyl('Teapot lid',(x,y+.47,z),.24,.045,m['Tea ceramic'],20)
    b.sphere('Teapot lid knob',(x,y+.54,z),(.07,.06,.07),m['Brass'],12,8)
    b.beam('Teapot spout',(x+.22,y+.22,z),(x+.55,y+.36,z),.075,m['Tea ceramic'])
    ob=torus('Teapot handle',(x-.28,y+.24,z),.21,.045,m['Cedar']);ob.rotation_euler.x=math.pi/2

# Rounded raised platform, boards, threshold and planted corners.
b.box('Shop stone plinth',(0,-.14,0),(10.8,.4,7.5),m['Foundation'],.25)
b.box('Plinth indigo band',(0,-.32,0),(10.55,.11,7.3),m['Roof slate'],.12)
for i in range(12):b.box('Individual cedar deck plank',(-3.15+i*.575,.11,-.1),(.555,.16,4.55),m['Honey timber'] if i%3 else m['End grain'],.025)
b.box('Entry stone step',(0,-.015,2.72),(5,.12,.9),m['Foundation'],.08)
for x,z in [(-4.3,-2.8),(4.35,-2.75),(4.4,2.7)]:
    for i in range(3):b.box('Hand cut paving',(x+(i%2)*.4,.075,z+(i//2)*.43),(.37,.04,.4),m['Grout'],.05)

# Open-front architecture: right wall is open, left shoji screen stays behind the serving plane.
b.box('Rear cream wall',(0,2.35,-2.21),(6.7,4.3,.15),m['Cream plaster'])
for x in [-3.35,3.35]:
    for z in [-2.15,2.0]:b.box('Cedar supporting post',(x,2.4,z),(.19,4.55,.19),m['Cedar'])
    b.box('Roof bearing timber',(x,4.62,-.075),(.22,.18,4.42),m['Cedar'])
    b.beam('RoofBack cedar rafter',(x,4.62,-2.25),(x,5.35,0),.075,m['Cedar'])
    b.beam('RoofFront cedar rafter',(x,4.62,2.25),(x,5.35,0),.075,m['Cedar'])
for y in [.45,4.50]:b.box('Rear timber beam',(0,y,-2.08),(6.8,.15,.17),m['Cedar'])
for x in [-3.3,-1.15,1.15,3.3]:b.box('Back wall timber stud',(x,2.40,-2.07),(.13,4.17,.16),m['Cedar'])
b.box('Shoji paper screen',(-3.3,2.05,-1.13),(.08,3.25,2.0),m['Paper'])
for z in [-2.05,-1.65,-1.25,-.85,-.45,-.15]:b.box('Shoji upright lattice',(-3.23,2.05,z),(.055,3.3,.04),m['Cedar'],.003)
for y in [.5,.95,1.4,1.85,2.3,2.75,3.2,3.65]:b.box('Shoji cross lattice',(-3.23,y,-1.12),(.055,.035,2.0),m['Cedar'],.003)
# Five separate banner panels are controlled by the chosen LEAD color.
b.box('FrontDisplay crossbeam',(0,4.02,2.05),(7.0,.19,.21),m['Cedar'])
for i in range(5):
    x=-2.2+i*1.1
    b.box('FrontDisplay noren banner',(x,3.66,2.11),(1.05,.57,.045),m['Banner'],.012)
    b.box('FrontDisplay stitched hem',(x,3.41,2.144),(.95,.025,.012),m['Paper'],.002)
    b.text('FrontDisplay noren motif','•',(x,3.65,2.151),.20,m['Paper'])
b.box('FrontDisplay name plaque',(0,4.12,2.28),(5.25,.78,.16),m['Cedar'],.075)
label('Shop_name_label',(0,4.12,2.372),4.98,.57)

# Tiled roof runs across the stall: front half can be hidden to inspect every shelf.
for side in [-1,1]:
    section='RoofBack' if side<0 else 'RoofFront'
    for j in range(8):
        t0=j/8;t1=(j+1)/8
        z0=side*2.65*t0;z1=side*2.65*t1
        y0=5.45-1.03*t0+.27*t0**4;y1=5.45-1.03*t1+.27*t1**4
        verts=[b.at((-3.85,y0,z0)),b.at((3.85,y0,z0)),b.at((3.85,y1,z1)),b.at((-3.85,y1,z1))]
        mesh=bpy.data.meshes.new(section);mesh.from_pydata(verts,[],[(0,1,2,3)]);mesh.update()
        obj=bpy.data.objects.new(section,mesh);bpy.context.collection.objects.link(obj);b.finish(obj,section,m['Roof slate'])
        mod=obj.modifiers.new('Solid clay tiles','SOLIDIFY');mod.thickness=.1;bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=mod.name)
    for x in [-3.75+i*.375 for i in range(21)]:
        for j in range(6):
            t0=j/6;t1=(j+1)/6
            b.beam(section+' curved tile rib',(x,5.50-1.03*t0+.27*t0**4,side*2.65*t0),(x,5.50-1.03*t1+.27*t1**4,side*2.65*t1),.045,m['Roof edge'])
    b.beam(section+' lifted eave',(-3.93,4.72,side*2.7),(3.93,4.72,side*2.7),.11,m['Roof slate'])
b.beam('Rounded ridge cap',(-4,5.53,0),(4,5.53,0),.14,m['Roof slate'])
for x in [-3.5,3.5]:lantern(x,3.14,2.22)

# Main slatted serving counter, inset drawers, brass handles and prep surface.
b.box('Front counter cabinet',(0,.66,1.34),(5.9,1.04,.94),m['Cedar'],.045)
for i in range(26):b.box('Counter hand laid slat',(-2.85+i*.228,.69,1.824),(.10,.91,.035),m['Honey timber'],.008)
b.box('Thick serving counter',(0,1.25,1.34),(6.28,.20,1.36),m['Honey timber'],.075)
for x in [-2.05,0,2.05]:
    b.box('Inset counter drawer',(x,.77,.842),(1.83,.65,.035),m['End grain'],.025)
    b.beam('Brass drawer handle',(x-.16,.89,.808),(x+.16,.89,.808),.022,m['Brass'])
b.box('Prep worktop',(.2,1.1,-1.6),(5.35,.16,.83),m['Honey timber'],.04)
for x in [-2,2.4]:b.box('Prep counter leg',(x,.59,-1.6),(.14,1.02,.65),m['Cedar'])

def bento(x,z,variant):
    y=1.37
    b.box('Bento lacquer tray',(x,y,z),(1.36,.14,.98),m['Dark lacquer'],.055)
    b.box('Bento inner tray',(x,y+.09,z),(1.25,.07,.87),m['Vermilion'],.015)
    b.box('Bento vertical divider',(x+.12,y+.15,z),(.035,.15,.86),m['Dark lacquer'],.008)
    b.box('Bento horizontal divider',(x+.38,y+.15,z+.02),(.49,.15,.035),m['Dark lacquer'],.008)
    # Rice is made of individual soft grains rather than a flat decal.
    for i in range(26):
        xx=x-.46+(i%5)*.108;zz=z-.31+(i//5)*.117
        grain=b.sphere('Rice grain',(xx,y+.185+random.random()*.03,zz),(.085,.065,.042),m['Rice'],8,6);grain.rotation_euler.z=random.uniform(-.45,.45)
    for i in range(3):
        if variant%2==0:
            b.box('Tamago slice',(x+.39,y+.21,z-.26+i*.09),(.35,.15,.077),m['Egg'],.04)
        else:
            b.box('Salmon slice',(x-.24,y+.29,z-.21+i*.145),(.49,.105,.12),m['Salmon'],.04)
            b.box('Salmon highlight',(x-.24,y+.347,z-.205+i*.145),(.43,.006,.022),m['Rice'],.003)
    for i in range(4):
        b.sphere('Edamame beans',(x+.32+(i%2)*.14,y+.21,z+.17+(i//2)*.13),(.078,.065,.10),m['Edamame'],10,6)
    b.star('Carrot flower',x+.50,y+.26,z+.28,.115,m['Carrot'])
    item('Counter','Bento tray '+str(variant+1),(x,1.6,z))
for i,x in enumerate([-2.02,-.46,1.1]):bento(x,1.42,i)
# Chopsticks, napkins, soy bottle and hand-written price board.
for i in range(4):b.box('Folded napkin',(2.27,1.385+i*.023,1.66),(.50,.021,.39),m['Paper'],.018)
for i in range(6):b.beam('Serving chopsticks',(2.1+i*.065,1.49,1.05),(2.1+i*.065,1.49,1.60),.013,m['Honey timber'])
b.cyl('Soy sauce bottle',(2.64,1.60,1.12),.11,.45,m['Dark lacquer'],16)
b.cyl('Sauce bottle cap',(2.64,1.86,1.12),.10,.07,m['Vermilion'],16)
item('Counter','Chopsticks, napkins and soy sauce',(2.4,1.6,1.4))
b.box('Small menu easel',(3.98,.95,1.10),(1.03,1.65,.16),m['Cedar'],.045)
b.box('Chalkboard inset',(3.98,1.03,1.194),(.84,1.3,.025),m['Chalkboard'],.025)
label('Shop_price_label',(3.98,1.03,1.214),.78,1.18)
for z in [.82,1.40]:b.box('Menu board feet',(3.98,.20,z),(.91,.3,.12),m['Cedar'])

# Stocked back shelves: ceramic bowls, tea tins, rice jars and takeaway boxes.
for y in [1.87,2.7]:
    b.box('Open display shelf',(0,y,-1.87),(5.5,.14,.56),m['Honey timber'],.025)
    for x in [-2.4,2.4]:b.beam('Shelf bracket',(x,y-.30,-2.1),(x,y-.07,-1.65),.025,m['Brass'])
for i in range(4):
    x=-2.1+i*.54
    b.cyl('Tea tin',(x,2.19,-1.85),.20,.49,m['Tea ceramic'] if i%2 else m['Banner'],20)
    b.cyl('Tea tin brass lid',(x,2.45,-1.85),.215,.065,m['Brass'],20)
    b.text('Tea tin lettering','TEA',(x,2.2,-1.64),.1,m['Paper'])
for i in range(4):
    x=.5+i*.54
    b.sphere('Rice storage jar',(x,2.15,-1.86),(.23,.26,.21),m['Paper'],16,10)
    b.cyl('Rice jar wooden lid',(x,2.42,-1.86),.20,.065,m['Cedar'],16)
for i in range(5):
    x=-2.13+i*.72
    for j in range(3):
        b.cyl('Stacked serving bowl',(x,2.87+j*.09,-1.85),.23,.075,m['Tea ceramic'] if i%2 else m['Paper'],20)
        torus('Bowl lip',(x,2.91+j*.09,-1.85),.23,.015,m['Paper'])
for i in range(4):b.box('Stacked takeaway box',(2.07,2.88+i*.115,-1.83),(.7,.09,.42),m['Paper'],.03)
item('Shelves','Tea tins and rice jars',(0,2.2,-1.85));item('Shelves','Bowls and takeaway boxes',(0,3,-1.85))
teapot(1.3,1.18,-1.48)
for x in [.3,.75]:cup(x,1.18,-1.43)
b.box('Bamboo preparation board',(-1.4,1.21,-1.43),(1.35,.055,.52),m['Honey timber'],.05)
for i in range(3):
    x=-1.75+i*.37
    b.sphere('Onigiri rice triangle',(x,1.42,-1.43),(.17,.19,.14),m['Rice'],12,8)
    b.box('Nori wrapper',(x,1.32,-1.275),(.15,.20,.017),m['Nori'],.006)
item('Kitchen','Tea set and onigiri prep',(0,1.6,-1.4))
# Produce crate and flower pot add close-up, handmade details.
b.box('Produce crate',(4.0,.43,-1.1),(1.20,.72,1.15),m['Cedar'],.04)
for y in [.17,.40,.63]:
    b.box('Crate front slat',(4,y,-.5),(1.2,.15,.06),m['Honey timber'],.008)
for i in range(8):b.sphere('Crate fresh produce',(3.68+(i%3)*.28,.84,-1.37+(i//3)*.28),(.16,.17,.16),m['Edamame'] if i%2 else m['Carrot'],12,8)
item('Kitchen','Fresh produce crate',(4,1,-1.1))
b.cyl('Flower ceramic pot',(-4.35,.52,-1.45),.40,.7,m['Vermilion'],24)
b.cyl('Flower pot soil',(-4.35,.89,-1.45),.35,.025,m['Cedar'],20)
for i in range(6):
    a=i*math.tau/6;dx=math.cos(a)*.33;dz=math.sin(a)*.33;y=1.45+random.uniform(0,.32)
    b.beam('Flower stem',(-4.35,.86,-1.45),(-4.35+dx,y,-1.45+dz),.025,m['Leaves'])
    for j in range(5):
        angle=j*math.tau/5
        b.sphere('Flower petal',(-4.35+dx+math.cos(angle)*.105,y,-1.45+dz+math.sin(angle)*.105),(.10,.055,.10),m['Pink flower'],10,6)
    b.sphere('Flower center',(-4.35+dx,y+.02,-1.45+dz),(.06,.04,.06),m['Egg'],10,6)

# Preserve two roof sections and dynamic labels; batch the rest by material.
bpy.ops.object.select_all(action='DESELECT')
for prefix in ['Body','RoofFront','RoofBack','FrontDisplay']:
    for material in list(b.M.values()):
        objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and not o.name.startswith('Shop_') and len(o.data.materials)==1 and o.data.materials[0]==material and ((prefix=='Body' and not o.name.startswith(('RoofFront','RoofBack','FrontDisplay'))) or o.name.startswith(prefix))]
        if not objects:continue
        for o in objects:o.select_set(True)
        if len(objects)>1:
            bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
        obj=objects[0] if len(objects)==1 else bpy.context.object
        obj.name=prefix+'_'+material.name.replace(' ','_')
        bpy.ops.object.select_all(action='DESELECT')
b.export('bento-showroom')
asset=b.manifest['assets'][-1]
asset.update({'generator':'tools/blender/build_shop_showroom.py','blender':bpy.app.version_string,'inventory':inventory,'dynamicLabels':['Shop_name_label','Shop_price_label'],'openRoofPrefix':'RoofFront','interiorCutawayPrefix':'FrontDisplay','bannerMaterial':'Shop Banner'})
with open(os.path.join(b.OUT,'bento-showroom.json'),'w',encoding='utf-8') as f:json.dump(asset,f,indent=2)
print('BENTO_SHOWROOM_EXPORTED',flush=True)

# Verify the open-roof composition using a real Blender render and existing Prena.
for o in bpy.context.scene.objects:
    if o.name.startswith('RoofFront'):o.hide_render=True
for name in ['Shop_name_label','Shop_price_label']:bpy.data.objects[name].hide_render=True
b.text('Preview name','LITTLE BENTO CO.',(0,4.12,2.38),.36,m['Paper'])
b.text('Preview menu','BENTO\n6 COINS',(3.98,1.15,1.23),.20,m['Paper'])
with bpy.data.libraries.load(os.path.join(b.SOURCE,'prena.blend'),link=False) as (source,target):
    target.objects=[name for name in source.objects if not name.startswith(('Camera','Light'))]
loaded=[o for o in target.objects if o]
for o in loaded:bpy.context.collection.objects.link(o)
rig=bpy.data.objects.new('Preview owner',None);bpy.context.collection.objects.link(rig)
for o in loaded:
    if o.parent is None:o.parent=rig
rig.location=b.at((-3.7,.08,2.25));rig.scale=(.85,.85,.85)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.66,.76,.79,1);scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.65
bpy.ops.object.light_add(type='AREA',location=b.at((-4,11,9)));light=bpy.context.object;light.data.energy=1800;light.data.size=8;light.rotation_euler=(Vector(b.at((0,1,0)))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='AREA',location=b.at((6,7,3)));light=bpy.context.object;light.data.energy=1000;light.data.size=6;light.rotation_euler=(Vector(b.at((0,1,0)))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=b.at((10,8.1,16)));camera=bpy.context.object;camera.rotation_euler=(Vector(b.at((0,2.0,0)))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=13.6;scene.camera=camera
scene.render.resolution_x=1300;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX'
scene.render.filepath=os.path.join(b.ROOT,'docs/screenshots/blender/bento-showroom.png');bpy.ops.render.render(write_still=True)
# Close-up compositions mirror the in-game camera presets. These are Blender
# renders, not browser screenshots or runtime acceptance tests.
for suffix,pos,target,width,height in [
    ('counter',(3.8,6.4,10),(0,1.4,1.3),8.5,5.3),
    ('inside',(5.1,5.05,5.6),(0,2.15,-1.8),6.6,4.8),
]:
    if suffix=='inside':
        for o in scene.objects:
            if o.name.startswith(('FrontDisplay','Preview name')):o.hide_render=True
    camera.location=b.at(pos);camera.rotation_euler=(Vector(b.at(target))-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.ortho_scale=max(width,height*1.3)
    scene.render.filepath=os.path.join(b.ROOT,'docs/screenshots/blender/bento-showroom-'+suffix+'.png');bpy.ops.render.render(write_still=True)
print('BENTO_SHOWROOM_COMPLETE',flush=True)
