import {
  listLowerToothPositions,
  listUpperToothPositions,
  sampleLowerGumMargin,
  sampleUpperGumMargin,
  type Vec3Tuple,
} from "@/lib/fdiArchGeometry";
import type { FdiMorphologyClass } from "@/lib/fdi";
import { fdiMorphologyClass } from "@/lib/fdi";
import {
  Billboard,
  ContactShadows,
  Environment,
  OrbitControls,
  RoundedBox,
  Text,
  useGLTF,
} from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Canvas, type ThreeEvent, useThree } from "@react-three/fiber";
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ACESFilmicToneMapping,
  Box3,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Matrix4,
  type Mesh,
  type Material,
  PCFSoftShadowMap,
  type MeshPhysicalMaterial,
  type MeshStandardMaterial,
  type Object3D,
  Quaternion,
  SRGBColorSpace,
  TubeGeometry,
  Vector3,
} from "three";

/** Bundled teaching mesh — see `public/models/ATTRIBUTION.txt`. */
const REFERENCE_TOOTH_URL = "/models/tooth-reference.glb" as const;

/** 28 FDI-named teeth + anatomy from Blender auto-mapping. */
const SEPARATED_MOUTH_URL =
  "/models/dental-mouth-separated-final.glb" as const;

/** Teeth present in the separated GLB (no wisdom). */
const EXPECTED_SEPARATED_FDI = [
  17, 16, 15, 14, 13, 12, 11,
  21, 22, 23, 24, 25, 26, 27,
  37, 36, 35, 34, 33, 32, 31,
  41, 42, 43, 44, 45, 46, 47,
] as const;

/** ISO quadrant sequences (distal → mesial) for geometry remapping. */
const FDI_QUADRANT_UR = [17, 16, 15, 14, 13, 12, 11] as const;
const FDI_QUADRANT_UL = [21, 22, 23, 24, 25, 26, 27] as const;
const FDI_QUADRANT_LL = [31, 32, 33, 34, 35, 36, 37] as const;
const FDI_QUADRANT_LR = [47, 46, 45, 44, 43, 42, 41] as const;

type ToothMaterialState = "normal" | "hover" | "selected";

type SeparatedToothEntry = {
  mesh: Mesh;
  fdi: number;
  materials: Material[];
};

type ClinicalViewId =
  | "frontal"
  | "upper_occlusal"
  | "lower_occlusal"
  | "right_buccal"
  | "left_buccal"
  | "lingual";

const CLINICAL_VIEWS: Record<
  ClinicalViewId,
  { label: string; position: [number, number, number]; target: [number, number, number] }
> = {
  frontal: { label: "Frontal", position: [0, 0.15, 5.2], target: [0, 0, 0] },
  upper_occlusal: { label: "Upper occlusal", position: [0, 5.5, 0.2], target: [0, 0, 0] },
  lower_occlusal: { label: "Lower occlusal", position: [0, -5.5, 0.2], target: [0, 0, 0] },
  right_buccal: { label: "Right buccal", position: [-5.2, 0.1, 0.2], target: [0, 0, 0] },
  left_buccal: { label: "Left buccal", position: [5.2, 0.1, 0.2], target: [0, 0, 0] },
  lingual: { label: "Lingual", position: [0, 0.1, -5.2], target: [0, 0, 0] },
};

/** Blender tooth convention → arch-facing (+Z camera). Tweaked once per jaw. */
const REFERENCE_TOOTH_PRE_ROTATION_UPPER: [number, number, number] = [
  Math.PI / 2,
  0,
  0,
];
const REFERENCE_TOOTH_PRE_ROTATION_LOWER: [number, number, number] = [
  -Math.PI / 2,
  0,
  Math.PI,
];

useGLTF.preload(REFERENCE_TOOTH_URL);
useGLTF.preload(SEPARATED_MOUTH_URL);

export type ReferenceMeshDetail = "full" | "crown_focus";

type Props = {
  selectedFdis: number[];
  onToggle: (fdi: number) => void;
  className?: string;
  /** Procedural crowns (lighter). Default uses bundled reference GLB for realism. */
  proceduralTeeth?: boolean;
  /**
   * Reference GLB only. `crown_focus` hides pulp, neurovascular and PDL shells for a cleaner crown view.
   */
  referenceMeshDetail?: ReferenceMeshDetail;
  /** Load Blender-exported mouth with per-FDI meshes (default). */
  useSeparatedMouth?: boolean;
};

/** Material names on the reference GLB (Blender exporter). */
const REFERENCE_HIDDEN_IN_CROWN_FOCUS = new Set([
  "pulp",
  "nerve",
  "blue vessel",
  "red vessel",
  "bone",
  "ligament",
]);

function normalizedMaterialName(name: string | undefined): string {
  return (name ?? "").trim().toLowerCase();
}

function meshShouldRenderForDetail(
  materials: readonly Material[],
  detail: ReferenceMeshDetail,
): boolean {
  if (detail === "full") return true;
  if (materials.length === 0) return true;
  return materials.some(
    (m) =>
      !REFERENCE_HIDDEN_IN_CROWN_FOCUS.has(normalizedMaterialName(m.name)),
  );
}

function isPhysicalOrStandard(
  m: Material,
): m is MeshPhysicalMaterial | MeshStandardMaterial {
  return (
    "roughness" in m &&
    typeof (m as MeshStandardMaterial).roughness === "number"
  );
}

