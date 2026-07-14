import { NextResponse } from "next/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { sendEmail, emailEnabled, appUrl } from "@/lib/email";
import { buildBackupJson, buildBackupEmail } from "@/lib/backup";
import { translator, normalizeLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DAY = 86_400_000;

// Scheduled by Vercel Cron (see vercel.json). For each household whose reminder
// interval is due, e-mails the members an automatic JSON snapshot of the diary
// text plus a nudge to run a full (media) export. Protected by CRON_SECRET.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!hasServiceRole() || !emailEnabled()) {
    return NextResponse.json({ ok: false, reason: "not configured (needs SUPABASE_SERVICE_ROLE_KEY + RESEND_API_KEY/EMAIL_FROM)" });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const nowISO = new Date(now).toISOString();

  const { data: households } = await admin.from("households").select("id, name, created_at");
  let sent = 0;

  for (const h of (households as { id: string; name: string; created_at: string }[] | null) ?? []) {
    const { data: st } = await admin
      .from("backup_settings")
      .select("interval_days, last_sent_at")
      .eq("household_id", h.id)
      .maybeSingle();
    const interval = (st as { interval_days: number } | null)?.interval_days ?? 30;
    if (interval <= 0) continue;
    // The first reminder fires immediately (establishes the baseline + delivers
    // the first snapshot); after that a full interval is waited between mails.
    const lastSent = (st as { last_sent_at: string | null } | null)?.last_sent_at ?? null;
    if (lastSent && now < new Date(lastSent).getTime() + interval * DAY) continue;

    // days since the last full backup (in-app or external), for the nudge tone
    const { data: lastB } = await admin
      .from("backups")
      .select("created_at")
      .eq("household_id", h.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const lastAt = (lastB as { created_at: string } | null)?.created_at ?? null;
    const daysSince = lastAt ? Math.floor((now - new Date(lastAt).getTime()) / DAY) : null;

    // recipients: each member's e-mail + UI language
    const { data: members } = await admin.from("memberships").select("user_id").eq("household_id", h.id);
    const recipients: { email: string; lang: string }[] = [];
    for (const m of (members as { user_id: string }[] | null) ?? []) {
      const { data: ud } = await admin.auth.admin.getUserById(m.user_id);
      const email = ud?.user?.email;
      if (!email) continue;
      const { data: pr } = await admin.from("profiles").select("ui_language").eq("user_id", m.user_id).maybeSingle();
      recipients.push({ email, lang: (pr as { ui_language: string } | null)?.ui_language ?? "en" });
    }
    if (recipients.length === 0) continue;

    // the automatic JSON snapshot (best-effort — still send the reminder if it fails)
    let attachments: { filename: string; content: string }[] | undefined;
    try {
      const json = await buildBackupJson(admin, h.id, h.name, nowISO);
      attachments = [
        { filename: `benni-tagebuch-snapshot-${nowISO.slice(0, 10)}.json`, content: Buffer.from(json, "utf8").toString("base64") },
      ];
    } catch {
      attachments = undefined;
    }

    for (const r of recipients) {
      const t = translator(normalizeLang(r.lang));
      const status = daysSince === null ? t("backup.mail_never") : t("backup.mail_since", { n: daysSince });
      const mail = buildBackupEmail(t, { link: appUrl("/export"), status, attached: Boolean(attachments) });
      await sendEmail({ to: r.email, ...mail, attachments });
    }

    await admin
      .from("backup_settings")
      .upsert({ household_id: h.id, interval_days: interval, last_sent_at: nowISO }, { onConflict: "household_id" });
    sent += 1;
  }

  return NextResponse.json({ ok: true, sent });
}
