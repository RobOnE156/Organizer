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

// ---- video compression -------------------------------------------------
// A 4K phone video is huge; 1080p H.264 is plenty for phone + laptop and a
// fraction of the size. We re-encode by playing the video, drawing scaled
// frames to a canvas, tapping the audio through WebAudio, and recording the
// pair with MediaRecorder. Safety-first: only ever emit MP4/H.264 (never a
// WebM that Safari might not play), and on ANY doubt — unsupported browser,
// decode failure, no audio tap, unverifiable output, no size win — return the
// ORIGINAL untouched. The camera-roll copy also remains, so a video is never
// at risk. Realtime: a 30s clip takes ~30s (progress is reported meanwhile).
const VIDEO_MIN_BYTES = 12 * 1024 * 1024; // don't bother with already-small clips
const VIDEO_MAX_LONG = 1920;
const VIDEO_MAX_SHORT = 1080;
const VIDEO_BPS = 3_500_000;
const AUDIO_BPS = 128_000;

function pickMp4Mime(): string | null {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return null;
  const candidates = [
    'video/mp4;codecs="avc1.4d0028,mp4a.40.2"',
    "video/mp4;codecs=avc1,mp4a.40.2",
    "video/mp4;codecs=avc1",
    "video/mp4",
  ];
  for (const m of candidates) if (MediaRecorder.isTypeSupported(m)) return m;
  return null; // no MP4/H.264 recording → keep the original, never emit WebM
}

