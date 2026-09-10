"""Reproducible original LEAD assets. Run with Blender --background --python.
All meshes are modeled here, not reference-image planes. Coordinates map to a
Y-up browser world. The supplied mascot designs guide silhouette and colors.
"""
import bpy, math, json, os, sys, random
from mathutils import Vector
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
OUT=os.path.join(ROOT,'public','models'); SOURCE=os.path.join(ROOT,'assets','source','blender')
os.makedirs(OUT,exist_ok=True); os.makedirs(SOURCE,exist_ok=True)
random.seed(27)
manifest={'version':1,'generator':'tools/blender/build_assets.py','blender':bpy.app.version_string,'assets':[],'colliders':[],'spawns':{'player':[0,0,16]},'interactions':[{'id':'bento','name':'Bento & Co.','position':[0,0,1]},{'id':'bank','name':'Village Bank','position':[-17,0,-3]},{'id':'town','name':'Town Hall','position':[0,0,-18]},{'id':'garden','name':'Fortune Garden','position':[19,0,4]},{'id':'stage','name':'Festival Plaza','position':[-17,0,15]}]}
M={}
def clear():
 bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False); M.clear()
 for action in list(bpy.data.actions):bpy.data.actions.remove(action)
def mat(name,color,metal=0,emit=0):
 if name in M:return M[name]
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.65;p.inputs['Metallic'].default_value=metal
 if emit:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emit
 M[name]=m;return m
def at(pos):return (pos[0],-pos[2],pos[1])
def finish(o,name,m):
 o.name=name;o.data.materials.append(m);return o
def sphere(name,pos,scale,m,segments=16,rings=10):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=at(pos));o=bpy.context.object;o.scale=(scale[0],scale[2],scale[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 for p in o.data.polygons:p.use_smooth=True
 return finish(o,name,m)
def box(name,pos,scale,m,bevel=.04):
 bpy.ops.mesh.primitive_cube_add(size=1,location=at(pos));o=bpy.context.object;o.scale=(scale[0],scale[2],scale[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Soft handcrafted edges','BEVEL');mod.width=bevel;mod.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 return finish(o,name,m)
def cyl(name,pos,radius,depth,m,vertices=12):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=at(pos));return finish(bpy.context.object,name,m)
def beam(name,a,b,r,m):
 va,vb=Vector(at(a)),Vector(at(b));bpy.ops.mesh.primitive_cylinder_add(vertices=10,radius=r,depth=(vb-va).length,location=(va+vb)/2);o=bpy.context.object;o.rotation_euler=(vb-va).to_track_quat('Z','Y').to_euler();return finish(o,name,m)
def text(name,body,pos,size,m):
 bpy.ops.object.text_add(location=at(pos),rotation=(math.pi/2,0,0));o=bpy.context.object;o.data.body=body;o.data.align_x='CENTER';o.data.align_y='CENTER';o.data.size=size;o.data.extrude=.007;o.data.materials.append(m);bpy.ops.object.convert(target='MESH');o.name=name;return o
def polygon(name,points,depth,m):
 # Flat 2D crown/crest shape extruded in browser Z.
 verts=[at((x,y,z)) for z in [-depth/2,depth/2] for x,y in points];n=len(points);faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);finish(o,name,m);mod=o.modifiers.new('Soft corners','BEVEL');mod.width=.022;mod.segments=2;bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.modifier_apply(modifier=mod.name);o.select_set(False);return o
def star(name,x,y,z,r,m):
 pts=[(x+math.sin(i*math.pi/5)*r*(1 if i%2==0 else .46),y+math.cos(i*math.pi/5)*r*(1 if i%2==0 else .46)) for i in range(10)];o=polygon(name,pts,.13,m);o.location.y=-z;return o
def export(name,animated=False):
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SOURCE,name+'.blend'))
 path=os.path.join(OUT,name+'.glb')
 bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',export_animations=animated,export_animation_mode='ACTIONS',export_skins=True,export_yup=True,export_materials='EXPORT',export_extras=True)
 tris=sum(len(p.vertices)-2 for o in bpy.context.scene.objects if o.type=='MESH' for p in o.data.polygons)
 manifest['assets'].append({'id':name,'file':'/models/'+name+'.glb','source':'assets/source/blender/'+name+'.blend','triangles':tris,'bytes':os.path.getsize(path),'animations':ANIMS if animated else []})
 print('LEAD_EXPORTED',name,tris,flush=True)
