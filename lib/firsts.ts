import type { MsgKey } from "@/lib/i18n";

// The canonical set of "firsts" for the collector. `key` is a stable
// identifier stored in milestones.key (so matching survives a language switch,
// unlike matching on the localized title); `label` is an i18n key.
export type FirstDef = { key: string; emoji: string; label: MsgKey };

export const FIRSTS: FirstDef[] = [
  { key: "first_smile", emoji: "😊", label: "firsts.smile" },
  { key: "first_laugh", emoji: "😄", label: "firsts.laugh" },
  { key: "slept_through", emoji: "😴", label: "firsts.slept" },
  { key: "rolled_over", emoji: "🔄", label: "firsts.roll" },
  { key: "first_tooth", emoji: "🦷", label: "firsts.tooth" },
  { key: "sat_up", emoji: "🪑", label: "firsts.sit" },
  { key: "ate_solid", emoji: "🥣", label: "firsts.solid" },
  { key: "crawled", emoji: "🐛", label: "firsts.crawl" },
  { key: "pulled_up", emoji: "🧍", label: "firsts.stand" },
  { key: "first_word", emoji: "💬", label: "firsts.word" },
  { key: "waved", emoji: "👋", label: "firsts.wave" },
  { key: "first_steps", emoji: "👣", label: "firsts.steps" },
  { key: "first_haircut", emoji: "✂️", label: "firsts.haircut" },
  { key: "first_birthday", emoji: "🎂", label: "firsts.birthday" },
];

export const FIRST_KEYS = new Set(FIRSTS.map((f) => f.key));
