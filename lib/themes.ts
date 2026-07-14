import type { MsgKey } from "@/lib/i18n";

// Per-user colour schemes. Each theme overrides the accent (--gold) and a
// subtle background tint; the neutral surfaces + ink stay from the base, so
// readability is preserved in both light and dark. `accent` is the light-mode
// accent, used only for the picker swatch. 'default' is the base scheme (no
// class). Keys map to the `.theme-<key>` blocks in globals.css.
export type ThemeDef = { key: string; label: MsgKey; accent: string };

export const THEMES: ThemeDef[] = [
  { key: "default", label: "theme.default", accent: "#c99a3f" },
  { key: "coral", label: "theme.coral", accent: "#db6b4d" },
  { key: "cherry", label: "theme.cherry", accent: "#cf4a52" },
  { key: "rose", label: "theme.rose", accent: "#c8497f" },
  { key: "magenta", label: "theme.magenta", accent: "#a94aa6" },
  { key: "plum", label: "theme.plum", accent: "#8a63c9" },
  { key: "indigo", label: "theme.indigo", accent: "#5a63c9" },
  { key: "ocean", label: "theme.ocean", accent: "#2b7fb8" },
  { key: "teal", label: "theme.teal", accent: "#1f9e97" },
  { key: "forest", label: "theme.forest", accent: "#3f8f5b" },
  { key: "lime", label: "theme.lime", accent: "#6f9b1f" },
  { key: "slate", label: "theme.slate", accent: "#607089" },
];

export const THEME_KEYS = new Set(THEMES.map((t) => t.key));

export function normalizeTheme(v: string | null | undefined): string {
  return v && THEME_KEYS.has(v) ? v : "default";
}

// The <html> class for a theme ("" for the base scheme).
export function themeClass(theme: string | null | undefined): string {
  const key = normalizeTheme(theme);
  return key === "default" ? "" : "theme-" + key;
}
