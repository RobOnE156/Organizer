import type { Metadata, Viewport } from "next";
import "./globals.css";
import ConfirmProvider from "@/app/ConfirmProvider";
import { LanguageProvider } from "@/app/LanguageProvider";
import { hasSupabaseEnv } from "@/lib/env";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getShellPrefs } from "@/lib/data";
import type { Lang } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Benni-Tagebuch",
  description: "Ein privates, sicheres digitales Tagebuch — für die Ewigkeit gebaut.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#15121A",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Apply the signed-in user's accessibility + language preferences globally.
  let a11y = "";
  let lang: Lang = "de";
  if (hasSupabaseEnv()) {
    try {
      const user = await getUser();
      if (user) {
        const supabase = await createClient();
        const prefs = await getShellPrefs(supabase, user.id);
        a11y = prefs.a11y;
        lang = prefs.lang;
      }
    } catch {
      // never let personalisation break the shell
    }
  }
  return (
    <html lang={lang} className={a11y || undefined}>
      <body>
        <LanguageProvider lang={lang}>
          <ConfirmProvider>{children}</ConfirmProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
