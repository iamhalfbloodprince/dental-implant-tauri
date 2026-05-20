/** ISO 3950 (FDI) permanent dentition — ten’s digit = quadrant, one’s = tooth from midline. */

export const FDI_UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11] as const;
export const FDI_UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28] as const;
export const FDI_LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38] as const;
export const FDI_LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41] as const;

export function fdiArchLabel(n: number): "Upper" | "Lower" {
  const t = Math.floor(n / 10);
  if (t === 1 || t === 2) return "Upper";
  return "Lower";
}

/** UR / UL / LL / LR */
export function fdiQuadrantLabel(n: number): string {
  const t = Math.floor(n / 10);
  if (t === 1) return "UR";
  if (t === 2) return "UL";
  if (t === 3) return "LL";
  if (t === 4) return "LR";
  return "";
}

export function isValidFdiPermanent(n: number): boolean {
  if (n < 11 || n > 48) return false;
  const ones = n % 10;
  if (ones < 1 || ones > 8) return false;
  const t = Math.floor(n / 10);
  return t >= 1 && t <= 4;
}

/** Natural crown class from FDI ones digit (upper/lower similar proportions in this viewer). */
export type FdiMorphologyClass =
  | "central_incisor"
  | "lateral_incisor"
  | "canine"
  | "premolar"
  | "molar";

export function fdiMorphologyClass(n: number): FdiMorphologyClass {
  const o = n % 10;
  if (o === 1) return "central_incisor";
  if (o === 2) return "lateral_incisor";
  if (o === 3) return "canine";
  if (o === 4 || o === 5) return "premolar";
  return "molar";
}
