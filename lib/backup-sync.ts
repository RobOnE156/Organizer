import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildBackupJson } from "@/lib/backup";
import { backupConfigured, putBackupObject } from "@/lib/backup-s3";

export type BackupRun = {
  status: "ok" | "partial" | "error";
  files_new: number;
  files_total: number;
  bytes_new: number;
  bytes_total: number;
  note: string | null;
  finished_at: string | null;
};

// Latest off-site backup run for a household (for the status UI).
export async function getLatestBackupRun(db: SupabaseClient, householdId: string): Promise<BackupRun | null> {
  const { data } = await db
    .from("backup_runs")
    .select("status, files_new, files_total, bytes_new, bytes_total, note, finished_at")
    .eq("household_id", householdId)
    .order("finished_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  return (data as BackupRun | null) ?? null;
}

// Every distinct storage key a household has (originals + video posters).
async function householdKeys(admin: SupabaseClient, householdId: string): Promise<string[]> {
  type Row = { storage_key: string | null; poster_key?: string | null };
  const withPoster = await admin
    .from("media")
    .select("storage_key, poster_key")
    .eq("household_id", householdId)
    .is("deleted_at", null);
  let rows: Row[];
  if (withPoster.error) {
    const without = await admin.from("media").select("storage_key").eq("household_id", householdId).is("deleted_at", null);
    rows = (without.data as Row[] | null) ?? [];
  } else {
    rows = (withPoster.data as Row[] | null) ?? [];
  }
  const set = new Set<string>();
  for (const r of rows) {
    if (r.storage_key) set.add(r.storage_key);
    if (r.poster_key) set.add(r.poster_key);
  }
  return [...set];
}

// Incrementally copy a household's media + a fresh metadata snapshot to the
// off-site bucket, bounded by `deadlineMs` (so it fits a serverless time limit;
// the next scheduled run continues where this one stopped). Records a
// backup_runs row and returns it. Safe to call repeatedly — already-copied
// media are skipped via the backup_objects ledger.
export async function syncHouseholdBackup(
  householdId: string,
  householdName: string,
  deadlineMs: number,
): Promise<BackupRun> {
  const admin = createAdminClient();
  const startedAt = new Date().toISOString();
  let status: "ok" | "partial" | "error" = "ok";
  let note: string | null = null;
  let filesNew = 0;
  let bytesNew = 0;

  try {
    const keys = await householdKeys(admin, householdId);
    const { data: doneRows } = await admin.from("backup_objects").select("storage_key").eq("household_id", householdId);
    const done = new Set((doneRows as { storage_key: string }[] | null)?.map((r) => r.storage_key) ?? []);
    const todo = keys.filter((k) => !done.has(k));

    for (const key of todo) {
      if (Date.now() > deadlineMs) {
        status = "partial"; // ran out of time; the next run continues
        break;
      }
      const { data: blob, error } = await admin.storage.from("media").download(key);
      if (error || !blob) continue; // skip unreadable key; retried next run
      const bytes = Buffer.from(await blob.arrayBuffer());
      await putBackupObject(`households/${householdId}/media/${key}`, bytes, "application/octet-stream");
      await admin.from("backup_objects").upsert(
        { household_id: householdId, storage_key: key, bytes: bytes.length, backed_up_at: new Date().toISOString() },
        { onConflict: "household_id,storage_key" },
      );
      filesNew += 1;
      bytesNew += bytes.length;
    }

    // Always refresh the metadata snapshot (small, and it's the searchable text).
    const json = await buildBackupJson(admin, householdId, householdName, new Date().toISOString());
    await putBackupObject(`households/${householdId}/metadata/latest.json`, json, "application/json");
  } catch (e) {
    status = "error";
    note = e instanceof Error ? e.message : String(e);
  }

  // Cumulative totals from the ledger.
  const { data: allObj } = await admin.from("backup_objects").select("bytes").eq("household_id", householdId);
  const objs = (allObj as { bytes: number | string }[] | null) ?? [];
  const filesTotal = objs.length;
  const bytesTotal = objs.reduce((s, o) => s + Number(o.bytes || 0), 0);

  const run: BackupRun = {
    status,
    files_new: filesNew,
    files_total: filesTotal,
    bytes_new: bytesNew,
    bytes_total: bytesTotal,
    note,
    finished_at: new Date().toISOString(),
  };
  await admin.from("backup_runs").insert({ household_id: householdId, started_at: startedAt, ...run });
  return run;
}

export { backupConfigured };