async function videoIsPlayable(blob: Blob, minDuration: number): Promise<boolean> {
  if (blob.size === 0) return false;
  const url = URL.createObjectURL(blob);
  const v = document.createElement("video");
  v.muted = true;
  v.preload = "metadata";
  v.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      const to = setTimeout(() => reject(new Error("timeout")), 8000);
      v.onloadedmetadata = () => {
        clearTimeout(to);
        resolve();
      };
      v.onerror = () => {
        clearTimeout(to);
        reject(new Error("error"));
      };
    });
    return v.videoWidth > 0 && v.videoHeight > 0 && Number.isFinite(v.duration) && v.duration >= minDuration * 0.8;
  } catch {
    return false;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function compressVideo(
  file: File,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<File> {
  if (!file.type.startsWith("video/")) return file;
  if (file.size < VIDEO_MIN_BYTES) return file;
  if (typeof document === "undefined" || typeof MediaRecorder === "undefined") return file;
  const mime = pickMp4Mime();
  if (!mime) return file;

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.preload = "auto";
  (video as unknown as { playsInline: boolean }).playsInline = true;
  let ac: AudioContext | null = null;
  const cleanup = () => {
    try {
      ac?.close();
    } catch {
      /* ignore */
    }
    URL.revokeObjectURL(url);
  };

  try {
    await new Promise<void>((resolve, reject) => {
      const to = setTimeout(() => reject(new Error("meta-timeout")), 15000);
      video.onloadedmetadata = () => {
        clearTimeout(to);
        resolve();
      };
      video.onerror = () => {
        clearTimeout(to);
        reject(new Error("decode"));
      };
    });

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const dur = video.duration;
    if (!vw || !vh || !Number.isFinite(dur) || dur <= 0) {
      cleanup();
      return file;
    }
    const long = Math.max(vw, vh);
    const short = Math.min(vw, vh);
    if (long <= VIDEO_MAX_LONG && short <= VIDEO_MAX_SHORT) {
      cleanup();
      return file; // already ≤1080p — re-encoding risks more than it saves
    }
    const scale = Math.min(VIDEO_MAX_LONG / long, VIDEO_MAX_SHORT / short, 1);
    const cw = Math.max(2, Math.round((vw * scale) / 2) * 2);
    const ch = Math.max(2, Math.round((vh * scale) / 2) * 2);
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx || typeof canvas.captureStream !== "function") {
      cleanup();
      return file;
    }

    const vStream = canvas.captureStream();
    const vTrack = vStream.getVideoTracks()[0];
    if (!vTrack) {
      cleanup();
      return file;
    }
    const tracks: MediaStreamTrack[] = [vTrack];
    // Tap the audio via WebAudio (works where HTMLMediaElement.captureStream
    // doesn't, e.g. Safari). If the graph can't be built, fall back to the
    // original rather than risk a silent copy of a precious memory.
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) {
        cleanup();
        return file;
      }
      ac = new AC();
      if (ac.state === "suspended") await ac.resume();
      const srcNode = ac.createMediaElementSource(video);
      const dest = ac.createMediaStreamDestination();
      srcNode.connect(dest);
      const aTrack = dest.stream.getAudioTracks()[0];
      if (!aTrack) {
        cleanup();
        return file;
      }
      tracks.push(aTrack);
    } catch {
      cleanup();
      return file;
    }

    const out = new MediaStream(tracks);
    const chunks: BlobPart[] = [];
    const rec = new MediaRecorder(out, { mimeType: mime, videoBitsPerSecond: VIDEO_BPS, audioBitsPerSecond: AUDIO_BPS });
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size) chunks.push(e.data);
    };

    let stopped = false;
    const stopRec = () => {
      if (stopped) return;
      stopped = true;
      try {
        if (rec.state !== "inactive") rec.stop();
      } catch {
        /* ignore */
      }
    };
    const onAbort = () => stopRec();
    signal?.addEventListener("abort", onAbort);

    const blob = await new Promise<Blob>((resolve, reject) => {
      const hard = setTimeout(
        () => {
          stopRec();
          reject(new Error("transcode-timeout"));
        },
        Math.max(20000, dur * 4000 + 10000),
      );
      rec.onstop = () => {
        clearTimeout(hard);
        resolve(new Blob(chunks, { type: "video/mp4" }));
      };
      rec.onerror = () => {
        clearTimeout(hard);
        reject(new Error("recorder"));
      };
      rec.start(1000);
      const useRVFC = "requestVideoFrameCallback" in video;
      const draw = () => {
        if (stopped) return;
        try {
          ctx.drawImage(video, 0, 0, cw, ch);
        } catch {
          /* keep going */
        }
        onProgress?.(Math.min(0.99, video.currentTime / dur));
        if (useRVFC) (video as unknown as { requestVideoFrameCallback: (cb: () => void) => void }).requestVideoFrameCallback(draw);
      };
      if (useRVFC) {
        (video as unknown as { requestVideoFrameCallback: (cb: () => void) => void }).requestVideoFrameCallback(draw);
      } else {
        const iv = setInterval(() => {
          if (stopped) {
            clearInterval(iv);
            return;
          }
          draw();
        }, 1000 / 30);
      }
      video.onended = () => stopRec();
      const play = video.play();
      if (play && typeof play.then === "function") play.catch(() => stopRec());
    });

    signal?.removeEventListener("abort", onAbort);
    onProgress?.(1);
    if (signal?.aborted) {
      cleanup();
      return file;
    }
    if (blob.size >= file.size) {
      cleanup();
      return file; // no size win
    }
    const ok = await videoIsPlayable(blob, dur);
    cleanup();
    if (!ok) return file;
    const base = file.name.replace(/\.[^./\\]+$/, "") || "video";
    return new File([blob], sanitize(base) + ".mp4", { type: "video/mp4", lastModified: file.lastModified });
  } catch {
    cleanup();
    return file;
  }
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
export type UploadProgress = {
  phase: "prepare" | "upload";
  done: number;
  total: number;
  loaded: number;
  totalBytes: number;
  fraction: number;
};

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

  // Prepare phase: shrink images (fast) and transcode big videos (realtime).
  // Reported as a "prepare" phase so the UI shows activity meanwhile.
  const prepared: File[] = [];
  for (let i = 0; i < files.length; i++) {
    if (signal?.aborted) return { items: [], aborted: true };
    const f = files[i]!;
    const emit = (vf: number) =>
      onProgress?.({
        phase: "prepare",
        done: i,
        total: files.length,
        loaded: 0,
        totalBytes: 1,
        fraction: files.length ? (i + vf) / files.length : 1,
      });
    emit(0);
    let out = f;
    if (f.type.startsWith("image/")) out = await compressImage(f);
    else if (f.type.startsWith("video/")) out = await compressVideo(f, (vf) => emit(vf), signal);
    prepared.push(out);
  }

  const totalBytes = prepared.reduce((s, f) => s + f.size, 0) || 1;
  const loaded = new Array(prepared.length).fill(0);
  let done = 0;
  const sum = () => loaded.reduce((s: number, n: number) => s + n, 0);
  const report = () =>
    onProgress?.({
      phase: "upload",
      done,
      total: prepared.length,
      loaded: sum(),
      totalBytes,
      fraction: Math.min(1, sum() / totalBytes),
    });
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
