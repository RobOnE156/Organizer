import type { Metadata, Viewport } from "next";
import "./globals.css";
import ConfirmProvider from "@/app/ConfirmProvider";
import { hasSupabaseEnv } from "@/lib/env";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getA11yClasses } from "@/lib/data";

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
  // Apply the signed-in user's accessibility preferences globally.
  let a11y = "";
  if (hasSupabaseEnv()) {
    try {
      const user = await getUser();
      if (user) {
        const supabase = await createClient();
        a11y = await getA11yClasses(supabase, user.id);
      }
    } catch {
      // never let personalisation break the shell
    }
  }
  return (
    <html lang="de" className={a11y || undefined}>
      <body>
        <ConfirmProvider>{children}</ConfirmProvider>
      </body>
    </html>
  );
}
