"""Two original, walkable Japan-inspired districts. Uses real Blender meshes.

Run: node tools/blender/headless.mjs tools/blender/build_districts.py
Writes only the expansion assets/navigation; never rewrites the main village.
"""
import bpy, json, math, os, random, sys
from mathutils import Vector
import build_assets as a

ROOT = a.ROOT
with open(os.path.join(ROOT, 'apps/client/village/districts.json'), encoding='utf-8') as f:
    DISTRICTS = json.load(f)

def linear(hex_value):
    values = [int(hex_value[i:i+2], 16) / 255 for i in (1, 3, 5)]
    return tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in values)

def build(district):
    a.clear()
    random.seed(74 if district['id'] == 'sakura' else 93)
    nav = {'spawns': {'player': district['spawn']}, 'bounds': {'minX': -19, 'maxX': 19, 'minZ': -18, 'maxZ': 18}, 'colliders': [], 'interactions': []}
    colors = {'cedar': '#69402c', 'timber': '#b77e4f', 'paper': '#f5e8ce', 'indigo': '#314963', 'red': '#b94a43', 'stone': '#a9aaa0', 'path': '#ded0b6', 'moss': '#8aa66f', 'leaf': '#60835c', 'pink': '#f1b6ca', 'water': '#67adba', 'gold': '#ffd88b', 'lavender': '#b698f5', 'sky': '#52a7da', 'green': '#6dba32', 'yellow': '#ffde00', 'coral': '#f96366'}
    m = {k: a.mat('District ' + k, linear(v), emit=.45 if k == 'gold' else 0) for k, v in colors.items()}
    def block(x, z, w, d):
        nav['colliders'].append({'x': x, 'z': z, 'w': w, 'd': d})
    def lantern(x, y, z, color='gold'):
        a.sphere('Ribbed paper lantern', (x,y,z), (.24,.38,.24), m[color], 12, 8)
        for dy in [-.31, -.16, 0, .16, .31]:
            r = .22 * math.sqrt(max(.15, 1-(dy/.39)**2))
            bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=.014, major_segments=12, minor_segments=4, location=a.at((x,y+dy,z)))
            a.finish(bpy.context.object, 'Lantern bamboo ring', m['timber'])
        for dy in [-.38,.38]: a.cyl('Lantern cap', (x,y+dy,z), .14, .055, m['cedar'])
    def tree(x, z, pink=True):
        a.cyl('Sakura trunk' if pink else 'Garden pine trunk', (x,1.2,z), .24, 2.4, m['cedar'], 8)
        for i in range(4):
            angle = i * math.tau / 4
            dx, dz = math.cos(angle)*.95, math.sin(angle)*.95
            a.beam('Tree branch', (x,1.5,z), (x+dx,2.9,z+dz), .105, m['cedar'])
            a.sphere('Sakura blossom cluster' if pink else 'Pine canopy', (x+dx,3.1+random.random()*.6,z+dz), (1.35,1.03,1.15), m['pink' if pink else 'leaf'], 10, 6)
        a.sphere('Tree crown', (x,3.8,z), (1.55,1,1.4), m['pink' if pink else 'leaf'], 10, 6)
        block(x,z,.6,.6)
    def stone_lamp(x,z):
        a.box('Stone lantern foot',(x,.16,z),(.75,.32,.75),m['stone'])
        a.cyl('Stone lantern column',(x,.68,z),.17,.9,m['stone'])
        a.box('Stone light chamber',(x,1.26,z),(.58,.45,.58),m['gold'])
        for dx in [-.25,.25]:
            for dz in [-.25,.25]: a.box('Stone light corner',(x+dx,1.27,z+dz),(.08,.55,.08),m['stone'])
        a.box('Stone lantern lid',(x,1.59,z),(.84,.16,.84),m['stone'])
        a.sphere('Lantern stone finial',(x,1.79,z),(.18,.22,.18),m['stone'],10,6)
        block(x,z,.8,.8)
    def pavilion(x,z,label,accent='indigo'):
        a.box(label+' foundation',(x,.18,z),(6,.35,4.5),m['stone'],.1)
        a.box(label+' floor',(x,.4,z),(5.7,.15,4.2),m['timber'])
        a.box(label+' back wall',(x,1.9,z-1.9),(5.5,3,.15),m['paper'])
        for dx in [-2.6,2.6]:
            for dz in [-1.9,1.9]: a.box('Cedar column',(x+dx,2,z+dz),(.2,3.6,.2),m['cedar'])
            a.box('Shoji side screen',(x+dx,1.8,z),(.12,2.65,3.6),m['paper'])
            for zz in [-1.4,-.7,0,.7,1.4]: a.box('Shoji vertical lattice',(x+dx+.08,1.8,z+zz),(.09,2.7,.045),m['timber'],.004)
            for yy in [.65,1.2,1.8,2.4,3]: a.box('Shoji horizontal lattice',(x+dx+.08,yy,z),(.09,.04,3.6),m['timber'],.004)
        a.roof(x,3.6,z,5.8,4.3,m[accent])
        a.box('Noren lintel',(x,3.2,z+2.15),(5.7,.18,.2),m['cedar'])
        for i in range(5):
            a.box('Split noren panel',(x-2+i,2.86,z+2.2),(.94,.63,.045),m[accent],.008)
            a.box('Noren hem',(x-2+i,2.59,z+2.24),(.86,.025,.015),m['paper'],.002)
        a.box('Handmade shop board',(x,3.85,z+2.61),(4.8,.48,.1),m['cedar'])
        a.text('Shop lettering',label,(x,3.85,z+2.68),.28,m['paper'])
        for dx in [-2.6,2.6]: lantern(x+dx,2.65,z+2.45)
        a.box('Craft counter',(x,1.1,z+1.3),(4.8,.16,.85),m['timber'])
        for dx in [-1.9,1.9]: a.box('Counter feet',(x+dx,.7,z+1.3),(.14,.75,.65),m['cedar'])
        block(x,z,6,4.5)
    def bench(x,z):
        a.box('Garden bench',(x,.65,z),(2.7,.17,.8),m['timber'])
        a.box('Bench back',(x,1.15,z-.35),(2.7,.75,.12),m['cedar'])
        for dx in [-1,1]: a.box('Bench leg',(x+dx,.3,z),(.16,.55,.6),m['cedar'])
        block(x,z,2.7,.9)

    a.box('District island',(0,-.42,0),(43,.82,42),m['moss'],.6)
    a.box('North south promenade',(0,.015,0),(5,.06,38),m['path'],.04)
    for z in [8,-8]: a.box('Neighbourhood cross lane',(0,.02,z),(34,.06,3.5),m['path'])
    # Small edge cobbles with no overlapping coplanar faces.
    for z in range(-17,18,2):
        for x in [-2.65,2.65]: a.box('Promenade edging',(x,.07,z),(.3,.16,1.7),m['stone'],.05)
    for x in [-18,18]:
        a.box('Boundary hedge',(x,.5,-16),(3,1,4),m['leaf'],.4)
    for x,z in [(-16,13),(16,13),(-16,-14),(15,-13),(-15,0),(16,0),(6,-16)]: tree(x,z,district['id']=='sakura')
    for x,z in [(-3.4,12),(3.4,12),(-3.4,-12),(3.4,-12)]: stone_lamp(x,z)
    for x,z in [(6,14),(-7,-14)]: bench(x,z)
    for x in [-3,3]: a.box('Welcome timber post',(x,2.3,17),(.2,4.6,.2),m['cedar'])
    a.box('Welcome indigo sign',(0,4.25,17),(6.4,.75,.18),m['indigo'])
    a.text('District name',district['name'].upper(),(0,4.25,17.12),.32,m['paper'])
    for x in [-3,3]: lantern(x,3.5,17)
    for site in district['sites']:
        x,y,z = site['position']
        # Interaction markers stay on walkable ground, in front of each building.
        nav['interactions'].append({'id':site['id'],'name':site['name'],'position':[x,0,z]})
        a.cyl('Mentor meeting stone',(x,.05,z),1.3,.09,m['stone'],32)

    if district['id']=='sakura':
        # Water is blocked except at the flat, walkable central footbridge.
        a.box('Quiet riverside stream',(0,-.04,-2),(41,.1,3.4),m['water'],.05)
        for x in [-11,11]: block(x,-2,17,3.4)
        for z in [-3.82,-.18]:
            for x in [-11,11]: a.box('Riverbank stones',(x,.03,z),(17,.3,.35),m['stone'],.12)
        for i in range(15): a.box('Bridge cedar plank',(0,.06,-3.8+i*.25),(4.5,.12,.24),m['timber'],.02)
        for x in [-2.3,2.3]:
            for i in range(5):
                z=-3.8+i*.95; a.cyl('Footbridge post',(x,.68,z),.07,1.3,m['red'])
                if i<4:
                    za=z; zb=z+.95
                    a.beam('Arched bridge handrail',(x,1.23+.25*math.sin(i*math.pi/4),za),(x,1.23+.25*math.sin((i+1)*math.pi/4),zb),.065,m['red'])
            block(x,-2,.2,4.4)
        pavilion(9,5,'RIVERSIDE TEA', 'indigo')
        # Cups, tray, and a small chasen-style whisk are meshes, not textures.
        for x in [7.5,8.5,9.5,10.5]:
            a.cyl('Tea bowl',(x,1.32,6.3),.18,.2,m['leaf'],16)
            a.cyl('Tea surface',(x,1.43,6.3),.155,.015,m['moss'],16)
        a.box('Picnic mat',(-9,.035,5),(5,.07,3),m['paper'])
        for z in [3.7,4.2,4.7,5.2,5.7,6.2]: a.box('Picnic woven stripe',(-9,.078,z),(5,.01,.045),m['red'],0)
        a.box('Picnic low table',(-9,.5,5),(2.7,.14,1.2),m['timber'])
        block(-9,5,3,1.6)
        for x in [-9.8,-9,-8.2]:
            a.box('Bento picnic tray',(x,.62,5),(.65,.1,.65),m['cedar'])
            a.sphere('Onigiri rice',(x,.8,5),(.22,.19,.21),m['paper'],10,6)
        a.text('Picnic sign','SAKURA PICNIC',(-9,1.4,3.3),.3,m['indigo'])
        for x in [-11.8,-6.2]: tree(x,3,True)
        for i,key in enumerate(['leaf','paper','sky']):
            x=-11+i*2
            a.box('River care sorting bin',(x,.7,-11),(1.25,1.4,1.15),m[key],.1)
            a.box('Bin lid',(x,1.42,-11),(1.35,.13,1.25),m['cedar'])
            a.text('Bin label',['COMPOST','PAPER','CONTAINERS'][i],(x,.9,-10.39),.14,m['indigo'] if key=='paper' else m['paper'])
            block(x,-11,1.35,1.25)
        # Bamboo grove beyond the river and a small roofed club noticeboard.
        for i in range(9):
            x=8+i*.8; z=-11+(i%3)*.65; h=4+(i%3)*.45
            a.cyl('Bamboo stalk',(x,h/2,z),.09,h,m['leaf'],8)
            for y in [1,2,3,4]: a.cyl('Bamboo node',(x,y,z),.12,.055,m['moss'],8)
            a.sphere('Bamboo leaves',(x,h-.4,z),(.55,.35,.3),m['leaf'],8,6)
            block(x,z,.25,.25)
        a.box('River club noticeboard',(-9,2.1,-12),(4,1,.18),m['indigo'])
        a.text('River club title','RIVER CARE CLUB',(-9,2.1,-11.88),.27,m['paper'])
    else:
        pavilion(-9,5,'LANTERN WORKSHOP','red')
        pavilion(9,5,'PAPER STUDIO','indigo')
        pavilion(-9,-11,'LITTLE MAKERS','indigo')
        for i,key in enumerate(['coral','sky','yellow','green','sky']): lantern(-10.8+i*.9,2,6.3,key)
        # Hand-folded fans with alternating pleats on the studio counter.
        for j in range(3):
            x=7.6+j*1.4
            verts=[a.at((x,1.22,6.3))]
            for k in range(11):
                angle=-1.2+k*.24
                verts.append(a.at((x+math.sin(angle)*.57,1.3+math.cos(angle)*.55,6.3+(.05 if k%2 else -.05))))
            mesh=bpy.data.meshes.new('Pleated fan mesh'); mesh.from_pydata(verts,[],[(0,i,i+1) for i in range(1,11)]); mesh.update()
            ob=bpy.data.objects.new('Folded paper fan',mesh); bpy.context.collection.objects.link(ob); a.finish(ob,'Folded paper fan',m[['coral','sky','lavender'][j]])
            a.beam('Paper fan handle',(x,1.15,6.3),(x,1.55,6.3),.025,m['timber'])
        for x in [-10,-8]:
            a.box('Makers cup tag display',(x,1.38,-9.7),(.8,.4,.6),m['paper'])
            a.star('LEAD makers star',x,1.95,-9.7,.3,m['yellow'])
        # Festival strings connect the neighbourhood, clear of the walking lanes.
        for z in [-3,13]:
            for x in [-15,15]:
                a.box('Festival cable pole',(x,2.7,z),(.14,5.4,.14),m['cedar']); block(x,z,.25,.25)
            for i in range(15):
                x=-15+i*2; xx=x+2
                a.beam('Sagging lantern string',(x,4.6+.6*(abs(x)/15)**2,z),(xx,4.6+.6*(abs(xx)/15)**2,z),.024,m['cedar'])
                lantern(x+1,4.24+.6*(abs(x+1)/15)**2,z,['gold','coral','sky','gold','green'][i%5])
        a.box('Maker garden gravel',(10,.055,-10),(10,.04,10),m['path'])
        for i in range(6):
            a.box('Garden raked stripe',(10,.085,-13+i),(8,.01,.06),m['stone'],0)
        a.sphere('Garden stone',(10,.55,-10),(1.4,.75,1),m['stone'],10,6);block(10,-10,2.8,2)

    # One static mesh per material keeps draw calls bounded.
    bpy.ops.object.select_all(action='DESELECT')
    for material in list(a.M.values()):
        objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.materials)==1 and o.data.materials[0]==material]
        if objects:
            for o in objects:o.select_set(True)
            bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
            bpy.context.object.name=district['id']+'_'+material.name
            bpy.ops.object.select_all(action='DESELECT')
    name='yatai-'+district['id']
    a.export(name)
    with open(os.path.join(a.OUT,name+'.navigation.json'),'w',encoding='utf-8') as f: json.dump(nav,f,indent=2)
    print('DISTRICT_READY',name,flush=True)

    # Render a real Blender preview for inspection, not used as the game model.
    scene=bpy.context.scene
    scene.render.engine='CYCLES';scene.cycles.samples=12
    scene.cycles.use_denoising=True
    scene.world.use_nodes=True
    scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.58,.69,.78,1)
    scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.45
    bpy.ops.object.light_add(type='AREA', location=a.at((-7,24,10)))
    light=bpy.context.object;light.data.energy=3500;light.data.shape='DISK';light.data.size=18
    light.rotation_euler=(Vector((0,0,0))-light.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.light_add(type='SUN',location=(0,0,18));bpy.context.object.data.energy=2.1
    bpy.context.object.rotation_euler=(.45,-.5,-.5)
    bpy.ops.object.camera_add(location=a.at((32,31,42)))
    camera=bpy.context.object;camera.rotation_euler=(Vector(a.at((0,0,0)))-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='ORTHO';camera.data.ortho_scale=58;scene.camera=camera
    scene.render.resolution_x=1000;scene.render.resolution_y=850;scene.render.resolution_percentage=100
    scene.view_settings.view_transform='AgX'
    scene.render.filepath=os.path.join(ROOT,'docs/screenshots/blender',name+'.png')
    bpy.ops.render.render(write_still=True)

for district in DISTRICTS:
    if district['id']!='festival': build(district)
with open(os.path.join(a.OUT,'village-expansion.json'),'w',encoding='utf-8') as f:
    json.dump({'generator':'tools/blender/build_districts.py','blender':bpy.app.version_string,'assets':a.manifest['assets']},f,indent=2)
print('VILLAGE_EXPANSION_COMPLETE',flush=True)