/** One-time PBR tweaks after clone — enamel reads more clinical under HDRI. */
function polishReferenceMaterial(m: Material): void {
  const name = normalizedMaterialName(m.name);
  if (!isPhysicalOrStandard(m)) return;

  if ("envMapIntensity" in m && typeof m.envMapIntensity === "number") {
    const mul =
      name === "enamel" ? 1.35 : name === "dentin" ? 1.12 : 1.06;
    m.envMapIntensity *= mul;
  }

  switch (name) {
    case "enamel":
      m.roughness = Math.max(0.06, m.roughness * 0.8);
      if (
        "clearcoat" in m &&
        typeof (m as MeshPhysicalMaterial).clearcoat === "number"
      ) {
        const mp = m as MeshPhysicalMaterial;
        mp.clearcoat = Math.min(1, mp.clearcoat + 0.22);
        if (typeof mp.clearcoatRoughness === "number") {
          mp.clearcoatRoughness = Math.max(
            0.05,
            mp.clearcoatRoughness * 0.72,
          );
        }
      }
      break;
    case "dentin":
      m.roughness = Math.max(0.12, m.roughness * 0.88);
      break;
    case "gum":
      m.roughness = Math.min(0.96, m.roughness + 0.05);
      break;
    default:
      break;
  }
}

function emergenceAdjustedPosition(
  position: readonly [number, number, number],
  arch: "upper" | "lower",
  indexAlongArch: number,
  archToothCount: number,
): [number, number, number] {
  const [x, y, z] = position;
  const u =
    archToothCount <= 1
      ? 0.5
      : Math.min(1, Math.max(0, indexAlongArch / (archToothCount - 1)));
  const posteriorLift = Math.sin(u * Math.PI) * 0.11;
  const vestibular = 0.075 + posteriorLift * 0.38;
  if (arch === "upper") {
    return [x, y - 0.058, z + vestibular];
  }
  return [x, y + 0.054, z + vestibular];
}

/** Ignore tiny movement so orbit-drag does not toggle a crown. */
const TOOTH_TAP_MOVE_PX = 14;

function parseFdiFromObjectName(name: string): number | null {
  if (!name.startsWith("FDI_")) return null;
  const n = parseInt(name.slice(4), 10);
  return Number.isFinite(n) ? n : null;
}

function fitSeparatedMouthScene(scene: Object3D) {
  const box = new Box3().setFromObject(scene);
  const size = new Vector3();
  const center = new Vector3();
  box.getSize(size);
  box.getCenter(center);
  const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
  const scale = 9.5 / maxDim;
  return {
    scale,
    position: [
      -center.x * scale,
      -center.y * scale - 0.15,
      -center.z * scale,
    ] as [number, number, number],
  };
}

type MeshCenter = { mesh: Mesh; x: number; y: number };

/** Split 28 crowns into upper/lower arches by world Y (Blender export labels are unreliable). */
function kMeansYTwoClusters(centers: MeshCenter[]): {
  upper: MeshCenter[];
  lower: MeshCenter[];
} {
  let c0 = -0.08;
  let c1 = 0.03;
  const items = [...centers];
  for (let iter = 0; iter < 24; iter++) {
    const g0: MeshCenter[] = [];
    const g1: MeshCenter[] = [];
    for (const t of items) {
      (Math.abs(t.y - c0) < Math.abs(t.y - c1) ? g0 : g1).push(t);
    }
    c0 = g0.reduce((s, t) => s + t.y, 0) / (g0.length || 1);
    c1 = g1.reduce((s, t) => s + t.y, 0) / (g1.length || 1);
  }
  const g0 = items.filter((t) => Math.abs(t.y - c0) < Math.abs(t.y - c1));
  const g1 = items.filter((t) => Math.abs(t.y - c0) >= Math.abs(t.y - c1));
  const mean = (arr: MeshCenter[]) =>
    arr.reduce((s, t) => s + t.y, 0) / (arr.length || 1);
  return mean(g1) > mean(g0)
    ? { upper: g1, lower: g0 }
    : { upper: g0, lower: g1 };
}

function assignQuadrantFdi(
  archTeeth: MeshCenter[],
  rightQuadrant: readonly number[],
  leftQuadrant: readonly number[],
): Map<Mesh, number> {
  const right = archTeeth.filter((t) => t.x < 0).sort((a, b) => a.x - b.x);
  const left = archTeeth.filter((t) => t.x >= 0).sort((a, b) => a.x - b.x);
  const out = new Map<Mesh, number>();
  right.forEach((t, i) => {
    const fdi = rightQuadrant[i];
    if (fdi !== undefined) out.set(t.mesh, fdi);
  });
  left.forEach((t, i) => {
    const fdi = leftQuadrant[i];
    if (fdi !== undefined) out.set(t.mesh, fdi);
  });
  return out;
}

/**
 * Blender auto-labels can invert arches; re-derive FDI from crown centroid layout.
 * Patient right = negative X, distal molars = largest |X| per quadrant.
 */
