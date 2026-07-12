# Security & Privacy (DSGVO)

Priority order follows the red-team review: **availability & recovery first**, then
confidentiality. Items marked ✅ are implemented in this repo; others are planned and
tracked here so nothing is forgotten.

## Implemented in this repo

- ✅ **RLS default-deny on every table.** `anon` has no table privileges at all;
  `authenticated` has DML but RLS filters rows. See
  [`0002_rls.sql`](../supabase/migrations/0002_rls.sql).
- ✅ **Household isolation as a tested invariant.** Membership-scoped `USING` +
  `WITH CHECK` on every policy; helper functions are `SECURITY DEFINER STABLE` with an
  empty `search_path` and fully-qualified names (no recursion, not search-path hijackable).
- ✅ **Author-only editing.** An entry's free text is editable only by its creator;
  comments only by the comment's author. Co-parents comment, they don't co-edit — which
  also removes most concurrency conflicts.
- ✅ **Private entries** (`is_private`) are hidden from the co-parent at the database
  level and revealed only to the author (and, later, to the child in handover mode).
- ✅ **No user-facing hard delete.** Removal is a soft-delete (`deleted_at`); there are
  no `DELETE` policies on content tables.
- ✅ **Account-less guest contributions** go through a `SECURITY DEFINER` RPC that
  validates the invite by **SHA-256 token hash** (the raw token is never stored) and
  writes a *pending* row for moderation — guests never touch tables directly.
- ✅ **pgTAP proof in CI** that anon access is denied, cross-household access is denied,
  forged-author / cross-household inserts are denied, and author-only edit holds.
- ✅ **Web hardening baseline:** `X-Content-Type-Options`, `X-Frame-Options: DENY`,
  `Referrer-Policy: no-referrer`, `Permissions-Policy`, HSTS; sessions in httpOnly
  cookies via `@supabase/ssr` (not localStorage). `poweredByHeader` off.

## Planned (tracked, not yet built)

- **[CRITICAL] 3-2-1 backup + automatic encrypted cold-storage exports.** The single
  measure against lock-out, separation-deletion, disk failure, ransomware and
  self-host neglect at once. See [continuity-runbook.md](continuity-runbook.md).
- **[CRITICAL] Lock-out / recovery solved before launch:** two equal parent accounts
  (never a shared login), passkeys synced via iCloud/Google, recovery codes printed in
  **two physical places**, documented break-glass path + digital-legacy plan; **AAL2
  required** for password reset / MFA change / export / delete.
- **[CRITICAL] Separation & malicious deletion:** soft-delete + trash + retention
  window; cooldown / two-party confirmation for bulk deletion; everyone holds a full
  copy via regular export anyway.
- **[HIGH] EXIF/GPS:** keep GPS in the private archive (place is memory) but **strip it
  by default on every share/gift export** (GPS = home address). Modelled on `media`;
  the stripping happens in the export/share path.
- **[HIGH] Signed URLs hardened:** short TTL (60–300 s), on-demand, **never logged**,
  `Referrer-Policy: no-referrer`, CDN cache TTL tied to token TTL — or an authorising
  server streaming proxy for originals (real per-request auth, instantly revocable).
- **[HIGH] Passkeys primary** (phishing-resistant), TOTP fallback; rate-limiting +
  TOTP lockout + CAPTCHA on auth.
- **[HIGH] Nonce-CSP without `unsafe-inline`** via middleware; sanitise all user text
  (no raw HTML injection); service worker never caches private media and clears on logout.
- **[HIGH] DSGVO deletion that truly purges everywhere:** DB + originals + thumbnails +
  CDN cache + backups ("beyond use" / crypto-shredding); full, tested export.

## DSGVO housekeeping (to maintain)

- **Art. 30 record of processing** — controllers, purposes, categories, recipients,
  retention. (Child + health data ⇒ Art. 9 special category — handle with extra care.)
- **Deletion & retention concept** — trash window, hard-purge job, backup expiry.
- **AVV/DPA with every processor** — Supabase (EU), Hetzner, transactional email, push,
  error tracker. Keep the signed list here.
- **DPIA** worth considering (children's + health data).
- **Encryption stance:** *no* full E2EE for v1 (key loss = all photos gone forever,
  worse than "operator can read"; also breaks thumbnails/search/transcoding/handover).
  Start with TLS + at-rest + private buckets + mandatory MFA. Optional fast-follow:
  selective app-layer encryption of media blobs **with bulletproof, tested multi-copy
  key recovery** (brings crypto-shredding as a bonus).

## iOS PWA constraints (design around, don't fight)

No background sync, ~7-day storage eviction, no HEIC decode, no web share target.
→ online-first with an explicit "N uploads pending" UI; IndexedDB only as a fragile
outbox, never the sole source. If offline capture matters, ship the native Capacitor /
Immich apps earlier (Route A provides them anyway).
