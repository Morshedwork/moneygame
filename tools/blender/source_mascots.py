"""Volumetric, skinned meshes measured from the supplied character artwork.

The source silhouette and colored panels determine the front design. Thickness,
rounded sides and a closed back make a real mesh; no image planes are exported.
"""
import math
import bpy
import bmesh
import numpy as np
from reference_pixels import load_art

COLORS={'lido':'f76665','prena':'50a6dd','oty':'ffd800','diva':'6bbc3b'}
ACCENTS={'lido':'c12525','prena':'035393','oty':'ef9b0f','diva':'459122'}

def linear_rgb(rgb):
    value=np.asarray(rgb,dtype=np.float64)/255
    return np.where(value<=.04045,value/12.92,((value+.055)/1.055)**2.4)

def arm_weights_from_outline(art,shoulder_y):
    """Separate the mittens from the torso using the actual source arm gaps.

    An x-only threshold incorrectly catches the original wide right hip when
    waving. Row segments keep the sweeping torso entirely on the body bone.
    """
    first=int(art['cy']+art['width']*.39)
    last=int(art['floor']-.70/art['factor'])
    center=int(art['cx']);rows={};first_split={}
    for y in range(first,last+1):
        line=art['mask'][y]
        changes=np.diff(np.pad(line.astype(np.int8),(1,1)))
        runs=list(zip(np.flatnonzero(changes==1),np.flatnonzero(changes==-1)-1))
        main=next(((a,b) for a,b in runs if a<=center<=b),None)
        if main is None:continue
        segments={}
        for side in ('L','R'):
            candidates=[(a,b) for a,b in runs if b-a>4 and (b<main[0] if side=='L' else a>main[1])]
            if candidates:
                a,b=max(candidates,key=lambda pair:pair[1]-pair[0]);segments[side]=(a,b)
                first_split.setdefault(side,(y,b if side=='L' else a))
        rows[y]=segments
    top=art['floor']-shoulder_y/art['factor']
    def weight(x,y,side):
        px=x/art['factor']+art['cx'];py=art['floor']-y/art['factor']
        if py<first or py>last or side not in first_split:return 0.
        split,seam_end=first_split[side]
        if py>=split:
            segment=rows.get(int(round(py)),{}).get(side)
            return 1. if segment and segment[0]-2<=px<=segment[1]+2 else 0.
        shoulder_x=art['cx']+(-.40 if side=='L' else .40)/art['factor']
        t=max(0,min(1,(py-top)/max(1,split-top)))
        seam=shoulder_x+(seam_end-shoulder_x)*t
        distance=(seam-px) if side=='L' else (px-seam)
        blend=max(0,min(1,(distance+6)/20))
        return blend*blend*(3-2*blend)
    return weight

