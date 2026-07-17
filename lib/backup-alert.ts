import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getLatestBackupRun, type BackupRun } from "@/lib/backup-sync";
import { backupConfigured } from "@/lib/backup-s3";
import { buildBackupAlertEmail } from "@/lib/backup";
import { sendEmail, appUrl } from "@/lib/email";
import { translator, normalizeLang } from "@/lib/i18n";

// Dead-man's switch for the automatic off-site backup: e-mails the household
// when the backup errors or goes stale, instead of relying on someone opening
// the export page and noticing the red status light.

export const OVERDUE_DAYS = 3; // last finished run older than this = overdue
export const ALERT_COOLDOWN_DAYS = 3; // minimum gap between repeat alerts

export const DAY = 86_400_000;

export type BackupHealthReason = "ok" | "error" | "overdue" | "no-run";

export type BackupHealth = {
  ok: boolean;
  reason: BackupHealthReason;
  daysSince: number | null; // full days since the last run finished (null without a run)
};

// Pure classification of a household's latest backup run, separated from the
// DB read so the rules are unit-testable without touching real backup_runs.
export function classifyBackupRun(run: BackupRun | null, now: number, overdueDays: number): BackupHealth {
  // No finished run yet: deliberately "healthy" for the in-app alert —
  // otherwise every household would alarm during the activation window before
  // the first nightly sync. The external watcher polling /api/backup-health
  // is the layer that covers "never ran at all".
  if (!run || !run.finished_at) return { ok: true, reason: "no-run", daysSince: null };
  const ageMs = now - new Date(run.finished_at).getTime();
  const daysSince = Math.floor(ageMs / DAY);
  if (run.status === "error") return { ok: false, reason: "error", daysSince };
  if (ageMs > overdueDays * DAY) return { ok: false, reason: "overdue", daysSince };
  return { ok: true, reason: "ok", daysSince };
}

export async function evaluateHouseholdBackupHealth(
  admin: SupabaseClient,
  householdId: string,
  overdueDays: number = OVERDUE_DAYS,
  now: number = Date.now(),
): Promise<BackupHealth> {
  const run = await getLatestBackupRun(admin, householdId);
  return classifyBackupRun(run, now, overdueDays);
}

export type Recipient = { email: string; lang: string };

// Every member's e-mail address + UI language for a household — shared by the
// backup reminder and the backup alert so both mail the same people.
export async function householdRecipients(admin: SupabaseClient, householdId: string): Promise<Recipient[]> {
  const { data: members } = await admin.from("memberships").select("user_id").eq("household_id", householdId);
  const recipients: Recipient[] = [];
  for (const m of (members as { user_id: string }[] | null) ?? []) {
    const { data: ud } = await admin.auth.admin.getUserById(m.user_id);
    const email = ud?.user?.email;
    if (!email) continue;
    const { data: pr } = await admin.from("profiles").select("ui_language").eq("user_id", m.user_id).maybeSingle();
    recipients.push({ email, lang: (pr as { ui_language: string } | null)?.ui_language ?? "en" });
  }
  return recipients;
}

// Checks every household's backup health and e-mails the members when it is
// unhealthy, rate-limited to one alert per ALERT_COOLDOWN_DAYS while the
// problem persists. Once the backup is healthy again the cooldown is cleared,
// so the next incident alerts immediately. The mail carries only the failure
// category + age — never backup_runs.note, which can contain internal error
// details (paths, storage keys).
//
// Deliberately NO per-household opt-out: the reminder cadence (interval_days,
// 0 = off) governs only the routine nudge mail; a failing off-site backup is a
// safety incident and always alerts. `send` is injectable for tests only.
export async function runBackupAlerts(
  admin: SupabaseClient,
  now: number,
  send: typeof sendEmail = sendEmail,
): Promise<{ alerted: number }> {
  if (!backupConfigured()) return { alerted: 0 }; // feature dormant without BACKUP_S3_*
  const nowISO = new Date(now).toISOString();
  const { data: households } = await admin.from("households").select("id, name");
  let alerted = 0;

  for (const h of (households as { id: string; name: string }[] | null) ?? []) {
    const health = await evaluateHouseholdBackupHealth(admin, h.id, OVERDUE_DAYS, now);

    // If migration 0031 has not been applied yet, this select and the upserts
    // below fail; we log and stay fail-loud (alert without a cooldown) rather
    // than silently disarming the safety net.
    const { data: st, error: stErr } = await admin
      .from("backup_settings")
      .select("last_alert_at")
      .eq("household_id", h.id)
      .maybeSingle();
    if (stErr) console.error("[backup-alert] last_alert_at read failed (migration 0031 missing?)", stErr.message);
    const lastAlert = (st as { last_alert_at: string | null } | null)?.last_alert_at ?? null;

    if (health.ok) {
      // Clear the cooldown only on a genuinely healthy run ('ok'). 'no-run'
      // can also mean a transient backup_runs read failure — clearing on it
      // would defeat the cooldown mid-incident.
      if (lastAlert && health.reason === "ok") {
        const { error } = await admin
          .from("backup_settings")
          .upsert({ household_id: h.id, last_alert_at: null }, { onConflict: "household_id" });
        if (error) console.error("[backup-alert] cooldown reset failed", error.message);
      }
      continue;
    }
    if (lastAlert && now < new Date(lastAlert).getTime() + ALERT_COOLDOWN_DAYS * DAY) continue;

    const recipients = await householdRecipients(admin, h.id);
    if (recipients.length === 0) continue;

    let delivered = false;
    for (const r of recipients) {
      const t = translator(normalizeLang(r.lang));
      const mail = buildBackupAlertEmail(t, {
        link: appUrl("/export"),
        reason: health.reason === "error" ? "error" : "overdue",
        daysSince: health.daysSince ?? 0,
      });
      if (await send({ to: r.email, ...mail })) delivered = true;
    }

    // Stamp the cooldown only when at least one mail actually went out —
    // otherwise (e.g. Resend outage) the next daily run retries instead of
    // going silent for ALERT_COOLDOWN_DAYS.
    if (!delivered) continue;
    const { error } = await admin
      .from("backup_settings")
      .upsert({ household_id: h.id, last_alert_at: nowISO }, { onConflict: "household_id" });
    if (error) console.error("[backup-alert] cooldown stamp failed (migration 0031 missing?)", error.message);
    alerted += 1;
  }

  return { alerted };
}
