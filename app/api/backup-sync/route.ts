import { NextResponse } from "next/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { syncHouseholdBackup, backupConfigured } from "@/lib/backup-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Scheduled by Vercel Cron (see vercel.json). Incrementally copies every
// household's media + a metadata snapshot to the off-site S3 bucket. Bounded to
// fit the function time limit; runs daily so a large first backup catches up
// over a few days and then stays current. Protected by CRON_SECRET (Vercel
// injects the matching Authorization header on scheduled invocations).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!hasServiceRole()) {
    return NextResponse.json({ ok: false, reason: "SUPABASE_SERVICE_ROLE_KEY missing" });
  }
  if (!backupConfigured()) {
    return NextResponse.json({ ok: false, reason: "off-site target not configured (set BACKUP_S3_*)" });
  }

  const admin = createAdminClient();
  const { data: households } = await admin.from("households").select("id, name");
  const deadline = Date.now() + 45_000; // leave headroom under maxDuration=60

  const results: unknown[] = [];
  for (const h of (households as { id: string; name: string }[] | null) ?? []) {
    if (Date.now() > deadline) break;
    const run = await syncHouseholdBackup(h.id, h.name ?? "", deadline);
    results.push({ household: h.id, status: run.status, filesNew: run.files_new, filesTotal: run.files_total });
  }
  return NextResponse.json({ ok: true, results });
}