def sculpt_body(api,name,art,material):
    rgb=art['rgb'];factor=art['factor'];step=3
    first=int(art['cy']+art['width']*.39)
    ys=np.arange(first,art['floor']+step,step).clip(max=rgb.shape[0]-1)
    xs=np.arange(0,rgb.shape[1],step)
    pixels=rgb[np.ix_(ys,xs)]
    mask=(pixels.min(axis=2)<245)&(ys[:,None]<=art['floor'])
    # A chamfer distance gives round cross-sections in the torso, palms and
    # flared feet, without altering their source outline in front projection.
    distance=np.where(mask,10000.,0.)
    for _ in range(150):
        padded=np.pad(distance,1,constant_values=0)
        neighbors=[padded[1+dy:1+dy+mask.shape[0],1+dx:1+dx+mask.shape[1]]+math.hypot(dx,dy)
                   for dy,dx in [(-1,0),(1,0),(0,-1),(0,1),(-1,-1),(-1,1),(1,-1),(1,1)]]
        new=np.minimum(distance,np.minimum.reduce(neighbors))
        if np.array_equal(new,distance):break
        distance=new
    # Torso and feet are full volumes. Small hands smoothly taper to the edge.
    depth=.29*np.sqrt(1-np.exp(-np.maximum(distance-.5,0)/8))
    # Diffuse small distance-grid ridges while keeping the exterior at zero.
    for _ in range(12):
        padded=np.pad(depth,1)
        averaged=(padded[1:-1,:-2]+padded[1:-1,2:]+padded[:-2,1:-1]+padded[2:,1:-1]+depth*4)/8
        depth=np.where(mask,averaged,0)
    rows,cols=np.nonzero(mask);count=len(rows)
    ids=np.full(mask.shape,-1,dtype=np.int32);ids[rows,cols]=np.arange(count)
    verts=[];vertex_colors=[]
    base=linear_rgb([int(COLORS[name][i:i+2],16) for i in (0,2,4)])
    allowed=[COLORS[name],ACCENTS[name],{'lido':'d25249','prena':'499bc6','oty':'ffba00','diva':'82ce51'}[name]]
    palette=np.array([[int(c[i:i+2],16) for i in (0,2,4)] for c in allowed])
    colors=pixels[rows,cols].astype(float)
    nearest=((colors[:,None,:]-palette[None,:,:])**2).sum(axis=2).argmin(axis=1)
    source_colors=linear_rgb(palette[nearest])
    for side in (1,-1):
        for i,(r,c) in enumerate(zip(rows,cols)):
            px,py=xs[c],ys[r]
            verts.append(api.at(((px-art['cx'])*factor,(art['floor']-py)*factor,side*float(depth[r,c]))))
            vertex_colors.append((*source_colors[i],1) if side==1 else (*base,1))
    faces=[];edges={}
    for r,c in zip(*np.nonzero(mask[:-1,:-1]&mask[1:,:-1]&mask[:-1,1:]&mask[1:,1:])):
        quad=tuple(int(ids[rr,cc]) for rr,cc in [(r,c),(r+1,c),(r+1,c+1),(r,c+1)])
        faces.append(quad);faces.append(tuple(i+count for i in reversed(quad)))
        for a,b in zip(quad,quad[1:]+quad[:1]):
            key=tuple(sorted((a,b)))
            edges[key]=None if key in edges else (a,b)
    for edge in edges.values():
        if edge:
            a,b=edge;faces.append((b,a,a+count,b+count))
    # Smooth the actual perimeter loop, rather than leaving tiny grid-aligned
    # ridges around a curved arm or foot when the character is turned sideways.
    neighbors={}
    for edge in edges.values():
        if edge:
            a,b=edge;neighbors.setdefault(a,[]).append(b);neighbors.setdefault(b,[]).append(a)
    positions=np.asarray(verts,dtype=np.float64)
    for _ in range(5):
        updated=positions.copy()
        for index,adjacent in neighbors.items():
            if len(adjacent)==2:
                updated[index]=positions[index]*.5+(positions[adjacent[0]]+positions[adjacent[1]])*.25
                updated[index+count]=updated[index]*np.array([1.,-1.,1.])
        positions=updated
    verts=positions.tolist()
    mesh=bpy.data.meshes.new('Source silhouette with rounded front and back')
    mesh.from_pydata(verts,[],faces);mesh.update()
    # Remove grid samples which did not belong to a complete surface quad.
    colors=mesh.color_attributes.new(name='Original body colors',type='FLOAT_COLOR',domain='POINT')
    colors.data.foreach_set('color',np.asarray(vertex_colors,dtype=np.float32).ravel())
    bm=bmesh.new();bm.from_mesh(mesh)
    loose=[v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm,geom=loose,context='VERTS')
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
    body=bpy.data.objects.new('Continuous soft silhouette',mesh);bpy.context.collection.objects.link(body)
    m=material('Original body panel colors','ffffff')
    color=m.node_tree.nodes.new('ShaderNodeVertexColor');color.layer_name='Original body colors'
    m.node_tree.links.new(color.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    api.finish(body,body.name,m)
    for poly in mesh.polygons:poly.use_smooth=True
    # Rounded grid-edge bevels remain tiny relative to the measured silhouette.
    bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body
    smooth=body.modifiers.new('Smooth rounded contour','SMOOTH');smooth.factor=.35;smooth.iterations=2
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    body['source_image']=art['filename'];body['construction']='Closed inflated source silhouette; original colored panels as vertex colors'
    return body

def build_source_mascot(api,name):
    from reference_face import build_face
    api.clear();art=load_art(api,name)
    def material(label,color):
        m=api.mat(label,linear_rgb([int(color[i:i+2],16) for i in (0,2,4)]))
        shader=m.node_tree.nodes.get('Principled BSDF');shader.inputs['Roughness'].default_value=.82
        shader.inputs['Specular IOR Level'].default_value=.12
        return m
    body=sculpt_body(api,name,art,material)
    parts=build_face(api,name,art,material)
    head_y=(art['floor']-art['cy'])*art['factor']
    shoulder_y=head_y-art.get('ry',.65)
    body_height=shoulder_y/1.48
    body_width=1.32
    pivots={'root':(0,0,0),'body':(0,.72*body_height,0),'head':(0,shoulder_y,0),
            'arm.L':(-.32*body_width,1.40*body_height,0),'arm.R':(.32*body_width,1.40*body_height,0),
            'leg.L':(-.22*body_width,.74*body_height,0),'leg.R':(.22*body_width,.74*body_height,0),
            'eye.L':(-.355,head_y+.08,.435),'eye.R':(.355,head_y+.08,.435),'mouth':(0,head_y-.29,.45)}
    pivots.update(art.get('face_pivots',{}))
    bpy.ops.object.armature_add();rig=bpy.context.object;rig.name=name+'_Rig'
    bpy.ops.object.mode_set(mode='EDIT');bones=rig.data.edit_bones;bones.remove(bones[0])
    for key,pos in pivots.items():
        bone=bones.new(key);bone.head=api.at(pos);bone.tail=api.at((pos[0],pos[1]+.20,pos[2]))
    for key in pivots:
        if key!='root':bones[key].parent=bones['head' if key.startswith('eye') or key=='mouth' else 'body' if key in ['head','arm.L','arm.R'] else 'root']
    bpy.ops.object.mode_set(mode='OBJECT')
    def bind(obj,weights):
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
        groups={key:obj.vertex_groups.new(name=key) for key in weights}
        for index,values in enumerate(zip(*weights.values())):
            total=sum(values)
            for key,value in zip(weights,values):
                if value>0:groups[key].add([index],value/total,'REPLACE')
        modifier=obj.modifiers.new('LEAD deform rig','ARMATURE');modifier.object=rig;obj.parent=rig
    weights={key:[] for key in ['body','arm.L','arm.R','leg.L','leg.R']}
    source_arm_weight=arm_weights_from_outline(art,shoulder_y)
    for vertex in body.data.vertices:
        x,y=vertex.co.x/body_width,vertex.co.z/body_height;side='L' if x<0 else 'R'
        arm=source_arm_weight(vertex.co.x,vertex.co.z,side)
        leg=max(0,min(1,(.48-y)/.23))*(1-arm)
        for key in weights:weights[key].append(arm if key=='arm.'+side else leg if key=='leg.'+side else 1-arm-leg if key=='body' else 0)
    bind(body,weights)
    for key,objects in parts.items():
        for obj in objects:bind(obj,{key:[1]*len(obj.data.vertices)})
    rig.scale=(.84,)*3
    rig['reference_design']=art['filename'];rig['art_revision']=4
    rig['geometry']='Closed volumetric source silhouette, ellipsoid head, modeled original facial details and crowns; no image planes'
    from reference_actions import animate_rig
    animate_rig(api,rig)
    api.export(name,True)
