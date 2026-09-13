"""An additive HQ village variant. Never overwrites the shipped village/manifest.

Run: node tools/blender/headless.mjs tools/blender/build_festival_hq.py
Leaves, petals, stems and roots are actual mesh geometry, not image planes.
"""
import bpy, bmesh, math, random, json, os
from mathutils import Vector
import build_assets as b

rng = random.Random(841)
original_export = b.export

class MeshBatch:
    def __init__(self, name, material):
        self.name, self.material, self.vertices, self.faces = name, material, [], []
    def face(self, points, faces):
        start = len(self.vertices)
        self.vertices.extend(b.at(p) for p in points)
        self.faces.extend(tuple(start+i for i in f) for f in faces)
    def tube(self, a, c, r1, r2):
        a, c = Vector(a), Vector(c)
        direction = (c-a).normalized()
        u = direction.cross(Vector((0,1,0)))
        if u.length < .01: u = direction.cross(Vector((1,0,0)))
        u.normalize(); v = direction.cross(u).normalized()
        points = [center + radius*(math.cos(i*math.tau/8)*u+math.sin(i*math.tau/8)*v)
                  for center, radius in [(a,r1),(c,r2)] for i in range(8)]
        self.face(points, [(i,(i+1)%8,(i+1)%8+8,i+8) for i in range(8)])
    def leaf(self, center, length, width):
        a = rng.random()*math.tau
        along = Vector((math.cos(a),rng.uniform(-.35,.6),math.sin(a))).normalized()
        across = Vector((-math.sin(a),rng.uniform(-.25,.25),math.cos(a))).normalized()
        c = Vector(center)
        self.face([c-along*length*.5, c+across*width*.5, c+along*length*.6,
                   c-across*width*.5, c+Vector((0,width*.18,0))],
                  [(0,1,4),(1,2,4),(2,3,4),(3,0,4)])
    def flower(self, center, radius):
        c=Vector(center); phase=rng.random()*math.tau
        tilt=rng.uniform(-.7,.7)
        u=Vector((1,0,0)); v=Vector((0,math.cos(tilt),math.sin(tilt)))
        for i in range(5):
            a=phase+i*math.tau/5
            direction=math.cos(a)*u+math.sin(a)*v
            side=-math.sin(a)*u+math.cos(a)*v
            self.face([c,c+direction*radius*.6-side*radius*.36,
                       c+direction*radius,c+direction*radius*.6+side*radius*.36],
                      [(0,1,2),(0,2,3)])
    def finish(self):
        mesh=bpy.data.meshes.new(self.name);mesh.from_pydata(self.vertices,[],self.faces);mesh.update()
        obj=bpy.data.objects.new(self.name,mesh);bpy.context.collection.objects.link(obj)
        b.finish(obj,self.name,self.material)
        for poly in mesh.polygons: poly.use_smooth=True

