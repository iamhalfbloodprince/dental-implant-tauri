"""Fix FDI naming using world-space bbox centers (handles parented GLTF hierarchy)."""
import bpy
import json
import mathutils
import os

EXPORT_PATH = "/Users/mac/Desktop/dental implant/public/models/dental-mouth-separated.glb"
result = {"fixes": []}


def world_bbox_center(obj):
    corners = [obj.matrix_world @ mathutils.Vector(c) for c in obj.bound_box]
    mn = mathutils.Vector((min(v[i] for v in corners) for i in range(3)))
    mx = mathutils.Vector((max(v[i] for v in corners) for i in range(3)))
    center = (mn + mx) / 2
    size = mx - mn
    return center, size, mn, mx


# Collect tooth meshes (separated from Object_6)
tooth_objs = []
for o in bpy.data.objects:
    if o.type != "MESH":
        continue
    if o.name in ("MOUTH_SOFT_TISSUE", "INNER_WET_TISSUE"):
        continue
    if o.name.startswith("FDI_") or o.name == "Object_6" or o.name.startswith("Object_6."):
        tooth_objs.append(o)

report = []
for obj in tooth_objs:
    c, size, mn, mx = world_bbox_center(obj)
    report.append({
        "object": obj.name,
        "world_center": [round(c.x, 5), round(c.y, 5), round(c.z, 5)],
        "world_size": [round(size.x, 5), round(size.y, 5), round(size.z, 5)],
        "vertices": len(obj.data.vertices),
        "arch": "upper" if c.y > -0.02 else "lower",
        "side": "right" if c.x < 0 else "left",
    })

# 7 teeth per quadrant (no wisdom): posterior -> anterior by Z descending
fdi_7 = {
    ("upper", "right"): [17, 16, 15, 14, 13, 12, 11],
    ("upper", "left"): [21, 22, 23, 24, 25, 26, 27],
    ("lower", "left"): [31, 32, 33, 34, 35, 36, 37],
    ("lower", "right"): [41, 42, 43, 44, 45, 46, 47],
}

assignments = []
manual = []
for arch in ("upper", "lower"):
    for side in ("right", "left"):
        group = [r for r in report if r["arch"] == arch and r["side"] == side]
        group.sort(
            key=lambda r: (
                -r["world_center"][2],
                r["world_center"][0] if side == "right" else -r["world_center"][0],
            )
        )
        fdis = fdi_7[(arch, side)]
        if len(group) != 7:
            manual.append({
                "quadrant": f"{arch}_{side}",
                "found": len(group),
                "expected": 7,
                "objects": [g["object"] for g in group],
            })
        types7 = ["molar", "molar", "premolar", "premolar", "canine", "lateral_incisor", "central_incisor"]
        for idx, r in enumerate(group):
            if idx < len(fdis):
                fdi = fdis[idx]
                r["assigned_fdi"] = fdi
                r["fdi_name"] = f"FDI_{fdi}"
                r["likely_type"] = types7[idx]
                assignments.append(r)
            else:
                manual.append({"object": r["object"], "note": "unassigned extra"})

# Rename
for a in assignments:
    obj = bpy.data.objects.get(a["object"])
    if obj:
        obj.name = a["fdi_name"]

# Anatomy renames (idempotent)
for old, new in {
    "Object_4": "MOUTH_SOFT_TISSUE",
    "Object_8": "INNER_WET_TISSUE",
}.items():
    o = bpy.data.objects.get(old)
    if o:
        o.name = new

for old, new in {
    "mouth": "mat_mouth_soft_tissue",
    "teeth": "mat_teeth_enamel",
    "material": "mat_inner_wet_tissue",
}.items():
    m = bpy.data.materials.get(old)
    if m:
        m.name = new

# Ensure all tooth meshes use enamel material
mat = bpy.data.materials.get("mat_teeth_enamel")
if mat:
    for a in assignments:
        obj = bpy.data.objects.get(a["fdi_name"])
        if obj and obj.data:
            if len(obj.data.materials) == 0:
                obj.data.materials.append(mat)
            else:
                for i in range(len(obj.data.materials)):
                    obj.data.materials[i] = mat

os.makedirs(os.path.dirname(EXPORT_PATH), exist_ok=True)
bpy.ops.object.select_all(action="DESELECT")
exported = []
for o in bpy.context.scene.objects:
    if o.type == "MESH":
        o.select_set(True)
        exported.append(o.name)

bpy.ops.export_scene.gltf(
    filepath=EXPORT_PATH,
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_materials="EXPORT",
)

result = {
    "tooth_count": len(tooth_objs),
    "assignments": assignments,
    "manual_confirmation_needed": manual,
    "excluded_wisdom_fdi": [18, 28, 38, 48],
    "export_path": EXPORT_PATH,
    "exported_mesh_objects": sorted(exported),
}
