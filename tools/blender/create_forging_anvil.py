from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
REFERENCE = ROOT / "assets" / "design-references" / "forge" / "anvil-2_5d-reference.png"
OUTPUT_DIR = ROOT / "assets" / "models" / "forge"
BLEND_PATH = OUTPUT_DIR / "forging-anvil-2_5d.blend"
GLB_PATH = OUTPUT_DIR / "forging-anvil-2_5d.glb"
PREVIEW_PATH = OUTPUT_DIR / "forging-anvil-2_5d-preview.png"


def material(name, color, metallic=0.0, roughness=0.5, emission=None):
    value = bpy.data.materials.new(name)
    value.diffuse_color = (*color, 1.0)
    value.use_nodes = True
    shader = value.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if emission:
        shader.inputs["Emission Color"].default_value = (*emission, 1.0)
        shader.inputs["Emission Strength"].default_value = 3.0
    return value


def bevelled_cube(name, location, scale, mat, bevel=0.08, parent=None):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    modifier = obj.modifiers.new("Soft bevel", "BEVEL")
    modifier.width = bevel
    modifier.segments = 3
    modifier.limit_method = "ANGLE"
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.data.materials.append(mat)
    obj.parent = parent
    return obj


def tapered_block(name, vertices, faces, mat, parent=None, bevel=0.05):
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    obj.parent = parent
    modifier = obj.modifiers.new("Edge bevel", "BEVEL")
    modifier.width = bevel
    modifier.segments = 3
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    return obj


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

steel = material("Forged Steel", (0.095, 0.105, 0.115), metallic=0.9, roughness=0.3)
face_steel = material("Polished Strike Face", (0.24, 0.26, 0.28), metallic=0.94, roughness=0.2)
brass = material("Aged Brass", (0.42, 0.24, 0.075), metallic=0.8, roughness=0.32)
ember = material(
    "Ember Seam",
    (0.58, 0.075, 0.008),
    metallic=0.15,
    roughness=0.27,
    emission=(1.0, 0.14, 0.01),
)

root = bpy.data.objects.new("Anvil_Root", None)
root.empty_display_type = "PLAIN_AXES"
root.empty_display_size = 0.4
bpy.context.collection.objects.link(root)

# Four broad feet and a stable base, kept as separate parts for easy editing.
bevelled_cube("Base_Core", (0.0, 0.0, 0.18), (1.42, 0.86, 0.18), steel, 0.09, root)
for name, x, y in (
    ("Foot_FL", -1.28, -0.76),
    ("Foot_FR", 1.28, -0.76),
    ("Foot_BL", -1.28, 0.76),
    ("Foot_BR", 1.28, 0.76),
):
    bevelled_cube(name, (x, y, 0.13), (0.34, 0.28, 0.13), brass, 0.07, root)

# Waist is narrower in the center and widens toward the top.
waist_vertices = [
    (-0.78, -0.54, 0.34), (0.78, -0.54, 0.34), (0.78, 0.54, 0.34), (-0.78, 0.54, 0.34),
    (-1.04, -0.62, 1.28), (1.04, -0.62, 1.28), (1.04, 0.62, 1.28), (-1.04, 0.62, 1.28),
]
box_faces = [
    (0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1),
    (1, 5, 6, 2), (2, 6, 7, 3), (4, 0, 3, 7),
]
tapered_block("Waist", waist_vertices, box_faces, steel, root, 0.09)

bevelled_cube("Top_Block", (-0.18, 0.0, 1.48), (1.55, 0.72, 0.28), steel, 0.11, root)
bevelled_cube("Strike_Face", (-0.28, 0.0, 1.80), (1.46, 0.68, 0.08), face_steel, 0.035, root)

