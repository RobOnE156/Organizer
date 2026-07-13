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
