// The curated "who is <child> right now" prompt set. Shared by the snapshot
// form and the export, so labels never drift between them. Language-aware:
// the answer keys are stable; only the display labels/placeholders translate.

import { translator, type Lang } from "@/lib/i18n";

export type SnapshotPrompt = { key: string; label: string; placeholder: string };

export function snapshotPrompts(name: string, lang: Lang = "de"): SnapshotPrompt[] {
  const t = translator(lang);
  return [
    { key: "food", label: t("sp.food.l"), placeholder: t("sp.food.p") },
    { key: "toy", label: t("sp.toy.l"), placeholder: t("sp.toy.p") },
    { key: "word", label: t("sp.word.l"), placeholder: t("sp.word.p") },
    { key: "saying", label: t("sp.saying.l"), placeholder: t("sp.saying.p", { name }) },
    { key: "obsession", label: t("sp.obsession.l"), placeholder: t("sp.obsession.p", { name }) },
    { key: "loves", label: t("sp.loves.l"), placeholder: t("sp.loves.p") },
    { key: "laugh", label: t("sp.laugh.l", { name }), placeholder: "" },
  ];
}