function remapFdiMeshesByGeometry(toothMeshes: Mesh[]): Map<Mesh, number> {
  const centers: MeshCenter[] = toothMeshes.map((mesh) => {
    const box = new Box3().setFromObject(mesh);
    const c = new Vector3();
    box.getCenter(c);
    return { mesh, x: c.x, y: c.y };
  });

  if (centers.length !== EXPECTED_SEPARATED_FDI.length) {
    const fallback = new Map<Mesh, number>();
    for (const mesh of toothMeshes) {
      const fdi = parseFdiFromObjectName(mesh.name);
      if (fdi !== null) fallback.set(mesh, fdi);
    }
    return fallback;
  }

  const { upper, lower } = kMeansYTwoClusters(centers);
  return new Map([
    ...assignQuadrantFdi(upper, FDI_QUADRANT_UR, FDI_QUADRANT_UL),
    ...assignQuadrantFdi(lower, FDI_QUADRANT_LR, FDI_QUADRANT_LL),
  ]);
}

function disableMeshRaycast(mesh: Mesh) {
  mesh.raycast = () => undefined;
}

/** Reparent crown to scene root so R3F click meshes share the same local space as the GLB root. */
function flattenToothToRoot(mesh: Mesh, root: Object3D) {
  mesh.updateWorldMatrix(true, true);
  root.updateWorldMatrix(true, true);
  const local = new Matrix4()
    .copy(root.matrixWorld)
    .invert()
    .multiply(mesh.matrixWorld);
  mesh.parent?.remove(mesh);
  root.add(mesh);
  const pos = new Vector3();
  const quat = new Quaternion();
  const scale = new Vector3();
  local.decompose(pos, quat, scale);
  mesh.position.copy(pos);
  mesh.quaternion.copy(quat);
  mesh.scale.copy(scale);
  mesh.updateMatrix();
}

function cloneMeshMaterials(mesh: Mesh): Material[] {
  const source = Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material];
  const cloned = source
    .filter((m): m is Material => Boolean(m))
    .map((m) => m.clone());
  mesh.material = cloned.length === 1 ? cloned[0] : cloned;
  return cloned;
}

function applyToothMaterialState(
  materials: readonly Material[],
  state: ToothMaterialState,
) {
  for (const m of materials) {
    if (!isMaterialWithEmissive(m)) continue;
    switch (state) {
      case "selected":
        m.emissive.set("#4a7ab8");
        m.emissiveIntensity = 0.2;
        break;
      case "hover":
        m.emissive.set("#9eb8dc");
        m.emissiveIntensity = 0.1;
        break;
      default:
        m.emissive.set("#000000");
        m.emissiveIntensity = 0;
        break;
    }
  }
}

function prepareSeparatedMouthRoot(scene: Object3D): {
  root: Object3D;
  toothEntries: SeparatedToothEntry[];
  anatomyNames: string[];
  remapLog: { from: string; to: number }[];
} {
  const root = scene.clone(true);
  const toothMeshes: Mesh[] = [];
  const anatomyNames: string[] = [];

  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    if (parseFdiFromObjectName(mesh.name) !== null) {
      toothMeshes.push(mesh);
      return;
    }
    disableMeshRaycast(mesh);
    if (mesh.name) anatomyNames.push(mesh.name);
  });

  const fdiMap = remapFdiMeshesByGeometry(toothMeshes);
  const remapLog: { from: string; to: number }[] = [];
  const toothEntries: SeparatedToothEntry[] = [];

  for (const mesh of toothMeshes) {
    const originalName = mesh.name;
    const fdi = fdiMap.get(mesh);
    if (fdi === undefined) continue;
    if (parseFdiFromObjectName(originalName) !== fdi) {
      remapLog.push({ from: originalName, to: fdi });
    }
    flattenToothToRoot(mesh, root);
    mesh.name = `FDI_${fdi}`;
    toothEntries.push({
      mesh,
      fdi,
      materials: cloneMeshMaterials(mesh),
    });
  }

  toothEntries.sort((a, b) => a.fdi - b.fdi);

  return { root, toothEntries, anatomyNames, remapLog };
}

function logSeparatedMouthValidation(
  toothEntries: SeparatedToothEntry[],
  anatomyNames: string[],
  remapLog: { from: string; to: number }[],
) {
  if (!import.meta.env.DEV) return;

  const found = toothEntries.map((t) => `FDI_${t.fdi}`).sort();
  const expected = EXPECTED_SEPARATED_FDI.map((n) => `FDI_${n}`);
  const missing = expected.filter((n) => !found.includes(n));
  const extra = found.filter((n) => !expected.includes(n));

  console.info("[DentalArch3D] Separated mouth GLB loaded", {
    totalMeshCount: toothEntries.length + anatomyNames.length,
    fdiMeshCount: found.length,
    fdiMeshNames: found,
    missingExpectedFdi: missing,
    extraFdiMeshes: extra,
    anatomyMeshes: anatomyNames.sort(),
    geometryRemapCorrections: remapLog.length > 0 ? remapLog : "none",
  });
}

function useToothTapHandlers(fdi: number, onToggle: (fdi: number) => void) {
  const downRef = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    downRef.current = {
      x: e.nativeEvent.clientX,
      y: e.nativeEvent.clientY,
    };
  }, []);

  const onPointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const start = downRef.current;
      downRef.current = null;
      if (!start) return;
      const dx = e.nativeEvent.clientX - start.x;
      const dy = e.nativeEvent.clientY - start.y;
      if (Math.hypot(dx, dy) > TOOTH_TAP_MOVE_PX) return;
      onToggle(fdi);
    },
    [fdi, onToggle],
  );

  const onPointerCancel = useCallback(() => {
    downRef.current = null;
  }, []);

  return { onPointerDown, onPointerUp, onPointerCancel };
}

