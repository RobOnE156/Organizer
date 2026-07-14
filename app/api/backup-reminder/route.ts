import { NextResponse } from "next/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { sendEmail, emailEnabled, appUrl } from "@/lib/email";
import { buildBackupJson } from "@/lib/backup";
import { translator, normalizeLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DAY = 86_400_000;

function esc(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

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
      const headline = t("backup.mail_headline");
      const body = t("backup.mail_body", { status });
      const cta = t("backup.mail_cta");
      const tip = t("backup.mail_tip");
      const attnote = attachments ? t("backup.mail_attached") : "";
      const link = appUrl("/export");
      const html =
        `<!doctype html><html><body style="margin:0;background:#faf8fb;padding:24px;` +
        `font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#241f29">` +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">` +
        `<table role="presentation" width="100%" style="max-width:480px;background:#ffffff;` +
        `border:1px solid rgba(0,0,0,.08);border-radius:16px;padding:28px"><tr><td>` +
        `<p style="margin:0 0 6px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#c99a3f">${esc(t("email.brand"))}</p>` +
        `<h1 style="margin:0 0 14px;font-size:20px;line-height:1.35">${esc(headline)}</h1>` +
        `<p style="margin:0 0 16px;font-size:14px;line-height:1.5">${esc(body)}</p>` +
        `<a href="${esc(link)}" style="display:inline-block;background:#c99a3f;color:#20160a;` +
        `text-decoration:none;font-weight:700;padding:11px 22px;border-radius:999px">${esc(cta)}</a>` +
        (attnote ? `<p style="margin:18px 0 0;font-size:13px;color:#7d7684">${esc(attnote)}</p>` : "") +
        `<p style="margin:14px 0 0;font-size:13px;color:#7d7684">${esc(tip)}</p>` +
        `<hr style="border:none;border-top:1px solid rgba(0,0,0,.08);margin:20px 0">` +
        `<p style="margin:0;font-size:12px;color:#7d7684">${esc(t("backup.mail_footer"))}</p>` +
        `</td></tr></table></td></tr></table></body></html>`;
      const text = `${headline}\n\n${body}\n${cta}: ${link}\n\n${attnote}\n${tip}`;
      await sendEmail({ to: r.email, subject: t("backup.mail_subject"), html, text, attachments });
    }

    await admin
      .from("backup_settings")
      .upsert({ household_id: h.id, interval_days: interval, last_sent_at: nowISO }, { onConflict: "household_id" });
    sent += 1;
  }

  return NextResponse.json({ ok: true, sent });
}
