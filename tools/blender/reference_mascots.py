"""Reference-led, fully modeled mascots with a continuous deforming body.

The supplied 2D artwork remains the design authority. Mesh names and action
names are stable because the browser uses these assets in every game mode.
"""
import math
import bpy, bmesh
from mathutils import Vector
from mathutils.geometry import tessellate_polygon

COLORS = {'lido':'f96366','prena':'52a7da','oty':'ffde00','diva':'6dba32','sparko':'238fcb'}
ACCENTS = {'lido':'bf252c','prena':'075a91','oty':'eea009','diva':'478d1c','sparko':'075a91'}

def linear(hex_value):
    def channel(v):
        v=int(v,16)/255
        return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
    return tuple(channel(hex_value[i:i+2]) for i in (0,2,4))

def bezier(a,b,c,d,count=12):
    return [tuple((1-t)**3*a[k]+3*(1-t)**2*t*b[k]+3*(1-t)*t*t*c[k]+t**3*d[k] for k in (0,1)) for t in [i/count for i in range(count)]]

def build_mascot(api,name):
    api.clear()
    def material(label,color):
        m=api.mat(label,linear(color))
        p=m.node_tree.nodes.get('Principled BSDF')
        p.inputs['Roughness'].default_value=.83
        p.inputs['Specular IOR Level'].default_value=.16
        return m
    skin=material('Skin',COLORS[name]); dark=material('Shadow accent',ACCENTS[name])
    white=material('Warm white','fffef9'); black=material('Midnight eyes','070909')
    palette={k:material('Crown '+k,v) for k,v in [('blue','52a7da'),('green','6dba32'),('coral','f96366'),('yellow','ffde00')]}
    gold=material('Golden accent','eea009')
    parts={k:[] for k in ['body','head','eye.L','eye.R','mouth']}
    def add(b,o):
        parts[b].append(o)
        return o
    def patch(label,points,center,radii,m,offset=.012):
        """Triangulated curved applique, conforming to the ellipsoid beneath."""
        points3=[Vector((x,y,0)) for x,y in points]
        lookup={tuple(v):i for i,v in enumerate(points3)}
        faces=[tuple(v if isinstance(v,int) else lookup[tuple(v)] for v in tri) for tri in tessellate_polygon([points3])]
        mesh=bpy.data.meshes.new(label);mesh.from_pydata(points3,[],faces);mesh.update()
        o=bpy.data.objects.new(label,mesh);bpy.context.collection.objects.link(o)
        bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
        sub=o.modifiers.new('Conforming detail','SUBSURF');sub.subdivision_type='SIMPLE';sub.levels=3
        bpy.ops.object.modifier_apply(modifier=sub.name)
        for v in o.data.vertices:
            x,y=v.co.x,v.co.y
            z=center[2]+radii[2]*math.sqrt(max(.015,1-((x-center[0])/radii[0])**2-((y-center[1])/radii[1])**2))+offset
            v.co=api.at((x,y,z))
        for p in o.data.polygons:p.use_smooth=True
        return api.finish(o,label,m)
    head_center=(0,2.00,0);head_radii=(.69,.65,.48)
    # Rounded continuous body, out-turned feet and mitten thumbs. Voxel union
    # removes intersecting primitive seams before a weighted skin is created.
    body_pieces=[api.sphere('Torso sculpt',(0,1.01,0),(.37,.60,.275),skin,24,16),api.sphere('Hip sculpt',(0,.67,0),(.36,.28,.26),skin,20,12)]
    for sign in (-1,1):
        o=api.sphere('Flared leg sculpt',(sign*.35,.40,0),(.215,.47,.245),skin,20,12)
        o.rotation_euler.y=-sign*.40;body_pieces.append(o)
        body_pieces.append(api.sphere('Soft outward foot',(sign*.51,.15,.065),(.245,.16,.275),skin,20,12))
        o=api.sphere('Tapered arm sculpt',(sign*.48,1.13,0),(.105,.35,.14),skin,20,12)
        o.rotation_euler.y=-sign*.52;body_pieces.append(o)
        body_pieces.append(api.sphere('Mitten palm',(sign*.65,.87,.01),(.105,.12,.13),skin,16,10))
        body_pieces.append(api.sphere('Mitten thumb',(sign*.71,.90,.045),(.075,.06,.10),skin,12,8))
    bpy.ops.object.select_all(action='DESELECT')
    for o in body_pieces:o.select_set(True)
    bpy.context.view_layer.objects.active=body_pieces[0];bpy.ops.object.join()
    body=bpy.context.object;body.name='Continuous soft silhouette'
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    remesh=body.modifiers.new('Seamless sculpt union','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.045;remesh.use_smooth_shade=True
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    smooth=body.modifiers.new('Soft mascot finish','SMOOTH');smooth.factor=.7;smooth.iterations=5
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    sub=body.modifiers.new('Animation surface','SUBSURF');sub.levels=1
    bpy.ops.object.modifier_apply(modifier=sub.name)
    for p in body.data.polygons:p.use_smooth=True
    if name!='sparko':
        add('body',patch('Diagonal chest accent',[(-.19,1.48),(.23,1.48),(-.28,.99)],(0,1.01,0),(.37,.60,.275),dark,.012))
    add('head',api.sphere('Signature round head',head_center,head_radii,skin,40,28))
    for x,side in [(-.265,'L'),(.265,'R')]:
        add('eye.'+side,api.sphere('Eye white '+side,(x,2.08,.435),(.126,.151,.044),white,24,16))
        add('eye.'+side,api.sphere('Round black pupil '+side,(x,2.08,.471),(.103,.116,.022),black,24,16))
    add('head',api.sphere('Small round nose',(0,1.94,.482),(.038,.040,.019),dark,16,10))
    width={'lido':.24,'prena':.185,'oty':.158,'diva':.168,'sparko':.20}[name]
    # Scalloped white smiles echo each mascot's original artwork, not a generic
    # open-mouth emoji. Fine tooth divisions remain subtle at gameplay scale.
    w=width;y=1.77
    smile=bezier((-w,y),(-w*.8,y+.07),(-w*.46,y+.01),(0,y))
    smile+=bezier((0,y),(w*.5,y-.005),(w*.72,y+.09),(w,y))
    smile+=bezier((w,y),(w*1.08,y-.23),(-w*1.05,y-.23),(-w,y))
    add('mouth',patch('Scalloped smile',smile,head_center,head_radii,white))
    if name in ['lido','prena','sparko']:
        tooth=material('Subtle tooth line','e8e8e5')
        for x in [-w*.48,w*.12,w*.58]:
            add('mouth',patch('Tooth separation',[(x-.004,y-.009),(x+.004,y-.009),(x+.033,y-.135),(x+.025,y-.135)],head_center,head_radii,tooth,.014))
    # Each fringe is its own recognizable silhouette, projected onto the head.
    if name=='lido':
        fringe=[(-.40,2.31),(-.30,2.57),(-.12,2.69),(-.10,2.59),(.27,2.48),(.05,2.43),(-.03,2.39),(.06,2.55)]
    elif name=='oty':
        fringe=[(-.29,2.43),(-.20,2.64),(-.30,2.75),(-.08,2.62),(.18,2.61),(.07,2.55),(.27,2.43),(.27,2.25),(.12,2.34),(.04,2.18),(-.07,2.39)]
    elif name=='diva':
        fringe=[(-.47,2.47),(-.23,2.59),(-.29,2.75),(-.11,2.63),(.25,2.64),(.15,2.57),(.46,2.48),(.31,2.32),(.19,2.32)]
        fringe+=bezier((.19,2.32),(.16,2.53),(-.18,2.53),(-.20,2.32))+[(-.33,2.32)]
    elif name=='prena':
        fringe=[(-.39,2.47),(-.27,2.57),(-.16,2.60),(-.20,2.72),(-.04,2.64),(.04,2.72),(.04,2.63),(.26,2.54)]
        fringe+=bezier((.26,2.54),(.46,2.39),(.18,2.36),(.13,2.39))
        fringe+=bezier((.13,2.39),(.04,2.46),(.09,2.30),(0,2.30))
        fringe+=bezier((0,2.30),(-.11,2.26),(-.11,2.35),(-.12,2.38))
        fringe+=bezier((-.12,2.38),(-.25,2.47),(-.23,2.30),(-.39,2.47))
    else:
        fringe=[(-.46,2.44),(-.45,2.72),(-.23,2.60),(-.13,2.93),(.01,2.75),(.29,2.93),(.20,2.64),(.48,2.79),(.34,2.43)]
    # Outside the sphere, the tip remains sculptural with a shallow bevel.
    crest=patch('Signature sculpted forelock',fringe,head_center,head_radii,dark if name!='sparko' else palette['blue'],.025)
    solid=crest.modifiers.new('Sculpted fringe depth','SOLIDIFY');solid.thickness=.030
    bpy.context.view_layer.objects.active=crest;bpy.ops.object.modifier_apply(modifier=solid.name)
    add('head',crest)
    if name=='lido':
        bulb=material('Idea bulb','fff14a');bulb.node_tree.nodes.get('Principled BSDF').inputs['Emission Color'].default_value=(*linear('ffe449'),1);bulb.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=.25
        for sign in [-1,1]:
            x=sign*.63
            add('head',api.beam('Idea stalk',(sign*.47,2.40,-.025),(x,2.67,-.025),.042,black))
            add('head',api.sphere('Lightbulb glass',(x,2.81,-.025),(.145,.18,.11),bulb,24,16))
            add('head',api.sphere('Bulb neck',(x-sign*.018,2.665,-.025),(.075,.08,.072),bulb))
            for dx in [-.035,.035]:add('head',api.beam('Bulb filament',(x,2.72,.075),(x+dx,2.84,.077),.009,gold))
            for dx,dy in [(-.14,.18),(0,.24),(.14,.18)]:
                add('head',api.beam('Idea ray',(x+dx,2.84+dy,-.025),(x+dx*1.18,2.84+dy*1.18,-.025),.012,palette['yellow']))
    elif name=='oty':
        for sign in [-1,1]:add('head',api.star('Large yellow crown star',sign*.49,2.56,-.09,.27,palette['yellow']))
        for x,y,color in [(-.76,2.68,'blue'),(-.53,2.91,'green'),(.53,2.91,'coral'),(.78,2.68,'yellow')]:
            add('head',api.beam('Orange star stem',(x*.67,2.5,-.075),(x,y,-.075),.019,gold))
            add('head',api.star('Small '+color+' crown star',x,y,-.075,.115,palette[color]))
    elif name=='prena':
        for x,y,r,color in [(-.69,2.48,.16,'green'),(-.44,2.66,.23,'blue'),(.39,2.67,.23,'coral'),(.68,2.48,.16,'yellow')]:
            # One annular gear mesh, with a real open center and radial teeth.
            verts=[];n=64
            layer=-.09 if color in ['green','yellow'] else .025
            for z in [layer-.10,layer]:
                for ring in [0,1]:
                    for i in range(n):
                        angle=i*math.tau/n;rr=r*(.56 if ring else (1.14 if i%8 in (2,3,4,5) else .89))
                        verts.append(api.at((x+math.sin(angle)*rr,y+math.cos(angle)*rr,z)))
            faces=[]
            for i in range(n):
                j=(i+1)%n
                faces.extend([(i,j,n+j,n+i),(2*n+i,3*n+i,3*n+j,2*n+j),(i,2*n+i,2*n+j,j),(n+i,n+j,3*n+j,3*n+i)])
            mesh=bpy.data.meshes.new('Open radial gear');mesh.from_pydata(verts,[],faces);mesh.update()
            bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
            o=bpy.data.objects.new('Open '+color+' gear',mesh);bpy.context.collection.objects.link(o);api.finish(o,o.name,palette[color]);add('head',o)
    elif name=='diva':
        for x,y,angle,color in [(-.64,2.49,-.55,'blue'),(-.43,2.68,-.45,'green'),(.40,2.67,.65,'coral'),(.65,2.49,.70,'yellow')]:
            # Four sides, alternating protruding tabs and concave sockets.
            points=[];half=.17
            for side in range(4):
                for i in range(16):
                    u=-half+2*half*i/16
                    bulge=math.sqrt(max(0,.068**2-u*u)) if abs(u)<.068 else 0
                    v=half+bulge*(1 if side in (0,3) else -1)
                    a=-side*math.pi/2;xx=u*math.cos(a)-v*math.sin(a);yy=u*math.sin(a)+v*math.cos(a)
                    points.append((x+xx*math.cos(angle)-yy*math.sin(angle),y+xx*math.sin(angle)+yy*math.cos(angle)))
            o=api.polygon('Notched '+color+' puzzle piece',points,.10,palette[color],bevel=.006);o.location.y=.14 if color in ['blue','yellow'] else .015;add('head',o)
    else:
        add('body',api.text('LEAD hoodie','LEAD',(0,1.17,.27),.16,white))
        add('body',api.sphere('Hood',(0,1.49,-.08),(.40,.16,.28),dark))
        for x in [-.12,.12]:add('body',api.beam('Drawstring',(x,1.43,.22),(x,1.23,.29),.012,white))
    # Bone-local Y follows the length of a bone. All bones use vertical rest
    # axes so local-Y translations are world-up and local-Z raises an arm.
    bpy.ops.object.armature_add();rig=bpy.context.object;rig.name=name+'_Rig'
    bpy.ops.object.mode_set(mode='EDIT');bones=rig.data.edit_bones;bones.remove(bones[0])
    pivots={'root':(0,0,0),'body':(0,.72,0),'head':(0,1.48,0),'arm.L':(-.32,1.40,0),'arm.R':(.32,1.40,0),'leg.L':(-.22,.74,0),'leg.R':(.22,.74,0),'eye.L':(-.265,2.08,.435),'eye.R':(.265,2.08,.435),'mouth':(0,1.71,.45)}
    for key,pos in pivots.items():
        bone=bones.new(key);bone.head=api.at(pos);bone.tail=api.at((pos[0],pos[1]+.20,pos[2]))
    for key in pivots:
        if key!='root':bones[key].parent=bones['head' if key.startswith('eye') or key=='mouth' else 'body' if key in ['head','arm.L','arm.R'] else 'root']
    bpy.ops.object.mode_set(mode='OBJECT')
    def bind(o,weights):
        groups={key:o.vertex_groups.new(name=key) for key in weights}
        for index,values in enumerate(zip(*weights.values())):
            total=sum(values)
            for (key,_),value in zip(weights.items(),values):
                if value>0:groups[key].add([index],value/total,'REPLACE')
        modifier=o.modifiers.new('LEAD deform rig','ARMATURE');modifier.object=rig;o.parent=rig
    weights={key:[] for key in ['body','arm.L','arm.R','leg.L','leg.R']}
    for v in body.data.vertices:
        x,y,z=v.co.x,v.co.z,-v.co.y;side='L' if x<0 else 'R'
        # Diagonal shoulder seam follows the anatomy, not a vertical x stripe.
        # A stripe drags the waist into a raised arm and creates a sharp wing.
        seam=.32-.30*(y-1.20)
        blend=max(0,min(1,(abs(x)-seam)/.10))
        arm=blend*blend*(3-2*blend) if y>.74 else 0
        leg=max(0,min(1,(.84-y)/.28))*(1-arm)
        for key in weights:weights[key].append(arm if key=='arm.'+side else leg if key=='leg.'+side else 1-arm-leg if key=='body' else 0)
    bind(body,weights)
    for key,objects in parts.items():
        for o in objects:bind(o,{key:[1]*len(o.data.vertices)})
    rig['reference_design']=name.title()+' / supplied LEAD guidebook';rig['art_revision']=2
    rig.animation_data_create();scene=bpy.context.scene;scene.render.fps=24;scene.frame_start=1;scene.frame_end=49
    for anim in api.ANIMS:
        action=bpy.data.actions.new(anim);rig.animation_data.action=action
        for frame in sorted(set([1,7,13,19,25,31,37,43,49,21,22,23])):
            t=(frame-1)/48*math.tau;pose=rig.pose.bones
            for pb in pose:pb.rotation_mode='XYZ';pb.rotation_euler=(0,0,0);pb.location=(0,0,0);pb.scale=(1,1,1)
            pose['body'].scale.y=1+.009*math.sin(t);pose['head'].rotation_euler.z=.022*math.sin(t)
            for eye in ['eye.L','eye.R']:pose[eye].scale.y=.12 if frame==22 else 1
            if anim in ['Walk','Run']:
                speed=2 if anim=='Run' else 1;amp=.55 if anim=='Run' else .35
                for sign,side in [(-1,'L'),(1,'R')]:
                    pose['leg.'+side].rotation_euler.x=sign*math.sin(t*speed)*amp;pose['arm.'+side].rotation_euler.x=-sign*math.sin(t*speed)*amp*.65
                pose['root'].location.y=abs(math.sin(t*speed))*.045
            elif anim in ['Wave','Encourage','Celebrate']:
                pose['arm.R'].rotation_euler.z=1.85+.12*math.sin(t*2)
                if anim=='Encourage':pose['head'].rotation_euler.x=.08*math.sin(t)
                if anim=='Celebrate':pose['arm.L'].rotation_euler.z=-1.85+.12*math.sin(t*2);pose['root'].location.y=.13*abs(math.sin(t));pose['head'].rotation_euler.z=.09*math.sin(t)
            elif anim=='Explain':pose['arm.R'].rotation_euler.z=.85+.15*math.sin(t);pose['arm.L'].rotation_euler.x=-.35;pose['head'].rotation_euler.x=.05*math.sin(t*2)
            elif anim=='Point':pose['arm.R'].rotation_euler.z=1.25;pose['arm.R'].rotation_euler.x=-.35;pose['head'].rotation_euler.y=-.18
            elif anim=='Ask':pose['arm.L'].rotation_euler.z=-.65;pose['arm.R'].rotation_euler.z=.65;pose['head'].rotation_euler.z=.10
            elif anim=='Think':pose['arm.R'].rotation_euler.z=.85;pose['arm.R'].rotation_euler.x=-1.2;pose['head'].rotation_euler.z=.12
            elif anim=='GentleConcern':pose['head'].rotation_euler.x=.14;pose['head'].rotation_euler.z=-.12;pose['mouth'].scale.y=.65
            elif anim=='LookAtBoard':pose['head'].rotation_euler.x=.29
            elif anim=='LookAtPlayer':pose['head'].rotation_euler.y=.12*math.sin(t)
            elif anim in ['Serve','Interact']:
                pose['arm.R'].rotation_euler.x=-.9+.13*math.sin(t);pose['arm.L'].rotation_euler.x=-.9 if anim=='Serve' else -.15
            elif anim=='Sit':pose['leg.L'].rotation_euler.x=-1.35;pose['leg.R'].rotation_euler.x=-1.35;pose['root'].location.y=-.30
            if anim in ['Talk','Explain','Ask']:pose['mouth'].scale.y=.87+.18*math.sin(t*3);pose['head'].rotation_euler.x=.045*math.sin(t*2)
            # Preserve the visible applique above the curved head as it closes.
            pose['mouth'].location.z=.08*max(0,1-pose['mouth'].scale.y)
            for pb in pose:
                pb.keyframe_insert(data_path='rotation_euler',frame=frame);pb.keyframe_insert(data_path='location',frame=frame);pb.keyframe_insert(data_path='scale',frame=frame)
        action.use_fake_user=True
    rig.animation_data.action=None
    for pb in rig.pose.bones:pb.location=(0,0,0);pb.rotation_euler=(0,0,0);pb.scale=(1,1,1)
    scene.frame_set(1);api.export(name,True)
