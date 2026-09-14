"""Reference board: twenty sculpted, lettered tiles and a real wooden bench.

Run from the project root with:
    node tools/blender/headless.mjs tools/blender/build_reference_board.py

Everything visible in this asset is mesh geometry, including the lettering,
icon artwork, tile rims, arrows and bench.  The source remains editable in
Blender.  This generator deliberately leaves the shared asset manifest alone.
Browser coordinates are X right, Y up, Z toward the front of the board.
"""
import math
import os
import json
import bpy
import bmesh
import build_assets as b
from reference_mascots import linear

ASSET = 'yatai-reference-board'
TOP = .305
INK_Y = .312
NAMES = ['Start', 'Sales Day', 'Omikuji', 'Bank', 'Big Sale',
         'Festival Plaza', 'Sales Day', 'Market Change', 'Omikuji',
         'Advertising', 'Town Hall', 'Sales Day', 'Omikuji', 'Returns',
         'Big Sale', 'Sparko\u2019s Bench', 'Sales Day', 'Market Change',
         'Omikuji', 'Bank']


def material(name, color, roughness=.72):
    m = b.mat(name, linear(color))
    m.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = roughness
    return m


def extrude(name, points, y, depth, m, bevel=0):
    """Extrude an X/Z outline vertically; concave outlines are supported."""
    n = len(points)
    verts = [b.at((x, yy, z)) for yy in [y-depth/2, y+depth/2] for x, z in points]
    faces = [tuple(range(n-1, -1, -1)), tuple(range(n, 2*n))]
    faces += [(i, (i+1) % n, (i+1) % n+n, i+n) for i in range(n)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(mesh)
    bm.free()
    o = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(o)
    b.finish(o, name, m)
    if bevel:
        mod = o.modifiers.new('Fine porcelain edge', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return o


def rounded_slab(name, x, z, width, depth, radius, y, height, m):
    points = []
    for cx, cz, start in [(width/2-radius, depth/2-radius, 0),
                          (-width/2+radius, depth/2-radius, 90),
                          (-width/2+radius, -depth/2+radius, 180),
                          (width/2-radius, -depth/2+radius, 270)]:
        for j in range(9):
            angle = math.radians(start+j*90/8)
            points.append((x+cx+math.cos(angle)*radius,
                           z+cz+math.sin(angle)*radius))
    return extrude(name, points, y, height, m, .009)


def flat_text(name, body, x, z, size, m, max_width=3.05, y=INK_Y):
    bpy.ops.object.text_add(location=b.at((x, y, z)))
    o = bpy.context.object
    o.name = name
    o.data.body = body
    o.data.font = FONT
    o.data.align_x = 'CENTER'
    o.data.align_y = 'CENTER'
    o.data.space_line = .88
    o.data.size = size
    o.data.extrude = .0015
    o.data.resolution_u = 6
    o.data.materials.append(m)
    bpy.context.view_layer.update()
    if o.dimensions.x > max_width:
        o.scale.x *= max_width/o.dimensions.x
    bpy.ops.object.convert(target='MESH')
    return o


def icon(kind, x, z, color, face):
    """Vector-style relief artwork, modeled on the reference board's icons."""
    prefix = kind.replace(' ', '_')
    stroke = 0
    def poly(label, points, mat=color, height=None):
        nonlocal stroke
        # Microscopic separation prevents overlapping icon strokes from sharing
        # identical surfaces while keeping the complete relief below Y=.325.
        if height is None:
            height=INK_Y+stroke*.0004
            stroke+=1
        return extrude(prefix+'_'+label, [(x+u, z-v) for u, v in points], height, .006, mat)
    def rect(label, u, v, w, h, mat=color, height=None):
        return poly(label, [(u-w/2,v-h/2),(u+w/2,v-h/2),(u+w/2,v+h/2),(u-w/2,v+h/2)], mat, height)
    def circle(label, u, v, r, mat=color, height=None):
        return poly(label, [(u+math.cos(k*math.tau/24)*r, v+math.sin(k*math.tau/24)*r) for k in range(24)], mat, height)
    def line(label, a, c, w, mat=color, height=None):
        dx,dy=c[0]-a[0],c[1]-a[1]
        ll=math.hypot(dx,dy)
        ox,oy=-dy/ll*w/2,dx/ll*w/2
        return poly(label, [(a[0]+ox,a[1]+oy),(c[0]+ox,c[1]+oy),(c[0]-ox,c[1]-oy),(a[0]-ox,a[1]-oy)],mat,height)
    if kind == 'Sales Day':
        poly('basket', [(-.50,.22),(.66,.22),(.49,-.31),(-.36,-.31)])
        line('handle',(-.75,.47),(-.50,.47),.115)
        line('stem',(-.51,.47),(-.32,-.48),.10)
        rect('lower rail',.08,-.45,.79,.08)
        circle('wheel left',-.23,-.65,.12)
        circle('wheel right',.40,-.65,.12)
    elif kind == 'Bank' or kind == 'Town Hall':
        poly('pediment', [(-.76,.32),(0,.83),(.76,.32)])
        rect('frieze',0,.23,1.42,.13)
        for u in [-.51,-.17,.17,.51]:
            rect('column',u,-.16,.15,.67)
            rect('capital',u,.13,.22,.10)
            rect('column foot',u,-.48,.22,.09)
        rect('upper step',0,-.56,1.49,.13)
        rect('lower step',0,-.70,1.70,.11)
        if kind == 'Town Hall':
            circle('town seal',0,.45,.085,face,INK_Y+.005)
    elif kind == 'Omikuji':
        poly('swept lintel',[(-.84,.53),(-.52,.44),(.52,.44),(.84,.53),(.80,.31),(.50,.22),(-.50,.22),(-.80,.31)])
        rect('lower beam',0,-.03,1.55,.13)
        for side in [-1,1]:
            poly('pillar',[(side*.49-.075,.28),(side*.49+.075,.28),(side*.57+.075,-.72),(side*.57-.075,-.72)])
        rect('name plate',0,.15,.17,.30)
    elif kind == 'Big Sale':
        poly('tag',[(-.77,.08),(.02,.70),(.63,.70),(.72,.11),(-.09,-.60)])
        circle('punched eye',.43,.44,.085,face,INK_Y+.005)
    elif kind == 'Market Change':
        for u, h in [(-.52,.55),(-.03,.88),(.46,1.20)]:
            rect('rising bar',u,-.62+h/2,.32,h)
        rect('axis',0,-.70,1.48,.08)
    elif kind == 'Advertising':
        poly('horn',[(-.42,.16),(.35,.65),(.48,-.46),(-.42,-.20)])
        rect('speaker neck',-.58,-.02,.33,.42)
        poly('handle',[(-.33,-.24),(-.11,-.31),(-.02,-.75),(-.24,-.75)])
        line('bell edge',(.35,.68),(.51,-.50),.12)
        line('sound middle',(.71,.13),(.96,.16),.065)
        line('sound top',(.64,.50),(.84,.68),.065)
        line('sound bottom',(.71,-.29),(.91,-.40),.065)
    elif kind == 'Returns':
        poly('box silhouette',[(-.67,.36),(0,.74),(.69,.35),(.69,-.46),(0,-.84),(-.67,-.46)])
        for label,a,c in [('left fold',(-.63,.34),(0,-.01)),('right fold',(0,-.01),(.65,.34)),('center fold',(0,-.01),(0,-.78)),('lid seam',(-.34,.54),(.34,.16))]:
            line(label,a,c,.055,face,INK_Y+.005)
        poly('folded flap',[(-.02,.43),(.30,.61),(.45,.51),(.13,.32)],face,INK_Y+.005)
    elif kind == 'Festival Plaza':
        poly('canopy',[(-.88,.20),(-.45,.41),(0,.79),(.45,.41),(.88,.20)])
        for u in [-.47,0,.47]:
            poly('canopy seam',[(u-.025,.22),(u+.025,.22),(u*.5+.025,.51),(u*.5-.025,.51)],face,INK_Y+.005)
        rect('ridge flag pole',.01,.86,.055,.36)
        poly('ridge flag',[(.04,1.02),(.38,.91),(.04,.81)])
        for u in [-.67,-.24,.24,.67]:
            poly('tent post',[(u-.055,.15),(u+.055,.15),(u*1.14+.055,-.61),(u*1.14-.055,-.61)])
        rect('tent base',0,-.65,1.79,.10)


def board_position(i):
    if i <= 5: return -10, 10-i*4
    if i <= 10: return -10+(i-5)*4, -10
    if i <= 15: return 10, -10+(i-10)*4
    return 10-(i-15)*4, 10


def add_bench():
    x,z = 10,9.55
    wood = material('Bench warm cedar','995126')
    light = material('Bench honey slat edges','c17b44')
    dark = material('Bench dark iron legs','543124')
    # The seat is 0.61 above the tile; Sparko's seated hips belong at Y=.91.
    for dx in [-1.00,1.00]:
        for dz in [-.36,.35]:
            b.box('Bench standing leg',(x+dx,.57,z+dz),(.12,.53,.13),dark,.024)
        b.box('Bench seat support',(x+dx,.82,z),(.14,.13,.98),dark,.026)
        b.box('Bench back upright',(x+dx,1.11,z-.45),(.13,1.06,.13),dark,.022)
    for j in range(4):
        b.box('Bench seat cedar slat',(x,.866,z-.32+j*.225),(2.64,.09,.195),wood if j%2 else light,.027)
    for j in range(3):
        b.box('Bench back cedar slat',(x,1.10+j*.23,z-.47),(2.64,.19,.10),wood if j%2 else light,.028)
    for dx in [-1.00,1.00]:
        for yy in [1.10,1.33,1.56]:
            b.sphere('Bench brass screw',(x+dx,yy,z-.404),(.025,.025,.008),GOLD,8,6)


def add_arrow(name, x, z, dx, dz):
    # Arrow points along local +v, then rotates to the intended board direction.
    shape=[(-.14,-.72),(.14,-.72),(.14,.12),(.42,.12),(0,.71),(-.42,.12),(-.14,.12)]
    pts=[(x+u*dz+v*dx, z-u*dx+v*dz) for u,v in shape]
    extrude(name,pts,.106,.025,WHITE,.009)


b.clear()
FONT_PATH = 'C:/Windows/Fonts/arialbd.ttf'
FONT = bpy.data.fonts.load(FONT_PATH) if os.path.exists(FONT_PATH) else bpy.data.fonts.get('Bfont')
GOLD = material('Golden tile foundation','e8b748',.52)
WHITE = material('Cream porcelain rim','fff8e9')
INK = material('Board midnight lettering','162447')
palette = {
    'pink': (material('Sales strawberry pink','ffb4cb'), material('Sales coral icon','f33e5b')),
    'violet': (material('Fortune lilac','d6aff4'), material('Fortune plum icon','a4339d')),
    'blue': (material('Bank sky blue','afd3ff'), material('Bank cobalt icon','1177cf')),
    'yellow': (material('Sale butter yellow','ffe18c'), material('Sale orange icon','ef9b00')),
    'green': (material('Market fresh mint','a5e8ae'), material('Market leaf icon','28944c')),
    'red': (material('Start and festival coral','ff515e'), WHITE),
    'orange': (material('Town hall tangerine','ff8734'), WHITE),
    'bench': (material('Sparko bench blue','3ba9ef'), WHITE),
}
families = ['red','pink','violet','blue','yellow','red','pink','green','violet','blue',
            'orange','pink','violet','blue','yellow','bench','pink','green','violet','blue']

for i, name in enumerate(NAMES):
    x,z = board_position(i)
    family = families[i]
    face, accent = palette[family]
    # Three nested, truly rounded extrusions make the sunny gold sides and ivory lip.
    rounded_slab('Tile %02d gold foundation'%i,x,z,3.94,3.94,.31,.1175,.185,GOLD)
    rounded_slab('Tile %02d ivory edge'%i,x,z,3.87,3.87,.30,.236,.112,WHITE)
    tile = rounded_slab('Tile %02d %s porcelain'%(i,name),x,z,3.68,3.68,.25,.285,.040,face)
    tile['boardIndex'] = i
    tile['boardName'] = name
    label_color = WHITE if family in ['red','orange','bench'] else INK
    number_z = z+1.11 if i == 0 else z-1.35
    number_x = x-1.36
    flat_text('Tile %02d number'%i,str(i),number_x,number_z,.63,accent,max_width=.80)
    if i == 0:
        flat_text('Start title','Start',x+.07,z+1.12,.84,WHITE,max_width=2.40)
        # A shallow porcelain halo leaves a physically clear place for the pawn.
        for r, thick, m, yy in [(.90,.067,WHITE,.313),(.805,.043,GOLD,.315)]:
            bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=thick,
                major_segments=64,minor_segments=8,location=b.at((x,.314,z-1.05)))
            o=bpy.context.object
            o.scale.z=.07
            b.finish(o,'Start pawn halo',m)
    elif i == 15:
        flat_text('Sparko bench title','Sparko\u2019s\nBench',x,z+1.13,.58,WHITE,max_width=2.88)
    else:
        icon(name,x,z-.34,accent,face)
        body = name
        size = .62
        label_z=z+1.0
        if name in ['Market Change','Festival Plaza']:
            body = name.replace(' ','\n')
            size=.54
            label_z=z+1.05
        if name == 'Advertising': size=.49
        if name == 'Bank': size=.67
        if name == 'Town Hall':
            flat_text('Town Hall title','Town Hall',x,z+.77,.58,WHITE)
            flat_text('Town Hall free tour','Free tour',x,z+1.26,.39,WHITE)
        else:
            flat_text('Tile %02d title'%i,body,x,label_z,size,label_color)

add_bench()
add_arrow('Left side clockwise arrow',-12.65,0,0,-1)
add_arrow('Back side clockwise arrow',0,-12.65,1,0)
add_arrow('Right side clockwise arrow',12.65,0,0,1)
add_arrow('Front side clockwise arrow',0,12.65,-1,0)

# Batch by material to keep draw calls low while retaining editable mesh parts
# in the .blend until this final predictable joining step.
bpy.ops.object.select_all(action='DESELECT')
for m in list(b.M.values()):
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.materials)==1 and o.data.materials[0]==m]
    if objects:
        for o in objects: o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        bpy.ops.object.join()
        bpy.context.object.name='Reference board '+m.name
        bpy.ops.object.select_all(action='DESELECT')

b.manifest['assets']=[]
# All lettering has been converted to meshes. Do not ship the unused local font
# reference inside the editable source asset.
for font in list(bpy.data.fonts):
    if font.users == 0 and font.filepath and not font.filepath.startswith('<'):
        bpy.data.fonts.remove(font)
bpy.context.preferences.filepaths.save_version=0
b.export(ASSET)
metadata = {'id':ASSET,'generator':'tools/blender/build_reference_board.py','tileTop':TOP,
            'tileSize':3.94,'boardNames':NAMES,'positions':[board_position(i) for i in range(20)],
            'benchSeat':[10,.911,9.55],'asset':b.manifest['assets'][0]}
with open(os.path.join(b.OUT,ASSET+'.json'),'w',encoding='utf-8') as f:
    json.dump(metadata,f,indent=2)
print('LEAD_REFERENCE_BOARD_COMPLETE',json.dumps(metadata),flush=True)
