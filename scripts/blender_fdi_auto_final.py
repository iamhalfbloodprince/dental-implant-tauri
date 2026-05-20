"""
Best-effort automatic FDI mapping for 28-tooth mouth model.
Run inside Blender via MCP execute_code.
"""
import bpy
import json
import math
import mathutils
import os

EXPORT_PATH = os.environ.get(
    "DENTAL_EXPORT_FINAL",
    "/Users/mac/Desktop/dental implant/public/models/dental-mouth-separated-final.glb",
)

ANATOMY_NAMES = {
    "Object_4": "MOUTH_SOFT_TISSUE",
    "Object_8": "INNER_WET_TISSUE",
}
MAT_RENAMES = {
    "mouth": "mat_mouth_soft_tissue",
    "teeth": "mat_teeth_enamel",
    "material": "mat_inner_wet_tissue",
}

EXPECTED_FDI = [
    17, 16, 15, 14, 13, 12, 11,
    21, 22, 23, 24, 25, 26, 27,
    37, 36, 35, 34, 33, 32, 31,
    41, 42, 43, 44, 45, 46, 47,
]

QUADRANT_FDI = {
    "upper_right": [17, 16, 15, 14, 13, 12, 11],
    "upper_left": [21, 22, 23, 24, 25, 26, 27],
    "lower_left": [37, 36, 35, 34, 33, 32, 31],
    "lower_right": [41, 42, 43, 44, 45, 46, 47],
}


def world_bbox(obj):
    corners = [obj.matrix_world @ mathutils.Vector(c) for c in obj.bound_box]
    mn = mathutils.Vector((min(v[i] for v in corners) for i in range(3)))
    mx = mathutils.Vector((max(v[i] for v in corners) for i in range(3)))
    center = (mn + mx) / 2
    size = mx - mn
    return center, size, mn, mx


def is_tooth_candidate(obj):
    if obj.type != "MESH":
        return False
    n = obj.name
    if n in ("MOUTH_SOFT_TISSUE", "INNER_WET_TISSUE"):
        return False
    if n.startswith(
        ("GUMS", "TONGUE", "PALATE", "INNER_CHEEKS", "SOFT_TISSUE", "Light", "Camera")
    ):
        return False
    if n.startswith("FDI_") or n == "Object_6" or n.startswith("Object_6."):
        return True
    if n.startswith("TEMP_TOOTH_"):
        return True
    # Separated teeth often keep generic names
    if obj.data and len(obj.data.vertices) < 50:
        return False
    if obj.data and len(obj.data.vertices) > 15000:
        return False
    return n.startswith("Object_")


def collect_teeth():
    teeth = [o for o in bpy.data.objects if is_tooth_candidate(o)]
    # If we have too many, keep only tooth-sized meshes
    if len(teeth) > 32:
        teeth = [
            o
            for o in teeth
            if o.name.startswith(("FDI_", "Object_6", "TEMP_TOOTH_"))
        ]
    return teeth


def split_upper_lower(teeth, target_upper=14):
    """Pick axis split (Y or Z) giving closest to 14/14."""
    best = None
    centers = [world_bbox(t)[0] for t in teeth]
    for axis in (1, 2, 0):  # Y, Z, X
        vals = sorted((c[axis], i) for i, c in enumerate(centers))
        for split_idx in range(len(vals) - 1):
            thresh = (vals[split_idx][0] + vals[split_idx + 1][0]) / 2
            upper = [teeth[i] for i, c in enumerate(centers) if c[axis] >= thresh]
            lower = [teeth[i] for i, c in enumerate(centers) if c[axis] < thresh]
            score = abs(len(upper) - target_upper) + abs(len(lower) - target_upper)
            if best is None or score < best[0]:
                best = (score, upper, lower, axis, thresh)
    # Also try: sort by Y descending, top 14 = upper (common for this model)
    sorted_by_y = sorted(
        teeth, key=lambda t: world_bbox(t)[0].y, reverse=True
    )
    upper_y = sorted_by_y[:target_upper]
    lower_y = sorted_by_y[target_upper:]
    score_y = abs(len(upper_y) - target_upper) + abs(len(lower_y) - target_upper)
    if best is None or score_y <= best[0]:
        return upper_y, lower_y, "Y_top14"
    return best[1], best[2], f"axis_{best[3]}"


def sort_quadrant(group, quadrant_key):
    """Return objects sorted in assignment order for quadrant_key."""
    items = [(t, world_bbox(t)[0]) for t in group]

    if quadrant_key == "upper_right":
        # posterior (17) -> anterior (11): distal on -X first
        items.sort(key=lambda it: (it[1].x, -it[1].z))
    elif quadrant_key == "upper_left":
        # anterior (21) -> posterior (27): midline toward +X
        items.sort(key=lambda it: (it[1].x, it[1].z))
    elif quadrant_key == "lower_left":
        # posterior (37) -> anterior (31): +X distal first
        items.sort(key=lambda it: (-it[1].x, -it[1].z))
    elif quadrant_key == "lower_right":
        # anterior (41) -> posterior (47): toward -X distal
        items.sort(key=lambda it: (-it[1].x, it[1].z))
    else:
        items.sort(key=lambda it: (it[1].x, it[1].y, it[1].z))
    return [it[0] for it in items]


