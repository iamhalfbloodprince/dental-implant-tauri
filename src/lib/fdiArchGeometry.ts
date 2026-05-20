import {
  FDI_LOWER_LEFT,
  FDI_LOWER_RIGHT,
  FDI_UPPER_LEFT,
  FDI_UPPER_RIGHT,
} from "./fdi";

/** Matches SVG odontogram layout in `FdiMouthChart` (viewBox-relative control points). */
export const SVG_UPPER_ARCH = {
  x0: 28,
  y0: 108,
  x1: 210,
  y1: 34,
  x2: 392,
  y2: 108,
} as const;

export const SVG_LOWER_ARCH = {
  x0: 28,
  y0: 142,
  x1: 210,
  y1: 214,
  x2: 392,
  y2: 142,
} as const;

export function quadBezierPoint(
  t: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): { x: number; y: number } {
  const mt = 1 - t;
  return {
    x: mt * mt * x0 + 2 * mt * t * x1 + t * t * x2,
    y: mt * mt * y0 + 2 * mt * t * y1 + t * t * y2,
  };
}

export type Vec3Tuple = readonly [number, number, number];

/** Map SVG coordinates to Three.js scene units (patient facing camera from +Z). */
export function svgToWorldUpper(sx: number, sy: number): Vec3Tuple {
  const x = ((sx - 210) / 210) * 4.85;
  const z = ((124 - sy) / 86) * 2.52;
  const y = 1.22;
  return [x, y, z];
}

export function svgToWorldLower(sx: number, sy: number): Vec3Tuple {
  const x = ((sx - 210) / 210) * 4.85;
  const z = ((sy - 142) / 76) * 2.52;
  const y = -1.22;
  return [x, y, z];
}

export const UPPER_FDI_ORDER = [
  ...FDI_UPPER_RIGHT,
  ...FDI_UPPER_LEFT,
] as const;

export const LOWER_FDI_ORDER = [
  ...FDI_LOWER_RIGHT,
  ...FDI_LOWER_LEFT,
] as const;

export function listUpperToothPositions(): {
  fdi: number;
  position: Vec3Tuple;
}[] {
  const arc = SVG_UPPER_ARCH;
  const n = UPPER_FDI_ORDER.length;
  const out: { fdi: number; position: Vec3Tuple }[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const p = quadBezierPoint(
      t,
      arc.x0,
      arc.y0,
      arc.x1,
      arc.y1,
      arc.x2,
      arc.y2,
    );
    out.push({
      fdi: UPPER_FDI_ORDER[i],
      position: svgToWorldUpper(p.x, p.y),
    });
  }
  return out;
}

export function listLowerToothPositions(): {
  fdi: number;
  position: Vec3Tuple;
}[] {
  const arc = SVG_LOWER_ARCH;
  const n = LOWER_FDI_ORDER.length;
  const out: { fdi: number; position: Vec3Tuple }[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const p = quadBezierPoint(
      t,
      arc.x0,
      arc.y0,
      arc.x1,
      arc.y1,
      arc.x2,
      arc.y2,
    );
    out.push({
      fdi: LOWER_FDI_ORDER[i],
      position: svgToWorldLower(p.x, p.y),
    });
  }
  return out;
}

/** Points along gingival band for tubular gum mesh (upper). */
export function sampleUpperGumMargin(stepCount = 48): Vec3Tuple[] {
  const arc = SVG_UPPER_ARCH;
  const pts: Vec3Tuple[] = [];
  for (let i = 0; i <= stepCount; i++) {
    const t = i / stepCount;
    const p = quadBezierPoint(
      t,
      arc.x0,
      arc.y0,
      arc.x1,
      arc.y1,
      arc.x2,
      arc.y2,
    );
    const [x, y, z] = svgToWorldUpper(p.x, p.y);
    pts.push([x, y - 0.18, z]);
  }
  return pts;
}

/** Points along gingival band for tubular gum mesh (lower). */
export function sampleLowerGumMargin(stepCount = 48): Vec3Tuple[] {
  const arc = SVG_LOWER_ARCH;
  const pts: Vec3Tuple[] = [];
  for (let i = 0; i <= stepCount; i++) {
    const t = i / stepCount;
    const p = quadBezierPoint(
      t,
      arc.x0,
      arc.y0,
      arc.x1,
      arc.y1,
      arc.x2,
      arc.y2,
    );
    const [x, y, z] = svgToWorldLower(p.x, p.y);
    pts.push([x, y + 0.18, z]);
  }
  return pts;
}
