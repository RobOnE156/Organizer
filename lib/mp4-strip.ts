// Remove location metadata (GPS) from an MP4/QuickTime (MOV) video, in the
// browser, without a decode. Phones write location into the `moov` box — either
// an Android/other `©xyz` atom in `udta`, or Apple's `meta`/`keys`/`ilst`
// mechanism (a `data` box holding an ISO-6709 string like "+43.46+011.88/").
//
// SAFETY, by construction:
//  - We only edit IN PLACE: a located atom is renamed to `free` (a box players
//    ignore) and its payload is zeroed. No box size ever changes, so every
//    `stco`/`co64` sample offset stays valid — playback cannot be corrupted.
//  - We FAIL CLOSED: any parsing anomaly, or any ISO-6709 coordinate string
//    still present in `moov` after scrubbing, returns { cleaned: false } with
//    the ORIGINAL bytes. Callers then treat the video as not-shareable rather
//    than risk leaking (or corrupting) it.

export type Mp4StripResult = { bytes: Uint8Array; cleaned: boolean };

const CONTAINERS = new Set(["moov", "udta", "meta", "ilst"]);

function u32(b: Uint8Array, i: number): number {
  return ((b[i]! << 24) | (b[i + 1]! << 16) | (b[i + 2]! << 8) | b[i + 3]!) >>> 0;
}

function typeStr(b: Uint8Array, i: number): string {
  return String.fromCharCode(b[i]!, b[i + 1]!, b[i + 2]!, b[i + 3]!);
}

// ISO-6709 coordinate signature: two signed decimal numbers (lat, lng).
const COORD_RE = /[+-]\d{1,3}\.\d{2,}[+-]\d{1,3}\.\d{2,}/;

function regionHasCoord(b: Uint8Array, start: number, end: number): boolean {
  let s = "";
  for (let i = start; i < end; i++) s += String.fromCharCode(b[i]!);
  return COORD_RE.test(s);
}

function neutralize(b: Uint8Array, boxStart: number, boxEnd: number, headerLen: number): void {
  // rename type -> "free"
  b[boxStart + 4] = 0x66; // f
  b[boxStart + 5] = 0x72; // r
  b[boxStart + 6] = 0x65; // e
  b[boxStart + 7] = 0x65; // e
  for (let i = boxStart + headerLen; i < boxEnd; i++) b[i] = 0; // zero payload
}

// Apple `meta` is a FullBox (4-byte version/flags before children) in ISO MP4
// but a plain box (children immediately) in QuickTime MOV. Both start their
// children with an `hdlr` box, so detect by where `hdlr` sits. Returns the
// number of bytes to skip (0 or 4), or throws if neither layout matches.
function metaChildOffset(b: Uint8Array, payloadStart: number, boxEnd: number): number {
  if (payloadStart + 8 <= boxEnd && typeStr(b, payloadStart + 4) === "hdlr") return 0; // QuickTime
  if (payloadStart + 12 <= boxEnd && typeStr(b, payloadStart + 8) === "hdlr") return 4; // ISO FullBox
  throw new Error("meta");
}

// Walk boxes in [start,end); recurse into location-bearing containers and
// neutralize any `©xyz` atom or `data` box that holds a coordinate. Throws on a
// structure that doesn't tile cleanly.
function walk(b: Uint8Array, start: number, end: number, depth: number): void {
  if (depth > 12) throw new Error("depth");
  let i = start;
  while (i + 8 <= end) {
    const size = u32(b, i);
    const type = typeStr(b, i + 4);
    let headerLen = 8;
    let boxEnd: number;
    if (size === 1) {
      // 64-bit size — only read the low 32 bits (a metadata box is never >4 GB)
      const hi = u32(b, i + 8);
      const lo = u32(b, i + 12);
      if (hi !== 0) throw new Error("huge");
      headerLen = 16;
      boxEnd = i + lo;
    } else if (size === 0) {
      boxEnd = end; // extends to the end of the container
    } else {
      boxEnd = i + size;
    }
    if (boxEnd < i + headerLen || boxEnd > end) throw new Error("bounds");
    const payloadStart = i + headerLen;

    if (type === "©xyz") {
      neutralize(b, i, boxEnd, headerLen);
    } else if (type === "data") {
      if (regionHasCoord(b, payloadStart, boxEnd)) neutralize(b, i, boxEnd, headerLen);
    } else if (CONTAINERS.has(type)) {
      const childStart = type === "meta" ? payloadStart + metaChildOffset(b, payloadStart, boxEnd) : payloadStart;
      walk(b, childStart, boxEnd, depth + 1);
    } else if (b[i + 4] === 0 && b[i + 5] === 0) {
      // ilst item box: its 4-byte type is a numeric key index — recurse to its `data`.
      walk(b, payloadStart, boxEnd, depth + 1);
    }
    // other leaf boxes: skip
    i = boxEnd;
  }
  if (i !== end) throw new Error("tile"); // boxes must tile the container exactly
}

// Find the top-level `moov` box's payload range [start,end), or null. Throws on
// a malformed top-level structure.
function findMoov(b: Uint8Array): { start: number; end: number } | null {
  let i = 0;
  let found: { start: number; end: number } | null = null;
  while (i + 8 <= b.length) {
    const size = u32(b, i);
    const type = typeStr(b, i + 4);
    let headerLen = 8;
    let boxEnd: number;
    if (size === 1) {
      const hi = u32(b, i + 8);
      const lo = u32(b, i + 12);
      if (hi !== 0) throw new Error("huge");
      headerLen = 16;
      boxEnd = i + lo;
    } else if (size === 0) {
      boxEnd = b.length;
    } else {
      boxEnd = i + size;
    }
    if (boxEnd < i + headerLen || boxEnd > b.length) throw new Error("bounds");
    if (type === "moov") found = { start: i + headerLen, end: boxEnd };
    i = boxEnd;
  }
  return found;
}

export function stripMp4Location(input: Uint8Array): Mp4StripResult {
  if (input.length < 16) return { bytes: input, cleaned: false };

  // Fast path: locate `moov` and check for a coordinate WITHOUT copying the
  // (possibly large) video. Only clone + scrub when there is location to remove.
  let moov: { start: number; end: number } | null;
  try {
    moov = findMoov(input);
  } catch {
    return { bytes: input, cleaned: false };
  }
  if (!moov) return { bytes: input, cleaned: false }; // not an MP4/MOV we can verify
  if (!regionHasCoord(input, moov.start, moov.end)) return { bytes: input, cleaned: true }; // nothing to strip

  const b = input.slice(); // there IS location — work on a copy so a failure keeps the original
  try {
    walk(b, moov.start, moov.end, 1);
  } catch {
    return { bytes: input, cleaned: false };
  }
  if (regionHasCoord(b, moov.start, moov.end)) return { bytes: input, cleaned: false }; // couldn't fully scrub
  return { bytes: b, cleaned: true };
}
