# Roadmap

Phased so no single release is impossibly large. Each of {video transcoding, offline
sync, 3D, passkeys+TOTP, correct RLS} is multi-week on its own, so they are sequenced.

## v0 — prove the foundation (infrastructure; needs your accounts)
- ☐ Immich on Hetzner (EU) + backups + Google-Takeout import.
- ☐ Media in/out + **3-2-1 restore test** *before* trusting it with real memories.
- ☐ (Evaluate **Journiv** — an open-source child diary with Immich integration — to
  adopt/fork instead of starting the journal layer from zero.)
- ☐ Managed Supabase (EU) project; link this repo's migrations.

## v1 — real MVP ("can we live in it for 3 months?")
- ✅ Data model + RLS + pgTAP security suite (this repo).
- ✅ Next.js PWA skeleton + hardened headers + Supabase SSR clients.
- ⏭ Auth: email + password + **TOTP** (passkeys later); AAL2 for sensitive ops.
- ⏭ Household bootstrap + invite the second parent.
- ⏭ Entries (event_date, author, text, photos) + growth + milestones.
- ⏭ 2D timeline grouped by age/month; author badges; trash; basic revision history.
- ⏭ **Automatic backup + one-click export (originals + static HTML) in the MVP.**
- Photos first; play video originals natively (4K transcoding → v1.1 / via Immich).
- **No 3D.**

## v1.1
- ⏭ Video transcoding (H.264 + poster) or via Immich; voice notes + transcripts;
  "on this day"; favourites.

## v2
- ⏭ Multiple children, people/tags/place, WHO percentile curves, grandparent read-only,
  writing prompts + gentle reminders, year-in-review / photo-book PDF.
- ⏭ Guest memories via expiring links (schema already present); moderation queue.
- ⏭ Read-only handover / gift mode + child self-export (prototyped; port to real stack).

## v3 (delight, optional)
- ⏭ Capacitor native app (background upload, share extension, HEIC originals), passkeys,
  and the **3D showcase** layer over the same data.

## Always-on
- Automatic export + 3-2-1 backups + documented handover/legacy plan
  (see [continuity-runbook.md](continuity-runbook.md)).

---

### Immediate next step
Wire **auth** (email + password + TOTP) and the **household bootstrap** flow against the
Supabase project, then the first real **timeline + create-entry** screens — reusing the
look & feel already validated in the prototype.
