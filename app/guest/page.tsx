import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import { getGuestInviteInfo } from "@/lib/data";
import { translator, normalizeLang } from "@/lib/i18n";
import GuestForm from "./GuestForm";

export const dynamic = "force-dynamic";

// PUBLIC page (no auth) for an account-less guest — grandparent, godparent —
// invited via an expiring link (…/guest?token=…). The page and form render in
// the invite's chosen language, not the visitor's, since a guest has no
// profile. The token is validated + personalised through a definer RPC.
export default async function GuestPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const info =
    hasSupabaseEnv() && token ? await getGuestInviteInfo(await createClient(), token) : null;
  const lang = normalizeLang(info?.language ?? "en");
  const t = translator(lang);

  if (!token || !info || !info.valid) {
    const reason = info?.reason ?? "invalid";
    const body =
      reason === "expired"
        ? t("guest.dead_expired")
        : reason === "revoked"
          ? t("guest.dead_revoked")
          : t("guest.dead_invalid");
    return (
      <main className="authwrap">
        <div className="card stack">
          <p className="eyebrow">{t("guest.eyebrow")}</p>
          <h1 className="title">{t("guest.dead_title")}</h1>
          <p className="sub" style={{ marginBottom: 0 }}>
            {body}
          </p>
        </div>
      </main>
    );
  }

  const childName = info.child_name ?? t("guest.the_child");

  return (
    <main className="authwrap">
      <div className="card stack" style={{ width: "min(540px, 100%)" }}>
        <div>
          <p className="eyebrow">{t("guest.eyebrow")}</p>
          <h1 className="title">
            {info.child_name ? t("guest.title_named", { name: info.child_name }) : t("guest.title")}
          </h1>
          <p className="sub" style={{ marginBottom: 0 }}>
            {t("guest.sub", { name: childName })}
          </p>
        </div>
        {info.message ? <p className="guestnote">„{info.message}“</p> : null}
        <GuestForm token={token} lang={lang} childName={childName} />
      </div>
    </main>
  );
}
