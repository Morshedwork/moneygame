"""A reference-led Japanese toy market, made entirely from editable 3D meshes.

Run: node tools/blender/headless.mjs tools/blender/build_board_village.py
The existing free-roam village and board tile assets are deliberately untouched.
Coordinates are browser Y-up; the main camera looks into the village from +Z.
"""
import bpy, math, os, random, json
from mathutils import Vector
import build_assets as b
from reference_mascots import linear

random.seed(84)
b.clear()
print('BOARD_VILLAGE_BUILD: materials and sandstone plaza', flush=True)

def material(name, color, emission=0, roughness=.76):
    value=b.mat('Board village / '+name, linear(color), emit=emission)
    value.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=roughness
    return value

cedar=material('Dark cedar','88502d')
wood=material('Warm cedar','bd7842')
timber=material('Fresh timber','dc9c5e')
endgrain=material('Timber highlight','ecc08a')
cream=material('Warm canvas','fff8df')
red=material('Coral red canvas','f34e55')
blue=material('Cobalt canvas','3589e8')
yellow=material('Golden canvas','ffc62b')
navy=material('Ink lettering','202f4b')
pink=material('Blossom pink','f8b4c9')
plum=material('Plum flower','ac4789')
white=material('White rice','fffdf0')
orange=material('Roasted orange','f4a220')
salmon=material('Salmon','ff7660')
leaf=material('Leaf medium','67a944')
leaflight=material('Leaf sunshine','8bb949')
leafdark=material('Leaf forest','408747')
leafdeep=material('Leaf shadow','39724b')
grass=material('Meadow','98b967')
moss=material('Garden grass','8bb55a')
earth=material('Island edge','a48563')
sand=material('Sandstone grout','d3b391')
paving=[material('Paver '+str(i), c) for i,c in enumerate(['e9c9a2','e0bf96','f0d1ad','dfb88d','e5c49c','f2d4ad'])]
stone=material('Stone warm','b4b2a7')
stonelight=material('Stone sunshine','cfccc0')
stonedark=material('Stone shadow','999f96')
slate=material('Roof blue slate','526e87')
water=material('Jade blue stream','56b5cd',roughness=.26)
watershine=material('Water highlights','b4e5eb',roughness=.3)
waterdeep=material('Water shadows','409dbf',roughness=.35)
lanternred=material('Lantern vermilion','fb5635',.22)
lanternglow=material('Lantern warm light','ffe180',1.5)
black=material('Bento lacquer','293334')
soil=material('Plant soil','63442d')
rubber=material('Wheel rubber','384349')
metal=material('Wheel hubs','c0c8bd')
window=material('Truck glass','89c8e7',roughness=.25)
greenpaint=material('Market green paint','36a36c')

box,beam,cyl,sphere,txt=b.box,b.beam,b.cyl,b.sphere,b.text

def face(name, points, m):
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata([b.at(p) for p in points],[],[tuple(range(len(points)))])
    mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    b.finish(obj,name,m)
    return obj

def foliage(name,pos,scale,m=leaf,subdivisions=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions,radius=1,location=b.at(pos))
    obj=bpy.context.object;obj.scale=(scale[0],scale[2],scale[1])
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return b.finish(obj,name,m)

def torus(name,pos,radius,minor,m):
    bpy.ops.mesh.primitive_torus_add(major_radius=radius,minor_radius=minor,major_segments=12,minor_segments=4,location=b.at(pos))
    return b.finish(bpy.context.object,name,m)

def cube_batch(name, cubes, m):
    verts=[];faces=[]
    indices=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    for x,y,z,w,h,d in cubes:
        start=len(verts)
        for dx,dy,dz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]:
            verts.append(b.at((x+dx*w/2,y+dy*h/2,z+dz*d/2)))
        faces.extend(tuple(start+i for i in f) for f in indices)
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);b.finish(obj,name,m)
    return obj

def planter(x,z,size=.75,style='box'):
    if style=='pot':
        cyl('Terracotta flower pot',(x,.28,z),size*.46,.5,wood,8)
        torus('Rolled planter rim',(x,.53,z),size*.45,.055,timber)
        cyl('Earth in planter',(x,.53,z),size*.40,.028,soil,8)
    else:
        box('Wood planter',(x,.33,z),(size,.64,size),wood,.055)
        box('Soil',(x,.67,z),(size*.82,.045,size*.82),soil,.012)
        for offset in [-.22,.23]:
            box('Planter strap',(x,.33+offset,z+size*.505),(size*.91,.046,.032),cedar,.01)
        for dx in [-1,1]:box('Planter corner post',(x+dx*size*.46,.35,z+size*.46),(.075,.7,.075),timber,.01)

