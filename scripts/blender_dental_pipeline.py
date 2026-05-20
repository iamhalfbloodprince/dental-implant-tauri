"""Run inside Blender via MCP execute_code — dental mouth separation pipeline."""
import bpy
import json
import mathutils
import os

result = {"steps": []}

EXPORT_PATH = os.environ.get(
    "DENTAL_EXPORT_PATH",
    "/Users/mac/Desktop/dental implant/public/models/dental-mouth-separated.glb",
)


def classify_and_assign(separated):
    report = []
    for obj in separated:
        c = obj.matrix_world.translation
        sx, sy, sz = obj.dimensions
        arch = "upper" if c.y > -0.02 else "lower"
        side = "right" if c.x < 0 else "left"
        report.append({
            "temp_name": obj.name,
            "world_center": [round(c.x, 5), round(c.y, 5), round(c.z, 5)],
            "approx_size": [round(sx, 5), round(sy, 5), round(sz, 5)],
            "max_dim": round(max(sx, sy, sz), 5),
            "vertices": len(obj.data.vertices),
            "arch": arch,
            "side": side,
        })

    for arch in ("upper", "lower"):
        for side in ("right", "left"):
            group = [r for r in report if r["arch"] == arch and r["side"] == side]
            group.sort(
                key=lambda r: (
                    -r["world_center"][2],
                    r["world_center"][0] if side == "right" else -r["world_center"][0],
                )
            )
            types8 = [
                "molar",
                "molar",
                "molar",
                "premolar",
                "premolar",
                "canine",
                "lateral_incisor",
                "central_incisor",
            ]
            for idx, r in enumerate(group):
                r["order_in_quadrant"] = idx + 1
                r["likely_type"] = types8[idx] if idx < len(types8) else "unknown"

    fdi_map = {
        ("upper", "right"): [18, 17, 16, 15, 14, 13, 12, 11],
        ("upper", "left"): [21, 22, 23, 24, 25, 26, 27, 28],
        ("lower", "left"): [38, 37, 36, 35, 34, 33, 32, 31],
        ("lower", "right"): [48, 47, 46, 45, 44, 43, 42, 41],
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
            fdis = fdi_map[(arch, side)]
            if len(group) != 8:
                manual.append({
                    "quadrant": f"{arch}_{side}",
                    "found": len(group),
                    "expected": 8,
                })
            for idx, r in enumerate(group):
                if idx < len(fdis):
                    fdi = fdis[idx]
                    assignments.append({
                        "temp_name": r["temp_name"],
                        "fdi": fdi,
                        "fdi_name": f"FDI_{fdi}",
                        "arch": arch,
                        "side": side,
                        "likely_type": r.get("likely_type"),
                        "world_center": r["world_center"],
                    })
                else:
                    manual.append({"temp_name": r["temp_name"], "note": "extra island"})

    return report, assignments, manual


teeth_obj = bpy.data.objects.get("Object_6")
if not teeth_obj or teeth_obj.type != "MESH":
    result["error"] = "Object_6 missing"
else:
    bpy.ops.object.select_all(action="DESELECT")
    teeth_obj.select_set(True)
    bpy.context.view_layer.objects.active = teeth_obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.separate(type="LOOSE")
    bpy.ops.object.mode_set(mode="OBJECT")

    separated = [o for o in bpy.context.selected_objects if o.type == "MESH"]
    result["steps"].append({
        "step": 2,
        "separated_count": len(separated),
        "names": [o.name for o in separated],
    })

    report, assignments, manual = classify_and_assign(separated)
    result["steps"].append({"step": 3, "tooth_report": report})
    result["fdi_assignments"] = assignments
    result["manual_confirmation_needed"] = manual
    result["missing_wisdom_teeth"] = [18, 28, 38, 48]
    result["total_separated_teeth"] = len(report)

    renamed = []
    for a in assignments:
        obj = bpy.data.objects.get(a["temp_name"])
        if obj:
            obj.name = a["fdi_name"]
            renamed.append(a["fdi_name"])
    result["steps"].append({"step": 3, "renamed_fdi": renamed})

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

os.makedirs(os.path.dirname(EXPORT_PATH), exist_ok=True)
bpy.ops.object.select_all(action="DESELECT")
exported = []
for o in bpy.context.scene.objects:
    if o.type == "MESH":
        o.select_set(True)
        exported.append(o.name)

try:
    bpy.ops.export_scene.gltf(
        filepath=EXPORT_PATH,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_materials="EXPORT",
    )
    result["steps"].append({
        "step": 6,
        "export_path": EXPORT_PATH,
        "exported_objects": exported,
        "success": True,
    })
except Exception as ex:
    result["steps"].append({"step": 6, "success": False, "error": str(ex)})

result["final_mesh_objects"] = sorted(
    [o.name for o in bpy.context.scene.objects if o.type == "MESH"]
)
