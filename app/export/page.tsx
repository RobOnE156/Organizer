import { redirect } from "next/navigation";
import { getUser, getMembership, enforceSecondFactor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getChildren,
  getCommentsForEntries,
  getEntriesForExport,
  getHighlightedEntryIds,
  getMediaForEntries,
  getMemberProfiles,
  getReactionsForComments,
  getReactionsForEntries,
  getShellPrefs,
  getSnapshotsForExport,
  getBackupStatus,
} from "@/lib/data";
import { translator } from "@/lib/i18n";
import { backupConfigured } from "@/lib/backup-s3";
import ExportPanel from "./ExportPanel";
import BackupStatus from "./BackupStatus";
import OffsiteBackup from "./OffsiteBackup";

import PageHeader from "@/app/PageHeader";
import PageFooter from "@/app/PageFooter";

export const dynamic = "force-dynamic";

export default async function ExportPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  await enforceSecondFactor();
  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  const supabase = await createClient();
  const t = translator((await getShellPrefs(supabase, user.id)).lang);
  const [children, entries, snapshots] = await Promise.all([
    getChildren(supabase, membership.household_id),
    getEntriesForExport(supabase, membership.household_id),
    getSnapshotsForExport(supabase, membership.household_id),
  ]);
  const entryIds = entries.map((e) => e.id);
  const mediaRows = await getMediaForEntries(supabase, entryIds);
  const commentRows = await getCommentsForEntries(supabase, entryIds);
  const reactionRows = await getReactionsForEntries(supabase, entryIds);
  const commentReactionRows = await getReactionsForComments(supabase, commentRows.map((c) => c.id));
  const highlightedIds = await getHighlightedEntryIds(supabase, entryIds);
  const authors = await getMemberProfiles(supabase, membership.household_id);

  const { data: hh } = await supabase
    .from("households")
    .select("name")
    .eq("id", membership.household_id)
    .maybeSingle();
  const householdName = (hh as { name: string } | null)?.name ?? "Tagebuch";
  const backup = await getBackupStatus(supabase, membership.household_id);

  // Latest off-site backup run (RLS-scoped select) for the status panel.
  const { data: lastRunRow } = await supabase
    .from("backup_runs")
    .select("status, files_total, bytes_total, finished_at")
    .eq("household_id", membership.household_id)
    .order("finished_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  const lastRun = (lastRunRow as {
    status: "ok" | "partial" | "error";
    files_total: number;
    bytes_total: number;
    finished_at: string | null;
  } | null) ?? null;

  const media = mediaRows.map((m) => ({
    entry_id: m.entry_id,
    storage_key: m.storage_key,
    kind: m.kind,
    position: m.position,
  }));

  return (
    <>
      <PageHeader />
      <main className="page">
      <p className="eyebrow">{t("export.eyebrow")}</p>
      <h1 className="title">{t("export.title")}</h1>
      <p className="sub">{t("export.sub")}</p>

      <h2 style={{ fontSize: "1.05rem", margin: "6px 0 10px" }}>{t("backup.head")}</h2>
      <BackupStatus lastBackupAt={backup.lastBackupAt} intervalDays={backup.intervalDays} />

      <div style={{ marginTop: 14 }}>
        <OffsiteBackup configured={backupConfigured()} lastRun={lastRun} />
      </div>

      <div style={{ marginTop: 20 }}>
        <ExportPanel
        householdName={householdName}
        childList={children}
        entries={entries}
        media={media}
        authors={authors}
        snapshots={snapshots}
        comments={commentRows}
        reactions={reactionRows}
        commentReactions={commentReactionRows}
        highlightedIds={highlightedIds}
        />
      </div>
    </main>
      <PageFooter />
    </>
  );
}
