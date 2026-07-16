# Benni‑Tagebuch — Arbeitshinweise für Claude

**Bevor du irgendetwas tust: lies zuerst `docs/SESSION-CONTEXT.md` vollständig.**
Diese Datei ist die zentrale Kontext‑/Übergabe‑Quelle (getroffene Entscheidungen, Feature‑Stand,
offene Punkte, technische Fallstricke, Backup/Deployment, Migrationen). **Nach jeder wesentlichen
Änderung `docs/SESSION-CONTEXT.md` aktualisieren.**

## Harte Regeln (Kurzfassung — Details in SESSION-CONTEXT.md)
- Antworten auf **Deutsch**.
- Entwickeln/pushen **nur** auf Branch `claude/baby-diary-app-plan-4qncna`.
- Commits mit `git -c user.email="RobOnE156@users.noreply.github.com" -c user.name="RobOnE156"`.
- Jede Commit‑Message endet mit:
  ```
  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01BzAuVsz7yKwBfn6zke1dx7
  ```
- Den exakten technischen Modell‑Bezeichner nie in committete Artefakte schreiben (nur im Chat).
- Setup‑/How‑To‑Anleitungen nur im Chat, nie committen.
- Migrationen führt der Nutzer manuell im Supabase SQL Editor aus — SQL im Chat liefern.
- Kein Pull Request, außer ausdrücklich gewünscht.
- Production (`organizer-puce.vercel.app`) deployt automatisch bei jedem Push; `*.vercel.app` ist aus
  der Arbeitsumgebung nicht erreichbar → Live‑Verifikation nur über den Nutzer.
