/** Best-effort message from Tauri invoke failures (often plain strings or structured objects). */
export function formatInvokeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    if (typeof o.message === "string" && o.message) return o.message;
    if (typeof o.error === "string" && o.error) return o.error;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
}