ANIMS=['Idle','Walk','Run','Wave','Talk','Explain','Point','Think','Ask','Encourage','Celebrate','GentleConcern','Sit','Stand','LookAtPlayer','LookAtBoard','Serve','Interact']
def character(name,color,kind):
 clear();skin=mat('Skin',color);dark=mat('Shadow accent',tuple(c*.55 for c in color));white=mat('Warm white',(.97,.98,1));black=mat('Midnight eyes',(.015,.026,.05));cyan=mat('Cyan crest',(.035,.72,.94));gold=mat('Golden accent',(1,.65,.05));palette=[mat('Crown blue',(.10,.56,.84)),mat('Crown green',(.30,.66,.12)),mat('Crown coral',(.97,.24,.28)),mat('Crown yellow',(1,.78,.02))]
 parts={k:[] for k in ['root','body','head','arm.L','arm.R','leg.L','leg.R']}
 def add(b,o):parts[b].append(o);return o
 add('body',sphere('Rounded torso',(0,1.03,0),(.40,.56,.28),skin))
 add('body',sphere('Tummy highlight',(0,1.01,.20),(.26,.35,.09),skin))
 for sign,side in [(-1,'L'),(1,'R')]:
  add('leg.'+side,sphere('Leg '+side,(sign*.23,.38,0),(.19,.40,.21),skin));add('leg.'+side,sphere('Foot '+side,(sign*.25,.13,.11),(.23,.14,.31),dark if kind=='sparko' else skin))
  add('arm.'+side,sphere('Arm '+side,(sign*.48,1.03,0),(.145,.36,.16),skin));add('arm.'+side,sphere('Mitten '+side,(sign*.55,.79,.035),(.17,.16,.17),skin))
 add('head',sphere('Signature big round head',(0,1.96,0),(.65,.64,.53),skin,24,16))
 for x in [-.255,.255]:
  add('head',sphere('Eye white',(x,2.03,.474),(.147,.188,.069),white));add('head',sphere('Eye pupil',(x,2.026,.530),(.098,.129,.035),black));add('head',sphere('Eye sparkle',(x-.027,2.075,.562),(.033,.037,.016),white))
  add('head',sphere('Cheek',(x*1.48,1.83,.434),(.086,.043,.024),dark))
 add('head',sphere('Nose',(0,1.88,.537),(.049,.052,.032),dark));add('head',sphere('Happy mouth',(0,1.68,.453),(.187,.103,.049),dark));add('head',sphere('Smile',(0,1.706,.490),(.153,.061,.025),white))
 if kind=='sparko':
  for i in [-1,0,1]:
   o=polygon('Flame crest '+str(i),[(i*.16-.17,2.44),(i*.16+.15,2.44),(i*.16+.29,2.84-abs(i)*.10),(i*.16+.02,2.68)],.24,cyan if i!=0 else skin);add('head',o)
  add('body',text('LEAD hoodie','LEAD',(0,1.15,.305),.19,white));add('body',sphere('Hood',(0,1.49,-.1),(.46,.19,.30),dark))
  for x in [-.13,.13]:add('body',beam('Drawstring',(x,1.44,.29),(x,1.19,.33),.015,white))
 else:
  add('head',sphere('Hair cap',(0,2.42,.05),(.45,.18,.36),dark))
  o=polygon('Hair swoop',[(-.30,2.47),(-.08,2.67),(.15,2.47),(.36,2.49),(.10,2.34),(-.05,2.42)],.15,dark);o.location.y=-.32;add('head',o)
  for i,x in enumerate([-.65,-.43,.43,.65]):
   y=2.50+(0.14 if abs(x)<.5 else 0);z=-.04
   if kind=='lido':
    if i in [1,2]:continue
    add('head',beam('Bulb stalk',(x*.7,2.32,z),(x,2.66,z),.047,dark));add('head',cyl('Bulb socket',(x,2.68,z),.082,.11,dark));add('head',sphere('Idea bulb',(x,2.85,z),(.14,.19,.14),mat('Glowing bulb',(1,.85,.14),emit=.7)))
   elif kind=='oty':add('head',beam('Star stem',(x*.7,2.30,z),(x,y,z),.025,gold));add('head',star('Authenticity star',x,y,z,.20,palette[i]))
   elif kind=='prena':
    bpy.ops.mesh.primitive_torus_add(major_radius=.17,minor_radius=.043,major_segments=16,minor_segments=6,location=at((x,y,z)),rotation=(math.pi/2,0,0));add('head',finish(bpy.context.object,'Gear ring',palette[i]))
    for k in range(8):
     angle=k*math.pi/4;add('head',box('Gear tooth',(x+math.sin(angle)*.19,y+math.cos(angle)*.19,z),(.085,.085,.12),palette[i],.013))
   else:
    add('head',box('Puzzle crown',(x,y,z),(.29,.28,.12),palette[i],.035));add('head',sphere('Puzzle tab',(x,y+.17,z),(.075,.078,.07),palette[i]))
 # Real deform rig; each soft component is rigid-weighted to an appropriate bone.
 bpy.ops.object.armature_add();rig=bpy.context.object;rig.name=name+'_Rig';bpy.ops.object.mode_set(mode='EDIT');bones=rig.data.edit_bones;bones.remove(bones[0]);positions={'root':((0,0,0),(0,.3,0)),'body':((0,.8,0),(0,1.4,0)),'head':((0,1.5,0),(0,2.1,0)),'arm.L':((-.38,1.34,0),(-.54,.78,0)),'arm.R':((.38,1.34,0),(.54,.78,0)),'leg.L':((-.23,.73,0),(-.23,.13,0)),'leg.R':((.23,.73,0),(.23,.13,0))}
 for b,(a,z) in positions.items():bone=bones.new(b);bone.head=at(a);bone.tail=at(z)
 for b in positions:
  if b!='root':bones[b].parent=bones['body' if b in ['head','arm.L','arm.R'] else 'root']
 bpy.ops.object.mode_set(mode='OBJECT')
 for b,objs in parts.items():
  for o in objs:
   group=o.vertex_groups.new(name=b);group.add(list(range(len(o.data.vertices))),1,'REPLACE');mod=o.modifiers.new('LEAD soft mascot rig','ARMATURE');mod.object=rig;o.parent=rig
 rig.animation_data_create();scene=bpy.context.scene;scene.render.fps=24;scene.frame_start=1;scene.frame_end=48
 for anim in ANIMS:
  action=bpy.data.actions.new(anim);rig.animation_data.action=action
  for frame in [1,7,13,19,25,31,37,43,49]:
   t=(frame-1)/48*math.tau
   for pb in rig.pose.bones:pb.rotation_mode='XYZ';pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
   pose=rig.pose.bones;pose['body'].location.z=.025*math.sin(t);pose['head'].rotation_euler.y=.035*math.sin(t)
   if anim in ['Walk','Run']:
    speed=2 if anim=='Run' else 1;amp=.66 if anim=='Run' else .42
    pose['leg.L'].rotation_euler.x=math.sin(t*speed)*amp;pose['leg.R'].rotation_euler.x=-math.sin(t*speed)*amp;pose['arm.L'].rotation_euler.x=-math.sin(t*speed)*amp*.7;pose['arm.R'].rotation_euler.x=math.sin(t*speed)*amp*.7;pose['body'].location.z=abs(math.sin(t*speed))*.05
   elif anim in ['Wave','Encourage','Celebrate']:
    pose['arm.R'].rotation_euler.y=-2.2+.24*math.sin(t*2)
    if anim=='Celebrate':pose['arm.L'].rotation_euler.y=2.2+.24*math.sin(t*2);pose['root'].location.z=.15*abs(math.sin(t))
   elif anim in ['Talk','Explain','Ask','Serve','Interact','Point']:
    pose['arm.R'].rotation_euler.x=-.7+.2*math.sin(t);pose['arm.L'].rotation_euler.y=.25*math.sin(t);pose['head'].rotation_euler.x=.07*math.sin(t*2)
   elif anim in ['Think','GentleConcern','LookAtBoard']:pose['head'].rotation_euler.x=.22;pose['head'].rotation_euler.y=.13*math.sin(t)
   elif anim=='Sit':pose['leg.L'].rotation_euler.x=-1.35;pose['leg.R'].rotation_euler.x=-1.35;pose['root'].location.z=-.35
   for pb in rig.pose.bones:pb.keyframe_insert(data_path='rotation_euler',frame=frame);pb.keyframe_insert(data_path='location',frame=frame)
  action.use_fake_user=True
 rig.animation_data.action=None;scene.frame_set(1);export(name,True)