function GumTube({
  points,
  tubeRadius,
  color,
  roughness,
}: {
  points: readonly Vec3Tuple[];
  tubeRadius: number;
  color: string;
  roughness: number;
}) {
  const geo = useMemo(() => {
    const curve = new CatmullRomCurve3(
      points.map(([x, y, z]) => new Vector3(x, y, z)),
    );
    return new TubeGeometry(
      curve,
      Math.min(160, Math.max(points.length * 3, 48)),
      tubeRadius,
      10,
      false,
    );
  }, [points, tubeRadius]);

  useEffect(() => () => geo.dispose(), [geo]);

  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshPhysicalMaterial
        color={color}
        roughness={roughness}
        metalness={0}
        clearcoat={0.08}
        clearcoatRoughness={0.78}
      />
    </mesh>
  );
}

function OralCavityShells() {
  const mucosa = {
    roughness: 0.82,
    metalness: 0,
    transmission: 0.08,
    thickness: 0.45,
    attenuationDistance: 0.8,
    attenuationColor: "#f0c4bd",
  };

  return (
    <group>
      {/* Hard palate / roof (patient head +Y) */}
      <mesh
        position={[0, 2.08, -2.62]}
        rotation={[1.05, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[5.6, 72]} />
        <meshPhysicalMaterial
          color="#d4a99b"
          roughness={0.92}
          metalness={0}
          side={DoubleSide}
          clearcoat={0.04}
        />
      </mesh>

      {/* Posterior pharyngeal wall feel */}
      <mesh position={[0, 0.15, -4.05]} receiveShadow>
        <planeGeometry args={[12.5, 9]} />
        <meshPhysicalMaterial
          color="#b07c72"
          roughness={0.95}
          metalness={0}
          side={DoubleSide}
        />
      </mesh>

      {/* Buccal mucosa – left */}
      <mesh position={[-5.55, -0.45, 0.15]} rotation={[0, 0.92, 0]} receiveShadow>
        <planeGeometry args={[7.8, 6.2]} />
        <meshPhysicalMaterial
          color="#ebbcb4"
          {...mucosa}
          roughness={0.78}
          side={DoubleSide}
        />
      </mesh>

      {/* Buccal mucosa – right */}
      <mesh position={[5.55, -0.45, 0.15]} rotation={[0, -0.92, 0]} receiveShadow>
        <planeGeometry args={[7.8, 6.2]} />
        <meshPhysicalMaterial
          color="#ebbcb4"
          {...mucosa}
          roughness={0.78}
          side={DoubleSide}
        />
      </mesh>

      {/* Floor of mouth */}
      <mesh
        position={[0, -2.58, -0.15]}
        rotation={[-1.12, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[5.95, 64]} />
        <meshPhysicalMaterial
          color="#c07a74"
          roughness={0.9}
          metalness={0}
          side={DoubleSide}
        />
      </mesh>

      {/* Tongue (stylised volume) */}
      <mesh
        position={[0, -1.92, 2.25]}
        rotation={[-0.18, 0, 0]}
        scale={[2.05, 0.72, 1.45]}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[1, 44, 36]} />
        <meshPhysicalMaterial
          color="#9c4d5c"
          roughness={0.48}
          metalness={0}
          clearcoat={0.22}
          clearcoatRoughness={0.55}
          sheen={0.35}
          sheenRoughness={0.45}
          sheenColor="#ffb4b8"
        />
      </mesh>
    </group>
  );
}

function useEnamelMaterial(selected: boolean, hovered: boolean) {
  return useMemo(
    () => ({
      color: selected ? "#bcd4f7" : hovered ? "#faf8f2" : "#fefdf7",
      roughness: selected ? 0.16 : hovered ? 0.17 : 0.2,
      metalness: 0.03,
      clearcoat: selected ? 0.95 : hovered ? 0.93 : 0.9,
      clearcoatRoughness: 0.12,
      emissive: selected ? "#2244aa" : hovered ? "#3355aa" : "#000000",
      emissiveIntensity: selected ? 0.22 : hovered ? 0.09 : 0,
      envMapIntensity: hovered ? 1.22 : 1.15,
    }),
    [selected, hovered],
  );
}

type ReferenceToothFit = {
  uniformScale: number;
  center: readonly [number, number, number];
};

function computeReferenceToothFit(scene: Object3D): ReferenceToothFit {
  const box = new Box3().setFromObject(scene);
  const size = new Vector3();
  const center = new Vector3();
  box.getSize(size);
  box.getCenter(center);
  /** Scene-space crown height target along arch (matches procedural crown scale). */
  const targetHeight = 0.74;
  const uniformScale = size.y > 1e-6 ? targetHeight / size.y : 0.12;
  return {
    uniformScale,
    center: [center.x, center.y, center.z],
  };
}

function morphologyScaleMultiplier(morph: FdiMorphologyClass): number {
  switch (morph) {
    case "central_incisor":
      return 1.06;
    case "lateral_incisor":
      return 0.96;
    case "canine":
      return 1.05;
    case "premolar":
      return 1.12;
    case "molar":
      return 1.2;
    default: {
      const _exhaustive: never = morph;
      throw new Error(`Unhandled morphology: ${_exhaustive}`);
    }
  }
}

function morphologyVisualRotation(
  morph: FdiMorphologyClass,
): [number, number, number] {
  switch (morph) {
    case "central_incisor":
      return [0, 0, 0];
    case "lateral_incisor":
      return [0, 0, 0.045];
    case "canine":
      return [0.065, 0, 0.055];
    case "premolar":
      return [0.035, 0, 0.015];
    case "molar":
      return [0.048, 0, -0.035];
    default: {
      const _exhaustive: never = morph;
      throw new Error(`Unhandled morphology: ${_exhaustive}`);
    }
  }
}

type MaterialWithEmissive = Material & {
  emissive: Color;
  emissiveIntensity: number;
};

function isMaterialWithEmissive(m: Material): m is MaterialWithEmissive {
  return (
    "emissive" in m &&
    m.emissive instanceof Color &&
    "emissiveIntensity" in m &&
    typeof (m as { emissiveIntensity: unknown }).emissiveIntensity === "number"
  );
}

function RealisticReferenceTooth({
  templateScene,
  fit,
  arch,
  fdi,
  position,
  rotation,
  selected,
  meshDetail,
  onToggle,
}: {
  templateScene: Object3D;
  fit: ReferenceToothFit;
  arch: "upper" | "lower";
  fdi: number;
  position: readonly [number, number, number];
  rotation: readonly [number, number, number];
  selected: boolean;
  meshDetail: ReferenceMeshDetail;
  onToggle: (fdi: number) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const morph = fdiMorphologyClass(fdi);
  const scaleMul = morphologyScaleMultiplier(morph);
  const outerScale = fit.uniformScale * scaleMul;
  const morphRot = morphologyVisualRotation(morph);
  const tap = useToothTapHandlers(fdi, onToggle);

  const root = useMemo(() => {
    const r = templateScene.clone(true);
    r.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const mats = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      const filtered = mats.filter(Boolean) as Material[];
      for (const m of filtered) {
        polishReferenceMaterial(m);
      }
    });
    return r;
  }, [templateScene]);

  useLayoutEffect(() => {
    root.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh || !mesh.material) return;

      const mats = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      const filtered = mats.filter(Boolean) as Material[];

      mesh.visible = meshShouldRenderForDetail(filtered, meshDetail);

      for (const m of filtered) {
        if (!isMaterialWithEmissive(m)) continue;
        if (selected) {
          m.emissive.set("#2244aa");
          m.emissiveIntensity = 0.32;
        } else if (hovered) {
          m.emissive.set("#c8dcf8");
          m.emissiveIntensity = 0.16;
        } else {
          m.emissive.set("#000000");
          m.emissiveIntensity = 0;
        }
      }
    });
  }, [root, meshDetail, selected, hovered]);

  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
    };
  }, []);

  const preRotation =
    arch === "upper"
      ? REFERENCE_TOOTH_PRE_ROTATION_UPPER
      : REFERENCE_TOOTH_PRE_ROTATION_LOWER;

  const [cx, cy, cz] = fit.center;

  return (
    <group
      position={position}
      rotation={rotation}
      {...tap}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = "";
      }}
    >
      <group rotation={preRotation} scale={outerScale}>
        <group rotation={morphRot}>
          <group position={[-cx, -cy, -cz]}>
            <primitive object={root} />
          </group>
        </group>
      </group>
      <Billboard position={[0, 0.62, 0.22]} follow>
        <Text
          raycast={() => null}
          fontSize={0.22}
          color={selected ? "#1e3a8a" : hovered ? "#334155" : "#1e293b"}
          outlineWidth={0.022}
          outlineColor="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {String(fdi)}
        </Text>
      </Billboard>
    </group>
  );
}

