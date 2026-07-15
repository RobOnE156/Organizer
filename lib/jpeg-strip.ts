// Remove metadata segments (EXIF/GPS, IPTC) from a JPEG byte stream, keeping
// the image itself and colour-critical segments (JFIF, ICC). Pure and
// dependency-free: it walks the JPEG marker segments and drops APP1 (EXIF,
// which is where GPS lives) and APP13 (IPTC). Used to scrub location out of
// photos served through an outward share link.
//
// FAILS CLOSED: returns null if the input isn't a JPEG we can fully parse, so
// callers can refuse to serve it rather than leak an unstripped file. A
// successful parse returns the scrubbed bytes (possibly unchanged if there was
// no metadata to remove).
export function stripJpegExif(buf: Uint8Array): Uint8Array | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null; // not a JPEG (FFD8 = SOI)

  const parts: Uint8Array[] = [buf.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff) return null; // unexpected structure — refuse rather than risk a leak
    const marker = buf[i + 1]!;
    // Start of Scan / End of Image: the rest is entropy-coded data — copy it verbatim.
    if (marker === 0xda || marker === 0xd9) {
      parts.push(buf.subarray(i));
      return concat(parts);
    }
    const len = (buf[i + 2]! << 8) | buf[i + 3]!; // segment length includes these 2 bytes
    const segEnd = i + 2 + len;
    if (len < 2 || segEnd > buf.length) return null; // malformed — refuse
    const drop = marker === 0xe1 || marker === 0xed; // APP1 (EXIF/GPS), APP13 (IPTC)
    if (!drop) parts.push(buf.subarray(i, segEnd));
    i = segEnd;
  }
  return concat(parts);
}

function concat(parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}
