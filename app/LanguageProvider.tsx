"use client";

import { createContext, useContext } from "react";
import { translator, type Lang, type T } from "@/lib/i18n";

const Ctx = createContext<{ lang: Lang; t: T }>({ lang: "de", t: translator("de") });

export function LanguageProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <Ctx.Provider value={{ lang, t: translator(lang) }}>{children}</Ctx.Provider>;
}

export function useT(): { lang: Lang; t: T } {
  return useContext(Ctx);
}