def garden():
    bark=MeshBatch('HQ tapered branches and exposed roots',b.mat('HQ Cherry bark',(.17,.075,.038)))
    greens=[MeshBatch('HQ individual leaves '+str(i),b.mat('HQ Foliage '+str(i),color))
            for i,color in enumerate([(.04,.12,.018),(.08,.20,.026),(.12,.27,.043),(.20,.36,.085)])]
    pinks=[MeshBatch('HQ five-petal sakura '+str(i),b.mat('HQ Petals '+str(i),color))
           for i,color in enumerate([(.96,.55,.66),(.99,.71,.78),(.98,.83,.85)])]
    for mesh in greens+pinks: mesh.material.use_backface_culling=False
    locations=[(-6,-4),(6,-5),(-7,5),(7,5),(17,3),(-24,7),(-25,-12),(24,8),(-12,-24),(11,-23),(-30,-22),(30,-23),(-28,25),(29,25),(12,23),(-11,25)]
    for index,(x,z) in enumerate(locations):
        size=1 if abs(x)<10 else 1.2
        blossom=index<4 or (x+z)%3==0
        root=Vector((x,.08,z)); fork=Vector((x+.12,1.75*size,z-.08))
        bark.tube(root,fork,.28*size,.15*size)
        for i in range(5):
            a=i*math.tau/5
            bark.tube(root+Vector((math.cos(a)*.68*size,0,math.sin(a)*.68*size)),root+Vector((0,.35,0)),.035,.16)
        for branch in range(9):
            a=branch*2.399+index*.5; radius=rng.uniform(.9,1.65)*size
            tip=Vector((x+math.cos(a)*radius,rng.uniform(2.5,3.5)*size,z+math.sin(a)*radius))
            elbow=fork.lerp(tip,.5)+Vector((0,.22,0))
            bark.tube(fork,elbow,.12*size,.065*size);bark.tube(elbow,tip,.065*size,.025*size)
            for twig in range(3):
                t=a+twig*math.tau/3
                end=tip+Vector((math.cos(t)*.55*size,rng.uniform(-.1,.45)*size,math.sin(t)*.55*size))
                bark.tube(tip,end,.025*size,.008)
                for leaf in range(45 if blossom else 65):
                    az=rng.random()*math.tau; y=rng.uniform(-1,1); r=rng.random()**(1/3)
                    s=math.sqrt(1-y*y)
                    center=end+Vector((math.cos(az)*s*.62*size,y*.38*size,math.sin(az)*s*.62*size))*r
                    if blossom: pinks[rng.randrange(3)].flower(center,rng.uniform(.085,.16)*size)
                    else: greens[rng.randrange(4)].leaf(center,rng.uniform(.19,.36)*size,.15*size)
        # Fallen petals/ground-cover keep detail low, away from the board lanes.
        for i in range(90):
            a=rng.random()*math.tau;r=rng.uniform(.35,2.1)*size
            c=(x+math.cos(a)*r,.10,z+math.sin(a)*r)
            if blossom: pinks[i%3].leaf(c,.12,.065)
            else: greens[i%4].leaf(c,.23,.10)
    # Layered low garden planting at the outer edge, with individual leaves.
    for i in range(28):
        x=-30+i*2.2;z=-26 if i%2 else 27
        for j in range(100):
            c=(x+rng.uniform(-.8,.8),rng.uniform(.15,.7),z+rng.uniform(-.6,.6))
            greens[j%4].leaf(c,.32,.15)
    for mesh in [bark]+greens+pinks:mesh.finish()

def export_hq(_name, animated=False):
    garden()
    original_export('yatai-village-hq')
    asset=b.manifest['assets'][-1]
    asset['description']='Branched sakura, five-petal flowers, individual leaves and tapered roots. Original walkable footprint preserved.'
    asset['seed']=841
    with open(os.path.join(b.OUT,'festival-hq.json'),'w',encoding='utf-8') as f:
        json.dump(asset,f,indent=2)

bpy.ops.wm.open_mainfile(filepath=os.path.join(b.SOURCE,'yatai-village.blend'))
print('Loaded existing village; preserving all buildings and paths.',flush=True)
for obj in list(bpy.context.scene.objects):
    if obj.type!='MESH': continue
    names=[m.name for m in obj.data.materials]
    if any(n.startswith(('Cherry blossom','Pale sakura')) for n in names):
        bpy.data.objects.remove(obj,do_unlink=True)
    elif any(n.startswith('Leaf canopy') for n in names):
        # The material batch also contains green roof tiles. Remove only the
        # disconnected round canopy/shrub components, retaining roof geometry.
        bm=bmesh.new();bm.from_mesh(obj.data)
        pending=set(bm.verts); removed=0
        while pending:
            first=pending.pop(); component={first}; stack=[first]
            while stack:
                for edge in stack.pop().link_edges:
                    for vertex in edge.verts:
                        if vertex in pending:
                            pending.remove(vertex);component.add(vertex);stack.append(vertex)
            xs=[v.co.x for v in component]; ys=[v.co.y for v in component]; zs=[v.co.z for v in component]
            spans=[max(a)-min(a) for a in (xs,ys,zs)]
            # UV spheres have >30 vertices and width/depth/height >1 world unit.
            # Roof surfaces/ribs have 8/20 vertices or a thin bounding dimension.
            if len(component)>30 and min(spans)>1:
                bmesh.ops.delete(bm,geom=list(component),context='VERTS');removed+=1
        bm.to_mesh(obj.data);bm.free()
        print('Replaced',removed,'round canopy components; roof retained.',flush=True)
export_hq('yatai-village-hq')
print('FESTIVAL_HQ_COMPLETE',flush=True)