function MorphTooth({
  fdi,
  position,
  rotation,
  selected,
  onToggle,
}: {
  fdi: number;
  position: readonly [number, number, number];
  rotation: readonly [number, number, number];
  selected: boolean;
  onToggle: (fdi: number) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const morph = fdiMorphologyClass(fdi);
  const enamel = useEnamelMaterial(selected, hovered);
  const morphRot = morphologyVisualRotation(morph);
  const tap = useToothTapHandlers(fdi, onToggle);

  const rootMat = (
    <meshPhysicalMaterial
      color={hovered ? "#e8dfd4" : "#ded3c8"}
      roughness={hovered ? 0.54 : 0.58}
      metalness={0}
      clearcoat={0.28}
      clearcoatRoughness={0.48}
    />
  );

  let crown: ReactNode;
  switch (morph) {
    case "central_incisor":
      crown = (
        <RoundedBox args={[0.24, 0.62, 0.29]} radius={0.045} smoothness={4}>
          <meshPhysicalMaterial {...enamel} />
        </RoundedBox>
      );
      break;
    case "lateral_incisor":
      crown = (
        <RoundedBox args={[0.2, 0.58, 0.26]} radius={0.04} smoothness={4}>
          <meshPhysicalMaterial {...enamel} />
        </RoundedBox>
      );
      break;
    case "canine":
      crown = (
        <mesh rotation={[0.12, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.1, 0.16, 0.62, 10]} />
          <meshPhysicalMaterial {...enamel} />
        </mesh>
      );
      break;
    case "premolar":
      crown = (
        <RoundedBox args={[0.4, 0.46, 0.38]} radius={0.07} smoothness={4}>
          <meshPhysicalMaterial {...enamel} />
        </RoundedBox>
      );
      break;
    case "molar":
      crown = (
        <group>
          <RoundedBox args={[0.52, 0.4, 0.46]} radius={0.08} smoothness={4}>
            <meshPhysicalMaterial {...enamel} />
          </RoundedBox>
          {(
            [
              [0.15, 0.12, 0.12],
              [-0.15, 0.12, 0.12],
              [0.15, 0.12, -0.1],
              [-0.15, 0.12, -0.1],
            ] as const
          ).map((pos, i) => (
            <mesh key={i} position={pos} castShadow receiveShadow>
              <sphereGeometry args={[0.068, 10, 10]} />
              <meshPhysicalMaterial {...enamel} />
            </mesh>
          ))}
        </group>
      );
      break;
    default: {
      const _never: never = morph;
      throw new Error(`Unhandled morphology: ${_never}`);
    }
  }

  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
    };
  }, []);

  return (
    <group
      position={position}
      rotation={rotation}
      {...tap}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = "";
      }}
    >
      <group rotation={morphRot}>{crown}</group>
      <mesh position={[0, -0.32, 0.02]} castShadow receiveShadow>
        <cylinderGeometry args={[0.1, 0.15, 0.3, 10]} />
        {rootMat}
      </mesh>
      <Billboard position={[0, 0.52, 0.2]} follow>
        <Text
          raycast={() => null}
          fontSize={0.22}
          color={selected ? "#1e3a8a" : hovered ? "#334155" : "#1e293b"}
          outlineWidth={0.022}
          outlineColor="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {String(fdi)}
        </Text>
      </Billboard>
    </group>
  );
}

