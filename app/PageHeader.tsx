import { headers } from "next/headers";
import { getUser, getMembership } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getChildren, getShellPrefs } from "@/lib/data";
import { translator, pickLangFromAcceptLanguage, type Lang } from "@/lib/i18n";
import ThemeModeToggle from "@/app/ThemeModeToggle";

// A slim top bar shown on every sub-page: the diary name (a link home) plus a
// light/dark toggle. Self-contained and defensive — never breaks the page.
export default async function PageHeader() {
  let brand = "Benni-Tagebuch";
  let lang: Lang = "de";
  let mode = "system";
  let resolved = false;
  if (hasSupabaseEnv()) {
    try {
      const user = await getUser();
      if (user) {
        const supabase = await createClient();
        const prefs = await getShellPrefs(supabase, user.id);
        lang = prefs.lang;
        mode = prefs.mode;
        resolved = true;
        const membership = await getMembership();
        if (membership) {
          const children = await getChildren(supabase, membership.household_id);
          if (children[0]?.name) brand = children[0].name;
        }
      }
    } catch {
      // never let the header break the page
    }
  }
  if (!resolved) {
    try {
      const h = await headers();
      lang = pickLangFromAcceptLanguage(h.get("accept-language"));
    } catch {
      /* keep default */
    }
  }
  const t = translator(lang);

  return (
    <header className="topbar">
      <a className="brand" href="/">
        {brand}
        <small>{t("nav.timeline")}</small>
      </a>
      <div className="topactions">
        <ThemeModeToggle initialMode={mode} />
      </div>
    </header>
  );
}