def plant(x,z,size=.7,pot=True,flowers=False):
    if pot:planter(x,z,size*.82,'pot' if random.random()<.3 else 'box')
    start=.57 if pot else .14
    beam('Plant stem',(x,start,z),(x,start+size*.84,z),.036,leafdark)
    for i in range(6):
        a=i*math.tau/6;dx=math.cos(a)*size*.34;dz=math.sin(a)*size*.34
        foliage('Leaf cluster',(x+dx,start+size*(.35+.10*(i%3)),z+dz),(size*.31,size*.3,size*.29),[leaf,leaflight,leafdark][i%3])
    if flowers:
        for i in range(3):
            a=i*math.tau/3;xx=x+math.cos(a)*size*.25;zz=z+math.sin(a)*size*.25
            sphere('Flower center',(xx,start+size*.9,zz),(.052,.052,.052),orange,8,4)
            for k in range(5):
                a=k*math.tau/5;sphere('Flower petal',(xx+math.cos(a)*.10,start+size*.88,zz+math.sin(a)*.10),(.077,.035,.073),[red,yellow,pink][i%3],8,4)

def tree(x,z,size=1,small=False):
    h=(2.8 if small else 3.55)*size
    cyl('Faceted cedar trunk',(x,h*.38,z),.22*size,h*.76,cedar,7)
    for dx,dz in [(-.65,.15),(.63,.25),(.10,-.57)]:
        beam('Tree branch',(x,h*.48,z),(x+dx*size,h*.84,z+dz*size),.13*size,wood)
    for i,(dx,dy,dz,s) in enumerate([(-.69,-.20,.05,.88),(.65,-.14,.15,.90),(-.15,.5,-.05,1),(.1,-.03,-.6,.90),(.02,-.26,.58,.82)]):
        foliage('Angular leafy crown',(x+dx*size,h+dy*size,z+dz*size),(1.05*size*s,1.17*size*s,1.03*size*s),[leaf,leaflight,leaf,leafdark,leaflight][i],2)
    if small:return
    for dx,dz in [(-.65,0),(.63,.06),(0,-.67)]:
        box('Tree planter stone',(x+dx*size,.28,z+dz*size),(.6*size,.50,.58*size),stonelight,.065)

def lantern(x,y,z,scale=1):
    sphere('Red paper lantern',(x,y,z),(.25*scale,.43*scale,.25*scale),lanternred,12,8)
    cyl('Lantern cap',(x,y+.40*scale,z),.18*scale,.09*scale,cedar,12)
    cyl('Lantern foot',(x,y-.40*scale,z),.18*scale,.09*scale,cedar,12)
    for off in [-.25,0,.25]:torus('Fine lantern rib',(x,y+off*scale,z),(.20 if off else .246)*scale,.014*scale,red)
    box('Glowing lantern label',(x,y,z+.239*scale),(.23*scale,.40*scale,.02),lanternglow,.035)
    txt('Lantern emblem','+', (x,y,z+.265*scale),.25*scale,cream)

def lantern_post(x,z,height=3.3,side=1):
    box('Stone lantern post foot',(x,.22,z),(.62,.40,.62),stone,.06)
    box('Cedar lantern pole',(x,height/2,z),(.16,height,.16),cedar,.025)
    box('Lantern hanging bracket',(x+side*.35,height-.06,z),(.95,.14,.19),wood,.03)
    beam('Lantern suspension',(x+side*.61,height-.10,z),(x+side*.61,height-.4,z),.025,cedar)
    lantern(x+side*.61,height-.83,z,.82)

def fence(a,c,height=1.05):
    va,vc=Vector(a),Vector(c);length=(vc-va).length;count=max(1,round(length/1.9))
    for i in range(count+1):
        v=va.lerp(vc,i/count);x,z=v
        box('Fence cedar upright',(x,height*.53,z),(.19,height,.19),wood,.025)
        box('Fence square cap',(x,height+ .065,z),(.27,.13,.27),timber,.025)
        if i%3==0:box('Fence base stone',(x,.20,z),(.5,.34,.48),stonelight,.05)
    for y in [.35,height*.79]:beam('Fence horizontal rail',(a[0],y,a[1]),(c[0],y,c[1]),.079,wood)

def crate(x,z,w=.7,h=.65):
    box('Produce crate',(x,h*.5,z),(w,h,w*.76),wood,.035)
    for yy in [.15,h-.13]:
        box('Crate plank',(x,yy,z+w*.39),(w*.95,.12,.04),timber,.013)
    box('Crate dark handhold',(x,h-.18,z+w*.415),(w*.38,.07,.01),cedar,.018)

def bento(x,y,z,scale=1):
    box('Lacquer bento tray',(x,y,z),(.77*scale,.085*scale,.53*scale),black,.06*scale)
    for dx in [-.07,.16]:box('Bento divider',(x+dx*scale,y+.065*scale,z),(.025*scale,.048*scale,.43*scale),cedar,.006)
    for j in range(3):
        zz=z+(j-1)*.125*scale;sphere('Rice ball',(x-.23*scale,y+.091*scale,zz),(.10*scale,.049*scale,.052*scale),white,10,6)
    sphere('Salmon slice',(x+.29*scale,y+.10*scale,z-.115*scale),(.075*scale,.038*scale,.083*scale),salmon,10,6)
    for dx,dz,mat in [(0,-.14,orange),(0,.03,leaflight),(.28,.08,orange),(.13,.13,red)]:
        sphere('Bento side dish',(x+dx*scale,y+.106*scale,z+dz*scale),(.075*scale,.05*scale,.060*scale),mat,8,5)