function FdiDebugLabels({
  toothEntries,
}: {
  toothEntries: SeparatedToothEntry[];
}) {
  const labelPos = useMemo(() => {
    const out: { fdi: number; position: [number, number, number] }[] = [];
    const v = new Vector3();
    for (const { mesh, fdi } of toothEntries) {
      mesh.getWorldPosition(v);
      out.push({ fdi, position: [v.x, v.y + 0.06, v.z] });
    }
    return out;
  }, [toothEntries]);

  return (
    <>
      {labelPos.map(({ fdi, position }) => (
        <Billboard key={fdi} position={position} follow>
          <Text
            raycast={() => null}
            fontSize={0.07}
            color="#1e3a8a"
            outlineWidth={0.012}
            outlineColor="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            {String(fdi)}
          </Text>
        </Billboard>
      ))}
    </>
  );
}

export type SeparatedMouthViewApi = {
  setClinicalView: (id: ClinicalViewId) => void;
};

function SeparatedToothMesh({
  entry,
  selected,
  hovered,
  onToggle,
  onHover,
}: {
  entry: SeparatedToothEntry;
  selected: boolean;
  hovered: boolean;
  onToggle: (fdi: number) => void;
  onHover: (fdi: number | null) => void;
}) {
  const { mesh, fdi, materials } = entry;
  const tap = useToothTapHandlers(fdi, onToggle);

  useLayoutEffect(() => {
    const state: ToothMaterialState = selected
      ? "selected"
      : hovered
        ? "hover"
        : "normal";
    applyToothMaterialState(materials, state);
  }, [materials, selected, hovered]);

  return (
    <mesh
      geometry={mesh.geometry}
      material={materials.length === 1 ? materials[0] : materials}
      position={mesh.position}
      quaternion={mesh.quaternion}
      scale={mesh.scale}
      castShadow
      receiveShadow
      onPointerDown={tap.onPointerDown}
      onPointerUp={tap.onPointerUp}
      onPointerCancel={tap.onPointerCancel}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(fdi);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onHover(null);
        document.body.style.cursor = "";
      }}
    />
  );
}

