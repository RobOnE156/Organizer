import { redirect } from "next/navigation";
import { getUser, getMembership, enforceSecondFactor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getChildren,
  getEntriesForChild,
  getMediaForEntries,
  getMemberProfiles,
  getMyProfile,
  getNotifications,
  signMediaByEntry,
} from "@/lib/data";
import { ageLabel, fmtDate } from "@/lib/timeline";
import { translator, normalizeLang } from "@/lib/i18n";
import Showcase, { type ShowcaseNode } from "./Showcase";

export const dynamic = "force-dynamic";

// Cap the number of textured cards so the GPU budget stays sane; the most
// recent memories are shown. (Full virtualization is a follow-up.)
const MAX_NODES = 200;

export default async function ShowcasePage() {
  const user = await getUser();
  if (!user) redirect("/login");
  await enforceSecondFactor();
  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  const supabase = await createClient();
  const profile = await getMyProfile(supabase, user.id);
  const t = translator(normalizeLang(profile.ui_language));
  const children = await getChildren(supabase, membership.household_id);
  const child = children[0];
  if (!child) redirect("/children/new");

  const entries = await getEntriesForChild(supabase, membership.household_id, child.id); // newest-first
  const capped = entries.slice(0, MAX_NODES);
  const media = await getMediaForEntries(supabase, capped.map((e) => e.id));
  const mediaByEntry = await signMediaByEntry(supabase, media, 3600);
  const authors = await getMemberProfiles(supabase, membership.household_id);
  const notifications = await getNotifications(supabase, user.id);

  const nodes: ShowcaseNode[] = capped.map((e) => {
    const ms = mediaByEntry[e.id] ?? [];
    const img = ms.find((m) => m.kind === "image");
    const vid = ms.find((m) => m.kind === "video");
    return {
      id: e.id,
      title: e.title ?? "",
      eventDate: e.event_date,
      dateLabel: fmtDate(e.event_date),
      age: ageLabel(child.birth_date, e.event_date),
      url: img?.url ?? vid?.poster ?? null,
      isVideo: !img && !!vid,
    };
  });

  const labels = {
    title: t("showcase.title", { name: child.name }),
    hint: t("showcase.hint"),
    to2d: t("showcase.to_2d"),
    open: t("showcase.open"),
    close: t("common.close"),
    empty: t("showcase.empty"),
    reduced: t("showcase.reduced"),
    unsupported: t("showcase.unsupported"),
  };

  return (
    <Showcase
      nodes={nodes}
      childName={child.name}
      reduceMotion={profile.reduce_motion}
      labels={labels}
      notifications={notifications}
      authors={authors}
    />
  );
}