def awning(x,z,w,d,y,color,stripes=9):
    # Separate fabric ribbons follow a gently bowed slope; round scallops hang at the front.
    for i in range(stripes):
        xx=x-w/2+(i+.5)*w/stripes;m=color if i%2==0 else cream
        verts=[];faces=[];steps=5
        for j in range(steps+1):
            t=j/steps;zz=z-d/2+t*d;yy=y+.30*(1-t)-.30*t*t
            verts.extend([b.at((xx-w/stripes*.5,yy,zz)),b.at((xx+w/stripes*.5,yy,zz))])
        for j in range(steps):faces.append((j*2,j*2+1,j*2+3,j*2+2))
        mesh=bpy.data.meshes.new('Striped sloping canopy');mesh.from_pydata(verts,[],faces);mesh.update()
        obj=bpy.data.objects.new('Striped sloping canopy',mesh);bpy.context.collection.objects.link(obj);b.finish(obj,'Striped sloping canopy',m)
        mod=obj.modifiers.new('Canvas thickness','SOLIDIFY');mod.thickness=.038;bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=mod.name)
        box('Awning hanging valance',(xx,y-.47,z+d/2),(.98*w/stripes,.34,.066),m,.055)
        sphere('Scalloped canvas edge',(xx,y-.62,z+d/2),(.48*w/stripes,.15,.045),m,12,6)
    beam('Canopy front crossbeam',(x-w/2,y-.35,z+d/2-.06),(x+w/2,y-.35,z+d/2-.06),.065,cedar)

def stall(x,z,w=4.9,d=2.1,color=red,main=False):
    h=3.13 if main else 2.70
    box('Market stall footing',(x,.19,z),(w+.08,.32,d+.28),wood,.06)
    box('Raised serving plinth',(x,.24,z),(w-.10,.18,d+.20),timber,.04)
    for dx in [-1,1]:
        for dz in [-1,1]:box('Stall wooden post',(x+dx*(w/2-.2),h*.47,z+dz*(d/2-.17)),(.14,h-.24,.14),cedar,.023)
    box('Counter body',(x,.75,z+d*.39),(w-.24,1.05,.52),wood,.065)
    for i in range(int(w/.4)):
        xx=x-(w-.32)/2+(i+.5)*(w-.32)/int(w/.4)
        box('Counter vertical board',(xx,.77,z+d*.39+.276),((w-.34)/int(w/.4)-.035,.90,.065),timber,.015)
    box('Thick service counter',(x,1.34,z+d*.30),(w+.10,.19,.98),timber,.05)
    box('Counter bright lip',(x,1.35,z+d*.30+.51),(w+.15,.19,.08),endgrain,.025)
    box('Rear display shelf',(x,1.24,z-d*.34),(w-.30,.12,.51),wood,.04)
    awning(x,z,w+.60,d+.62,h,color,9 if main else 7)
    if main:
        box('Bento yellow nameboard',(x,h+.40,z+.12),(3.25,.63,.15),yellow,.13)
        txt('Bento Box Co. title','Bento Box Co.',(x,h+.40,z+.208),.34,navy)
        sphere('Nameboard tomato',(x+1.40,h+.39,z+.238),(.085,.085,.04),red,10,6)
        for xx in [-1.43,-.47,.49,1.45]:
            for zz in [.21,.81]:bento(x+xx,1.47,z+zz,.99)
        for i in range(6):
            zz=z-.69;xx=x-1.50+i*.61
            box('Takeaway bento box',(xx,1.39,zz),(.47,.19,.37),cream,.04)
            box('Bento box band',(xx,1.40,zz+.19),(.11,.20,.019),red,.003)
    else:
        for i in range(5):
            xx=x-w*.34+i*w*.17
            if color==blue:
                cyl('Street food bowl',(xx,1.52,z+d*.35),.16,.15,cream,12)
                for j in range(3):sphere('Takoyaki bite',(xx+(j-1)*.07,1.64,z+d*.35),(.071,.075,.07),orange,8,5)
                beam('Wooden food skewer',(xx,1.56,z+d*.35),(xx+.05,1.89,z+d*.35+.015),.012,timber)
            else:
                cyl('Drink bottle',(xx,1.64,z+d*.35),.095,.53,[salmon,orange,white,greenpaint,orange][i],12)
                cyl('Bottle cap',(xx,1.94,z+d*.35),.068,.09,cream,10)
                box('Bottle label',(xx,1.64,z+d*.35+.092),(.13,.17,.016),cream,.01)
    for sign in [-1,1]:
        beam('Stall lantern arm',(x+sign*(w*.5-.1),h-.56,z+d*.6),(x+sign*(w*.5+.29),h-.56,z+d*.6),.066,cedar)
        lantern(x+sign*(w*.5+.25),h-1.06,z+d*.61,.77 if main else .65)

