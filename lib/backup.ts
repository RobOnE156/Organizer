import type { SupabaseClient } from "@supabase/supabase-js";
import type { T } from "@/lib/i18n";
import {
  getChildren,
  getEntriesForExport,
  getSnapshotsForExport,
  getCommentsForEntries,
  getMediaForEntries,
  getMilestones,
  getLetters,
} from "@/lib/data";

// A JSON text/metadata snapshot of a household's diary — the automatic backup
// carried by the scheduled reminder e-mail. Media BYTES are not included (too
// large to e-mail); the media inventory (keys/kinds) is, and the in-app ZIP
// export remains the way to pull the originals. Reuses the export data helpers
// with whatever client is passed (the cron passes the service-role client, so
// the explicit household_id filters still scope each query correctly).
export async function buildBackupJson(
  db: SupabaseClient,
  householdId: string,
  householdName: string,
  nowISO: string,
): Promise<string> {
  const children = await getChildren(db, householdId);
  const entries = await getEntriesForExport(db, householdId);
  const entryIds = entries.map((e) => e.id);
  const [snapshots, comments, media] = await Promise.all([
    getSnapshotsForExport(db, householdId),
    getCommentsForEntries(db, entryIds),
    getMediaForEntries(db, entryIds),
  ]);
  const milestones = (await Promise.all(children.map((c) => getMilestones(db, c.id)))).flat();
  const letters = (await Promise.all(children.map((c) => getLetters(db, c.id)))).flat();

  const snapshot = {
    kind: "benni-tagebuch-backup",
    version: 1,
    exported_at: nowISO,
    household: householdName,
    note: "Text/metadata snapshot. Media files are NOT included — use the in-app ZIP export for the original photos/videos/audio.",
    children,
    entries,
    comments,
    milestones,
    snapshots,
    letters,
    media: media.map((m) => ({ entry_id: m.entry_id, kind: m.kind, storage_key: m.storage_key })),
  };
  return JSON.stringify(snapshot, null, 2);
}

function esc(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

// Shared HTML shell for the backup mails (reminder + alert): identical card
// layout, differing only in accent colour, CTA text colour and the optional
// paragraphs between CTA and footer.
function buildBackupMailHtml(opts: {
  brand: string;
  headline: string;
  body: string;
  cta: string;
  link: string;
  accent: string;
  ctaColor: string;
  extras: { text: string; top: number }[]; // translated paragraphs (escaped here) + top margin px
  footer: string;
}): string {
  return (
    `<!doctype html><html><body style="margin:0;background:#faf8fb;padding:24px;` +
    `font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#241f29">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">` +
    `<table role="presentation" width="100%" style="max-width:480px;background:#ffffff;` +
    `border:1px solid rgba(0,0,0,.08);border-radius:16px;padding:28px"><tr><td>` +
    `<p style="margin:0 0 6px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:${opts.accent}">${esc(opts.brand)}</p>` +
    `<h1 style="margin:0 0 14px;font-size:20px;line-height:1.35">${esc(opts.headline)}</h1>` +
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.5">${esc(opts.body)}</p>` +
    `<a href="${esc(opts.link)}" style="display:inline-block;background:${opts.accent};color:${opts.ctaColor};` +
    `text-decoration:none;font-weight:700;padding:11px 22px;border-radius:999px">${esc(opts.cta)}</a>` +
    opts.extras.map((p) => `<p style="margin:${p.top}px 0 0;font-size:13px;color:#7d7684">${esc(p.text)}</p>`).join("") +
    `<hr style="border:none;border-top:1px solid rgba(0,0,0,.08);margin:20px 0">` +
    `<p style="margin:0;font-size:12px;color:#7d7684">${esc(opts.footer)}</p>` +
    `</td></tr></table></td></tr></table></body></html>`
  );
}

// The reminder e-mail (subject + HTML + plain text), shared by the scheduled
// cron and the in-app "send test e-mail" action so both look identical.
export function buildBackupEmail(
  t: T,
  opts: { link: string; status: string; attached: boolean },
): { subject: string; html: string; text: string } {
  const headline = t("backup.mail_headline");
  const body = t("backup.mail_body", { status: opts.status });
  const cta = t("backup.mail_cta");
  const tip = t("backup.mail_tip");
  const attnote = opts.attached ? t("backup.mail_attached") : "";
  const html = buildBackupMailHtml({
    brand: t("email.brand"),
    headline,
    body,
    cta,
    link: opts.link,
    accent: "#c99a3f",
    ctaColor: "#20160a",
    extras: [...(attnote ? [{ text: attnote, top: 18 }] : []), { text: tip, top: 14 }],
    footer: t("backup.mail_footer"),
  });
  const text = `${headline}\n\n${body}\n${cta}: ${opts.link}\n\n${attnote}\n${tip}`;
  return { subject: t("backup.mail_subject"), html, text };
}

// The off-site backup alert e-mail (dead-man's switch): same layout as the
// reminder above, but with a warning accent instead of gold. `reason` is only
// the failure category — never raw run notes (they can contain internal error
// details).
export function buildBackupAlertEmail(
  t: T,
  opts: { link: string; reason: "error" | "overdue"; daysSince: number },
): { subject: string; html: string; text: string } {
  const headline = t("alert.mail_headline");
  const reason = opts.reason === "error" ? t("alert.mail_reason_error") : t("alert.mail_reason_overdue", { n: opts.daysSince });
  const body = t("alert.mail_body", { reason });
  const cta = t("alert.mail_cta");
  const html = buildBackupMailHtml({
    brand: t("email.brand"),
    headline,
    body,
    cta,
    link: opts.link,
    accent: "#b23b2e",
    ctaColor: "#ffffff",
    extras: [],
    footer: t("alert.mail_footer"),
  });
  const text = `${headline}\n\n${body}\n${cta}: ${opts.link}`;
  return { subject: t("alert.mail_subject"), html, text };
}
