import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import { getShellPrefs } from "@/lib/data";
import { translator } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// Landing page for a shared invite link (…/join?code=XXXX). A logged-in
// visitor is joined to the household immediately; a signed-out visitor is
// sent to sign up first, with the code carried through so they join right
// after creating their account.
export default async function JoinPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  if (!hasSupabaseEnv() || !code) redirect("/");

  const user = await getUser();
  if (!user) redirect(`/signup?code=${encodeURIComponent(code)}`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("redeem_household_invite", { p_code: code });
  if (!error) redirect("/");

  // Invalid or expired code — show a friendly dead end rather than a crash.
  const t = translator((await getShellPrefs(supabase, user.id)).lang);
  return (
    <main className="authwrap">
      <div className="card stack">
        <div>
          <p className="eyebrow">{t("join.eyebrow")}</p>
          <h1 className="title">{t("join.title")}</h1>
          <p className="sub">{t("join.sub")}</p>
        </div>
        <a className="btn btn-primary" href="/">{t("join.home")}</a>
      </div>
    </main>
  );
}