def bunting(a,c,count=12):
    colors=[red,yellow,blue,leaflight]
    length=Vector(c)-Vector(a)
    def point(t):
        value=Vector(a)+length*t;value.y-=.39*math.sin(t*math.pi);return tuple(value)
    for i in range(count):
        t=i/count;end=(i+1)/count;p=point(t);q=point(end)
        beam('Bunting string',p,q,.018,cedar)
        mid=(Vector(p)+Vector(q))*.5;mid.y-=.51
        face('Colorful triangular festival pennant',[p,q,tuple(mid)],colors[i%4])

# A continuous handcrafted sandstone plaza under the board and shops.
box('Meadow island',(0,-.49,-3),(58,.88,58),grass,.9)
box('Thick sandstone plaza',(0,-.08,.1),(37,.23,32.6),sand,.45)
box('Back village path',(0,-.08,-24),(39,.22,10),sand,.22)
patches=[[] for _ in paving]
for iz in range(47):
    z=-15.9+iz*.68
    for ix in range(35):
        x=-18+ix*1.06+(iz%2)*.53
        # The board agent builds raised tiles; retain tiny pavers all around their path.
        if (abs(x)>8.05 and abs(x)<11.95 and abs(z)<11.95) or (abs(z)>8.05 and abs(z)<11.95 and abs(x)<11.95):continue
        patches[(ix*3+iz+random.randrange(3))%6].append((x,.048+random.uniform(-.009,.009),z,1.035,.08,.655))
for iz in range(12):
    for ix in range(35):
        patches[(ix+iz)%6].append((-18+ix*1.06+(iz%2)*.53,.039,-28+iz*.7,1.035,.07,.675))
for i,cubes in enumerate(patches):cube_batch('Individually laid sandstone pavers '+str(i),cubes,paving[i])

# The recognizable three-counter village composition.
print('BOARD_VILLAGE_BUILD: three market stalls and central square', flush=True)
stall(0,1.25,4.9,2.15,red,True)
stall(-5.10,.50,2.55,1.80,blue)
stall(5.10,.50,2.55,1.80,yellow)
for x,z,size,flowers in [(-3.30,-2.4,.83,True),(3.25,-2.4,.84,True),(-6.7,1.0,.73,False),(6.55,1.0,.83,False),(-2.67,.4,.58,False),(2.75,.4,.60,False),(-4.15,3.55,.85,True),(5.2,3.8,.78,False),(1.97,1.95,.55,True),(-1.05,2.0,.50,False)]:plant(x,z,size,True,flowers)
for x,z in [(-6.55,-1.8),(6.55,-1.8)]:
    box('Bunting post',(x,2.0,z),(.17,4,.17),cedar,.025)
bunting((-6.55,3.95,-1.8),(6.55,3.95,-1.8),16)
bunting((-6.55,3.95,-1.8),(-3.15,2.90,-.1),5)
bunting((3.15,2.90,-.1),(6.55,3.95,-1.8),5)

# A real standing menu sign with a tiny bento diagram.
for xx in [-.9,.5]:beam('Menu easel leg',(xx,.13,3.10),(xx,1.78,2.82),.07,cedar)
box('Menu sign timber frame',(-.2,1.04,2.90),(1.57,1.91,.17),timber,.06)
box('Menu chalkboard',(-.2,1.09,3.01),(1.38,1.68,.055),navy,.025)
txt('Menu chalk title','BENTO',(-.2,1.53,3.05),.18,cream)
box('Chalk bento tray',(-.2,1.04,3.056),(.90,.55,.026),cream,.055)
box('Chalk black tray',(-.2,1.04,3.075),(.81,.47,.024),black,.035)
for xx,yy,m in [(-.45,1.14,white),(-.19,1.14,orange),(.08,1.14,red),(-.43,.93,white),(-.16,.93,leaflight),(.10,.93,orange)]:sphere('Menu bento drawing',(xx,yy,3.10),(.09,.07,.02),m,8,4)

# Fortune stand and a budding wish tree toward the front of the center square.
foreground_props_start=set(bpy.context.scene.objects)
box('Fortune box',(-3.35,.85,5.32),(2.20,1.63,1.42),wood,.07)
for dx in [-.99,.99]:box('Fortune box leg',(-3.35+dx,.91,6.04),(.12,1.80,.14),cedar,.02)
box('Fortune box roof',(-3.35,1.75,5.38),(2.43,.20,1.64),timber,.06)
fortune=box('Omikuji title plaque',(-3.35,1.89,5.64),(2.13,.065,.79),cream,.035)
text=txt('Omikuji stand title','OMIKUJI',(-3.35,1.99,5.76),.29,navy)
text.rotation_euler=(0,0,0)
for dx in [-.22,.22]:box('Fortune shrine icon',(-3.35+dx,.86,6.061),(.075,.60,.035),red,.006)
for y,w in [(1.12,.78),(.95,.63)]:box('Fortune shrine beam',(-3.35,y,6.062),(w,.075,.036),red,.006)
for i in range(5):
    o=box('Fortune folded paper',(-2.02,1.0+i*.05,5.3),(.31,.42,.44),cream,.018)
    o.rotation_euler.x=.10
    box('Fortune paper stamp',(-2.02,1.13+i*.05,5.533),(.16,.08,.01),pink,.002)
