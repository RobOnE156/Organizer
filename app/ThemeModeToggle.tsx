"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateColorMode } from "@/app/content-actions";
import { useT } from "@/app/LanguageProvider";
import { MODES, normalizeMode, type ColorMode } from "@/lib/mode";
import type { MsgKey } from "@/lib/i18n";

const ICON: Record<ColorMode, string> = { system: "🌗", light: "☀️", dark: "🌙" };

// Reflect the choice on <html> immediately so the switch feels instant; the
// server action + router.refresh then persist it and reconcile the shell.
function applyModeClass(mode: ColorMode) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  el.classList.remove("mode-light", "mode-dark");
  if (mode === "light") el.classList.add("mode-light");
  else if (mode === "dark") el.classList.add("mode-dark");
}

function readModeFromDom(): ColorMode {
  if (typeof document === "undefined") return "system";
  const el = document.documentElement;
  return el.classList.contains("mode-dark") ? "dark" : el.classList.contains("mode-light") ? "light" : "system";
}

export default function ThemeModeToggle({
  initialMode,
  variant = "compact",
}: {
  initialMode?: string;
  variant?: "compact" | "full";
}) {
  const { t } = useT();
  const router = useRouter();
  const [mode, setMode] = useState<ColorMode>(normalizeMode(initialMode));
  const [busy, setBusy] = useState(false);

  // The compact toggle can appear without an explicit initial value; sync it to
  // whatever class the server rendered onto <html>.
  useEffect(() => {
    if (initialMode === undefined) setMode(readModeFromDom());
  }, [initialMode]);

  async function pick(next: ColorMode) {
    if (busy || next === mode) {
      if (next === mode) return;
    }
    setMode(next);
    applyModeClass(next);
    setBusy(true);
    await updateColorMode(next);
    setBusy(false);
    router.refresh();
  }

  if (variant === "full") {
    return (
      <div className="modeopts">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            className={"modebtn" + (m === mode ? " on" : "")}
            onClick={() => pick(m)}
            disabled={busy}
            aria-pressed={m === mode}
          >
            <span aria-hidden>{ICON[m]}</span> {t(("mode." + m) as MsgKey)}
          </button>
        ))}
      </div>
    );
  }

  const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length] as ColorMode;
  const label = t("mode.toggle", { mode: t(("mode." + mode) as MsgKey) });
  return (
    <button
      type="button"
      className="menubtn"
      onClick={() => pick(next)}
      disabled={busy}
      aria-label={label}
      title={label}
    >
      <span aria-hidden>{ICON[mode]}</span>
    </button>
  );
}
