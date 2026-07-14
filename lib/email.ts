// Server-only e-mail sending via Resend's REST API (no SDK dependency).
// Configured entirely through env vars so the app builds + runs fine without
// e-mail set up (emailEnabled() is then false and sends are skipped):
//   RESEND_API_KEY  – Resend API key (server secret, never NEXT_PUBLIC_*)
//   EMAIL_FROM      – verified sender, e.g. "Benni-Tagebuch <benni@your.eu>"
//   APP_URL         – public origin for links, e.g. https://organizer-puce.vercel.app
// For EU data residency, enable the EU region on the Resend account/domain;
// the API endpoint is the same.

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function appUrl(path = "/"): string {
  const base = (process.env.APP_URL || "https://organizer-puce.vercel.app").replace(/\/+$/, "");
  return base + (path.startsWith("/") ? path : "/" + path);
}

export async function sendEmail(msg: {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; content: string }[]; // content = base64
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return false;
  try {
    const payload: Record<string, unknown> = {
      from,
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    };
    if (msg.attachments && msg.attachments.length > 0) payload.attachments = msg.attachments;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      // Best-effort channel: log server-side, never throw into the request.
      console.error("[email] Resend responded", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] send failed", err);
    return false;
  }
}
