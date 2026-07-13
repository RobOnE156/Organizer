// Shared types for content server actions (kept out of the "use server" file).

export type MediaKind = "image" | "video" | "audio";

export type MediaInput = {
  storage_key: string;
  kind: MediaKind;
  mime: string;
  bytes: number;
  position: number;
};

export type CreateEntryResult = { error?: string; entryId?: string; householdId?: string };

// The fixed set of reactions (whitelisted server-side), usable on both
// entries and comments.
export const REACTION_EMOJIS = ["❤️", "😍", "😂", "🥰", "👏", "🎉"] as const;

export type ReactTarget = "entry" | "comment";

// Author colours: a distinguishable, colour-blind-friendly set, all dark
// enough for white avatar initials. Whitelisted server-side.
export const AUTHOR_COLORS = [
  "#0072B2", // blue
  "#009E73", // green
  "#D55E00", // vermillion
  "#CC79A7", // pink
  "#7A5CC0", // purple
  "#B8860B", // gold
  "#2E8B8B", // teal
  "#C2185B", // magenta
] as const;

// ---- search --------------------------------------------------------
export type SearchEntryHit = {
  id: string;
  title: string | null;
  body: string | null;
  place_name: string | null;
  event_date: string;
  author_id: string;
};

export type SearchCommentHit = {
  id: string;
  entry_id: string;
  body: string;
  author_id: string;
  created_at: string;
  entry_title: string | null;
  entry_date: string | null;
};

export type SearchResult = { entries: SearchEntryHit[]; comments: SearchCommentHit[]; error?: string };
