# Setup: managed Supabase (EU) — step by step

This gets a real database + auth running so the app can log in for real. Free tier is
enough for two people (we only store metadata; media comes later). ~15 minutes.

> You do these steps (they need your account). I can't provision hosting for you, but
> everything after "apply the migrations" is already built in this repo.

## 1. Create the project (EU region)

1. Go to **https://supabase.com** → sign in → **New project**.
2. **Organization:** your own. **Name:** e.g. `benni-tagebuch`.
3. **Database password:** generate a strong one → **save it in your password manager**.
4. **Region:** pick an **EU** region — `Frankfurt (eu-central-1)` (Germany) is ideal.
5. Create. Wait ~2 minutes for it to provision.

## 2. Grab the keys

Project → **Settings → API**:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **Project API keys → `anon` `public`** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **`service_role` `secret`** → `SUPABASE_SERVICE_ROLE_KEY`
  **(server-only — never put this in a `NEXT_PUBLIC_*` var, the browser, or a commit).**

Create `.env.local` in the repo root (copy from `.env.example`) and paste them in.

## 3. Apply the database migrations

Two options — either is fine.

**Option A — SQL editor (no tools):**
Project → **SQL Editor → New query**. Paste and **Run** each file **in order**:

1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_rls.sql`
3. `supabase/migrations/0003_household_invites.sql`

(Skip `supabase/tests/**` — that's the local test harness, not for the cloud DB.)

**Option B — Supabase CLI (repeatable, recommended long-term):**

```bash
npm install -g supabase          # or: brew install supabase/tap/supabase
supabase login
supabase link --project-ref <your-project-ref>   # from the project URL / settings
supabase db push                                  # applies supabase/migrations/*
```

Verify: **Table editor** should now show `households`, `memberships`, `entries`,
`children`, `media`, … and **Authentication → Policies** should show RLS enabled.

## 4. Configure Auth

Project → **Authentication**:

- **Providers → Email:** enabled (default).
- **For the first end-to-end test**, temporarily turn **"Confirm email" OFF**
  (Authentication → Providers → Email → *Confirm email*). This lets sign-up create a
  session immediately so you can click through onboarding. **Turn it back ON**
  (or configure SMTP) before real use.
- **Multi-factor (TOTP):** ensure app-based MFA is allowed (Authentication → settings;
  TOTP factors are enabled by default on Supabase). The app enrolls it under
  **Settings → Zwei-Faktor**.
- **URL configuration → Site URL:** `http://localhost:3000` for local dev
  (add your real domain later). Add it to **Redirect URLs** too.

## 5. Run the app

```bash
npm install
npm run dev            # http://localhost:3000
```

Expected first run:

1. `/` redirects to **/login**. Click **Registrieren** → create your account.
2. You land on **/onboarding** → **Haushalt anlegen** (creates the household and makes
   you the owner via the `create_household` RPC).
3. **Settings → Zwei-Faktor** → scan the QR with an authenticator app → enter the code.
   Next login will ask for the 6-digit code.
4. **Settings → Haushalt & Einladung** → **Einladungs-Code erzeugen** → give the code to
   the second parent. They register and enter it during onboarding to join.

## 6. Before real data goes in

- Turn **email confirmation back on** (or wire SMTP) so accounts are verified.
- Read **[continuity-runbook.md](continuity-runbook.md)** and set up backups + the
  quarterly restore test. Supabase's automated backups are copy #1, not the whole 3-2-1.
- Keep the `service_role` key and DB password only in your password manager.

## Troubleshooting

- **"Supabase ist noch nicht konfiguriert"** on `/` → `.env.local` missing/empty or the
  dev server wasn't restarted after adding it.
- **Sign-up seems to do nothing** → email confirmation is ON; check your inbox, or turn
  it off for testing (step 4).
- **RLS/permission errors** → a migration didn't apply; re-run step 3 in order.
