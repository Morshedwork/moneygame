"""Assemble the four modeled, animated LEAD characters into an editable studio.

Run after exporting the individual character .blend and .glb assets:
  node tools/blender/headless.mjs tools/blender/build_character_studio.py

Source characters are appended, never modified. The saved studio opens on the
front camera and retains each character's 18 separately named animation actions.
"""
import math
import os

import bpy
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
SOURCE = os.path.join(ROOT, "assets", "source", "blender")
OUTPUT = os.path.join(ROOT, "docs", "screenshots", "blender")
CHARACTERS = ("lido", "prena", "oty", "diva")
COLORS = {"lido": "f76665", "prena": "50a6dd", "oty": "ffd800", "diva": "6bbc3b"}
ANIMATIONS = (
    "Idle", "Walk", "Run", "Wave", "Talk", "Explain", "Point", "Think", "Ask",
    "Encourage", "Celebrate", "GentleConcern", "Sit", "Stand", "LookAtPlayer",
    "LookAtBoard", "Serve", "Interact",
)


def linear_color(hex_value):
    values = [int(hex_value[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4 for value in values)


def studio_material(name, color, roughness=.8):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*linear_color(color), 1)
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = material.diffuse_color
    shader.inputs["Roughness"].default_value = roughness
    return material


def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def move_to_collection(obj, collection):
    for previous in tuple(obj.users_collection):
        previous.objects.unlink(obj)
    collection.objects.link(obj)


def set_action(rig, action):
    rig.animation_data_create()
    rig.animation_data.action = action
    # Blender 4.4+ actions have slots. Retaining the original slot associates the
    # appended action with the correct rig without flattening or baking its keys.
    if hasattr(action, "slots") and len(action.slots):
        rig.animation_data.action_slot = action.slots[0]


def add_area(name, location, target, energy, size, collection):
    bpy.ops.object.light_add(type="AREA", location=location)
    lamp = bpy.context.object
    lamp.name = name
    lamp.data.energy = energy
    lamp.data.shape = "DISK"
    lamp.data.size = size
    point_at(lamp, target)
    move_to_collection(lamp, collection)
    return lamp


def create_studio():
    for name in CHARACTERS:
        path = os.path.join(SOURCE, name + ".blend")
        if not os.path.isfile(path):
            raise FileNotFoundError("Export the revised character first: " + path)
    os.makedirs(OUTPUT, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.name = "LEAD · Original characters in 3D"
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 960
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.film_transparent = False
    scene.render.fps = 24
    scene.frame_start = 1
    scene.frame_end = 49
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1
    scene.world = bpy.data.worlds.new("Neutral soft studio")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs[0].default_value = (.75, .75, .75, 1)
    scene.world.node_tree.nodes["Background"].inputs[1].default_value = .252

    stage = bpy.data.collections.new("Studio · plinths and labels")
    lights = bpy.data.collections.new("Studio · cameras and soft lighting")
    scene.collection.children.link(stage)
    scene.collection.children.link(lights)
    floor_material = studio_material("Studio warm white", "f4f3ef")
    plinth_material = studio_material("Plinth porcelain", "fffdf8")
    label_material = studio_material("Name lettering", "343640")
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.02))
    floor = bpy.context.object
    floor.name = "Seamless neutral floor"
    floor.data.materials.append(floor_material)
    move_to_collection(floor, stage)

    characters = []
    for index, name in enumerate(CHARACTERS):
        source_file = os.path.join(SOURCE, name + ".blend")
        collection = bpy.data.collections.new(f"{index + 1:02d} · {name.title()} · meshes and rig")
        scene.collection.children.link(collection)
        with bpy.data.libraries.load(source_file, link=False) as (available, appended):
            source_action_names = list(available.actions)
            appended.objects = available.objects
            # libraries.load replaces target list entries with loaded datablocks.
            # Keep a separate string list for stable source-to-action naming.
            appended.actions = list(source_action_names)
        objects = [obj for obj in appended.objects if obj and obj.type in {"ARMATURE", "MESH", "EMPTY"}]
        for obj in objects:
            collection.objects.link(obj)
        rigs = [obj for obj in objects if obj.type == "ARMATURE"]
        if len(rigs) != 1:
            raise AssertionError(f"{name}: expected one complete armature, found {len(rigs)}")
        rig = rigs[0]
        actions = {}
        for source_name, action in zip(source_action_names, appended.actions):
            if action is None:
                continue
            if source_name not in ANIMATIONS:
                raise AssertionError(f"{name}: unexpected source action {source_name}")
            action.name = f"{name}/{source_name}"
            action.use_fake_user = True
            actions[source_name] = action
        if set(actions) != set(ANIMATIONS):
            raise AssertionError(f"{name}: all 18 original animation actions must be preserved")
        set_action(rig, actions["Idle"])
        rig.show_in_front = True
        rig.data.display_type = "STICK"
        for obj in objects:
            if obj != rig:
                obj.name = f"{name}/{obj.name}"
        # Existing material node colors are the design authority. Mirror those
        # colors in Solid/Material viewport mode without changing shader values.
        for obj in objects:
            if obj.type != "MESH":
                continue
            for material in obj.data.materials:
                if material and material.use_nodes:
                    shader = material.node_tree.nodes.get("Principled BSDF")
                    if shader:
                        material.diffuse_color = shader.inputs["Base Color"].default_value

        anchor = bpy.data.objects.new(name.title() + " · studio position", None)
        anchor.empty_display_type = "PLAIN_AXES"
        anchor.empty_display_size = .12
        collection.objects.link(anchor)
        for obj in objects:
            if obj.parent not in objects:
                original_world = obj.matrix_world.copy()
                obj.parent = anchor
                obj.matrix_world = original_world
        scene.frame_set(1)
        bpy.context.view_layer.update()
        graph = bpy.context.evaluated_depsgraph_get()
        minimum_z = min(
            (obj.evaluated_get(graph).matrix_world @ Vector(corner)).z
            for obj in objects if obj.type == "MESH"
            for corner in obj.evaluated_get(graph).bound_box
        )
        x = (index - 1.5) * 2.35
        anchor.location = (x, 0, .23 - minimum_z)
        anchor["source_blend"] = os.path.relpath(source_file, ROOT).replace(os.sep, "/")
        anchor["animation_actions"] = ", ".join(f"{name}/{clip}" for clip in ANIMATIONS)
        characters.append((anchor, rig, actions))

        accent = studio_material(name.title() + " · plinth accent", COLORS[name])
        for label, radius, depth, z, material in (
            ("color rim", 1.04, .05, .025, accent),
            ("porcelain plinth", 1.025, .17, .13, plinth_material),
        ):
            bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=radius, depth=depth, location=(x, 0, z))
            plinth = bpy.context.object
            plinth.name = f"{name.title()} · {label}"
            plinth.data.materials.append(material)
            bevel = plinth.modifiers.new("Soft plinth edge", "BEVEL")
            bevel.width = .018
            bevel.segments = 3
            for polygon in plinth.data.polygons:
                polygon.use_smooth = True
            move_to_collection(plinth, stage)
        bpy.ops.object.text_add(location=(x, -1.05, .067), rotation=(math.pi / 2, 0, 0))
        label = bpy.context.object
        label.name = name.title() + " · name label"
        label.data.body = name.upper()
        label.data.align_x = "CENTER"
        label.data.size = .15
        label.data.space_character = 1.25
        label.data.extrude = .0008
        label.data.materials.append(label_material)
        move_to_collection(label, stage)

    # Keep Standard/sRGB color management below highlight clipping so the
    # supplied yellow and green palette does not become fluorescent in renders.
    add_area("Large soft key", (-5, -7, 8), (0, 0, 1.5), 660, 7, lights)
    add_area("Gentle neutral fill", (6, -4, 5.5), (0, 0, 1.5), 390, 6, lights)
    add_area("Soft crown rim", (0, 5, 7), (0, 0, 1.8), 600, 5, lights)
    bpy.ops.object.camera_add(location=(0, -17.5, 1.65))
    camera = bpy.context.object
    camera.name = "LEAD · level front comparison camera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 10.1
    camera.data.lens = 57
    camera.data.clip_end = 250
    point_at(camera, (0, 0, 1.65))
    move_to_collection(camera, lights)
    scene.camera = camera
    scene["character_studio"] = "Fully modeled, rigged characters; 18 actions per character. No character image planes."
    scene["animation_help"] = "Select a character rig, open Dope Sheet > Action Editor, and choose its character/Action name."
    for name, frame in (("Idle start", 1), ("Gesture midpoint", 13), ("Blink", 22), ("Loop end", 49)):
        scene.timeline_markers.new(name, frame=frame)
    bpy.ops.object.select_all(action="DESELECT")
    for _, rig, _ in characters:
        rig.select_set(True)
    bpy.context.view_layer.objects.active = characters[0][1]
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == "VIEW_3D":
                space = area.spaces.active
                # Material preview includes the modeled source-color vertex
                # attributes; Solid/Material mode would show those bodies white.
                space.shading.type = "MATERIAL"
                space.shading.use_scene_lights = True
                space.shading.use_scene_world = True
                space.overlay.show_overlays = False
                space.region_3d.view_perspective = "CAMERA"
                space.region_3d.view_camera_zoom = 0
                space.region_3d.view_camera_offset = (0, 0)
    scene.frame_set(1)
    # Stored relative to the saved studio, portable across checkouts.
    scene.render.filepath = "//" + os.path.relpath(os.path.join(OUTPUT, "characters-3d-front.png"), SOURCE).replace(os.sep, "/")
    studio_path = os.path.join(SOURCE, "LEAD-characters-3D.blend")
    bpy.ops.wm.save_as_mainfile(filepath=studio_path)
    print("LEAD_CHARACTER_STUDIO_SAVED", studio_path, flush=True)
    bpy.ops.render.render(write_still=True)
    for (anchor, _, _), degrees in zip(characters, (45, -45, 45, -45)):
        anchor.rotation_euler.z = math.radians(degrees)
    camera.data.type = "PERSP"
    camera.location = (2.8, -17.5, 4.2)
    point_at(camera, (0, 0, 1.65))
    scene.render.filepath = os.path.join(OUTPUT, "characters-3d-turnaround.png")
    bpy.ops.render.render(write_still=True)
    print("LEAD_CHARACTER_STUDIO_COMPLETE", flush=True)


if __name__ == "__main__":
    create_studio()