# A tapered horn on the right; its broad base transitions into a readable tip.
horn_vertices = [
    (1.18, -0.62, 1.30), (1.18, 0.62, 1.30), (2.58, -0.13, 1.50), (2.58, 0.13, 1.50),
    (1.18, -0.62, 1.78), (1.18, 0.62, 1.78), (2.58, -0.07, 1.60), (2.58, 0.07, 1.60),
]
horn_faces = [
    (0, 2, 3, 1), (4, 5, 7, 6), (0, 4, 6, 2),
    (1, 3, 7, 5), (0, 1, 5, 4), (2, 6, 7, 3),
]
tapered_block("Horn", horn_vertices, horn_faces, steel, root, 0.06)

# Brass corner braces and ember seams echo the hammer without obscuring the silhouette.
for x in (-1.53, 1.03):
    bevelled_cube(f"Top_Brass_{x:+.2f}", (x, 0.0, 1.50), (0.10, 0.76, 0.30), brass, 0.04, root)
bevelled_cube("Ember_Seam_Left", (-0.88, 0.0, 1.17), (0.055, 0.59, 0.40), ember, 0.02, root)
bevelled_cube("Ember_Seam_Right", (0.70, 0.0, 1.17), (0.055, 0.59, 0.40), ember, 0.02, root)

# A dark inset approximates the hardy hole while keeping the mesh game-friendly.
hole_mat = material("Hardy Hole", (0.008, 0.01, 0.014), metallic=0.2, roughness=0.8)
bevelled_cube("Hardy_Hole_Inset", (-1.08, -0.20, 1.895), (0.17, 0.17, 0.018), hole_mat, 0.015, root)

strike_target = bpy.data.objects.new("Strike_Target", None)
strike_target.empty_display_type = "SPHERE"
strike_target.empty_display_size = 0.16
strike_target.location = (-0.15, 0.0, 1.92)
strike_target.parent = root
strike_target["animation_note"] = "Align the hammer impact face to this target."
bpy.context.collection.objects.link(strike_target)

if REFERENCE.exists():
    image = bpy.data.images.load(str(REFERENCE), check_existing=True)
    reference = bpy.data.objects.new("REFERENCE_Anvil_Concept", None)
    reference.empty_display_type = "IMAGE"
    reference.data = image
    reference.empty_display_size = 4.5
    reference.color[3] = 0.38
    reference.location = (0.0, 0.9, 1.0)
    reference.rotation_euler = (1.57079632679, 0.0, 0.0)
    reference.hide_render = True
    bpy.context.collection.objects.link(reference)
    reference.hide_set(True)

bpy.ops.object.light_add(type="AREA", location=(-4.2, -4.5, 6.0))
key = bpy.context.object
key.name = "Key_Light"
key.data.energy = 1000
key.data.shape = "DISK"
key.data.size = 4.2
look_at(key, (0.2, 0.0, 0.9))

bpy.ops.object.light_add(type="AREA", location=(4.0, 1.8, 3.4))
fill = bpy.context.object
fill.name = "Fill_Light"
fill.data.energy = 500
fill.data.color = (0.34, 0.52, 1.0)
fill.data.size = 3.0
look_at(fill, (0.2, 0.0, 1.0))

bpy.ops.object.camera_add(location=(5.7, -8.7, 4.8))
camera = bpy.context.object
camera.name = "Camera_2_5D"
camera.data.type = "ORTHO"
camera.data.ortho_scale = 5.8
look_at(camera, (0.35, 0.0, 0.95))
bpy.context.scene.camera = camera

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1536
scene.render.resolution_y = 1024
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(PREVIEW_PATH)
scene.render.film_transparent = True
scene.world.color = (0.025, 0.03, 0.04)

bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

bpy.ops.object.select_all(action="DESELECT")
root.select_set(True)
for child in root.children_recursive:
    child.select_set(True)
bpy.context.view_layer.objects.active = root
bpy.ops.export_scene.gltf(
    filepath=str(GLB_PATH),
    export_format="GLB",
    use_selection=True,
    export_animations=False,
)
bpy.ops.render.render(write_still=True)
print(f"BLEND={BLEND_PATH}")
print(f"GLB={GLB_PATH}")
print(f"PREVIEW={PREVIEW_PATH}")