function SeparatedMouthScene({
  selected,
  onToggle,
  showFdiLabels,
  registerViewApi,
}: {
  selected: Set<number>;
  onToggle: (fdi: number) => void;
  showFdiLabels: boolean;
  registerViewApi: (api: SeparatedMouthViewApi) => void;
}) {
  const gltf = useGLTF(SEPARATED_MOUTH_URL);
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [hoveredFdi, setHoveredFdi] = useState<number | null>(null);

  const { root, fit, toothEntries, anatomyNames, remapLog } = useMemo(() => {
    const prepared = prepareSeparatedMouthRoot(gltf.scene);
    for (const { mesh } of prepared.toothEntries) {
      mesh.visible = false;
      disableMeshRaycast(mesh);
    }
    return {
      ...prepared,
      fit: fitSeparatedMouthScene(prepared.root),
    };
  }, [gltf.scene]);

  useEffect(() => {
    logSeparatedMouthValidation(toothEntries, anatomyNames, remapLog);
  }, [toothEntries, anatomyNames, remapLog]);

  const setClinicalView = useCallback(
    (id: ClinicalViewId) => {
      const view = CLINICAL_VIEWS[id];
      camera.position.set(...view.position);
      if (controlsRef.current) {
        controlsRef.current.target.set(...view.target);
        controlsRef.current.update();
      }
    },
    [camera],
  );

  useEffect(() => {
    registerViewApi({ setClinicalView });
  }, [registerViewApi, setClinicalView]);

  return (
    <>
      <color attach="background" args={["#ebe4df"]} />
      <fog attach="fog" args={["#ebe4df", 18, 52]} />

      <hemisphereLight color="#fde8e0" groundColor="#5c3e3a" intensity={0.55} />
      <ambientLight intensity={0.38} />
      <directionalLight
        castShadow
        position={[2, 4, 3]}
        intensity={1.6}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={20}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0002}
      />
      <directionalLight position={[-3, 2, -2]} intensity={0.45} />
      <Environment preset="studio" environmentIntensity={1.1} />

      <group scale={fit.scale} position={fit.position}>
        <primitive object={root} />
        {toothEntries.map((entry) => (
          <SeparatedToothMesh
            key={entry.fdi}
            entry={entry}
            selected={selected.has(entry.fdi)}
            hovered={hoveredFdi === entry.fdi}
            onToggle={onToggle}
            onHover={setHoveredFdi}
          />
        ))}
      </group>

      <ContactShadows
        position={[0, -2.2, 0]}
        opacity={0.35}
        scale={14}
        blur={2.8}
        far={6}
      />

      {showFdiLabels ? <FdiDebugLabels toothEntries={toothEntries} /> : null}

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={false}
        minPolarAngle={0.45}
        maxPolarAngle={Math.PI / 2 + 0.35}
        minDistance={4}
        maxDistance={14}
        target={[0, 0, 0]}
        rotateSpeed={0.78}
        dampingFactor={0.07}
        enableDamping
      />
    </>
  );
}

function Scene({
  selected,
  onToggle,
  proceduralTeeth,
  referenceMeshDetail,
}: {
  selected: Set<number>;
  onToggle: (fdi: number) => void;
  proceduralTeeth: boolean;
  referenceMeshDetail: ReferenceMeshDetail;
}) {
  const gltf = useGLTF(REFERENCE_TOOTH_URL);
  const referenceFit = useMemo(
    () => computeReferenceToothFit(gltf.scene),
    [gltf.scene],
  );

  const upperData = useMemo(() => listUpperToothPositions(), []);
  const lowerData = useMemo(() => listLowerToothPositions(), []);
  const upperGumPts = useMemo(() => sampleUpperGumMargin(52), []);
  const lowerGumPts = useMemo(() => sampleLowerGumMargin(52), []);
  const upperCount = upperData.length;
  const lowerCount = lowerData.length;

  function rotationForUpper([x]: readonly [number, number, number]): [
    number,
    number,
    number,
  ] {
    const yaw = Math.atan2(-x, 3.4) * 0.42;
    return [-0.38, yaw, 0.06];
  }

  function rotationForLower([x]: readonly [number, number, number]): [
    number,
    number,
    number,
  ] {
    const yaw = Math.atan2(-x, 3.4) * 0.42;
    return [0.38, yaw, -0.05];
  }

  return (
    <>
      <color attach="background" args={["#ebe4df"]} />
      <fog attach="fog" args={["#ebe4df", 18, 52]} />

      <hemisphereLight color="#fde8e0" groundColor="#5c3e3a" intensity={0.5} />
      <ambientLight intensity={0.34} />
      <directionalLight
        castShadow
        position={[5.8, 11, 8]}
        intensity={1.52}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={32}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-bias={-0.00019}
        shadow-normalBias={0.038}
      />
      <directionalLight position={[-7.5, 6.5, -4]} intensity={0.48} />
      <directionalLight position={[1.5, -3.5, 9]} intensity={0.32} />
      <spotLight
        position={[0, 9.5, 5]}
        angle={0.42}
        penumbra={0.92}
        intensity={0.58}
      />

      <Environment preset="studio" environmentIntensity={1.14} />

      <OralCavityShells />

      <GumTube
        points={upperGumPts}
        tubeRadius={0.175}
        color="#ae6860"
        roughness={0.89}
      />
      <GumTube
        points={lowerGumPts}
        tubeRadius={0.175}
        color="#ae6860"
        roughness={0.89}
      />
      <GumTube
        points={upperGumPts.map(([x, y, z]) => [x, y - 0.06, z] as Vec3Tuple)}
        tubeRadius={0.095}
        color="#864d49"
        roughness={0.94}
      />
      <GumTube
        points={lowerGumPts.map(([x, y, z]) => [x, y + 0.06, z] as Vec3Tuple)}
        tubeRadius={0.095}
        color="#864d49"
        roughness={0.94}
      />

      {upperData.map(({ fdi, position }, idx) => {
        const pos = emergenceAdjustedPosition(
          position as [number, number, number],
          "upper",
          idx,
          upperCount,
        );
        return proceduralTeeth ? (
          <MorphTooth
            key={fdi}
            fdi={fdi}
            position={pos}
            rotation={rotationForUpper(position)}
            selected={selected.has(fdi)}
            onToggle={onToggle}
          />
        ) : (
          <RealisticReferenceTooth
            key={fdi}
            templateScene={gltf.scene}
            fit={referenceFit}
            arch="upper"
            fdi={fdi}
            position={pos}
            rotation={rotationForUpper(position)}
            selected={selected.has(fdi)}
            meshDetail={referenceMeshDetail}
            onToggle={onToggle}
          />
        );
      })}
      {lowerData.map(({ fdi, position }, idx) => {
        const pos = emergenceAdjustedPosition(
          position as [number, number, number],
          "lower",
          idx,
          lowerCount,
        );
        return proceduralTeeth ? (
          <MorphTooth
            key={fdi}
            fdi={fdi}
            position={pos}
            rotation={rotationForLower(position)}
            selected={selected.has(fdi)}
            onToggle={onToggle}
          />
        ) : (
          <RealisticReferenceTooth
            key={fdi}
            templateScene={gltf.scene}
            fit={referenceFit}
            arch="lower"
            fdi={fdi}
            position={pos}
            rotation={rotationForLower(position)}
            selected={selected.has(fdi)}
            meshDetail={referenceMeshDetail}
            onToggle={onToggle}
          />
        );
      })}

      <ContactShadows
        position={[0, -2.72, 0.5]}
        opacity={0.33}
        scale={18}
        blur={3.1}
        far={8}
      />

      <OrbitControls
        makeDefault
        enablePan={false}
        minPolarAngle={0.55}
        maxPolarAngle={Math.PI / 2 + 0.45}
        minDistance={7}
        maxDistance={15}
        target={[0, -0.55, 0.9]}
        rotateSpeed={0.78}
        dampingFactor={0.07}
        enableDamping
      />
    </>
  );
}

