import math
import bpy

def animate_rig(api,rig):
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
    scene.frame_set(1)