planter(-5.18,4.22,1.0)
beam('Wish tree main trunk',(-5.18,.63,4.22),(-5.28,2.63,4.22),.13,wood)
for i in range(7):
    a=i*math.tau/7;dx=math.cos(a)*(.72 if i%2 else .91);dz=math.sin(a)*.67
    beam('Wish tree branch',(-5.23,1.28,4.22),(-5.18+dx,2.45+(i%3)*.21,4.22+dz),.058,timber)
    for t in [.55,1]:
        xx=-5.18+dx*t;zz=4.22+dz*t;yy=1.55+t*(.85+(i%3)*.21)
        o=box('Tied white fortune slip',(xx,yy,zz),(.10,.30,.026),white,.008);o.rotation_euler.y=.25*(i%3-1)
        sphere('Wish knot',(xx,yy+.15,zz),(.057,.04,.045),white,8,4)
        if i%2==0:sphere('Wish tree pink bud',(xx+.07,yy+.25,zz),(.055,.055,.055),pink,8,4)

# Market-change book stand, green cover and a tiny growth chart.
box('Book display foot',(3.54,.27,5.30),(2.77,.40,1.90),wood,.065)
for i in range(5):
    box('Market report cream pages',(3.54,.52+i*.16,5.24),(2.54,.11,1.66),cream,.032)
    box('Book colored binding',(3.54,.50+i*.16,6.04),(2.54,.15,.047),[red,slate,leaflight,cream,greenpaint][i],.012)
box('Market change book cover',(3.54,1.35,5.22),(2.66,.12,1.79),greenpaint,.06)
for dx in [-1.2,1.2]:box('Book cover border',(3.54+dx,1.418,5.22),(.032,.012,1.52),cream,.002)
for dz in [-.75,.75]:box('Book cover border',(3.54,1.418,5.22+dz),(2.40,.012,.032),cream,.002)
for body,z in [('MARKET',4.99),('CHANGE',5.39)]:
    o=txt('Market book title',body,(3.54,1.434,z),.30,cream);o.rotation_euler=(0,0,0)
for i in range(3):box('Growth bar on book spine',(3.31+i*.20,1.01+i*.08,6.076),(.14,.21+i*.16,.026),greenpaint,.01)
crate(5.27,4.8,.55,.5);crate(-5.54,5.66,.65,.63)

# Forward spacing keeps the mascot bodies visible; the prop row ends at Z 7.85.
for foreground_prop in set(bpy.context.scene.objects)-foreground_props_start:
    foreground_prop.location.y-=1.65
bpy.context.scene['foreground_props_forward_shift']=1.65

# Soft planted pockets, kept clear of all twenty play spaces.
for x,z,s in [(-6.65,-5.8,.77),(6.62,-5.9,.73),(-7.0,5.9,.49),(7.1,5.8,.56)]:
    box('Inner garden bed',(x,.06,z),(1.75,.11,1.65),moss,.23)
    tree(x,z,s,True)
for a,c in [((-7.2,-4.5),(-7.2,2.3)),((7.2,-4.5),(7.2,2.3))]:fence(a,c,.88)

# Blue food truck at the left edge, slightly angled into the plaza.
print('BOARD_VILLAGE_BUILD: food truck and perimeter storefronts', flush=True)
truck_start=set(bpy.context.scene.objects)
tx,tz=-16.2,-3.0
box('Food truck blue cargo',(tx+.43,1.52,tz),(3.61,2.30,2.23),blue,.20)
box('Food truck cream roof',(tx+.43,2.76,tz),(3.78,.20,2.40),cream,.12)
box('Food truck cream sill',(tx+.43,.56,tz),(3.72,.45,2.36),cream,.07)
box('Food truck cabin',(tx-2.05,1.22,tz),(1.51,1.79,2.11),cream,.18)
box('Food truck bonnet',(tx-2.63,.95,tz),(1.04,.84,2.18),cream,.13)
box('Cabin near side glass',(tx-2.1,1.78,tz+1.078),(.95,.74,.036),window,.07)
box('Blue truck door',(tx-1.97,.96,tz+1.086),(.96,.66,.04),blue,.035)
box('Door handle',(tx-1.62,1.27,tz+1.12),(.14,.06,.04),cedar,.009)
box('Truck windscreen',(tx-2.819,1.77,tz),(.037,.66,1.70),window,.075)
box('Bento truck sign surround',(tx+.42,1.74,tz+1.133),(2.78,1.52,.08),timber,.055)
box('Bento truck sign background',(tx+.42,1.74,tz+1.186),(2.60,1.35,.065),navy,.04)
for dx,dz,m in [(-.53,-.2,white),(-.08,-.2,orange),(.42,-.2,salmon),(-.53,.22,orange),(-.08,.22,white),(.42,.22,leaflight)]:
    sphere('Food truck bento emblem',(tx+.42+dx,1.80-dz,tz+1.257),(.19,.14,.065),m,10,6)
