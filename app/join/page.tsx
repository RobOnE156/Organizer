import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";

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
  return (
    <main className="authwrap">
      <div className="card stack">
        <div>
          <p className="eyebrow">Einladung</p>
          <h1 className="title">Beitritt nicht möglich</h1>
          <p className="sub">
            Dieser Einladungs-Link ist ungültig, bereits benutzt oder abgelaufen. Bitte den anderen
            Elternteil um einen neuen Link.
          </p>
        </div>
        <a className="btn btn-primary" href="/">Zur Startseite</a>
      </div>
    </main>
  );
}
