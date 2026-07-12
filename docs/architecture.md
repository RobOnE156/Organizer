# Architecture

## The reframe

> The archive is the product; the app is only a viewer.

Over an 18-year horizon the dominant risk is **permanent loss** of the memories
(lock-out, accidental/malicious deletion, disk failure, the app/provider
disappearing), not a targeted attacker. Everything below follows from putting
**availability & longevity first**.

Four principles:

1. **Canonical store = open files, not rows in a proprietary app.** Originals in a
   dated folder structure + one open-format sidecar per entry (Markdown/JSON). The
   database is a derived index. Automatic **static-HTML export** + **3-2-1 backups**
   are the real 18-year guarantee.
2. **Don't build the media layer.** Photo/video processing (HEIC, transcoding,
   thumbnails, EXIF, dedup, import of existing libraries, background upload) is the
   hardest, riskiest and best-already-solved part → build on **Immich**.
3. **Concurrency is an append-only problem, not a CRDT problem.** Client-generated
   UUIDs + immutable entries + full revision history beats last-write-wins without
   the longevity risk of opaque CRDT blobs. Gives author attribution + undo for free.
4. **2D first.** 3D is a later, optional, non-archiving showcase layer.

## Route A — build on Immich (chosen)

```
Native capture apps (iOS/Android, Immich) ── background upload, HEIC originals, share sheet
      │
Immich (self-hosted, Hetzner EU) ── media storage, transcoding, thumbnails, EXIF,
      │                             dedup, Google-Takeout/iCloud import, backup story
      │  (API, asset IDs)
Our journal app (this repo, Next.js PWA) ── timeline (2D + later 3D), entries, growth,
      │                                      milestones, author badges, keepsake export
Managed Supabase (EU): Postgres + RLS + Auth (TOTP) ── journal metadata only
      │
Canonical archive: originals + Markdown/JSON sidecars + static-HTML export + 3-2-1 backup
```

**Why managed Supabase (not self-hosted):** for irreplaceable family data, self-hosting
Postgres/Auth is *riskier* than managed (unpatched CVEs, exposed ports, backup neglect,
single point of failure). Immich is self-hosted but has a mature backup/restore story.
More important than the hosting debate is the **3-2-1 backup/export discipline**, which
is required either way.

## Data model (this repo)

Defined in [`supabase/migrations/0001_schema.sql`](../supabase/migrations/0001_schema.sql).
Decisions locked in now because they are expensive to retrofit:

- **Multi-tenant from day 1:** `household_id` on every content row; a `memberships`
  table links users to households with a per-household role + colour. This is both the
  security boundary *and* the future product boundary (SaaS-ready) — the same work.
- **Children as first-class subjects** (siblings supported); entries link to one *or
  more* children via `entry_children`.
- **Three dates per entry:** `event_date` (timeline position, may pre-date birth) vs.
  `created_at`/`updated_at` (audit) vs. media `exif_taken_at` (capture time). Enables
  back-dating and importing old photos.
- **Soft-delete everywhere** (`deleted_at`) → trash + retention; no user-facing hard
  delete (protects against accidental & malicious loss).
- **Author attribution + revision history:** `created_by`/`updated_by` on entries and a
  trigger-populated `entry_revisions` log (who changed what → trust + undo).
- **Storage-agnostic media:** `media.store` = `supabase | immich`, plus `storage_key`
  / `immich_asset_id`. The media backend is a late-binding choice.
- **Privacy-aware geo:** `media.lat/lng/place_name/country_code` kept in the private
  archive (place *is* memory) but stripped on every outward share/export.
- **Monetization-ready without complexity:** `households.plan` + `entitlements` jsonb —
  a feature-flag seam only; everyone is "owner/unlimited" today.

Also modelled: `comments`, `reactions`, `growth_measurements` (WHO metrics),
`milestones`, `letters` (time capsule), `guest_invites` + `guest_contributions`
(account-less, moderated, token-hash only), and an `audit_log`.

## Security posture

See [security-privacy.md](security-privacy.md). In short: RLS default-deny on every
table, author-only editing of free text, private entries hidden from the co-parent,
account-less guest submission through a `SECURITY DEFINER` RPC (never touching tables
directly), and a pgTAP suite that proves these invariants in CI.

## Frontend

Next.js (App Router) PWA. Server Components + Route Handlers are used deliberately for
the security-sensitive bits the plan calls out: an authorising **signed-URL / streaming
proxy** for originals, **SSRF-safe oEmbed** for link previews, and **httpOnly-cookie**
sessions (not localStorage). 2D timeline first; the 3D showcase is a later layer over the
same data and must never block content or become an archive format.
