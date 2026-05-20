/** Replace {{var_name}} placeholders (PRD letter templates). */
export function mergeLetterPlaceholders(
  template: string,
  vars: Record<string, string>,
): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\{\\{\\s*${escaped}\\s*\\}\\}`, "g");
    out = out.replace(re, value);
  }
  return out;
}