def roof(x,y,z,w,d,m):
 # Curved gable profile, lifted eaves, ridge caps, individually tiled ribs.
 for side in [-1,1]:
  for j in range(6):
   t0=j/6;t1=(j+1)/6;xa=side*w*.57*t0;xb=side*w*.57*t1;ha=y+1.3*(1-t0)+.38*t0**4;hb=y+1.3*(1-t1)+.38*t1**4
   verts=[at((x+xa,ha,z-d*.60)),at((x+xb,hb,z-d*.60)),at((x+xb,hb,z+d*.60)),at((x+xa,ha,z+d*.60))];mesh=bpy.data.meshes.new('Curved roof tile');mesh.from_pydata(verts,[],[(0,1,2,3)]);mesh.update();o=bpy.data.objects.new('Swept roof',mesh);bpy.context.collection.objects.link(o);finish(o,'Swept roof',m);mod=o.modifiers.new('Tile thickness','SOLIDIFY');mod.thickness=.12;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
  for k in range(int(d*2)+1):
   zz=z-d*.60+k*d*1.2/int(d*2)
   for j in range(5):
    a=j/5;b=(j+1)/5;beam('Roof rib',(x+side*w*.57*a,y+1.3*(1-a)+.38*a**4+.04,zz),(x+side*w*.57*b,y+1.3*(1-b)+.38*b**4+.04,zz),.035,m)
 beam('Ridge cap',(x,y+1.34,z-d*.65),(x,y+1.34,z+d*.65),.13,m)
