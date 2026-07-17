# Benni‑Tagebuch — Projekt‑Kontext & Übergabe

> **Stand: 2026‑07‑17.** Diese Datei ist die zentrale Wissens‑ und Übergabe‑Quelle für die
> Weiterarbeit in neuen Chats. **Immer zuerst vollständig lesen, bevor du antwortest oder
> arbeitest.** Nach jeder größeren Änderung / jedem Feature aktualisieren, damit nichts an
> Kontext verloren geht (auch nicht beim automatischen „Compacting" langer Chats).

---

## 0. So arbeitest du mit dieser Datei
- **Vor jeder Antwort lesen.** Sie enthält alle getroffenen Entscheidungen, Regeln, den
  Feature‑Stand, offene Punkte und technische Fallstricke.
- **Nach jeder wesentlichen Änderung aktualisieren** (Feature‑Log, offene Punkte, Migrationen,
  „Stand"‑Datum oben). Lieber zu ausführlich als zu knapp.
- Sie liegt bewusst **im Repo** (wird bei jeder neuen Cloud‑Session mitgeklont) und wird über
  die Wurzel‑`CLAUDE.md` referenziert.

---

## 1. Projekt‑Überblick
- **Was:** privates, sicheres, **DSGVO‑konformes** digitales Baby‑Tagebuch **„Benni‑Tagebuch"**
  für den Sohn **Benni** zweier deutschsprachiger Eltern.
- **Nutzer‑Kontakt:** r.wolter@wolroy.com (weniger technischer Partner mitgedacht → einfache UX).
- **Live:** https://organizer-puce.vercel.app
- **Repo:** `RobOnE156/Organizer` (GitHub). **Branch (immer):** `claude/baby-diary-app-plan-4qncna`
- **Antwortsprache:** **Deutsch.**
- **Leitprinzip aus dem Plan:** *„Das Archiv ist das Produkt — die App nur ein Betrachter."*
  Oberste Prioritäten: **Sicherheit/Datenschutz** und **Langlebigkeit (18+ Jahre, kein stiller
  Datenverlust)**, dazu erstklassige UI/UX. Der große „Wow"‑Wunsch ist die 3D‑Timeline.

---

## 2. Tech‑Stack
- **Next.js 15** (App Router, React Server Components, Server Actions `"use server"`), **React 19**,
  **TypeScript strict + `noUncheckedIndexedAccess`** (Indexzugriffe können `undefined` sein → immer absichern).
- **Supabase** (EU/Frankfurt): Postgres + Auth (**TOTP‑MFA + AAL2**) + Storage (privater Bucket
  **`media`**) + **RLS** (default‑deny, `app.is_member(household_id)`). `@supabase/ssr`.
  Service‑Role‑Admin‑Client: `lib/supabase/admin.ts` (`createAdminClient`, `hasServiceRole`).
- **Vercel** (Hobby‑Plan), **Auto‑Deploy vom Branch**. Cronjobs via `vercel.json`.
- **E‑Mail:** Resend (`lib/email.ts`: `emailEnabled`, `sendEmail`, `appUrl`).
- **Medienverarbeitung:** `sharp ^0.35.3` (libvips 8.18.3, HEIF‑**Read** vorhanden, HEIF‑Encode NICHT),
  `heic-decode ^2.1.0` (libheif‑WASM) als HEIC‑Fallback, `jszip` (Export‑ZIP),
  `three ^0.171 / @react-three/fiber ^9.6.1 / @react-three/drei ^10.7.7` (3D, WebGL2),
  `@aws-sdk/client-s3 ^3.x` (Offsite‑Backup, S3‑kompatibel).
- **i18n:** `lib/i18n.ts` — Dictionary `satisfies Record<string,Msg>` mit `de/en/es`; hier `de` als Default.
  Neue UI‑Strings **immer** als i18n‑Key mit allen drei Sprachen anlegen.
- **Personalisierung/Theme:** Klassen auf `<html>` (a11y + Theme + Hell/Dunkel), CSS‑Custom‑Properties
  + `color-mix(in oklab, …)`. Variablen u. a. `--accent`, `--gold`, `--fg`, `--muted`, `--surface`, `--faint`, `--danger`.

---

## 3. Arbeitsregeln / persistente Constraints (PFLICHT)
- **Nur** auf Branch `claude/baby-diary-app-plan-4qncna` entwickeln **und** pushen. Kein anderer Branch.
- **Commits** mit `git -c user.email="RobOnE156@users.noreply.github.com" -c user.name="RobOnE156" commit …`.
- **Commit‑Message endet immer** mit den zwei Trailern:
  ```
  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01BzAuVsz7yKwBfn6zke1dx7
  ```
- **Modell‑ID (der exakte technische Bezeichner) NIEMALS** in Commits/PRs/Code‑Kommentaren/committeten
  Artefakten — nur im Chat. (Der Trailer „Claude Opus 4.8" ist erlaubt/Pflicht.)
- **Setup‑/How‑To‑Anleitungen (z. B. Env‑Var‑Einrichtung) NUR im Chat, NIE committen.**
  Diese Kontext‑Datei ist die einzige Ausnahme (Übergabe‑Doku, keine How‑To für Endnutzer).
- **Migrationen führt der Nutzer MANUELL** im Supabase SQL Editor aus. Ich liefere das SQL **im Chat**.
  (Migrationsdateien liegen im Repo unter `supabase/migrations/`, werden aber nicht automatisch angewandt.)
- **Kein Pull Request**, außer der Nutzer verlangt es ausdrücklich.
- **Push** mit `git push -u origin claude/baby-diary-app-plan-4qncna`, bei Netzwerkfehlern Retry mit Backoff.
- **Vor jeder Antwort diese Datei berücksichtigen.** Qualität vor Geschwindigkeit; keine Schritte überspringen.

---

## 4. Deployment & Umgebung (wichtig für Verifikation)
- `organizer-puce.vercel.app` ist **Production** und deployt **automatisch bei jedem Push** in den Branch.
  Zusätzlich gibt es Preview‑Deployments (`organizer-<hash>-wolroy.vercel.app`).
- **Deploy‑Timing beachten:** ~1–2 Min nach Push. Bei Tests **immer prüfen**, ob der *neueste* Commit
  in Vercel → Deployments als **„Production / Ready"** steht (sonst testet der Nutzer eine alte Version).
- **Diese Arbeitsumgebung erreicht `*.vercel.app` NICHT** (Proxy blockt Outbound). ⇒ Die **Live‑App
  kann ich nicht selbst aufrufen.** Verifikation der Live‑Umgebung läuft **nur über den Nutzer**
  (Screenshots, JSON aus Diagnose‑Endpunkten). Lokal geht `npm run build` und `npx next start`.
- **Vorhandene Vercel‑Env‑Vars** (Production + Preview): `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`,
  `APP_URL`, `EMAIL_FROM`, `RESEND_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Neu benötigt (noch NICHT gesetzt) fürs Offsite‑Backup:** `BACKUP_S3_ENDPOINT`, `BACKUP_S3_REGION`,
  `BACKUP_S3_BUCKET`, `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY`.
- **Neu benötigt (noch NICHT gesetzt) für den externen Backup‑Wächter:** `BACKUP_HEALTH_TOKEN` —
  schützt `GET /api/backup-health` (`?token=…` oder `Authorization: Bearer`). **Bewusst ein separates
  Secret** (NICHT `CRON_SECRET` wiederverwenden — das Token landet in den Logs des externen Monitors).
  Ohne gesetzte Env ist der Endpunkt offen (gibt aber nur `ok` + Fehlerkategorie preis, keine IDs/Keys).
- **Vercel‑Crons** (`vercel.json`): `/api/backup-reminder` täglich 09:00, `/api/backup-sync` täglich 03:00.
  Vercel injiziert bei Cron‑Aufrufen automatisch den Header `Authorization: Bearer $CRON_SECRET`.
  **Hobby‑Plan‑Limits (Stand 07/2026):** Crons dürfen nur **täglich** laufen (Auslösung irgendwann
  innerhalb der geplanten Stunde); seit 01/2026 sind bis zu 100 Cron‑Jobs/Projekt erlaubt. Entschieden:
  **kein dritter Cron** — die Backup‑Alarm‑Prüfung ist in den bestehenden 09:00‑Cron
  `/api/backup-reminder` eingehängt (gleicher Mail‑Kontext, ein Guard‑Satz), und `/api/backup-health`
  ist **kein** Vercel‑Cron, sondern wird **extern** gepollt (Stufe 2, echter Totmann‑Schalter).

---

## 5. Datenbank‑Migrationen — Status (SEHR WICHTIG)
- **0001–0028:** angewendet (App läuft mit allen Features).
- **0029_media_poster (`media.poster_key`):** **Status UNSICHER / vermutlich NICHT auf Production.**
  Der „weiße Kugeln"‑Bug entstand, weil die Vorschau‑Route `poster_key` selektierte und die Spalte
  **fehlte** → Select‑Fehler → 404 für *jede* Vorschau. Der Code hat jetzt überall einen **kaskadierenden
  Fallback** (erst mit `poster_key`, sonst ohne), funktioniert also auch ohne 0029. **Aber Video‑Standbilder
  (Poster) erscheinen erst, wenn 0029 wirklich läuft.** → **Nutzer bitten, 0029 zu prüfen/auszuführen.**
- **0030_backup_offsite (`backup_runs` + `backup_objects`):** **NEU, noch NICHT ausgeführt.** Nötig fürs
  automatische Offsite‑Backup. SQL wurde im Chat geliefert (siehe auch die Migrationsdatei im Repo).
- **0031_backup_alert (`backup_settings.last_alert_at` + Spalten‑Grants):** **NEU, noch NICHT ausgeführt.**
  Nötig für den E‑Mail‑Alarm (Totmann‑Schalter). Ohne 0031 verschickt der Alarm zwar (Cooldown‑Select
  schlägt fehl → wird wie „nie alarmiert“ behandelt), aber **täglich ohne Cooldown** — 0031 also zeitnah
  mit der Backup‑Aktivierung ausführen. Härtet zusätzlich die Grants: Mitglieder dürfen nur noch
  `household_id, interval_days, updated_at` schreiben (der Client‑Upsert braucht alle drei auf dem
  Konfliktpfad); `last_sent_at`/`last_alert_at` schreibt allein die Service‑Role (sonst könnte ein
  kompromittiertes Mitglieds‑Konto den Alarm still unterdrücken).

---

## 6. Feature‑Log — was existiert (Stand jetzt)
**Fundament / früher gebaut:** Auth (E‑Mail+Passwort + **TOTP‑MFA + AAL2**, Wiederherstellungscodes),
Einträge (Foto/Text/**Link mit oEmbed‑Vorschau**/**Sprachnotiz**/**Video**), **2D‑Timeline** (nach Monat
gruppiert, linke Datums‑Schiene), **Autor‑Kennzeichnung** (Avatar/Farbe), **Papierkorb** (Soft‑Delete),
**Wachstum**, **Meilensteine** + **„Erste Male"**, **Snapshots** („Wer ist Benni gerade"),
**Kommentare + Reaktionen**, **Highlights**, **Briefe an die Zukunft**, **Gäste‑Links** (ablaufend,
kontolos), **Weltkarte** aus EXIF‑Geodaten, **Suche**, **Foto‑Buch/Jahresrückblick‑PDF**,
**Familien‑/Share‑Lesezugang** (ablaufende Links, EXIF/GPS entfernt), **Benachrichtigungen + Aktivitätslog**,
**Ein‑Klick‑Export** (ZIP: Originale + Sidecars + Static‑HTML‑Viewer), **Backup‑Erinnerungen** (E‑Mail‑Cron),
**i18n de/en/es**, **Hell/Dunkel** (pro Profil), **12 Theme‑Farbschemata**, **Barrierefreiheit**.

**In den jüngsten Sessions gebaut (bestätigt vom Nutzer, sofern nicht anders vermerkt):**
1. 12 Theme‑Farbschemata mit getönten Flächen; Titel nur auf der Timeline größer.
2. Hell/Dunkel‑Umschalter (pro Nutzer) + einheitliche Kopf-/Fußzeile auf jeder Seite.
3. Read‑only Familien‑Lesezugang (Großeltern + Übergabe‑Links).
4. Upload‑Optimierung: Client‑Bildkompression (`<img>`‑decode, **nicht** `createImageBitmap` wg. iOS‑HEIC‑Hang),
   Fortschritt, parallele Uploads (Concurrency 3), XHR mit Idle‑Watchdog (60 s).
5. Echte Video‑Kompression (MediaRecorder → 1080p H.264, feature‑gated, MP4‑only fail‑safe).
6. Fix: Multi‑Foto‑Speichern hing auf iOS (Ursache HEIC + `createImageBitmap`).
7. Druckbares Foto‑Buch / Jahresrückblick‑PDF.
8. Qualitäts-/Härtungs‑Runde: **EXIF/GPS‑Leak in Shares gefunden & behoben** (EXIF‑strippender Bild‑Proxy
   `app/share/[token]/m/route.ts`, `lib/jpeg-strip.ts` fail‑closed), Video‑GPS‑Scrubbing (`lib/mp4-strip.ts`),
   Storage‑Key nie nach außen.
9. Video‑Standbilder (Poster, erster Frame) + Migration 0029 (`poster_key`).
10. **3D‑Showcase‑Timeline** (Helix/Spirale, `app/showcase/`), Performance vom Nutzer als „gut" bestätigt.
11. 3D‑Verfeinerungen: runde Vorschauen, **Datumsachse links** (auch in 2D als Schiene), atmosphärische
    Detailansicht (Blur‑Glow), 2D/3D‑Umschalt‑Button, Menü auch in 3D, **einheitliche TopNav** in 2D & 3D.
12. **Datums‑Führungslinien pro Erinnerung** (Jahr = gold/kräftig, Monat = mittel, Tag = dezent) +
    Inhalts‑Vorschau (Titel als Canvas‑Textur) für Karten ohne Foto.
13. **Serverseitiger Bild‑Transcode `/media/[id]/preview`** (HEIC→JPEG, s. §7 + §8).
14. **WHO‑Perzentilkurven** für **Gewicht + Größe** (siehe §9).
15. **„An diesem Tag"** gestuft (exakt → ±3 Tage → Monat) statt nur exakt‑tagesgenau.
16. **Automatisches Offsite‑Backup (3‑2‑1)** in S3‑kompatiblen Speicher (siehe §8, **aktueller Fokus**).
17. **E‑Mail‑Alarm / Totmann‑Schalter fürs Offsite‑Backup** (2 Stufen, siehe §8a): Stufe 1 =
    Alarm‑Mail aus dem 09:00‑Cron bei `error` sofort bzw. „überfällig“ (> 3 Tage), Wiederholung
    frühestens alle 3 Tage bis das Backup wieder gesund ist; Stufe 2 = `GET /api/backup-health`
    für einen externen Wächter (deckt auch „App/Cron komplett tot“ und „nie gelaufen“ ab).
    Migration 0031 + Env `BACKUP_HEALTH_TOKEN` nötig (noch offen, siehe §4/§5).

---

## 7. Die „weiße Kugeln"‑Saga (3D‑Vorschauen) — Chronik & endgültige Ursache
Langer Debugging‑Weg; **Kernlernpunkte für die Zukunft:**
- **iOS Safari kann HEIC in einem `<img>` anzeigen, aber NICHT als `<canvas>`/WebGL‑Textur** → in der
  3D‑Ansicht wurden solche Kugeln leer (weiß/schwarz).
- Zwischenschritte (alle im Git‑Log nachvollziehbar): Client‑Downscale vor GPU‑Upload, `img.decode()`,
  Blank‑Detection‑Fallback auf Titelkarte, HEIC‑Uploads immer als JPEG (`lib/upload.ts` gehärtet).
- **Endgültige Ursache der zuletzt hartnäckigen weißen Kugeln:** Die Route `/media/[id]/preview`
  selektierte **`poster_key`** (Migration 0029), die Spalte **fehlte auf Production** → Select‑Fehler →
  **404 für jede Vorschau** → weiße/leere Kacheln. **Fix:** kaskadierender Select (erst mit `poster_key`,
  sonst ohne) in `lib/media-preview.ts` (Commit `b4f29d7`).
- **Zweiter Client‑Fix:** `img.crossOrigin="anonymous"` darf für **same‑origin** URLs (die eigene
  `/media`‑Route) **NICHT** gesetzt werden (sonst CORS‑Modus → Cookie kann fehlen / Canvas „tainted" →
  weiße Grundfarbe). Wird jetzt nur für echte Cross‑Origin‑URLs gesetzt.
- **Bulletproof‑Fallback in der 3D‑Karte** (`app/showcase/Showcase.tsx`): Kette
  **Transcode‑Vorschau → direkte signierte URL → Titelkarte**. Weiß ist damit unmöglich (getestet).
- **Diagnose bestätigte:** alle 10 Fotos des Nutzers sind JPEG (keine HEIC!), alle transcodieren farbig
  (`blankCount: 0`). Die zuletzt gemeldeten weißen Kugeln waren **alter Browser‑Cache** vor dem
  `poster_key`‑Fix. Der temporäre Diagnose‑Endpunkt `/media/diag` wurde wieder **entfernt** (`ccf131a`).
- **Offen/zu bestätigen:** Nutzer soll die 3D‑Ansicht einmal **frisch neu laden** und melden, ob wirklich
  alle Fotos erscheinen. Laut Diagnose sollte alles farbig sein.

**Wie der Bild‑Transcode funktioniert (`/media/[id]/preview`):** Auth via RLS (Nutzer‑Session), Download
via Service‑Role, `sharp` (jpeg/png/webp/avif) bzw. `heic-decode` (WASM) als HEIC‑Fallback; `?w=512`
(Cover‑Quadrat für die Kugel), `?w=1280&fit=inside` (Detailansicht), `?poster=1` (Video‑Standbild).
Cache‑Control bewusst **ohne `immutable`** (damit fehlerhafte frühe Antworten nicht hängen bleiben).

---

## 8. AKTUELLER FOKUS: Automatisches Offsite‑Backup (3‑2‑1)
**Warum:** Die Fotos/Videos (das Unersetzliche) wurden bisher nur **manuell** exportiert; der Cron mailte
nur einen **Text‑JSON‑Schnappschuss**. Das automatische Offsite‑Kopieren der Medien war die größte Lücke.

**Was gebaut wurde (Commit `99000cc`):**
- `lib/backup-s3.ts` — anbieter‑unabhängiger S3‑Client (`backupConfigured()`, `putBackupObject()`),
  konfiguriert via `BACKUP_S3_*`‑Env‑Vars (`forcePathStyle: true`; ruht, solange nicht konfiguriert).
- `lib/backup-sync.ts` — **inkrementeller, zeitgeboxter** Sync je Haushalt: Ledger `backup_objects`
  (nur Neues hochladen), Medien + `households/<id>/metadata/latest.json` (aus `buildBackupJson`), Lauf‑
  Protokoll in `backup_runs`. `getLatestBackupRun()` für die Status‑UI.
- `app/api/backup-sync/route.ts` — nächtlicher **Vercel‑Cron** (CRON_SECRET, `maxDuration=60`, Deadline 45 s).
- `app/content-actions.ts` → **`runBackupNow()`** (Server Action) für den „Jetzt sichern"‑Button.
- `app/export/OffsiteBackup.tsx` + Einbindung in `app/export/page.tsx` — Status (Ampel/Alter/Anzahl/Größe)
  + Button. `app/export/BackupStatus.tsx` (bestehend) zeigt die manuelle Backup‑Erinnerung.
- Migration **0030** (`backup_runs`, `backup_objects`).
- i18n‑Keys `offsite.*`.

**Zum Aktivieren nötig (beides fehlt noch):**
1. **Migration 0030** im Supabase SQL Editor ausführen.
2. **Backup‑Ziel + 5 Env‑Vars in Vercel** (siehe unten).

**Cloudflare‑R2‑Frage des Nutzers (beantwortet):** **Kein Konflikt** mit bestehenden Cloudflare‑Websites.
R2 ist ein **separates, isoliertes** Storage‑Produkt (unabhängig von DNS/Pages/Workers). Empfehlung:
**eigener Bucket** (z. B. `benni-backup`) + **dediziertes, auf genau diesen Bucket beschränktes API‑Token**
(Object Read & Write) → die Vercel‑Zugangsdaten können nichts anderes im Account berühren. R2 hat einen
eigenen **Gratis‑Tarif (10 GB, keine Egress‑Gebühren)**; Abrechnung teilt sich den Account, Ressourcen
sind getrennt. Alternativ Backblaze B2 / Hetzner (nur andere Endpoint‑URL/Keys — Code identisch).

**Env‑Vars (Beispiel R2):**
```
BACKUP_S3_ENDPOINT          = https://<account-id>.r2.cloudflarestorage.com
BACKUP_S3_REGION            = auto
BACKUP_S3_BUCKET            = benni-backup
BACKUP_S3_ACCESS_KEY_ID     = <key>
BACKUP_S3_SECRET_ACCESS_KEY = <secret>
```
**Test:** Menü → Export/Backup → „Automatisches Offsite‑Backup" → „Jetzt sichern". Bei vielen Dateien
mehrfach klicken oder auf den nächtlichen Lauf warten (inkrementell + zeitgeboxt).

**Nächster Schritt wurde umgesetzt:** der Totmann‑Schalter / E‑Mail‑Alarm (siehe §8a).

---

## 8a. Totmann‑Schalter / E‑Mail‑Alarm fürs Offsite‑Backup (2 Stufen)
**Entscheidungen (fix):** Alarm bei Lauf‑Status `error` sofort; „überfällig“, wenn der letzte
abgeschlossene Lauf > **3 Tage** her ist (`OVERDUE_DAYS`); Wiederhol‑Alarm frühestens alle **3 Tage**
(`ALERT_COOLDOWN_DAYS`), bis das Backup wieder gesund ist (dann wird `last_alert_at` auf `null`
zurückgesetzt → nächster Vorfall alarmiert sofort). **Kein dritter Vercel‑Cron** — die Prüfung hängt im
bestehenden 09:00‑Cron `/api/backup-reminder` (Guard: läuft nur, wenn `backupConfigured()`).

**Stufe 1 — In‑App‑Alarm‑Mail (Cron):**
- `lib/backup-alert.ts`: `classifyBackupRun` (pure, unit‑getestet) + `evaluateHouseholdBackupHealth`
  (`{ ok, reason: 'ok'|'error'|'overdue'|'no-run', daysSince }`) + `runBackupAlerts` (Alarm‑Versand +
  Cooldown in `backup_settings.last_alert_at`). **„Nie gelaufen“ löst in Stufe 1 bewusst KEINEN Alarm aus**
  (Aktivierungsfenster vor dem ersten Nachtlauf); das deckt Stufe 2 ab.
- `householdRecipients()` (ebd.) = gemeinsamer Empfänger‑Helper (memberships → `auth.admin.getUserById`
  → `profiles.ui_language`), genutzt von Reminder **und** Alarm.
- `buildBackupAlertEmail` (`lib/backup.ts`) mit Warn‑Akzent (`#b23b2e` statt Gold); i18n `alert.*` (de/en/es).
  **Sicherheit:** In die Mail geht **nur** Kategorie + Tage — **niemals `backup_runs.note`**
  (kann interne Fehlerdetails/Pfade/Storage‑Keys enthalten).
- Cron‑Antwort ist jetzt `{ ok, sent, alerted }`.

**Stufe 2 — externer Wächter:** `GET /api/backup-health` (kein Vercel‑Cron; `force-dynamic`, Node‑Runtime).
Token‑Schutz optional via `BACKUP_HEALTH_TOKEN` (`?token=…` oder `Authorization: Bearer`; Env gesetzt +
falsches Token → 401; Env leer → offen). Antworten: ohne Service‑Role → 500; Backup nicht konfiguriert →
200 `{ok:true, reason:'not-configured'}`; irgendein Haushalt ungesund (**hier zählt auch `no-run`**) →
**503** `{ok:false, reason}` (nur Kategorie, keine IDs/Keys); sonst 200 `{ok:true}`. Ein externer Monitor
(Cloudflare Worker Cron / UptimeRobot / healthchecks.io) pollt und alarmiert unabhängig — fängt auch
„App tot / Cron läuft nicht / Backup nie gestartet“. Einrichtungs‑Anleitung wurde im Chat geliefert
(nicht committet, gemäß Regel).

---

## 9. WHO‑Perzentilkurven (Wachstum) — Details
- `lib/who-growth.ts`: **WHO Child Growth Standards (LMS, 0–60 Monate)** für **Gewicht‑ und
  Länge/Größe‑für‑Alter**, je Geschlecht. Quelle: WHO MGRS 2006 via `zscorer`‑Datensatz. LMS→Perzentil
  gegen veröffentlichte WHO‑Mediane **verifiziert** (z. B. Junge Geburtsgewicht Median 3,35 kg).
  Funktionen: `whoCurves`, `zScoreFor`, `zToPercentile`.
- `app/growth/GrowthPanel.tsx`: Chart neu = **x‑Achse Alter (Monate)**, WHO‑Perzentilband (3.–97.) +
  Kurven im Hintergrund, eigene Werte darüber, Perzentil des letzten Werts.
- **Geschlecht** ist für die Kurven nötig. `children.sex` existierte bereits (nie gesetzt). Jetzt:
  Feld im Anlege‑Formular + **Inline‑Auswahl** im Diagramm (`setChildSex`). **Keine Migration** nötig.
- **Offen:** **Kopfumfang‑WHO‑Kurve** — die passende `hcfa`‑Datentabelle war online nicht sauber
  auffindbar; aktuell zeigt der Kopfumfang nur die eigenen Werte. (RCPCH/`rcpchgrowth` prüfen oder die
  WHO‑`hcfa`‑Tabelle als LMS sauber besorgen.)

---

## 10. Offene Punkte / To‑Do (priorisiert)
1. **Offsite‑Backup aktivieren** (Nutzer): Migration 0030 + BACKUP_S3_* + „Jetzt sichern" testen.
2. **Backup‑Alarm aktivieren** (Nutzer): Migration **0031** ausführen; für Stufe 2 `BACKUP_HEALTH_TOKEN`
   in Vercel setzen und den externen Wächter (Cloudflare Worker / UptimeRobot / healthchecks.io) auf
   `/api/backup-health` zeigen lassen (Anleitung im Chat geliefert).
3. **Migration 0029 prüfen/ausführen** (Video‑Poster); sonst funktionieren Standbilder nur eingeschränkt.
4. **3D‑Ansicht frisch neu laden** und bestätigen, dass alle Fotos erscheinen (weiße Kugeln = alter Cache).
5. **Kopfumfang‑WHO‑Kurve** nachziehen (Datenquelle klären).
6. Weitere Plan‑Punkte (nicht begonnen): **Passkeys** (aktuell TOTP), **native App (Capacitor)**
   (Hintergrund‑Upload/Share‑Sheet), **On‑Device‑Sprachnotiz‑Transkription** (Whisper), **Schreib‑Impulse /
   Entwurfs‑Posteingang / „E‑Mail ans Tagebuch"** (gegen das leere Tagebuch), **Jahres‑Rückblick als
   Video‑Montage**, **Mehrere‑Kinder‑Umschalter** (Datenmodell unterstützt es bereits).

---

## 11. Wichtige technische Details / Fallstricke
- **`noUncheckedIndexedAccess`:** Array/Objekt‑Indexzugriffe sind `T | undefined` → immer absichern
  (`?? …`, `!` nur wenn nachweislich sicher).
- **iOS Safari:** kein HEIC‑in‑WebGL; `<img>`‑decode statt `createImageBitmap`; `onload` feuert teils vor
  vollständigem Decode (`img.decode()` nutzen); große Bilder werden subsampled.
- **`crossOrigin` nur für Cross‑Origin** setzen (siehe §7).
- **`poster_key` (0029)** ⇒ überall **kaskadierender Select** (siehe `lib/data.ts:getMediaForEntries`,
  `lib/media-preview.ts`, `lib/backup-sync.ts`).
- **Externe Inhalte/Kommentare** (Shares, oEmbed, CI‑Logs) = untrusted; SSRF‑Schutz beim serverseitigen Abruf.
- **Vercel Hobby:** Function‑Timeout begrenzt (daher Backup‑Sync **inkrementell + zeitgeboxt**); Crons
  täglich.
- **Sicherheit:** RLS default‑deny; Service‑Role nur serverseitig; Storage‑Keys nie nach außen; bei Shares
  EXIF/GPS strippen (fail‑closed).

---

## 12. Verifikations‑Setup (in der Cloud‑Arbeitsumgebung)
- **Build/Typecheck:** `npm run build` (Next 15 type‑checkt beim Build).
- **Lokaler Server‑Test:** `npx next start -p <port>` + `curl` (z. B. Routen‑Auth prüfen). Env‑Vars
  vorher setzen, falls nötig (`CRON_SECRET=… npx next start …`).
- **3D/three.js standalone:** three‑Dateien in den Scratchpad kopieren, via `python3 -m http.server 8099`
  ausliefern (nicht `file://` — CORS), mit Playwright/Chromium screenshoten.
  Chromium: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`; Node 22: `/opt/node22/bin/node`;
  Playwright global: `/opt/node22/lib/node_modules/playwright`.
- **SVG→PNG** (z. B. Chart‑Vorschau): `sharp(svgBuffer).png()` **aus dem Projektverzeichnis** (dort ist
  `sharp` installiert).
- **Scratchpad:** `/tmp/claude-0/-home-user-Organizer/bf02b9d0-a401-56a8-bbc3-3f477ad4e474/scratchpad`.
- **Wichtig:** `*.vercel.app` ist aus dieser Umgebung **nicht erreichbar** → Live‑Verifikation nur über den Nutzer.

---

## 13. Claude Skills — verwendet & empfohlen
**Bisher genutzt:** `artifact-design` (früh, für den anfänglichen 3D‑Design‑Prototyp als HTML‑Artifact).
Der Großteil der Arbeit lief direkt (manuelle Verifikation über standalone‑Renders, Route‑Tests, Diagnose‑Endpunkte).

**Für die Weiterarbeit empfohlen (im neuen Chat aktivieren/laden):**
- **`security-review`** — das Backup‑Feature verarbeitet Zugangsdaten + Service‑Role‑Downloads + RLS;
  Bild‑Transcode macht Auth + Service‑Role‑Download. Sicherheits‑Review dringend sinnvoll.
- **`code-review`** — den bisherigen Diff (Backup, `media-preview`, WHO‑Growth, Showcase) auf Korrektheit/
  Vereinfachung prüfen.
- **`verify`** — Änderungen end‑to‑end verifizieren (das eigene Verfahren formalisieren/absichern).
- **`dataviz`** — für die Wachstums‑/WHO‑Charts und künftige Visualisierungen (Kopfumfang‑Kurve,
  Jahres‑Rückblick) — konsistentes, barrierefreies Chart‑Design.
- **`session-start-hook`** — SessionStart‑Hook einrichten, damit neue Web‑Sessions automatisch
  Build/Lint/Tests fahren können (Robustheit für dieses langlebige Projekt).
- **`artifact-design` / `artifact-capabilities`** — falls wieder teilbare HTML‑Artefakte (Mockups,
  Buch‑Vorschau) gebaut werden.
- **`run`** — App lokal starten/„fahren" (Live‑URL bleibt aus der Umgebung unerreichbar).

---

## 14. Empfohlene nächste Schritte
1. Nutzer aktiviert Backup (0030 + Env‑Vars) und testet „Jetzt sichern".
2. **Totmann‑Schalter / E‑Mail‑Alarm** fürs Backup bauen (kleiner, klar abgegrenzter Schritt).
3. `security-review` + `code-review` über die jüngsten Features laufen lassen.
4. Danach je nach Wunsch: Kopfumfang‑Kurve, „gegen das leere Tagebuch" (Impulse/Entwürfe), Passkeys, native App.
