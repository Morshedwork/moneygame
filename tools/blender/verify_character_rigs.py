"""Validate final source rigs and modeled volumes without changing source files.

Run after the final four character exports:
  node tools/blender/headless.mjs tools/blender/verify_character_rigs.py
"""
import json
import os

import bpy
import bmesh
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
CHARACTERS = ("lido", "prena", "oty", "diva")
ANIMATIONS = (
    "Idle", "Walk", "Run", "Wave", "Talk", "Explain", "Point", "Think", "Ask",
    "Encourage", "Celebrate", "GentleConcern", "Sit", "Stand", "LookAtPlayer",
    "LookAtBoard", "Serve", "Interact",
)
FRAMES = (1, 13, 25, 37, 49)


def set_action(rig, action, frame):
    rig.animation_data_create()
    rig.animation_data.action = action
    if hasattr(action, "slots") and len(action.slots):
        rig.animation_data.action_slot = action.slots[0]
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()


def evaluated_points(obj, graph):
    evaluated = obj.evaluated_get(graph)
    mesh = evaluated.to_mesh()
    try:
        coordinates = np.empty(len(mesh.vertices) * 3, dtype=np.float64)
        mesh.vertices.foreach_get("co", coordinates)
        coordinates = coordinates.reshape((-1, 3))
        assert coordinates.size and np.isfinite(coordinates).all(), obj.name + ": finite mesh coordinates"
        matrix = np.asarray(evaluated.matrix_world, dtype=np.float64)
        world = coordinates @ matrix[:3, :3].T + matrix[:3, 3]
        assert np.isfinite(world).all(), obj.name + ": finite world coordinates"
        return world
    finally:
        evaluated.to_mesh_clear()


def scene_bounds(meshes, graph):
    low = np.full(3, np.inf)
    high = np.full(3, -np.inf)
    for obj in meshes:
        points = evaluated_points(obj, graph)
        low = np.minimum(low, points.min(axis=0))
        high = np.maximum(high, points.max(axis=0))
    return low, high


def topology(obj):
    mesh = bmesh.new()
    try:
        mesh.from_mesh(obj.data)
        return {
            "vertices": len(mesh.verts),
            "faces": len(mesh.faces),
            "boundary_edges": sum(edge.is_boundary for edge in mesh.edges),
            "non_manifold_edges": sum(not edge.is_manifold for edge in mesh.edges),
            "loose_vertices": sum(not vertex.link_faces for vertex in mesh.verts),
        }
    finally:
        mesh.free()


def check_weights(obj, rig):
    modifiers = [modifier for modifier in obj.modifiers if modifier.type == "ARMATURE" and modifier.object == rig]
    assert modifiers, obj.name + ": armature modifier references the character rig"
    deform_groups = {group.index for group in obj.vertex_groups if group.name in rig.data.bones}
    minimum = float("inf")
    maximum = 0.
    unbound = 0
    for vertex in obj.data.vertices:
        weights = [group.weight for group in vertex.groups if group.group in deform_groups]
        assert all(np.isfinite(weight) and weight >= 0 for weight in weights), obj.name + ": nonnegative finite weights"
        total = sum(weights)
        minimum = min(minimum, total)
        maximum = max(maximum, total)
        unbound += total <= .000001
        assert abs(total - 1) <= .0001, f"{obj.name}: vertex {vertex.index} skin weights sum to {total}"
    assert unbound == 0, obj.name + ": no unbound vertices"
    return {"unbound_vertices": unbound, "weight_min": round(minimum, 7), "weight_max": round(maximum, 7)}


