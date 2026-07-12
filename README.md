# Benni-Tagebuch

A **private, secure digital baby diary** for two parents to fill together — photos,
videos, voice notes, text and milestones along a beautiful timeline — built to be
handed to the child later and to last **18+ years**.

> **Guiding principle: the archive is the product; the app is just a viewer.**
> For an 18-year keepsake the worst case is not a hacker but the silent, permanent
> loss of the memories. Availability & longevity come first — hence automatic
> exports, 3-2-1 backups and open file formats are first-class, not afterthoughts.

This repository is being built **foundation-first**: the security and data model
(the top priority from the plan) before the UI. The look & feel has been validated
in a separate clickable prototype.

## What's in here now

| Area | Path | Status |
|------|------|--------|
| Database schema (multi-tenant, soft-delete, author attribution, 3 dates) | `supabase/migrations/0001_schema.sql` | ✅ |
| Row-Level Security policies (household isolation, author-only edit, private entries, no hard-delete) | `supabase/migrations/0002_rls.sql` | ✅ |
| RLS security tests (pgTAP, 21 assertions) run against real Postgres in CI | `supabase/tests/`, `tests/rls/run.sh` | ✅ |
| Next.js (App Router) PWA skeleton + hardened headers + Supabase SSR clients | `app/`, `lib/`, `middleware.ts`, `next.config.mjs` | ✅ scaffold |
| CI: RLS suite + web typecheck/build on every push | `.github/workflows/ci.yml` | ✅ |
| DSGVO / architecture / continuity docs | `docs/` | ✅ living docs |
| Auth flows (email + TOTP), timeline & entry UI, media pipeline, export | — | ⏭ next |

See **[docs/roadmap.md](docs/roadmap.md)** for the phased plan (v0 → v3) and what comes next.

## Architecture (short)

- **Route A — build on Immich** for the media layer (HEIC, transcoding, import, native
  capture apps, backup story). The journal/timeline layer is ours.
- **Journal DB + Auth on managed Supabase (EU)** — Postgres + RLS + TOTP.
- **Media is storage-agnostic** in the schema (`media.store` = `supabase` | `immich`),
  so the media backend can be chosen/switched without a data migration.
- **2D first.** A 3D showcase is a later, non-load-bearing layer over the same data.

Full detail: **[docs/architecture.md](docs/architecture.md)** ·
Security & DSGVO: **[docs/security-privacy.md](docs/security-privacy.md)** ·
Backups & handover: **[docs/continuity-runbook.md](docs/continuity-runbook.md)**.

## Develop

```bash
# 1. Web app
cp .env.example .env.local          # fill in Supabase URL + anon key
npm install
npm run dev                         # http://localhost:3000
npm run typecheck && npm run build

# 2. Security tests — real Postgres + pgTAP, no cloud needed
#    (Ubuntu: sudo apt-get install -y postgresql postgresql-16-pgtap \
#             libtap-parser-sourcehandler-pgtap-perl)
sudo -u postgres bash tests/rls/run.sh
```

The RLS suite spins up a throwaway database, loads a tiny Supabase shim
(`supabase/tests/harness/`), applies the real migrations, and proves the security
invariants with pgTAP. The same script runs in CI.

## Security note

Every table is default-deny with Row-Level Security. The anon key is public by
design; it can only reach data the signed-in user's household owns. The
`service_role` key bypasses RLS and must **never** appear in the browser, logs or a
`NEXT_PUBLIC_*` variable. Report anything sensitive privately, not via a public issue.

_Private family project — all rights reserved._
