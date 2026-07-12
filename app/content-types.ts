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
