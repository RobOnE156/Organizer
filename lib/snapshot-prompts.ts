// The curated "who is <child> right now" prompt set. Shared by the snapshot
// form and the export, so labels never drift between them.

export type SnapshotPrompt = { key: string; label: string; placeholder: string };

export function snapshotPrompts(name: string): SnapshotPrompt[] {
  return [
    { key: "food", label: "Lieblingsessen", placeholder: "z. B. Nudeln mit Tomatensoße" },
    { key: "toy", label: "Lieblingsspielzeug", placeholder: "z. B. der rote Bagger" },
    { key: "word", label: "Lieblingswort / Lieblingsspruch", placeholder: "z. B. „Nochmal!“" },
    { key: "saying", label: "Lustigster Spruch (Kindermund)", placeholder: `Was hat ${name} Lustiges gesagt?` },
    { key: "obsession", label: "Aktuelle Obsession", placeholder: `Wofür interessiert sich ${name} gerade total?` },
    { key: "loves", label: "Liebt gerade", placeholder: "Menschen, Tiere, Orte, Aktivitäten …" },
    { key: "laugh", label: `Was bringt ${name} zum Lachen?`, placeholder: "" },
  ];
}