def split_left_right(arch_teeth):
    """Patient right = negative X in this GLTF orientation."""
    right = [t for t in arch_teeth if world_bbox(t)[0].x < 0]
    left = [t for t in arch_teeth if world_bbox(t)[0].x >= 0]
    # If uneven, assign by distance to median X
    if len(right) != 7 or len(left) != 7:
        med_x = sorted(world_bbox(t)[0].x for t in arch_teeth)[len(arch_teeth) // 2]
        right = [t for t in arch_teeth if world_bbox(t)[0].x < med_x]
        left = [t for t in arch_teeth if world_bbox(t)[0].x >= med_x]
        # Balance to 7/7 by moving borderline teeth
        while len(right) > 7:
            t = max(right, key=lambda o: world_bbox(o)[0].x)
            right.remove(t)
            left.append(t)
        while len(left) > 7:
            t = min(left, key=lambda o: world_bbox(o)[0].x)
            left.remove(t)
            right.append(t)
        while len(right) < 7 and left:
            t = max(left, key=lambda o: -world_bbox(o)[0].x)
            left.remove(t)
            right.append(t)
        while len(left) < 7 and right:
            t = min(right, key=lambda o: world_bbox(o)[0].x)
            right.remove(t)
            left.append(t)
    return right, left


# --- Main pipeline ---
report = {"mapping": [], "validation": {}, "split_method": None}

teeth = collect_teeth()
if len(teeth) != 28:
  # try only Object_6* and FDI*
  teeth = [
      o
      for o in bpy.data.objects
      if o.type == "MESH"
      and (
          o.name == "Object_6"
          or o.name.startswith("Object_6.")
          or o.name.startswith("FDI_")
          or o.name.startswith("TEMP_TOOTH_")
      )
  ]

# Step 1: temp rename to avoid .001 collisions
for i, obj in enumerate(sorted(teeth, key=lambda o: o.name)):
    obj.name = f"TEMP_TOOTH_{i+1:02d}"

teeth = collect_teeth()
assert len(teeth) == 28, f"Expected 28 teeth, found {len(teeth)}"

upper, lower, split_method = split_upper_lower(teeth, 14)
report["split_method"] = split_method
report["upper_count"] = len(upper)
report["lower_count"] = len(lower)

# If not 14/14, force by Y sort
if len(upper) != 14 or len(lower) != 14:
    sorted_by_y = sorted(teeth, key=lambda t: world_bbox(t)[0].y, reverse=True)
    upper = sorted_by_y[:14]
    lower = sorted_by_y[14:]
    report["split_method"] = "Y_top14_forced"

ur, ul = split_left_right(upper)
lr, ll = split_left_right(lower)

quadrants = {
    "upper_right": sort_quadrant(ur, "upper_right"),
    "upper_left": sort_quadrant(ul, "upper_left"),
    "lower_left": sort_quadrant(ll, "lower_left"),
    "lower_right": sort_quadrant(lr, "lower_right"),
}

assignments = []
for qkey, fdis in QUADRANT_FDI.items():
    objs = quadrants[qkey]
    for obj, fdi in zip(objs, fdis):
        old = obj.name
        new = f"FDI_{fdi}"
        obj.name = new
        c, size, _, _ = world_bbox(obj)
        assignments.append({
            "fdi_name": new,
            "old_name": old,
            "world_center": [round(c.x, 5), round(c.y, 5), round(c.z, 5)],
            "size": [round(size.x, 5), round(size.y, 5), round(size.z, 5)],
            "vertices": len(obj.data.vertices),
            "quadrant": qkey,
            "fdi": fdi,
        })

report["mapping"] = assignments

# Anatomy + materials
for old, new in ANATOMY_NAMES.items():
    o = bpy.data.objects.get(old)
    if o:
        o.name = new
for o in bpy.data.objects:
    if o.type == "MESH" and o.name in ("mouth", "wet_2"):
        pass
for old, new in MAT_RENAMES.items():
    m = bpy.data.materials.get(old)
    if m:
        m.name = new

mat_enamel = bpy.data.materials.get("mat_teeth_enamel")
if mat_enamel:
    for a in assignments:
        obj = bpy.data.objects.get(a["fdi_name"])
        if obj and obj.data:
            if len(obj.data.materials) == 0:
                obj.data.materials.append(mat_enamel)
            else:
                for i in range(len(obj.data.materials)):
                    obj.data.materials[i] = mat_enamel

# Validation
fdi_objs = sorted(
    [o.name for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("FDI_")]
)
expected_names = [f"FDI_{n}" for n in EXPECTED_FDI]
missing = [n for n in expected_names if n not in fdi_objs]
dupes = [n for n in fdi_objs if fdi_objs.count(n) > 1]
bad_suffix = [n for n in fdi_objs if "." in n]
obj6_left = [
    o.name
    for o in bpy.data.objects
    if o.type == "MESH" and (o.name.startswith("Object_6") or o.name.startswith("TEMP_TOOTH_"))
]
anatomy = [
    o.name
    for o in bpy.data.objects
    if o.type == "MESH"
    and not o.name.startswith("FDI_")
    and o.name not in ("Light", "Camera")
]

report["validation"] = {
    "total_mesh_objects": len([o for o in bpy.data.objects if o.type == "MESH"]),
    "fdi_count": len(fdi_objs),
    "fdi_names": fdi_objs,
    "missing": missing,
    "duplicates": list(set(d for d in dupes)),
    "bad_suffix": bad_suffix,
    "object6_remaining": obj6_left,
    "anatomy_meshes": anatomy,
    "pass": (
        len(fdi_objs) == 28
        and not missing
        and not dupes
        and not bad_suffix
        and not obj6_left
    ),
}

os.makedirs(os.path.dirname(EXPORT_PATH), exist_ok=True)
bpy.ops.object.select_all(action="DESELECT")
for o in bpy.data.objects:
    if o.type == "MESH":
        o.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=EXPORT_PATH,
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_materials="EXPORT",
)
report["export_path"] = EXPORT_PATH
