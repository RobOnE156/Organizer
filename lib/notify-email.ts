import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { translator, normalizeLang, type MsgKey } from "@/lib/i18n";
import { sendEmail, emailEnabled, appUrl } from "@/lib/email";

// Bridges the in-app notification engine to e-mail. Called from the entry /
// comment / reaction server actions right after a successful write: it asks
// the definer RPC who wants an e-mail for this event (addresses stay
// server-side), then sends the mail AFTER the response via next/server's
// after(), so it never adds latency to the user's action.

export type NotifyKind = "entry" | "comment" | "reaction";

type Target = { email: string; language: string; actor_name: string };

const SUBJECT: Record<NotifyKind, MsgKey> = {
  entry: "email.subject_entry",
  comment: "email.subject_comment",
  reaction: "email.subject_reaction",
};

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function queueNotificationEmails(
  supabase: SupabaseClient,
  kind: NotifyKind,
  entryId: string | null | undefined,
): Promise<void> {
  if (!emailEnabled() || !entryId) return;
  const { data } = await supabase.rpc("notification_email_targets", { p_kind: kind, p_entry_id: entryId });
  const targets = (data as Target[] | null) ?? [];
  if (targets.length === 0) return;

  const link = appUrl(`/#entry-${entryId}`);
  after(async () => {
    await Promise.allSettled(targets.map((tgt) => sendOne(tgt, kind, link)));
  });
}

async function sendOne(tgt: Target, kind: NotifyKind, link: string): Promise<void> {
  const t = translator(normalizeLang(tgt.language));
  const name = tgt.actor_name.trim() || t("email.someone");
  const headline = t(SUBJECT[kind], { name });
  const cta = t("email.cta");
  const privacy = t("email.privacy");
  const footer = t("email.footer");
  const brand = t("email.brand");

  const html =
    `<!doctype html><html><body style="margin:0;background:#faf8fb;padding:24px;` +
    `font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#241f29">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">` +
    `<table role="presentation" width="100%" style="max-width:480px;background:#ffffff;` +
    `border:1px solid rgba(0,0,0,.08);border-radius:16px;padding:28px"><tr><td>` +
    `<p style="margin:0 0 6px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#c99a3f">${esc(brand)}</p>` +
    `<h1 style="margin:0 0 18px;font-size:20px;line-height:1.35">${esc(headline)}</h1>` +
    `<a href="${esc(link)}" style="display:inline-block;background:#c99a3f;color:#20160a;` +
    `text-decoration:none;font-weight:700;padding:11px 22px;border-radius:999px">${esc(cta)}</a>` +
    `<p style="margin:18px 0 0;font-size:13px;color:#7d7684">${esc(privacy)}</p>` +
    `<hr style="border:none;border-top:1px solid rgba(0,0,0,.08);margin:20px 0">` +
    `<p style="margin:0;font-size:12px;color:#7d7684">${esc(footer)}</p>` +
    `</td></tr></table></td></tr></table></body></html>`;

  const text = `${headline}\n\n${cta}: ${link}\n\n${privacy}\n${footer}`;

  await sendEmail({ to: tgt.email, subject: headline, html, text });
}
