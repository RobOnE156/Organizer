import type { SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import type { MediaInput, MediaKind } from "@/app/content-types";

// Browser-side media upload helpers: shrink big phone photos before upload,
// report real byte-level progress (so a slow video never looks frozen), and
// upload several files at once. Used by the new-entry and edit-entry forms.

export function kindOf(type: string): MediaKind {
  if (type.startsWith("video")) return "video";
  if (type.startsWith("audio")) return "audio";
  return "image";
}

export function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
}

// ---- image compression -------------------------------------------------
// A modern phone photo is often 4000+px and 3–12 MB. 2048px on the long edge
// at JPEG q0.82 is indistinguishable on a phone or laptop but a fraction of
// the size — the single biggest upload speed-up. Re-encoding also strips EXIF
// (incl. GPS) from the stored copy; the map still gets coordinates because the
// forms read them from the ORIGINAL file before calling this.
const IMG_MAX_DIM = 2048;
const IMG_QUALITY = 0.82;
const SKIP_UNDER_BYTES = 500 * 1024;

function jpegName(name: string): string {
  const base = name.replace(/\.[^./\\]+$/, "") || "foto";
  return sanitize(base) + ".jpg";
}

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (/gif|svg/i.test(file.type)) return file; // keep animation / vectors
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;

  let bitmap: ImageBitmap;
  try {
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      bitmap = await createImageBitmap(file); // option unsupported on older engines
    }
  } catch {
    return file; // undecodable in this browser (e.g. HEIC) — upload as-is
  }

  const { width, height } = bitmap;
  const scale = Math.min(1, IMG_MAX_DIM / Math.max(width, height));
  if (scale === 1 && file.size < SKIP_UNDER_BYTES) {
    bitmap.close?.();
    return file; // already small and modestly sized — not worth re-encoding
  }
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", IMG_QUALITY));
  if (!blob) return file;
  if (blob.size >= file.size && scale === 1) return file; // no gain
  return new File([blob], jpegName(file.name), { type: "image/jpeg", lastModified: file.lastModified });
}

// ---- upload with progress ---------------------------------------------
// supabase-js .upload() gives no progress events, so POST straight to the
// Storage REST endpoint with the session token via XHR — the server still sets
// owner = auth.uid(), so the same RLS insert policy applies.
export async function uploadWithProgress(
  supabase: SupabaseClient,
  path: string,
  file: File,
  onProgress: (loadedBytes: number) => void,
  signal?: AbortSignal,
): Promise<{ error?: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: "not-authenticated" };
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  const endpoint = `${publicEnv.supabaseUrl}/storage/v1/object/media/${encoded}`;

  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve({ error: "aborted" });
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint, true);
    xhr.setRequestHeader("authorization", `Bearer ${token}`);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "max-age=3600");
    if (file.type) xhr.setRequestHeader("content-type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve({})
        : resolve({ error: `HTTP ${xhr.status}${xhr.responseText ? ": " + xhr.responseText.slice(0, 160) : ""}` });
    xhr.onerror = () => resolve({ error: "network" });
    xhr.onabort = () => resolve({ error: "aborted" });
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(file);
  });
}

// ---- orchestration -----------------------------------------------------
export type UploadProgress = { done: number; total: number; loaded: number; totalBytes: number; fraction: number };

export async function uploadEntryMedia(opts: {
  supabase: SupabaseClient;
  householdId: string;
  entryId: string;
  files: File[];
  startPosition?: number;
  onProgress?: (p: UploadProgress) => void;
  signal?: AbortSignal;
  concurrency?: number;
}): Promise<{ items: MediaInput[]; error?: string; aborted?: boolean }> {
  const { supabase, householdId, entryId, files, startPosition = 0, onProgress, signal } = opts;
  const concurrency = opts.concurrency ?? 3;

  // Shrink images up front; videos/audio pass through untouched.
  const prepared = await Promise.all(files.map((f) => compressImage(f)));
  const totalBytes = prepared.reduce((s, f) => s + f.size, 0) || 1;
  const loaded = new Array(prepared.length).fill(0);
  let done = 0;
  const sum = () => loaded.reduce((s: number, n: number) => s + n, 0);
  const report = () =>
    onProgress?.({ done, total: prepared.length, loaded: sum(), totalBytes, fraction: Math.min(1, sum() / totalBytes) });
  report();

  const items: (MediaInput | null)[] = new Array(prepared.length).fill(null);
  let firstError: string | undefined;
  let aborted = false;
  let next = 0;

  async function worker() {
    while (!firstError && !aborted && !signal?.aborted) {
      const i = next++;
      if (i >= prepared.length) return;
      const file = prepared[i]!;
      const orig = files[i]!;
      const path = `${householdId}/${entryId}/${startPosition + i}-${sanitize(file.name)}`;
      const res = await uploadWithProgress(
        supabase,
        path,
        file,
        (lb) => {
          loaded[i] = lb;
          report();
        },
        signal,
      );
      if (res.error === "aborted") {
        aborted = true;
        return;
      }
      if (res.error) {
        firstError ??= res.error;
        return;
      }
      loaded[i] = file.size;
      done++;
      report();
      items[i] = {
        storage_key: path,
        kind: kindOf(orig.type),
        mime: file.type,
        bytes: file.size,
        position: startPosition + i,
      };
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, prepared.length) }, () => worker()));

  const good = items.filter((x): x is MediaInput => x !== null);
  if (firstError) return { items: good, error: firstError };
  if (aborted || signal?.aborted) return { items: good, aborted: true };
  return { items: good };
}