def environment():
 clear();wood=mat('Cedar',(.30,.12,.055));lightwood=mat('Honey timber',(.61,.32,.12));wall=mat('Plaster',(.78,.68,.47));roofmat=mat('Blue slate',(.045,.10,.16));grass=mat('Moss meadow',(.25,.40,.25));paving=mat('Sandstone',(.65,.55,.40));gold=mat('Lantern glow',(1,.57,.16),emit=1.2);red=mat('Vermilion',(.72,.12,.075));white=mat('Cream linen',(.93,.87,.65));green=mat('Leaf canopy',(.27,.48,.20));pink=mat('Cherry blossom',(.94,.47,.55));water=mat('Stream',(.13,.43,.49),metal=.25);navy=mat('Indigo canvas',(.04,.22,.38));stone=mat('Foundation',(.40,.44,.39));fruit=mat('Orange food',(.94,.47,.06))
 box('Island meadow',(0,-.32,0),(67,.6,59),grass,.7)
 box('Main village lane',(0,.01,4),(9,.09,50),paving,.15);box('Market cross street',(0,.02,1),(54,.10,8),paving,.15)
 for z in [-10,10]:box('Quarter path',(0,.03,z),(24,.12,3.7),paving)
 for x in [-10,10]:box('Quarter path',(x,.03,0),(3.7,.12,24),paving)
 # Randomized cobbles and edging, clustered rather than a single bare floor.
 for i in range(270):
  x=random.uniform(-26,26);z=random.uniform(-22,24)
  if abs(x)<4 or abs(z-1)<3.5:box('Hand laid paving',(x,.08,z),(random.uniform(.5,1.1),.035,random.uniform(.4,.8)),paving if i%3 else stone,.045)
 def lantern(x,y,z):
  sphere('Paper lantern',(x,y,z),(.20,.33,.20),gold,12,8);cyl('Lantern top',(x,y+.31,z),.13,.055,wood);cyl('Lantern base',(x,y-.31,z),.13,.055,wood)
  for dy in [-.18,0,.18]:
   bpy.ops.mesh.primitive_torus_add(major_radius=.186 if dy==0 else .15,minor_radius=.011,major_segments=12,minor_segments=4,location=at((x,y+dy,z)));finish(bpy.context.object,'Lantern rib',lightwood)
 def building(x,z,w,d,label,m=roofmat):
  box('Stone step',(x,.17,z),(w+.5,.34,d+.5),stone,.12);box(label+' walls',(x,1.7,z),(w,3,d),wall,.06)
  for xx in [x-w/2+.08,x+w/2-.08]:box('Timber post',(xx,1.8,z+d/2+.06),(.16,3.3,.19),wood)
  box('Door',(x,1.1,z+d/2+.04),(1.0,2,.15),wood)
  for xx in [x-w*.31,x+w*.31]:
   box('Warm window',(xx,1.65,z+d/2+.13),(.85,1.1,.09),gold)
   for offset in [-.26,0,.26]:box('Window slat',(xx+offset,1.65,z+d/2+.19),(.04,1.1,.035),wood,.006)
  roof(x,3.2,z,w,d,m);box('Shop sign',(x,2.9,z+d/2+.26),(w*.8,.5,.13),navy);text(label+' lettering',label,(x,2.9,z+d/2+.35),.27,white)
  for xx in [x-w*.46,x+w*.46]:lantern(xx,2.3,z+d/2+.5)
  manifest['colliders'].append({'x':x,'z':z,'w':w+.4,'d':d+.4})
 def stall(x,z,label,canvas=red):
  box('Stall platform',(x,.18,z),(4,.35,2.8),lightwood,.1)
  for xx in [-1.65,1.65]:
   for zz in [-1,1]:box('Stall post',(x+xx,1.9,z+zz),(.13,3.5,.13),wood)
  box('Stall counter',(x,1.15,z+.8),(3.8,.24,.65),lightwood,.04);box('Counter front',(x,.69,z+.87),(3.55,.75,.13),wood)
  roof(x,3.0,z,3.8,2.6,canvas)
  box('Stall nameboard',(x,2.8,z+1.5),(3.25,.52,.12),wood);text('Stall label',label,(x,2.8,z+1.58),.28,white)
  for i in range(5):
   xx=x-1.2+i*.57;box('Bento box',(xx,1.32,z+.80),(.45,.12,.40),wood,.03);sphere('Rice serving',(xx-.07,1.43,z+.80),(.11,.08,.12),white,10,6);sphere('Golden side',(xx+.11,1.43,z+.80),(.09,.07,.11),fruit,10,6)
  lantern(x-1.7,2.15,z+1.35);lantern(x+1.7,2.15,z+1.35);manifest['colliders'].append({'x':x,'z':z,'w':4,'d':2.8})
 stall(0,0,'BENTO & CO.',roofmat);stall(-18,7,'FRESH & LOCAL',red);stall(18,-6,'LITTLE IDEAS',navy);stall(18,11,'SWEET MOMENTS',red);stall(-17,-14,'THE GREEN BOWL',green)
 building(0,-21,7,4.5,'TOWN HALL');building(-19,-3,5,4,'VILLAGE BANK',green);building(20,-17,5,4,'HERO LAB');building(-27,17,4,4,'TEA HOUSE');building(27,21,4,4,'FUTURE GATE')
 # Food truck: body, striped awning, service window, wheels, counter.
 box('Food truck',( -19,1.75,19),(6,3,3),white,.35);box('Truck indigo skirt',(-19,.74,19),(6,1,3.05),navy,.2)
 for x in [-21,-17]:
  for z in [17.5,20.5]:
   o=cyl('Truck tyre',(x,.65,z),.58,.3,wood,16);o.rotation_euler.x=math.pi/2;sphere('Wheel hub',(x,.65,z+.17),(.23,.23,.07),stone)
 box('Truck serving window',(-19,2.15,20.52),(3.4,1.4,.1),wood);box('Truck counter',(-19,1.5,20.8),(3.8,.16,.9),lightwood)
 for i in range(8):box('Truck awning',(-21+i*.55,3.3,21.1),(.55,.12,1.4),white if i%2 else navy)
 manifest['colliders'].append({'x':-19,'z':19,'w':6.4,'d':4})
 # Torii festival gateway and wooden gathering stage.
 for x in [-3,3]:cyl('Torii pillar',(x,2.7,23),.23,5.4,red)
 box('Torii beam',(0,4.8,23),(7.3,.38,.45),red);box('Torii dark cap',(0,5.3,23),(8,.28,.6),roofmat);text('Welcome sign','YATAI VILLAGE',(0,4.8,23.3),.32,white)
 box('Festival stage',(-17,.48,13),(6.5,.8,4),wood,.12)
 for x in [-20.2,-13.8]:box('Stage post',(x,2.7,12),(.13,4.4,.13),wood)
 beam('Stage light string',(-20.2,4.5,12),(-13.8,4.5,12),.025,wood)
 for i in range(6):lantern(-19.7+i*1.08,4.1,12)
 # Street strings.
 for z in [-15,7,18]:
  for x in [-6.4,6.4]:box('Lantern pole',(x,2.9,z),(.14,5.8,.14),wood)
  for i in range(12):
   a=-6.4+i*12.8/12;b=a+12.8/12;beam('Catenary cable',(a,5.3+.5*(abs(a)/6.4)**2,z),(b,5.3+.5*(abs(b)/6.4)**2,z),.018,wood)
  for i in range(9):x=-5.5+i*1.375;lantern(x,4.9+.5*(abs(x)/6.4)**2,z)
 # Stream and bridge on the east side.
 box('Quiet stream',(27,-.02,0),(3,.15,44),water,.3)
 for j in range(15):box('Bridge plank',(25.5+j*.22,.42+math.sin(j/14*math.pi)*.4,1),(.21,.13,3.4),lightwood)
 for z in [-.8,2.8]:beam('Bridge rail',(25.3,1.5,z),(29,1.5,z),.07,wood)
 def tree(x,z,blossom=False,size=1):
  cyl('Tree trunk',(x,1.1*size,z),.23*size,2.2*size,wood,9)
  for i in range(5):
   a=i*math.tau/5;dx=math.cos(a)*.8*size;dz=math.sin(a)*.8*size;sphere('Blossom canopy' if blossom else 'Leaf canopy',(x+dx,(2.8+random.random()*.4)*size,z+dz),(1.2*size,1.3*size,1.15*size),pink if blossom else green,10,6)
  manifest['colliders'].append({'x':x,'z':z,'w':.7*size,'d':.7*size})
 for x,z in [(-6,-4),(6,-5),(-7,5),(7,5),(17,3),(-24,7),(-25,-12),(24,8),(-12,-24),(11,-23),(-30,-22),(30,-23),(-28,25),(29,25),(12,23),(-11,25)]:tree(x,z,(x+z)%3==0,1 if abs(x)<10 else 1.2)
 for i in range(26):
  x=random.uniform(-31,31);z=random.choice([-26,27]);sphere('Distant garden shrub',(x,.6,z),(1.4,.8,1.2),green,10,6)
 for x,z in [(14,6),(-13,8),(6,18)]:
  box('Bench seat',(x,.7,z),(2.3,.16,.7),lightwood);box('Bench back',(x,1.18,z-.3),(2.3,.8,.13),lightwood)
  for dx in [-.85,.85]:box('Bench feet',(x+dx,.36,z),(.14,.6,.6),wood)
 # Fortune tree notes, lantern pedestals and baskets add close-up detail.
 for i in range(12):
  a=i*math.tau/12;box('Wish paper',(17+math.sin(a)*1.05,2.3+(i%3)*.2,3+math.cos(a)*1.05),(.14,.38,.02),white,.008)
 for x,z in [(-3,3),(3,3),(-14,-4),(15,-7),(-22,9)]:
  box('Wooden crate',(x,.35,z),(.75,.65,.7),lightwood)
  for k in range(5):sphere('Market produce',(x+(k%3-.8)*.19,.71,z+(k//3-.3)*.21),(.13,.13,.13),fruit,8,6)
 # Join static material batches: keep the world efficient in browsers.
 bpy.ops.object.select_all(action='DESELECT')
 for material in list(M.values()):
  objs=[o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.materials)==1 and o.data.materials[0]==material]
  if objs:
   for o in objs:o.select_set(True)
   bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();bpy.context.object.name='Village_'+material.name;bpy.ops.object.select_all(action='DESELECT')
 export('yatai-village')
if __name__=='__main__':
 for name,color in [('lido',(.95,.23,.23)),('prena',(.12,.53,.79)),('oty',(1,.72,.02)),('diva',(.34,.67,.12)),('sparko',(.025,.32,.76))]:character(name,color,name)
 environment()
 with open(os.path.join(OUT,'manifest.json'),'w',encoding='utf-8') as f:json.dump(manifest,f,indent=2)
 print('LEAD_ASSETS_COMPLETE',flush=True)
 import build_props
