import { NextResponse } from "next/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { backupConfigured } from "@/lib/backup-s3";
import { evaluateHouseholdBackupHealth, OVERDUE_DAYS, type BackupHealthReason } from "@/lib/backup-alert";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Health probe for the off-site backup, made for an EXTERNAL watcher (a
// Cloudflare Worker cron, UptimeRobot, healthchecks.io, …) — deliberately NOT
// a Vercel cron. It answers 200 while every household's backup is healthy and
// 503 otherwise, so a dead app, a broken cron and a failing backup all trip
// the same external alarm (the true dead-man's switch on top of the in-app
// alert e-mail). Unlike the in-app alert, "no run ever" counts as unhealthy
// here — this layer covers the case where the nightly sync never starts.
//
// Optionally protected by BACKUP_HEALTH_TOKEN (?token=… or Authorization:
// Bearer). A separate secret on purpose: CRON_SECRET must never be handed to
// third-party monitors, where it would end up in their logs.
//
// The response is only ever a category ("error" | "overdue" | "no-run") —
// never household ids, notes or storage keys.
export async function GET(request: Request) {
  const token = process.env.BACKUP_HEALTH_TOKEN;
  if (token) {
    const given = new URL(request.url).searchParams.get("token");
    const auth = request.headers.get("authorization");
    if (given !== token && auth !== `Bearer ${token}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }
  if (!hasServiceRole()) {
    return NextResponse.json({ ok: false, reason: "no-service-role" }, { status: 500 });
  }
  if (!backupConfigured()) {
    return NextResponse.json({ ok: true, reason: "not-configured" });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const { data: households } = await admin.from("households").select("id");

  const rank: Record<"error" | "overdue" | "no-run", number> = { error: 3, overdue: 2, "no-run": 1 };
  let worst: "error" | "overdue" | "no-run" | null = null;
  for (const h of (households as { id: string }[] | null) ?? []) {
    const health = await evaluateHouseholdBackupHealth(admin, h.id, OVERDUE_DAYS, now);
    const r: BackupHealthReason = health.reason;
    if (r === "ok") continue;
    if (!worst || rank[r] > rank[worst]) worst = r;
  }

  if (worst) return NextResponse.json({ ok: false, reason: worst }, { status: 503 });
  return NextResponse.json({ ok: true });
}