def verify(name):
    source = os.path.join(ROOT, "assets", "source", "blender", name + ".blend")
    bpy.ops.wm.open_mainfile(filepath=source)
    scene = bpy.context.scene
    rigs = [obj for obj in scene.objects if obj.type == "ARMATURE"]
    assert len(rigs) == 1, name + ": one complete source rig"
    rig = rigs[0]
    meshes = [obj for obj in scene.objects if obj.type == "MESH"]
    assert meshes, name + ": source has modeled meshes"
    assert len(rig.data.bones) >= 10, name + ": complete skeleton"
    actions = {action.name: action for action in bpy.data.actions}
    assert set(actions) == set(ANIMATIONS), name + ": all 18 source actions preserved"
    weight_checks = {obj.name: check_weights(obj, rig) for obj in meshes}
    set_action(rig, actions["Idle"], 1)
    graph = bpy.context.evaluated_depsgraph_get()
    rest_low, rest_high = scene_bounds(meshes, graph)
    rest_dimensions = rest_high - rest_low
    rest_center = (rest_high + rest_low) * .5
    rest_diagonal = float(np.linalg.norm(rest_dimensions))
    report = {"character": name, "rig": rig.name, "bones": len(rig.data.bones), "meshes": len(meshes), "clips": len(actions), "frames_per_clip": list(FRAMES)}
    report["volumes"] = {}
    for label, prefix in (("body", "Continuous soft silhouette"), ("head", "Signature round head")):
        matches = [obj for obj in meshes if obj.name.startswith(prefix)]
        assert len(matches) == 1, f"{name}: one named {label} volume"
        obj = matches[0]
        mesh_topology = topology(obj)
        points = evaluated_points(obj, graph)
        dimensions = points.max(axis=0) - points.min(axis=0)
        # Blender sources are Z-up; forward/back thickness is the Y dimension.
        depth = float(dimensions[1])
        report["volumes"][label] = {**mesh_topology, **weight_checks[obj.name], "dimensions_xyz": [round(float(value), 5) for value in dimensions], "front_back_depth": round(depth, 5)}
        print(name, label, json.dumps(report["volumes"][label]), flush=True)
        assert mesh_topology["boundary_edges"] == 0, f"{name} {label}: closed front/back mesh, no boundary edges"
        assert mesh_topology["non_manifold_edges"] == 0, f"{name} {label}: manifold volume"
        assert mesh_topology["loose_vertices"] == 0, f"{name} {label}: no loose vertices"
        assert depth > .35, f"{name} {label}: actual front/back depth exceeds .35"
    maximum_dimensions = rest_dimensions.copy()
    maximum_center_offset = 0.
    for animation in ANIMATIONS:
        for frame in FRAMES:
            set_action(rig, actions[animation], frame)
            low, high = scene_bounds(meshes, bpy.context.evaluated_depsgraph_get())
            dimensions = high - low
            center_offset = float(np.linalg.norm((low + high) * .5 - rest_center))
            maximum_dimensions = np.maximum(maximum_dimensions, dimensions)
            maximum_center_offset = max(maximum_center_offset, center_offset)
            # Broad whole-character bounds permit normal waving, sitting and
            # forward-reaching gestures; they reject runaway deformations without
            # imposing arbitrary edge limits on thin modeled facial panels.
            assert float(dimensions.max()) <= rest_diagonal * 2.5, f"{name}/{animation}/{frame}: mesh deformation exceeds character bounds"
            assert center_offset <= rest_diagonal * 1.5, f"{name}/{animation}/{frame}: unexpected runaway translation"
    report["rest_dimensions_xyz"] = [round(float(value), 5) for value in rest_dimensions]
    report["maximum_animated_dimensions_xyz"] = [round(float(value), 5) for value in maximum_dimensions]
    report["maximum_center_offset"] = round(maximum_center_offset, 5)
    report["all_skinned_vertices_normalized"] = True
    report["finite_bounded_animation_samples"] = len(ANIMATIONS) * len(FRAMES)
    print("LEAD_RIG_VERIFIED", json.dumps(report), flush=True)


if __name__ == "__main__":
    for character in CHARACTERS:
        verify(character)
    print("LEAD_CHARACTER_RIGS_VALIDATED: four closed volumes, normalized skinning, 360 finite animation samples", flush=True)
