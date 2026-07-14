import { redirect } from "next/navigation";
import { getUser, getMembership, enforceSecondFactor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getActivityLog, getMemberProfiles, getShellPrefs, type AuditEntry, type MemberProfile } from "@/lib/data";
import { translator, type MsgKey } from "@/lib/i18n";
import { fmtDateTime } from "@/lib/timeline";
import Avatar from "@/app/Avatar";

import PageHeader from "@/app/PageHeader";
import PageFooter from "@/app/PageFooter";

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<string, MsgKey> = {
  "entry.create": "activity.entry_create",
  "entry.edit": "activity.entry_edit",
  "entry.delete": "activity.entry_delete",
  "entry.restore": "activity.entry_restore",
  "comment.create": "activity.comment_create",
  "comment.delete": "activity.comment_delete",
};

const ACTION_ICON: Record<string, string> = {
  "entry.create": "✏️",
  "entry.edit": "✎",
  "entry.delete": "🗑️",
  "entry.restore": "♻️",
  "comment.create": "💬",
  "comment.delete": "🗑️",
};

function excerptOf(a: AuditEntry): string | null {
  const d = a.detail || {};
  const title = typeof d.title === "string" ? d.title : "";
  const ex = typeof d.excerpt === "string" ? d.excerpt : "";
  const s = (title || ex).trim();
  return s.length > 0 ? s : null;
}

export default async function ActivityPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  await enforceSecondFactor();
  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  const supabase = await createClient();
  const [log, authors, prefs] = await Promise.all([
    getActivityLog(supabase, membership.household_id),
    getMemberProfiles(supabase, membership.household_id),
    getShellPrefs(supabase, user.id),
  ]);
  const t = translator(prefs.lang);
  const fallback: MemberProfile = { name: t("activity.someone"), color: "#8a8a8a" };

  return (
    <>
      <PageHeader />
      <main className="page">
      <p className="eyebrow">{t("activity.eyebrow")}</p>
      <h1 className="title">📜 {t("activity.title")}</h1>
      <p className="sub">{t("activity.sub")}</p>

      {log.length === 0 ? (
        <p className="muted">{t("activity.empty")}</p>
      ) : (
        <ul className="actlist">
          {log.map((a) => {
            const who = (a.actor_id && authors[a.actor_id]) || fallback;
            const key = ACTION_LABEL[a.action];
            const label = key ? t(key, { name: who.name }) : `${who.name}: ${a.action}`;
            const ex = excerptOf(a);
            return (
              <li className="actrow" key={a.id}>
                <Avatar name={who.name} color={who.color} url={who.avatarUrl} className="cava" />
                <div className="acttext">
                  <span>
                    <span className="acticon" aria-hidden>{ACTION_ICON[a.action] ?? "•"}</span> {label}
                  </span>
                  {ex ? <em className="actexcerpt">„{ex}“</em> : null}
                  <small className="muted">{fmtDateTime(a.created_at)}</small>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
      <PageFooter />
    </>
  );
}
