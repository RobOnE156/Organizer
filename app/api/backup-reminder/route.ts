import { NextResponse } from "next/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { sendEmail, emailEnabled, appUrl } from "@/lib/email";
import { buildBackupJson, buildBackupEmail } from "@/lib/backup";
import { runBackupAlerts, householdRecipients, DAY } from "@/lib/backup-alert";
import { translator, normalizeLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  // Dead-man's-switch check for the off-site backup, piggy-backed on this cron
  // (Vercel Hobby crons are daily-only; no separate schedule needed). Runs
  // FIRST and exception-isolated: the safety alert must go out even if the
  // routine reminder pass below breaks. Dormant until BACKUP_S3_* is set.
  let alerted = 0;
  try {
    ({ alerted } = await runBackupAlerts(admin, now));
  } catch (e) {
    console.error("[backup-reminder] alert pass failed", e);
  }

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

    const recipients = await householdRecipients(admin, h.id);
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

  return NextResponse.json({ ok: true, sent, alerted });
}
