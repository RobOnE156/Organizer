# Continuity & Handover Runbook

The most important document in the project. If everything else is lost but the backups
and this runbook survive, the memories survive.

> Status: this is the **target** runbook. Steps are marked ☐ until the corresponding
> infrastructure exists. Fill in the bracketed specifics when you provision it.

## 1. 3-2-1 backup (the one rule that matters)

- **3** copies of the data, on **2** different media, with **1** off-site.
- ☐ Copy A — primary: Immich media + Postgres (managed Supabase automated backups).
- ☐ Copy B — local: nightly `pg_dump` + Immich library rsync to a NAS/USB drive at home.
- ☐ Copy C — off-site, **encrypted**: Backblaze B2 or a second Hetzner Storage Box.
- ☐ Automatic **full export** (originals + static HTML + JSON sidecars) to encrypted
  cold storage on a schedule.

## 2. Restore test (prove the guarantee)

The single most important test in the whole project — run it **quarterly**:

☐ Take a backup → restore it on a *different* machine → confirm a known photo + its
  metadata (author, date, caption, growth, milestone) come back intact and the static
  HTML opens offline in a browser. Record the date + result below.

| Date | Who | Result | Notes |
|------|-----|--------|-------|
|      |     |        |       |

## 3. Backup dead-man's switch

☐ Email/push alert if a backup job or the server fails (no green ping within N hours).
☐ Periodic reminder: "restore one file as a test." Silent failure is the enemy over
  18 years.

## 4. Lock-out & recovery (solve before real data goes in)

- ☐ **Two equal parent accounts** — never a single shared login.
- ☐ Passkeys synced via iCloud/Google on each parent's devices.
- ☐ **Recovery codes printed and stored in two physical locations.**
- ☐ Documented **break-glass** path (regain access if both factors are lost).
- ☐ **AAL2 required** for: password reset, MFA change, export, delete.
- ☐ Social recovery: each parent can help restore the other's access.

## 5. Digital legacy (death of a parent)

- ☐ Written plan: who inherits access, where the recovery codes are, how to reach the
  hosting accounts, and how to keep paying for hosting.
- ☐ At least one trusted third party knows the plan exists and where to find it.

## 6. Separation / malicious-deletion protection

- ☐ Soft-delete + trash + retention window (already enforced in the schema).
- ☐ Cooldown / two-party confirmation for bulk deletion.
- ☐ Both parents keep a full copy via regular export → neither can unilaterally erase
  the archive.

## 7. Hosting accounts & secrets (fill in — do NOT commit real values)

| Item | Provider | Owner | Where the credential lives |
|------|----------|-------|----------------------------|
| Journal DB / Auth | Supabase (EU) | | password manager |
| Media / Immich host | Hetzner (EU) | | password manager |
| Off-site backup | [B2 / Storage Box] | | password manager |
| Domain | [registrar] | | password manager |
| Transactional email | [provider] | | password manager |

Secrets never live in the repo. `service_role` / JWT secret are server-only.
