import type { SupabaseClient } from "@supabase/supabase-js";
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