for xx in [tx-2.04,tx+1.47]:
    for zz in [tz-1.08,tz+1.08]:
        o=cyl('Truck tyre',(xx,.49,zz),.45,.23,rubber,16);o.rotation_euler.x=math.pi/2
        o=cyl('Truck cream hub',(xx,.49,zz+(.14 if zz>tz else -.14)),.23,.036,metal,12);o.rotation_euler.x=math.pi/2
        o=cyl('Truck hub center',(xx,.49,zz+(.166 if zz>tz else -.166)),.086,.044,cedar,10);o.rotation_euler.x=math.pi/2
for zz in [tz-.74,tz+.74]:
    box('Truck headlamp',(tx-3.16,.96,zz),(.043,.24,.36),lanternglow,.05)
box('Truck front bumper',(tx-3.22,.53,tz),(.18,.20,2.12),metal,.055)
box('Truck grill',(tx-3.24,.77,tz),(.037,.22,.70),rubber,.025)
for obj in set(bpy.context.scene.objects)-truck_start:
    # Turn the front toward the viewer while retaining the broad side illustration.
    center=Vector(b.at((tx,0,tz)));p=obj.location-center;angle=math.radians(-15)
    p.rotate(__import__('mathutils').Matrix.Rotation(angle,3,'Z'));obj.location=center+p;obj.rotation_euler.z+=angle

# Small perimeter storefronts with glowing lamps and roof tiles.
def storefront(x,z,w,d,color,label):
    box('Shop foundation',(x,.26,z),(w+.40,.45,d+.42),stonelight,.09)
    box('Shop plaster',(x,1.91,z),(w,3.3,d),cream,.06)
    for xx in [x-w*.48,x+w*.48]:box('Shop facade cedar post',(xx,1.98,z+d*.505),(.24,3.54,.23),cedar,.025)
    box('Shop dark serving opening',(x,1.68,z+d*.508),(w*.75,1.85,.13),cedar,.03)
    box('Shop counter',(x,.94,z+d*.59),(w*.83,.18,.78),timber,.035)
    for i in range(5):
        xx=x-w*.30+i*w*.15
        box('Noren curtain',(xx,2.35,z+d*.586),(w*.14,.91,.04),color,.025)
    txt('Shop curtain crest','✿',(x,2.34,z+d*.615),.70,cream)
    b.roof(x,3.17,z,w,d,color)
    for xx in [x-w*.44,x+w*.44]:lantern(xx,2.38,z+d*.78,.95)
    for i in range(4):
        cyl('Shop bottle',(x-w*.3+i*w*.21,1.28,z+d*.68),.115,.56,[orange,cream,salmon,leaflight][i],10)
    for dx in [-w*.7,w*.67]:crate(x+dx,z+d*.5,.72,.67)
    plant(x-w*.64,z+d*.2,.85)

storefront(-20.55,-8.3,4.3,3.6,slate,'BENTO')
storefront(20.0,1.4,4.6,3.5,red,'FLOWER')
storefront(18.6,-9.0,3.8,3.4,blue,'YATAI')

# Visible warm fencing and planter stones on either side of the board.
print('BOARD_VILLAGE_BUILD: perimeter trees, lanterns and gardens', flush=True)
for a,c in [((-13.65,-10),(-13.65,-6.4)),((-13.65,1),(-13.65,6.1)),((13.6,-9.3),(13.6,-2)),((13.6,2.3),(13.6,6.3)),((-12.8,-12.9),(-5.5,-12.9)),((2.4,-12.9),(13.5,-12.9)),((-15.0,10.8),(-15,15.7)),((15,10.8),(15,15.7))]:fence(a,c,1.1)
for x,z,height,side in [(-13.7,-11.0,3.2,-1),(-14.0,-.2,3.1,-1),(-14.1,7.5,3.25,-1),(13.75,-7.1,3.1,1),(13.8,4.6,3.2,1),(-6.4,-13.35,2.6,1),(7.7,-13.4,2.6,1),(-5.1,14.0,2.5,-1),(5.1,14.0,2.5,1)]:lantern_post(x,z,height,side)
for x,z,s in [(-15.0,-8.9,1.30),(-15.0,2.0,.86),(-17.2,8.5,1.23),(-15.6,15.4,1.24),(15.55,11.4,1.28),(15.10,-12.1,1.0),(13.6,-15.1,.95),(-10.8,-13.8,.76),(5.1,-14.0,.72),(20.5,13.9,1.36),(-22.3,3.4,1.30)]:tree(x,z,s)
for x,z in [(-12.9,4.0),(-14.0,5.5),(-13.5,-7.6),(13.35,7.2),(14.0,1.3),(13.2,-4.9),(-6.8,14.5),(7.1,14.5),(-13.4,13.4),(12.7,14.2),(-11.5,-13.2),(11.7,-13.7)]:plant(x,z,random.uniform(.55,.86),True,random.random()<.4)

