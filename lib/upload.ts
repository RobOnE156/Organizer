import type { SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { stripMp4Location } from "@/lib/mp4-strip";
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

// Never let a single stubborn photo stall the whole save: if any step takes too
// long (a HEIC that a browser struggles to decode, memory pressure on a phone),
// give up and fall back to the original file.
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (/gif|svg/i.test(file.type)) return file; // keep animation / vectors
  if (typeof document === "undefined") return file;

  // HEIC/HEIF must always be re-encoded to JPEG: iOS shows it in an <img>, but
  // it cannot be drawn into a <canvas>/WebGL texture (blank discs in the 3D
  // view) and most non-Apple browsers can't open it at all. So don't take the
  // "already small, skip re-encoding" shortcut for these.
  const isHeic = /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);

  // Decode via <img>, not createImageBitmap: iOS Safari renders HEIC in <img>
  // but can hang/fail on createImageBitmap, which was stalling multi-photo
  // saves. <img> also applies EXIF orientation when drawn to a canvas.
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.decoding = "async";
  try {
    img.src = url;
    const ready = img.decode
      ? img.decode()
      : new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("load"));
        });
    await withTimeout(ready, 10000);
  } catch {
    URL.revokeObjectURL(url);
    return file; // undecodable or too slow — upload the original, never hang
  }

  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (!iw || !ih) {
    URL.revokeObjectURL(url);
    return file;
  }
  const scale = Math.min(1, IMG_MAX_DIM / Math.max(iw, ih));
  if (scale === 1 && file.size < SKIP_UNDER_BYTES && !isHeic) {
    URL.revokeObjectURL(url);
    return file; // already small and modestly sized — not worth re-encoding
  }
  const w = Math.max(1, Math.round(iw * scale));
  const h = Math.max(1, Math.round(ih * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(url);
    return file;
  }
  try {
    ctx.drawImage(img, 0, 0, w, h);
  } catch {
    URL.revokeObjectURL(url);
    return file;
  }
  URL.revokeObjectURL(url);
  img.src = ""; // let the phone reclaim the decoded image promptly

  let blob: Blob | null = null;
  try {
    blob = await withTimeout(new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", IMG_QUALITY)), 10000);
  } catch {
    blob = null;
  }
  canvas.width = 0; // free the backing store
  canvas.height = 0;
  if (!blob) return file;
  // Keep the JPEG for HEIC even if it's not smaller — compatibility is the win.
  if (blob.size >= file.size && scale === 1 && !isHeic) return file; // no gain
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

// Grab a still frame from a video for use as a timeline poster (so a video
// tile shows a preview instead of a black box). Best-effort: returns null on
// any failure, in which case the tile falls back to a #t media-fragment poster.
async function makeVideoPoster(file: File): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  (video as unknown as { playsInline: boolean }).playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    await withTimeout(
      new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error("load"));
      }),
      12000,
    );
    // Seek slightly in to avoid an all-black first frame; ignore seek failures.
    const target = Math.min(0.1, (Number.isFinite(video.duration) ? video.duration : 1) / 2);
    await withTimeout(
      new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
        try {
          video.currentTime = target;
        } catch {
          resolve();
        }
      }),
      6000,
    ).catch(() => {});
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) {
      URL.revokeObjectURL(url);
      return null;
    }
    const scale = Math.min(1, 1280 / Math.max(w, h));
    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(url);
      return null;
    }
    ctx.drawImage(video, 0, 0, cw, ch);
    URL.revokeObjectURL(url);
    return await withTimeout(new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.8)), 8000).catch(() => null);
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

// Strip a video's embedded GPS location before upload so the stored file — and
// anything a share serves from it — carries no location. Returns the cleaned
// file + whether it is now verifiably location-free; on any doubt keeps the
// original and reports clean:false (the share then won't expose it).
async function scrubVideoLocation(file: File): Promise<{ file: File; clean: boolean }> {
  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    const res = stripMp4Location(buf);
    if (!res.cleaned) return { file, clean: false };
    if (res.bytes === buf) return { file, clean: true }; // no location present — original is fine
    const blob = new Blob([res.bytes as unknown as BlobPart], { type: file.type });
    return { file: new File([blob], file.name, { type: file.type, lastModified: file.lastModified }), clean: true };
  } catch {
    return { file, clean: false };
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

    // Idle watchdog: abort only if the upload makes NO progress for 60s (a
    // stalled connection that never fires load/error), not merely because a big
    // file is slow — resetting on each progress tick keeps slow-but-moving
    // uploads alive.
    let timedOut = false;
    let idle: ReturnType<typeof setTimeout>;
    const armIdle = () => {
      clearTimeout(idle);
      idle = setTimeout(() => {
        timedOut = true;
        try {
          xhr.abort();
        } catch {
          /* ignore */
        }
      }, 60000);
    };

    xhr.upload.onprogress = (e) => {
      armIdle();
      if (e.lengthComputable) onProgress(e.loaded);
    };
    xhr.onload = () => {
      clearTimeout(idle);
      xhr.status >= 200 && xhr.status < 300
        ? resolve({})
        : resolve({ error: `HTTP ${xhr.status}${xhr.responseText ? ": " + xhr.responseText.slice(0, 160) : ""}` });
    };
    xhr.onerror = () => {
      clearTimeout(idle);
      resolve({ error: "network" });
    };
    xhr.onabort = () => {
      clearTimeout(idle);
      resolve({ error: timedOut ? "timeout" : "aborted" });
    };
    signal?.addEventListener("abort", () => xhr.abort());
    armIdle();
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
  const locationClean: boolean[] = [];
  const posters: (Blob | null)[] = [];
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
    // Images are served through the EXIF-stripping share proxy, and audio has
    // no realistic location vector — both are "location clean" for sharing.
    let clean = true;
    let poster: Blob | null = null;
    if (f.type.startsWith("image/")) {
      out = await compressImage(f);
    } else if (f.type.startsWith("video/")) {
      out = await compressVideo(f, (vf) => emit(vf), signal);
      const scrubbed = await scrubVideoLocation(out);
      out = scrubbed.file;
      clean = scrubbed.clean;
      poster = await makeVideoPoster(out);
    }
    prepared.push(out);
    locationClean.push(clean);
    posters.push(poster);
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
      // Upload the video poster (best-effort — a failure just means no preview).
      let posterKey: string | null = null;
      const poster = posters[i];
      if (poster) {
        const pPath = `${householdId}/${entryId}/poster-${startPosition + i}.jpg`;
        const { error: pErr } = await supabase.storage
          .from("media")
          .upload(pPath, poster, { contentType: "image/jpeg", upsert: false });
        if (!pErr) posterKey = pPath;
      }
      items[i] = {
        storage_key: path,
        kind: kindOf(orig.type),
        mime: file.type,
        bytes: file.size,
        position: startPosition + i,
        location_clean: locationClean[i] ?? true,
        poster_key: posterKey,
      };
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, prepared.length) }, () => worker()));

  const good = items.filter((x): x is MediaInput => x !== null);
  if (firstError) return { items: good, error: firstError };
  if (aborted || signal?.aborted) return { items: good, aborted: true };
  return { items: good };
}
