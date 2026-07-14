// Per-user light/dark preference. 'system' follows the device (no class,
// so the prefers-color-scheme media query decides); 'light'/'dark' force the
// appearance via a class on <html> that overrides the media query.
export const MODES = ["system", "light", "dark"] as const;
export type ColorMode = (typeof MODES)[number];

export function normalizeMode(v: string | null | undefined): ColorMode {
  return v === "light" || v === "dark" ? v : "system";
}

// The <html> class for a mode ("" for 'system', which follows the device).
export function modeClass(mode: string | null | undefined): string {
  const m = normalizeMode(mode);
  return m === "light" ? "mode-light" : m === "dark" ? "mode-dark" : "";
}