# A river stretching behind the complete board, with an arched timber footbridge.
print('BOARD_VILLAGE_BUILD: rear stream, arched bridge and gateway', flush=True)
box('Horizontal jade village stream',(0,-.075,-18.1),(51,.10,5.4),water,.3)
for i in range(45):
    x=random.uniform(-24,24);z=random.uniform(-20.65,-15.70)
    box('Faceted water shimmer',(x,-.009,z),(random.uniform(.35,1.7),.009,random.uniform(.025,.075)),watershine if i%3 else waterdeep,.012)
for side in [-1,1]:
    z=-18.1+side*2.87
    for i in range(39):
        x=-25+i*1.31
        box('Riverbank retaining stone',(x,.17,z),(1.22,.55,.51),[stone,stonelight,stonedark][i%3],.085)
        if i%4==0:box('Riverbank green hummock',(x,.13,z+side*.50),(1.70,.31,1.01),moss,.2)

bx=-3.45
for i in range(24):
    z=-21.9+i*7.7/23;y=.30+.76*math.sin(i/23*math.pi)
    box('Bridge plank',(bx,y,z),(3.45,.20,.315),timber,.025)
for side in [-1,1]:
    x=bx+side*1.73
    for i in range(9):
        t=i/8;z=-21.9+t*7.7;y=.30+.76*math.sin(t*math.pi)
        box('Bridge upright',(x,y+.75,z),(.16,1.72,.17),cedar,.018)
        box('Bridge post cap',(x,y+1.64,z),(.25,.16,.26),timber,.025)
    for i in range(23):
        a=i/23;c=(i+1)/23
        for add in [.73,1.46]:beam('Arched bridge handrail',(x,.30+.76*math.sin(a*math.pi)+add,-21.9+a*7.7),(x,.30+.76*math.sin(c*math.pi)+add,-21.9+c*7.7),.09,wood)

# Rear left gateway, suspended village sign and paper lanterns.
gx,gz=-12.2,-18.5
for xx in [gx-2.61,gx+2.61]:
    box('Gate stone plinth',(xx,.51,gz),(.96,1.02,.90),stonelight,.065)
    box('Gateway timber upright',(xx,2.50,gz),(.25,4.85,.25),wood,.035)
    box('Gate post dark edge',(xx-.11,2.50,gz+.13),(.05,4.74,.04),cedar,.008)
box('Village gate top lintel',(gx,4.79,gz),(6.09,.32,.44),wood,.07)
box('Village gate top cap',(gx,5.01,gz),(6.33,.18,.56),timber,.04)
for xx in [gx-1.67,gx+1.67]:beam('Sign suspension',(xx,4.69,gz),(xx,4.30,gz),.04,cedar)
box('Welcome timber sign',(gx,3.91,gz+.12),(4.67,1.20,.18),timber,.10)
box('Welcome sign cream center',(gx,3.93,gz+.23),(4.40,.96,.065),endgrain,.065)
txt('Yatai Village gate name','YATAI VILLAGE',(gx,3.96,gz+.275),.42,navy)
for side in [-1,1]:
    lantern(gx+side*2.91,3.31,gz+.18,.94)
    beam('Gateway lantern bar',(gx+side*2.55,4.03,gz),(gx+side*3.05,4.03,gz),.065,cedar)
bunting((-19.2,4.1,-18.5),(-15.0,4.25,-18.5),7)

# Distant toy village tiers: small stepped park, hilltop shrine, locked landmark.
print('BOARD_VILLAGE_BUILD: distant village landmarks', flush=True)
for x,z,w,d in [(-12,-25,7,4),(4,-25,9,5),(12.5,-25.9,7.7,5.8)]:
    box('Back garden terrace',(x,.35,z),(w,.66,d),moss,.40)
    for i in range(int(w/1.2)):
        box('Terrace front block',(x-w/2+.6+i*1.2,.35,z+d/2),(1.12,.70,.67),stonelight,.05)
for i in range(4):box('Rear garden stone step',(.3,.17+i*.19,-22.1-i*.45),(3.5,.35,.56),stonelight,.055)
for a,c in [((-8.8,-23.0),(-1.7,-23.0)),((2.8,-23.0),(6.7,-23.0)),((15.4,-24.1),(21.9,-24.1))]:fence(a,c,1.02)
for x,z,s in [(-23,-23.5,1.48),(-19.2,-25.1,1.17),(-8.4,-26.3,1.15),(-.5,-28.2,1.3),(6.5,-24.7,.78),(16.9,-27,1.2),(22.8,-23.5,1.49),(-25,-15.5,1.6),(27,-16.4,1.5)]:tree(x,z,s)

