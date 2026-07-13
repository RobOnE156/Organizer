// Pure helpers for the diary search — no IO, so they unit-test directly.

// Escape a user term for a SQL LIKE/ILIKE pattern so %, _ and \ are matched
// literally instead of acting as wildcards.
export function escapeLike(q: string): string {
  return q.replace(/[\\%_]/g, (c) => "\\" + c);
}

export type Snippet = { pre: string; hit: string; post: string };

// Build a short excerpt around the first (case-insensitive) match of `query`
// in `text`, with ellipses when trimmed. Returns null if there is no match.
export function makeSnippet(text: string, query: string, radius = 48): Snippet | null {
  if (!text || !query) return null;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i < 0) return null;
  const start = Math.max(0, i - radius);
  const end = Math.min(text.length, i + query.length + radius);
  const pre = (start > 0 ? "… " : "") + text.slice(start, i);
  const hit = text.slice(i, i + query.length);
  const post = text.slice(i + query.length, end) + (end < text.length ? " …" : "");
  return { pre, hit, post };
}