/**
 * Stylised anatomical oral cavity + FDI crowns (reference-style, not patient scan).
 * For true scan fidelity, replace with GLB / DICOM-derived mesh workflow.
 */
export function DentalArch3D({
  selectedFdis,
  onToggle,
  className,
  proceduralTeeth = false,
  referenceMeshDetail = "crown_focus",
  useSeparatedMouth = true,
}: Props) {
  const sel = useMemo(
    () =>
      new Set(
        selectedFdis.filter((x) => Number.isFinite(x)).map((x) => Number(x)),
      ),
    [selectedFdis],
  );

  const toggleRef = useRef(onToggle);
  toggleRef.current = onToggle;

  const stableToggle = useMemo(
    () => (fdi: number) => toggleRef.current(fdi),
    [],
  );

  const viewApiRef = useRef<SeparatedMouthViewApi | null>(null);
  const registerViewApi = useCallback((api: SeparatedMouthViewApi) => {
    viewApiRef.current = api;
  }, []);
  const [showFdiLabels, setShowFdiLabels] = useState(false);

  return (
    <div className={className}>
      {useSeparatedMouth ? (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {(Object.keys(CLINICAL_VIEWS) as ClinicalViewId[]).map((id) => (
            <button
              key={id}
              type="button"
              className="rounded border border-[oklch(0.88_0.02_260)] bg-white px-2 py-0.5 text-[10px] font-medium text-[oklch(0.35_0.03_260)] hover:bg-[oklch(0.97_0.01_95)]"
              onClick={() => viewApiRef.current?.setClinicalView(id)}
            >
              {CLINICAL_VIEWS[id].label}
            </button>
          ))}
          {import.meta.env.DEV ? (
            <label className="ml-auto flex cursor-pointer items-center gap-1 text-[10px] text-[oklch(0.45_0.02_260)]">
              <input
                type="checkbox"
                checked={showFdiLabels}
                onChange={(e) => setShowFdiLabels(e.target.checked)}
                className="size-3"
              />
              Show FDI labels
            </label>
          ) : null}
        </div>
      ) : null}
      <div className="h-[min(380px,52vw)] w-full min-h-[280px] touch-none select-none overflow-hidden rounded-xl border border-[oklch(0.88_0.015_260)] bg-[linear-gradient(180deg,oklch(0.97_0.01_95)_0%,oklch(0.9_0.02_95)_100%)] shadow-inner">
        <Canvas
          shadows
          gl={{
            antialias: true,
            alpha: false,
            toneMapping: ACESFilmicToneMapping,
            toneMappingExposure: 1.06,
            outputColorSpace: SRGBColorSpace,
          }}
          onCreated={({ gl }) => {
            gl.shadowMap.enabled = true;
            gl.shadowMap.type = PCFSoftShadowMap;
          }}
          camera={{
            position: useSeparatedMouth ? [0, 0.15, 5.2] : [0, 0.85, 9.8],
            fov: useSeparatedMouth ? 38 : 36,
            near: 0.1,
            far: 65,
          }}
          dpr={[1, 2]}
        >
          <Suspense fallback={null}>
            {useSeparatedMouth ? (
              <SeparatedMouthScene
                selected={sel}
                onToggle={stableToggle}
                showFdiLabels={showFdiLabels}
                registerViewApi={registerViewApi}
              />
            ) : (
              <Scene
                selected={sel}
                onToggle={stableToggle}
                proceduralTeeth={proceduralTeeth}
                referenceMeshDetail={referenceMeshDetail}
              />
            )}
          </Suspense>
        </Canvas>
      </div>
      <p className="mt-1.5 text-center text-[10px] leading-snug text-[oklch(0.46_0.02_260)]">
        {useSeparatedMouth ? (
          <>
            Tap a tooth in 3D or use the keypad. 3D model includes 28 teeth. Wisdom
            teeth are not shown.
          </>
        ) : (
          <>
            <span className="font-medium">Rotate</span>: drag on palate/gums/tongue ·{" "}
            <span className="font-medium">Select tooth</span>: short tap on a crown (or use keypad).
          </>
        )}
      </p>
    </div>
  );
}