def tapered_block(name,x,y,z,w,d,h,topscale,m):
    verts=[(x+dx*w/2,y-h/2,z+dz*d/2) for dx,dz in [(-1,-1),(1,-1),(1,1),(-1,1)]]
    verts.extend((x+dx*w/2*topscale,y+h/2,z+dz*d/2*topscale) for dx,dz in [(-1,-1),(1,-1),(1,1),(-1,1)])
    mesh=bpy.data.meshes.new(name);mesh.from_pydata([b.at(v) for v in verts],[],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);b.finish(obj,name,m)

tapered_block('Hilltop stone landmark',10.35,2.20,-27.2,6.5,5.5,4.4,.62,stone)
box('Hilltop upper terrace',(10.35,4.52,-27.2),(4.54,.23,3.93),stonelight,.09)
for x in [8.85,11.85]:
    for z in [-28.4,-26.0]:box('Hilltop pergola upright',(x,5.29,z),(.16,1.60,.16),wood,.018)
for z in [-28.4,-26.0]:box('Hilltop pergola lintel',(10.35,6.04,z),(3.78,.15,.21),wood,.025)
for i in range(5):box('Hilltop pergola rafter',(8.69+i*.83,6.15,-27.2),(.12,.14,3.22),timber,.018)
lantern(9.0,5.50,-26.0,.53);lantern(11.7,5.5,-26.0,.53)
box('Locked landmark icon body',(10.35,2.3,-24.47),(.71,.68,.065),slate,.085)
for dx in [-.23,.23]:beam('Lock shackle side',(10.35+dx,2.53,-24.455),(10.35+dx,2.98,-24.455),.061,slate)
beam('Lock shackle top',(10.12,2.98,-24.455),(10.58,2.98,-24.455),.061,slate)
sphere('Lock keyhole',(10.35,2.35,-24.413),(.065,.080,.026),cream,8,5)

# Farther meadow makes the horizon a colorful toy diorama rather than an empty plane.
for i in range(29):
    x=-29+i*2.15;z=-32.0-random.random()*4
    foliage('Distant faceted green hill',(x,.35,z),(random.uniform(2.8,4.1),random.uniform(2.0,3.4),random.uniform(2.0,3.7)),[leaflight,leaf,leafdark][i%3],2)
for x,z in [(-22,15),(23,15),(-24,8),(25,7),(-23,-2),(23,-13)]:
    for i in range(3):foliage('Perimeter hedge',(x+(i-1)*1.1,.42,z),(1.20,.80,1.07),[leaf,leafdark,leaflight][i],1)

# Join by material for predictable browser draw calls while preserving the editable source.
print('BOARD_VILLAGE_BUILD: batch materials and export', flush=True)
objects_before=sum(o.type=='MESH' for o in bpy.context.scene.objects)
bpy.ops.object.select_all(action='DESELECT')
for m in list(b.M.values()):
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.materials)==1 and o.data.materials[0]==m]
    if not objects:continue
    for obj in objects:obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
    bpy.context.object.name='BoardVillage_'+m.name.split(' / ')[-1].replace(' ','_')
    bpy.ops.object.select_all(action='DESELECT')

meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
bounds=[o.matrix_world@Vector(corner) for o in meshes for corner in o.bound_box]
metadata={'generator':'tools/blender/build_board_village.py','objectsBeforeBatching':objects_before,'materialBatches':len(meshes),'triangles':sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons),'boundsBlender':{'min':[min(v[k] for v in bounds) for k in range(3)],'max':[max(v[k] for v in bounds) for k in range(3)]},'note':'Y-up browser coordinates. Central counter at (0,1.25), river at z=-18.1. Entirely modeled 3D; no photographic planes.'}
bpy.context.scene['central_stalls_forward_shift']=2.5
b.export('yatai-board-village')
with open(os.path.join(b.SOURCE,'yatai-board-village.json'),'w',encoding='utf8') as handle:json.dump(metadata,handle,indent=2)
print('BOARD_VILLAGE_STATS',json.dumps(metadata),flush=True)

if '--render' in __import__('sys').argv:
    # Review render only: lights and camera are intentionally added after GLB export.
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
    scene.render.resolution_x=1416;scene.render.resolution_y=766;scene.render.resolution_percentage=75
    scene.world.color=(.63,.77,.90)
    bpy.ops.object.light_add(type='AREA',location=b.at((-12,24,12)));light=bpy.context.object;light.data.energy=2800;light.data.shape='DISK';light.data.size=20
    bpy.ops.object.light_add(type='SUN',location=(0,0,20));sun=bpy.context.object;sun.rotation_euler=(math.radians(25),math.radians(-20),math.radians(-30));sun.data.energy=2.0;sun.data.angle=.15
    bpy.ops.object.camera_add(location=b.at((0,26,35)));camera=bpy.context.object;target=Vector(b.at((0,.2,-3)));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=44;scene.camera=camera
    scene.view_settings.view_transform='AgX';scene.render.filepath=os.path.join(b.SOURCE,'yatai-board-village-preview.png');bpy.ops.render.render(write_still=True)
