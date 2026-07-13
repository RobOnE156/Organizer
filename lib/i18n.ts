// Lightweight i18n for the app interface (not user content). Messages are
// keyed and translated to de/en/es; a translator(lang) returns t(key, vars).
// Server components call translator(lang) directly; client components use the
// LanguageProvider's useT().

export type Lang = "de" | "en" | "es";

export const LANGS: { code: Lang; label: string }[] = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
];

export function normalizeLang(v: string | null | undefined): Lang {
  return v === "en" || v === "es" || v === "de" ? v : "de";
}

type Msg = { de: string; en: string; es: string };

const M = {
  // common
  "common.save": { de: "Speichern", en: "Save", es: "Guardar" },
  "common.saving": { de: "Speichere …", en: "Saving …", es: "Guardando …" },
  "common.cancel": { de: "Abbrechen", en: "Cancel", es: "Cancelar" },
  "common.back": { de: "← Zurück", en: "← Back", es: "← Volver" },
  "common.saved": { de: "Gespeichert ✓", en: "Saved ✓", es: "Guardado ✓" },

  // top navigation
  "nav.tagline": { de: "Tagebuch", en: "Diary", es: "Diario" },
  "nav.about": { de: "Über {name}", en: "About {name}", es: "Sobre {name}" },
  "nav.review": { de: "Rückblick", en: "Highlights", es: "Recuerdos" },
  "nav.map": { de: "Karte", en: "Map", es: "Mapa" },
  "nav.search": { de: "Suche", en: "Search", es: "Buscar" },
  "nav.profile": { de: "Profil", en: "Profile", es: "Perfil" },
  "nav.household": { de: "Haushalt", en: "Household", es: "Hogar" },
  "nav.export": { de: "Export", en: "Export", es: "Exportar" },
  "nav.signout": { de: "Abmelden", en: "Sign out", es: "Cerrar sesión" },
  "nav.child_fallback": { de: "Kind", en: "child", es: "niño" },
  "nav.menu": { de: "Menü", en: "Menu", es: "Menú" },
  "nav.close": { de: "Schließen", en: "Close", es: "Cerrar" },
  "nav.timeline": { de: "Tagebuch", en: "Diary", es: "Diario" },
  "nav.explore": { de: "Entdecken", en: "Explore", es: "Explorar" },
  "nav.settings": { de: "Einstellungen", en: "Settings", es: "Ajustes" },
  "nav.security": { de: "Sicherheit & 2FA", en: "Security & 2FA", es: "Seguridad y 2FA" },

  // settings hub
  "settings.eyebrow": { de: "Konto & App", en: "Account & app", es: "Cuenta y app" },
  "settings.title": { de: "Einstellungen", en: "Settings", es: "Ajustes" },
  "settings.sub": {
    de: "Verwalte dein Profil, den Haushalt, die Sicherheit und die Sicherung.",
    en: "Manage your profile, household, security and backup.",
    es: "Gestiona tu perfil, el hogar, la seguridad y la copia de seguridad.",
  },
  "settings.profile_desc": {
    de: "Name, Foto, Farbe, Sprache, Barrierefreiheit, Passwort",
    en: "Name, photo, colour, language, accessibility, password",
    es: "Nombre, foto, color, idioma, accesibilidad, contraseña",
  },
  "settings.household_desc": {
    de: "Partner einladen und Mitglieder verwalten",
    en: "Invite your partner and manage members",
    es: "Invita a tu pareja y gestiona miembros",
  },
  "settings.security_desc": {
    de: "Zwei-Faktor-Authentifizierung",
    en: "Two-factor authentication",
    es: "Autenticación de dos factores",
  },
  "settings.export_desc": {
    de: "Das komplette Tagebuch als ZIP sichern",
    en: "Back up the whole diary as a ZIP",
    es: "Copia de seguridad de todo el diario en ZIP",
  },

  // home / timeline
  "home.welcome_title": { de: "Willkommen! 👶", en: "Welcome! 👶", es: "¡Bienvenido! 👶" },
  "home.welcome_body": {
    de: "Lege zuerst ein Kind an, um Erinnerungen festzuhalten.",
    en: "Add a child first to start capturing memories.",
    es: "Primero añade un niño para empezar a guardar recuerdos.",
  },
  "home.add_child": { de: "Kind anlegen", en: "Add child", es: "Añadir niño" },
  "home.no_entries": {
    de: "Noch keine Erinnerungen für {name}.",
    en: "No memories for {name} yet.",
    es: "Aún no hay recuerdos de {name}.",
  },
  "home.no_entries_hint": {
    de: "Tippe unten auf „Hinzufügen“, um die erste festzuhalten.",
    en: "Tap “Add” below to capture the first one.",
    es: "Toca “Añadir” abajo para guardar el primero.",
  },
  "home.fab_add": { de: "＋ Hinzufügen", en: "＋ Add", es: "＋ Añadir" },
  "home.on_this_day": { de: "✨ An diesem Tag", en: "✨ On this day", es: "✨ En este día" },
  "home.year_one": { de: "vor {n} Jahr", en: "{n} year ago", es: "hace {n} año" },
  "home.year_many": { de: "vor {n} Jahren", en: "{n} years ago", es: "hace {n} años" },
  "home.memory": { de: "Erinnerung", en: "Memory", es: "Recuerdo" },

  // profile page
  "profile.eyebrow": { de: "Dein Profil", en: "Your profile", es: "Tu perfil" },
  "profile.title": { de: "Profil bearbeiten", en: "Edit profile", es: "Editar perfil" },
  "profile.sub": {
    de: "Dein Anzeigename und deine Farbe erscheinen an jedem Eintrag und Kommentar, den du erstellst.",
    en: "Your display name and colour appear on every entry and comment you create.",
    es: "Tu nombre y color aparecen en cada entrada y comentario que creas.",
  },
  "profile.name_label": { de: "Anzeigename", en: "Display name", es: "Nombre visible" },
  "profile.name_ph": {
    de: "z. B. Mama, Papa, dein Vorname",
    en: "e.g. Mum, Dad, your first name",
    es: "p. ej. Mamá, Papá, tu nombre",
  },
  "profile.color_label": { de: "Deine Farbe", en: "Your colour", es: "Tu color" },
  "profile.photo_add": { de: "Foto hinzufügen", en: "Add photo", es: "Añadir foto" },
  "profile.photo_change": { de: "Foto ändern", en: "Change photo", es: "Cambiar foto" },
  "profile.photo_remove": { de: "Entfernen", en: "Remove", es: "Quitar" },

  // accessibility
  "a11y.title": { de: "Barrierefreiheit", en: "Accessibility", es: "Accesibilidad" },
  "a11y.large": { de: "Größerer Text", en: "Larger text", es: "Texto más grande" },
  "a11y.large_hint": {
    de: "Vergrößert die Schrift in der ganzen App.",
    en: "Increases the font size across the app.",
    es: "Aumenta el tamaño del texto en toda la app.",
  },
  "a11y.contrast": { de: "Höherer Kontrast", en: "Higher contrast", es: "Mayor contraste" },
  "a11y.contrast_hint": {
    de: "Kräftigere Texte und Ränder für bessere Lesbarkeit.",
    en: "Stronger text and borders for readability.",
    es: "Textos y bordes más marcados para leer mejor.",
  },
  "a11y.motion": { de: "Weniger Animation", en: "Reduce motion", es: "Menos animación" },
  "a11y.motion_hint": {
    de: "Reduziert Bewegungen und Übergänge.",
    en: "Reduces movement and transitions.",
    es: "Reduce movimientos y transiciones.",
  },

  // password
  "pw.title": { de: "Passwort ändern", en: "Change password", es: "Cambiar contraseña" },
  "pw.new": { de: "Neues Passwort", en: "New password", es: "Nueva contraseña" },
  "pw.new_ph": { de: "mindestens 8 Zeichen", en: "at least 8 characters", es: "al menos 8 caracteres" },
  "pw.repeat": { de: "Neues Passwort wiederholen", en: "Repeat new password", es: "Repite la nueva contraseña" },
  "pw.mismatch": {
    de: "Die Passwörter stimmen nicht überein.",
    en: "The passwords don’t match.",
    es: "Las contraseñas no coinciden.",
  },
  "pw.min": {
    de: "Das Passwort muss mindestens 8 Zeichen haben.",
    en: "The password must be at least 8 characters.",
    es: "La contraseña debe tener al menos 8 caracteres.",
  },
  "pw.changed": { de: "Passwort geändert ✓", en: "Password changed ✓", es: "Contraseña cambiada ✓" },

  // language
  "lang.title": { de: "Sprache", en: "Language", es: "Idioma" },
  "lang.sub": {
    de: "Sprache der App-Oberfläche (nicht der Inhalte).",
    en: "Language of the app interface (not of your content).",
    es: "Idioma de la interfaz (no de tus contenidos).",
  },

  "back.diary": { de: "← Zurück zum Tagebuch", en: "← Back to the diary", es: "← Volver al diario" },

  // highlights page
  "hl.eyebrow": { de: "Rückblick", en: "Highlights", es: "Recuerdos" },
  "hl.title": { de: "★ {name}s Höhepunkte", en: "★ {name}’s highlights", es: "★ Los mejores momentos de {name}" },
  "hl.sub": {
    de: "Die schönsten Erinnerungen an einem Ort. Tippe im Tagebuch bei einer Erinnerung auf den Stern (☆), um sie hier zu sammeln — beide Elternteile pflegen den Rückblick gemeinsam.",
    en: "Your favourite memories in one place. Tap the star (☆) on a memory in the diary to collect it here — both parents curate the highlights together.",
    es: "Tus mejores recuerdos en un solo lugar. Toca la estrella (☆) en un recuerdo del diario para reunirlos aquí — ambos padres cuidan los recuerdos juntos.",
  },
  "hl.empty": {
    de: "Noch keine Höhepunkte markiert.",
    en: "No highlights yet.",
    es: "Aún no hay momentos destacados.",
  },
  "hl.empty_hint": {
    de: "Tippe im Tagebuch bei einer besonderen Erinnerung oben rechts auf den Stern.",
    en: "Tap the star in the top right of a special memory in the diary.",
    es: "Toca la estrella arriba a la derecha de un recuerdo especial en el diario.",
  },

  // map page
  "map.eyebrow": { de: "Weltkarte", en: "World map", es: "Mapa mundial" },
  "map.title": { de: "Wo {name} schon war", en: "Where {name} has been", es: "Dónde ha estado {name}" },
  "map.sub": {
    de: "Aus den GPS-Daten der hochgeladenen Fotos ermittelt — vollständig offline, ohne externe Kartendienste. Diese Standortdaten bleiben privat (nur ihr beide seht sie) und sind in keinem Export enthalten.",
    en: "Derived from the GPS data of your uploaded photos — fully offline, without external map services. These locations stay private (only the two of you can see them) and are never included in an export.",
    es: "Obtenido de los datos GPS de tus fotos — totalmente sin conexión, sin servicios de mapas externos. Estas ubicaciones son privadas (solo las veis vosotros dos) y nunca se incluyen en una exportación.",
  },
  "map.empty": { de: "Noch keine Orte gefunden.", en: "No locations found yet.", es: "Aún no se han encontrado ubicaciones." },
  "map.empty_hint": {
    de: "Sobald ihr Fotos mit GPS-Angabe hochladet, erscheinen die besuchten Länder hier. (Nicht jedes Foto enthält GPS — je nach Kamera-Einstellung.)",
    en: "As soon as you upload photos with GPS data, the visited countries appear here. (Not every photo has GPS — it depends on your camera settings.)",
    es: "En cuanto subáis fotos con datos GPS, los países visitados aparecen aquí. (No todas las fotos tienen GPS — depende de los ajustes de la cámara.)",
  },
  "map.aria": {
    de: "Weltkarte mit {n} besuchten Ländern",
    en: "World map with {n} visited countries",
    es: "Mapa mundial con {n} países visitados",
  },
  "map.country_one": { de: "Land besucht", en: "country visited", es: "país visitado" },
  "map.country_many": { de: "Länder besucht", en: "countries visited", es: "países visitados" },
  "map.located_one": { de: "{n} verortete Erinnerung", en: "{n} located memory", es: "{n} recuerdo ubicado" },
  "map.located_many": { de: "{n} verortete Erinnerungen", en: "{n} located memories", es: "{n} recuerdos ubicados" },
  "map.memory_one": { de: "{n} Erinnerung", en: "{n} memory", es: "{n} recuerdo" },
  "map.memory_many": { de: "{n} Erinnerungen", en: "{n} memories", es: "{n} recuerdos" },
  "map.no_country": {
    de: "Es wurden GPS-Fotos gefunden, aber keinem Land zugeordnet (z. B. auf offener See).",
    en: "GPS photos were found but couldn’t be matched to a country (e.g. on open water).",
    es: "Se encontraron fotos con GPS, pero no se pudieron asignar a un país (p. ej. en mar abierto).",
  },
  "map.backfill_title": { de: "Orte nachtragen", en: "Add locations", es: "Añadir ubicaciones" },
  "map.backfill_sub": {
    de: "Deine früher hochgeladenen Fotos wurden noch nicht ausgewertet. Trage ihre Orte nachträglich ein, um Karte und Detailkarten zu füllen.",
    en: "Your earlier uploaded photos haven’t been analysed yet. Add their locations to fill the map and the per-entry mini-maps.",
    es: "Tus fotos subidas antes aún no se han analizado. Añade sus ubicaciones para llenar el mapa y los mini-mapas de cada entrada.",
  },

  // geo backfill
  "gb.button": {
    de: "Orte aus vorhandenen Fotos nachtragen",
    en: "Add locations from existing photos",
    es: "Añadir ubicaciones de fotos existentes",
  },
  "gb.busy": { de: "Trage nach …", en: "Adding …", es: "Añadiendo …" },
  "gb.searching": { de: "Suche deine Einträge ohne Ort …", en: "Finding your entries without a location …", es: "Buscando tus entradas sin ubicación …" },
  "gb.checking": {
    de: "Prüfe {i}/{n} … {found} verortet",
    en: "Checking {i}/{n} … {found} located",
    es: "Revisando {i}/{n} … {found} ubicadas",
  },
  "gb.none": {
    de: "Keine deiner Erinnerungen ohne Ort mit Foto gefunden — alles aktuell ✓",
    en: "No memories of yours without a location have photos — all up to date ✓",
    es: "Ninguno de tus recuerdos sin ubicación tiene fotos — todo al día ✓",
  },
  "gb.done_some": {
    de: "Fertig ✓ {found} von {scanned} Erinnerungen einen Ort ergänzt.",
    en: "Done ✓ Added a location to {found} of {scanned} memories.",
    es: "Listo ✓ Se añadió ubicación a {found} de {scanned} recuerdos.",
  },
  "gb.done_none": {
    de: "Fertig — in {scanned} geprüften Fotos war kein GPS enthalten.",
    en: "Done — none of the {scanned} photos checked contained GPS.",
    es: "Listo — ninguna de las {scanned} fotos revisadas tenía GPS.",
  },
  "gb.failed": { de: "Nachtragen fehlgeschlagen.", en: "Adding locations failed.", es: "No se pudieron añadir las ubicaciones." },
  "gb.hint": {
    de: "Liest die GPS-Angaben aus deinen bereits hochgeladenen Fotos (nur deine eigenen Einträge). Die Fotos werden dafür kurz geladen — am besten im WLAN ausführen. Es werden keine Daten an Dritte gesendet.",
    en: "Reads the GPS data from your already-uploaded photos (only your own entries). The photos are briefly downloaded for this — best done on Wi-Fi. No data is sent to third parties.",
    es: "Lee los datos GPS de tus fotos ya subidas (solo tus propias entradas). Las fotos se descargan brevemente — mejor con Wi-Fi. No se envían datos a terceros.",
  },

  // search page
  "search.eyebrow": { de: "Suche", en: "Search", es: "Buscar" },
  "search.title": { de: "Im Tagebuch suchen", en: "Search the diary", es: "Buscar en el diario" },
  "search.sub": {
    de: "Durchsuche Titel, Texte, Orte und Kommentare. Es werden nur Erinnerungen gefunden, die du auch sehen darfst.",
    en: "Search titles, text, places and comments. Only memories you’re allowed to see are found.",
    es: "Busca en títulos, textos, lugares y comentarios. Solo se encuentran recuerdos que puedes ver.",
  },
  "search.ph": {
    de: "Titel, Text, Ort oder Kommentar suchen …",
    en: "Search title, text, place or comment …",
    es: "Buscar título, texto, lugar o comentario …",
  },
  "search.searching": { de: "Suche …", en: "Searching …", es: "Buscando …" },
  "search.none": { de: "Keine Treffer für „{term}“.", en: "No results for “{term}”.", es: "Sin resultados para «{term}»." },
  "search.results": { de: "{n} Treffer für „{term}“.", en: "{n} results for “{term}”.", es: "{n} resultados para «{term}»." },
  "search.entries": { de: "Einträge", en: "Entries", es: "Entradas" },
  "search.comments": { de: "Kommentare", en: "Comments", es: "Comentarios" },
  "search.untitled": { de: "Ohne Titel", en: "Untitled", es: "Sin título" },
  "search.on": { de: "zu:", en: "on:", es: "en:" },

  // export page
  "export.eyebrow": { de: "Sicherung", en: "Backup", es: "Copia de seguridad" },
  "export.title": { de: "Tagebuch exportieren", en: "Export the diary", es: "Exportar el diario" },
  "export.sub": {
    de: "Lade das komplette Tagebuch als ZIP herunter: alle Original-Fotos und -Videos, jeder Eintrag als offene Textdatei und eine index.html, die das Tagebuch offline in jedem Browser anzeigt — auch in vielen Jahren noch, ohne diese App. So hat jeder Elternteil jederzeit eine vollständige eigene Kopie.",
    en: "Download the whole diary as a ZIP: all original photos and videos, every entry as an open text file, and an index.html that shows the diary offline in any browser — even many years from now, without this app. That way each parent always has a complete copy.",
    es: "Descarga todo el diario como ZIP: todas las fotos y vídeos originales, cada entrada como archivo de texto abierto y un index.html que muestra el diario sin conexión en cualquier navegador — incluso dentro de muchos años, sin esta app. Así cada padre tiene siempre una copia completa.",
  },
  "export.summary": {
    de: "{n} Einträge · {m} Mediendateien",
    en: "{n} entries · {m} media files",
    es: "{n} entradas · {m} archivos",
  },
  "export.busy": { de: "Exportiere …", en: "Exporting …", es: "Exportando …" },
  "export.loading_media": { de: "Lade Medien … {i}/{n}", en: "Loading media … {i}/{n}", es: "Cargando archivos … {i}/{n}" },
  "export.building": { de: "Erstelle Tagebuch-Seite …", en: "Building the diary page …", es: "Creando la página del diario …" },
  "export.zipping": { de: "Packe ZIP … {p}%", en: "Packing ZIP … {p}%", es: "Comprimiendo ZIP … {p}%" },
  "export.done": {
    de: "Fertig ✓ Die ZIP-Datei wurde heruntergeladen.",
    en: "Done ✓ The ZIP file was downloaded.",
    es: "Listo ✓ Se descargó el archivo ZIP.",
  },
  "export.failed": { de: "Export fehlgeschlagen.", en: "Export failed.", es: "La exportación falló." },
  "export.warn": {
    de: "{failed} von {total} Mediendateien konnten nicht geladen werden und fehlen im Export. Bitte erneut versuchen.",
    en: "{failed} of {total} media files couldn’t be loaded and are missing from the export. Please try again.",
    es: "No se pudieron cargar {failed} de {total} archivos y faltan en la exportación. Inténtalo de nuevo.",
  },
  "export.hint": {
    de: "Bei sehr vielen oder großen Videos den Export am besten am Computer ausführen. Die Datei wird lokal auf deinem Gerät erstellt — es werden keine Daten an Dritte gesendet.",
    en: "For lots of or large videos, it’s best to run the export on a computer. The file is created locally on your device — no data is sent to third parties.",
    es: "Con muchos vídeos o vídeos grandes, es mejor exportar desde un ordenador. El archivo se crea localmente en tu dispositivo — no se envían datos a terceros.",
  },

  // common form words
  "common.date": { de: "Datum", en: "Date", es: "Fecha" },
  "common.add": { de: "Hinzufügen", en: "Add", es: "Añadir" },
  "common.delete": { de: "Löschen", en: "Delete", es: "Eliminar" },
  "common.edit": { de: "Bearbeiten", en: "Edit", es: "Editar" },
  "common.back_short": { de: "← Zurück", en: "← Back", es: "← Volver" },

  // growth page
  "growth.title": {
    de: "Schnappschuss, Wachstum & Meilensteine",
    en: "Snapshot, growth & milestones",
    es: "Instantánea, crecimiento e hitos",
  },
  "growth.sub": {
    de: "Wer ist {name} gerade — und wie wächst und entwickelt er sich.",
    en: "Who {name} is right now — and how they grow and develop.",
    es: "Quién es {name} ahora — y cómo crece y se desarrolla.",
  },
  "growth.head_growth": { de: "Wachstum", en: "Growth", es: "Crecimiento" },
  "growth.head_milestones": { de: "Meilensteine", en: "Milestones", es: "Hitos" },

  // metrics
  "metric.weight": { de: "Gewicht", en: "Weight", es: "Peso" },
  "metric.height": { de: "Größe", en: "Height", es: "Estatura" },
  "metric.head": { de: "Kopfumfang", en: "Head circumference", es: "Perímetro cefálico" },
  "growth.no_measure": {
    de: "Noch keine Messungen — trage unten die erste ein.",
    en: "No measurements yet — add the first one below.",
    es: "Aún no hay mediciones — añade la primera abajo.",
  },
  "growth.chart_aria": { de: "Verlaufskurve", en: "Trend curve", es: "Curva de evolución" },
  "growth.invalid_value": { de: "Bitte einen gültigen Wert eingeben.", en: "Please enter a valid value.", es: "Introduce un valor válido." },
  "growth.del_measure_title": { de: "Messung löschen?", en: "Delete measurement?", es: "¿Eliminar medición?" },
  "growth.del_measure_body": { de: "Dieser Messwert wird entfernt.", en: "This value will be removed.", es: "Se eliminará este valor." },
  "growth.ph_weight": { de: "z. B. 7,4", en: "e.g. 7.4", es: "p. ej. 7,4" },
  "growth.ph_other": { de: "z. B. 68", en: "e.g. 68", es: "p. ej. 68" },
  "growth.who_hint": {
    de: "Nur {name}s eigene Werte — WHO-Perzentilkurven kommen später.",
    en: "Only {name}’s own values — WHO percentile curves coming later.",
    es: "Solo los valores de {name} — las curvas de percentiles de la OMS llegarán más adelante.",
  },

  // milestones
  "ms.smile": { de: "Erstes Lächeln", en: "First smile", es: "Primera sonrisa" },
  "ms.slept": { de: "Zum ersten Mal durchgeschlafen", en: "First time sleeping through", es: "Primera vez durmiendo toda la noche" },
  "ms.tooth": { de: "Erster Zahn", en: "First tooth", es: "Primer diente" },
  "ms.roll": { de: "Erstes Umdrehen", en: "First roll-over", es: "Primera vez que se dio la vuelta" },
  "ms.sit": { de: "Erstes Sitzen", en: "First sitting up", es: "Primera vez sentado" },
  "ms.crawl": { de: "Erstes Krabbeln", en: "First crawling", es: "Primer gateo" },
  "ms.word": { de: "Erstes Wort", en: "First word", es: "Primera palabra" },
  "ms.steps": { de: "Erste Schritte", en: "First steps", es: "Primeros pasos" },
  "ms.no_date": { de: "ohne Datum", en: "no date", es: "sin fecha" },
  "ms.need_title": { de: "Bitte einen Titel eingeben.", en: "Please enter a title.", es: "Introduce un título." },
  "ms.del_title": { de: "Meilenstein löschen?", en: "Delete milestone?", es: "¿Eliminar hito?" },
  "ms.del_body": { de: "Dieser Meilenstein wird entfernt.", en: "This milestone will be removed.", es: "Se eliminará este hito." },
  "ms.label": { de: "Meilenstein", en: "Milestone", es: "Hito" },
  "ms.ph": { de: "z. B. Erstes Wort", en: "e.g. First word", es: "p. ej. Primera palabra" },
  "ms.save": { de: "Merken", en: "Save", es: "Guardar" },
  "ms.empty": { de: "Noch keine Meilensteine festgehalten.", en: "No milestones recorded yet.", es: "Aún no hay hitos registrados." },

  // snapshot panel
  "snap.who": { de: "Wer ist {name} gerade?", en: "Who is {name} right now?", es: "¿Quién es {name} ahora?" },
  "snap.edit": { de: "Schnappschuss bearbeiten", en: "Edit snapshot", es: "Editar instantánea" },
  "snap.new": { de: "Neu", en: "New", es: "Nuevo" },
  "snap.sub": {
    de: "Ein kleiner Steckbrief für diesen Moment — fülle aus, was gerade passt. Später wird daraus eine schöne Sammlung.",
    en: "A little profile of this moment — fill in whatever fits right now. Over time it becomes a lovely collection.",
    es: "Un pequeño perfil de este momento — rellena lo que encaje ahora. Con el tiempo se convierte en una bonita colección.",
  },
  "snap.need_one": { de: "Bitte mindestens ein Feld ausfüllen.", en: "Please fill in at least one field.", es: "Rellena al menos un campo." },
  "snap.del_title": { de: "Schnappschuss löschen?", en: "Delete snapshot?", es: "¿Eliminar instantánea?" },
  "snap.del_body": { de: "Diese Momentaufnahme wird entfernt.", en: "This snapshot will be removed.", es: "Se eliminará esta instantánea." },
  "snap.with_age": { de: "{name} mit {age}", en: "{name} at {age}", es: "{name} con {age}" },
  "snap.save": { de: "Schnappschuss sichern", en: "Save snapshot", es: "Guardar instantánea" },

  // snapshot prompt labels + placeholders
  "sp.food.l": { de: "Lieblingsessen", en: "Favourite food", es: "Comida favorita" },
  "sp.food.p": { de: "z. B. Nudeln mit Tomatensoße", en: "e.g. pasta with tomato sauce", es: "p. ej. pasta con tomate" },
  "sp.toy.l": { de: "Lieblingsspielzeug", en: "Favourite toy", es: "Juguete favorito" },
  "sp.toy.p": { de: "z. B. der rote Bagger", en: "e.g. the red digger", es: "p. ej. la excavadora roja" },
  "sp.word.l": { de: "Lieblingswort / Lieblingsspruch", en: "Favourite word or phrase", es: "Palabra o frase favorita" },
  "sp.word.p": { de: "z. B. „Nochmal!“", en: "e.g. “Again!”", es: "p. ej. «¡Otra vez!»" },
  "sp.saying.l": { de: "Lustigster Spruch (Kindermund)", en: "Funniest thing said", es: "Lo más gracioso que dijo" },
  "sp.saying.p": { de: "Was hat {name} Lustiges gesagt?", en: "What funny thing did {name} say?", es: "¿Qué cosa graciosa dijo {name}?" },
  "sp.obsession.l": { de: "Aktuelle Obsession", en: "Current obsession", es: "Obsesión actual" },
  "sp.obsession.p": { de: "Wofür interessiert sich {name} gerade total?", en: "What is {name} totally into right now?", es: "¿Qué le apasiona a {name} ahora?" },
  "sp.loves.l": { de: "Liebt gerade", en: "Loves right now", es: "Le encanta ahora" },
  "sp.loves.p": { de: "Menschen, Tiere, Orte, Aktivitäten …", en: "People, animals, places, activities …", es: "Personas, animales, lugares, actividades …" },
  "sp.laugh.l": { de: "Was bringt {name} zum Lachen?", en: "What makes {name} laugh?", es: "¿Qué hace reír a {name}?" },

  // more common words
  "common.remove": { de: "Entfernen", en: "Remove", es: "Quitar" },
  "common.loading": { de: "Lädt …", en: "Loading …", es: "Cargando …" },
  "common.apply": { de: "Übernehmen", en: "Apply", es: "Aplicar" },
  "common.unknown_error": { de: "Unbekannter Fehler.", en: "Unknown error.", es: "Error desconocido." },
  "common.upload_failed": { de: "Upload fehlgeschlagen: ", en: "Upload failed: ", es: "Error al subir: " },

  // entry menu
  "em.del_title": { de: "Eintrag löschen?", en: "Delete entry?", es: "¿Eliminar entrada?" },
  "em.del_body": { de: "Der Eintrag wird aus dem Tagebuch entfernt.", en: "The entry will be removed from the diary.", es: "La entrada se eliminará del diario." },
  "em.options": { de: "Optionen", en: "Options", es: "Opciones" },
  "em.deleting": { de: "Löschen…", en: "Deleting…", es: "Eliminando…" },

  // media / lightbox
  "media.zoom": { de: "Vergrößern", en: "Enlarge", es: "Ampliar" },
  "lb.view": { de: "Großansicht", en: "Full view", es: "Vista ampliada" },
  "lb.prev": { de: "Zurück", en: "Previous", es: "Anterior" },
  "lb.next": { de: "Weiter", en: "Next", es: "Siguiente" },

  // reactions
  "react.aria": { de: "Reaktion {emoji}", en: "Reaction {emoji}", es: "Reacción {emoji}" },
  "react.add": { de: "Reagieren", en: "React", es: "Reaccionar" },

  // child hero + covers
  "hero.born": { de: "geboren am {date}", en: "born on {date}", es: "nacido el {date}" },
  "hero.change_cover": { de: "Titelbild ändern", en: "Change cover", es: "Cambiar portada" },
  "hero.cover_change": { de: "📷 Ändern", en: "📷 Change", es: "📷 Cambiar" },
  "hero.cover_add": { de: "📷 Titelbild", en: "📷 Cover", es: "📷 Portada" },
  "cp.choose": { de: "Titelbild wählen", en: "Choose cover", es: "Elegir portada" },
  "cp.new_photo": { de: "Neues Foto", en: "New photo", es: "Nueva foto" },
  "cp.none": { de: "Noch keine früheren Titelbilder.", en: "No earlier covers yet.", es: "Aún no hay portadas anteriores." },
  "cp.use": { de: "Dieses Titelbild verwenden", en: "Use this cover", es: "Usar esta portada" },
  "cp.current": { de: "Aktuell", en: "Current", es: "Actual" },
  "cp.del_title": { de: "Titelbild löschen?", en: "Delete cover?", es: "¿Eliminar portada?" },
  "cp.del_body": { de: "Dieses Titelbild wird dauerhaft aus dem Speicher entfernt.", en: "This cover will be permanently removed from storage.", es: "Esta portada se eliminará permanentemente del almacenamiento." },
  "cp.del_perm": { de: "Dauerhaft löschen", en: "Delete permanently", es: "Eliminar permanentemente" },
  "cp.del_fail": {
    de: "Löschen nicht möglich — evtl. kann nur der Elternteil löschen, der dieses Bild hochgeladen hat.",
    en: "Couldn’t delete — maybe only the parent who uploaded this image can delete it.",
    es: "No se pudo eliminar — quizá solo el padre que subió la imagen puede eliminarla.",
  },
  "cc.crop": { de: "Titelbild zuschneiden", en: "Crop cover", es: "Recortar portada" },
  "cc.zoom": { de: "Zoom", en: "Zoom", es: "Zoom" },
  "cc.hint": {
    de: "Ziehen zum Verschieben · Slider oder Mausrad zum Zoomen",
    en: "Drag to move · slider or scroll to zoom",
    es: "Arrastra para mover · barra o rueda para ampliar",
  },

  // voice recorder
  "vr.unsupported": {
    de: "Aufnahme wird von diesem Browser nicht unterstützt — du kannst aber eine Audiodatei anhängen.",
    en: "Recording isn’t supported by this browser — but you can attach an audio file.",
    es: "Este navegador no admite grabación — pero puedes adjuntar un archivo de audio.",
  },
  "vr.stop": { de: "Stopp", en: "Stop", es: "Detener" },
  "vr.listen": { de: "Aufnahme anhören:", en: "Listen to the recording:", es: "Escuchar la grabación:" },
  "vr.accept": { de: "✓ Übernehmen", en: "✓ Use it", es: "✓ Usar" },
  "vr.rerecord": { de: "↻ Neu aufnehmen", en: "↻ Re-record", es: "↻ Grabar de nuevo" },
  "vr.record": { de: "🎙️ Sprachnotiz aufnehmen", en: "🎙️ Record voice note", es: "🎙️ Grabar nota de voz" },
  "vr.err_generic": { de: "Mikrofon-Zugriff nicht möglich.", en: "Can’t access the microphone.", es: "No se puede acceder al micrófono." },
  "vr.err_blocked": {
    de: "Mikrofon-Zugriff ist blockiert. Erlaube ihn in den Website-Einstellungen (Symbol links neben der Web-Adresse → Mikrofon → Zulassen) und lade die Seite neu.",
    en: "Microphone access is blocked. Allow it in the site settings (icon to the left of the address bar → Microphone → Allow) and reload the page.",
    es: "El acceso al micrófono está bloqueado. Permítelo en los ajustes del sitio (icono a la izquierda de la dirección → Micrófono → Permitir) y recarga la página.",
  },
  "vr.err_notfound": {
    de: "Kein Mikrofon gefunden. Schließe eins an — oder nimm am Handy auf.",
    en: "No microphone found. Connect one — or record on your phone.",
    es: "No se encontró micrófono. Conecta uno — o graba en el móvil.",
  },
  "vr.err_busy": {
    de: "Das Mikrofon wird gerade von einem anderen Programm benutzt. Schließe es und versuche es erneut.",
    en: "The microphone is being used by another program. Close it and try again.",
    es: "El micrófono lo está usando otro programa. Ciérralo e inténtalo de nuevo.",
  },
  "vr.err_secure": {
    de: "Aufnahme braucht eine sichere (HTTPS-)Verbindung.",
    en: "Recording needs a secure (HTTPS) connection.",
    es: "La grabación necesita una conexión segura (HTTPS).",
  },

  // comments
  "ec.edit": { de: "Kommentar bearbeiten", en: "Edit comment", es: "Editar comentario" },
  "ec.delete": { de: "Kommentar löschen", en: "Delete comment", es: "Eliminar comentario" },
  "ec.del_title": { de: "Kommentar löschen?", en: "Delete comment?", es: "¿Eliminar comentario?" },
  "ec.del_body": { de: "Dein Kommentar wird entfernt.", en: "Your comment will be removed.", es: "Se eliminará tu comentario." },
  "ec.ph": { de: "Kommentar schreiben …", en: "Write a comment …", es: "Escribe un comentario …" },
  "ec.send": { de: "Senden", en: "Send", es: "Enviar" },
  "ec.label": { de: "Kommentar", en: "Comment", es: "Comentario" },
  "ec.save_fail": { de: "Kommentar konnte nicht gespeichert werden.", en: "The comment couldn’t be saved.", es: "No se pudo guardar el comentario." },

  // new entry form
  "ef.eyebrow": { de: "Neue Erinnerung", en: "New memory", es: "Nuevo recuerdo" },
  "ef.for": { de: "Für {name}", en: "For {name}", es: "Para {name}" },
  "ef.sub": {
    de: "Halte einen Moment fest — mit Text, Fotos und Videos.",
    en: "Capture a moment — with text, photos and videos.",
    es: "Guarda un momento — con texto, fotos y vídeos.",
  },
  "ef.title_label": { de: "Titel (optional)", en: "Title (optional)", es: "Título (opcional)" },
  "ef.title_ph": { de: "z. B. Erster Zahn", en: "e.g. First tooth", es: "p. ej. Primer diente" },
  "ef.media_label": { de: "Fotos / Videos / Audio (optional)", en: "Photos / videos / audio (optional)", es: "Fotos / vídeos / audio (opcional)" },
  "ef.pick_files": { de: "＋ Dateien wählen (mehrere möglich)", en: "＋ Choose files (multiple)", es: "＋ Elegir archivos (varios)" },
  "ef.text_label": { de: "Text", en: "Text", es: "Texto" },
  "ef.text_ph": { de: "Was ist passiert?", en: "What happened?", es: "¿Qué pasó?" },
  "ef.link_label": { de: "Link (optional)", en: "Link (optional)", es: "Enlace (opcional)" },
  "ef.link_ph": {
    de: "z. B. ein Spotify- oder YouTube-Link",
    en: "e.g. a Spotify or YouTube link",
    es: "p. ej. un enlace de Spotify o YouTube",
  },
  "ef.link_hint": {
    de: "Wird als Vorschaukarte angezeigt (Titel + Bild).",
    en: "Shown as a preview card (title + image).",
    es: "Se muestra como tarjeta de vista previa (título + imagen).",
  },
  "ef.when_label": { de: "Zeitpunkt der Erinnerung", en: "When it happened", es: "Cuándo ocurrió" },
  "ef.place_label": { de: "Ort (optional)", en: "Place (optional)", es: "Lugar (opcional)" },
  "ef.place_ph": { de: "z. B. Berlin, bei Oma", en: "e.g. Berlin, at Grandma’s", es: "p. ej. Berlín, en casa de la abuela" },
  "ef.private_title": { de: "Nur für mich (privat)", en: "Just for me (private)", es: "Solo para mí (privado)" },
  "ef.private_hint": {
    de: "Nur du siehst diesen Eintrag — später auch das Kind, nicht der andere Elternteil.",
    en: "Only you see this entry — later also the child, but not the other parent.",
    es: "Solo tú ves esta entrada — más adelante también el niño, pero no el otro padre.",
  },
  "ef.save_fail": { de: "Speichern fehlgeschlagen.", en: "Saving failed.", es: "No se pudo guardar." },

  // edit entry form
  "ee.eyebrow": { de: "Erinnerung bearbeiten", en: "Edit memory", es: "Editar recuerdo" },
  "ee.title": { de: "Eintrag ändern", en: "Change entry", es: "Cambiar entrada" },
  "ee.sub": {
    de: "Text, Ort, Datum, Sichtbarkeit und Fotos/Videos anpassen.",
    en: "Adjust text, place, date, visibility and photos/videos.",
    es: "Ajusta texto, lugar, fecha, visibilidad y fotos/vídeos.",
  },
  "ee.media_label": { de: "Fotos / Videos", en: "Photos / videos", es: "Fotos / vídeos" },
  "ee.no_media": { de: "Noch keine Medien in diesem Eintrag.", en: "No media in this entry yet.", es: "Aún no hay archivos en esta entrada." },
  "ee.add_media": {
    de: "＋ Fotos/Videos/Audio hinzufügen (mehrere möglich)",
    en: "＋ Add photos/videos/audio (multiple)",
    es: "＋ Añadir fotos/vídeos/audio (varios)",
  },
  "ee.rm_media_title": { de: "Medium entfernen?", en: "Remove media?", es: "¿Quitar archivo?" },
  "ee.rm_media_body": {
    de: "Dieses Foto/Video wird dauerhaft gelöscht.",
    en: "This photo/video will be permanently deleted.",
    es: "Esta foto/vídeo se eliminará permanentemente.",
  },
  "ee.link_hint": {
    de: "Wird als Vorschaukarte angezeigt. Leer lassen entfernt den Link.",
    en: "Shown as a preview card. Leave empty to remove the link.",
    es: "Se muestra como tarjeta de vista previa. Déjalo vacío para quitar el enlace.",
  },
} satisfies Record<string, Msg>;

export type MsgKey = keyof typeof M;

export type T = (key: MsgKey, vars?: Record<string, string | number>) => string;

export function translator(lang: Lang): T {
  return (key, vars) => {
    let s = M[key][lang] ?? M[key].de;
    if (vars) {
      for (const k of Object.keys(vars)) s = s.split("{" + k + "}").join(String(vars[k]));
    }
    return s;
  };
}
