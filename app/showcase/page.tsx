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
  const authors = await getMemberProfiles(supabase, membership.household_id);
  const notifications = await getNotifications(supabase, user.id);

  // Group media by entry. Previews go through the transcoding proxy so every
  // photo (HEIC included) becomes a small JPEG that renders in a WebGL texture
  // on any browser; the private storage key is never exposed.
  const mediaByEntry = new Map<string, typeof media>();
  for (const m of media) {
    const arr = mediaByEntry.get(m.entry_id);
    if (arr) arr.push(m);
    else mediaByEntry.set(m.entry_id, [m]);
  }

  const nodes: ShowcaseNode[] = capped.map((e) => {
    const ms = mediaByEntry.get(e.id) ?? [];
    const img = ms.find((m) => m.kind === "image");
    const vid = ms.find((m) => m.kind === "video");
    let previewUrl: string | null = null;
    let url: string | null = null;
    if (img) {
      previewUrl = `/media/${img.id}/preview?w=512`;
      url = `/media/${img.id}/preview?w=1280&fit=inside`;
    } else if (vid?.poster_key) {
      previewUrl = `/media/${vid.id}/preview?w=512&poster=1`;
      url = `/media/${vid.id}/preview?w=1280&fit=inside&poster=1`;
    }
    return {
      id: e.id,
      title: e.title ?? "",
      eventDate: e.event_date,
      dateLabel: fmtDate(e.event_date),
      age: ageLabel(child.birth_date, e.event_date),
      previewUrl,
      url,
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
