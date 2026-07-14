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

// Pick a UI language from an Accept-Language header (for pre-login pages,
// where there is no profile yet). Falls back to German.
export function pickLangFromAcceptLanguage(header: string | null | undefined): Lang {
  if (!header) return "de";
  for (const part of header.split(",")) {
    const code = (part.split(";")[0] ?? "").trim().toLowerCase();
    if (code.startsWith("de")) return "de";
    if (code.startsWith("es")) return "es";
    if (code.startsWith("en")) return "en";
  }
  return "de";
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
  "nav.firsts": { de: "Erste Male", en: "Firsts", es: "Primeras veces" },
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
  "nav.notifications": { de: "Benachrichtigungen", en: "Notifications", es: "Notificaciones" },
  "nav.trash": { de: "Papierkorb", en: "Trash", es: "Papelera" },
  "nav.activity": { de: "Aktivität", en: "Activity", es: "Actividad" },
  "nav.letters": { de: "Briefe", en: "Letters", es: "Cartas" },
  "nav.guests": { de: "Gäste-Beiträge", en: "Guest posts", es: "Aportes de invitados" },

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
  "settings.notifications_desc": {
    de: "Wobei und wie du benachrichtigt wirst",
    en: "What and how you get notified",
    es: "Sobre qué y cómo recibes avisos",
  },
  "settings.trash_desc": {
    de: "Gelöschte Einträge ansehen und wiederherstellen",
    en: "View and restore deleted entries",
    es: "Ver y restaurar entradas eliminadas",
  },
  "settings.activity_desc": {
    de: "Wer hat wann was erstellt, geändert oder gelöscht",
    en: "Who created, changed or deleted what, and when",
    es: "Quién creó, cambió o eliminó qué, y cuándo",
  },
  "settings.export_desc": {
    de: "Das komplette Tagebuch als ZIP sichern",
    en: "Back up the whole diary as a ZIP",
    es: "Copia de seguridad de todo el diario en ZIP",
  },
  "settings.guests_desc": {
    de: "Großeltern & Paten per Ablauf-Link beitragen lassen",
    en: "Let grandparents & godparents contribute via an expiring link",
    es: "Deja que abuelos y padrinos aporten con un enlace temporal",
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
  "entry.private": { de: "🔒 Privat", en: "🔒 Private", es: "🔒 Privado" },

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

  // colour scheme (per-user theme)
  "theme.title": { de: "Farbschema", en: "Colour scheme", es: "Esquema de color" },
  "theme.sub": {
    de: "Wähle deine Farben — gilt nur für deine Ansicht.",
    en: "Pick your colours — applies only to your view.",
    es: "Elige tus colores — solo para tu vista.",
  },
  "theme.default": { de: "Bernstein", en: "Amber", es: "Ámbar" },
  "theme.coral": { de: "Koralle", en: "Coral", es: "Coral" },
  "theme.cherry": { de: "Kirsche", en: "Cherry", es: "Cereza" },
  "theme.rose": { de: "Rosé", en: "Rose", es: "Rosa" },
  "theme.magenta": { de: "Purpur", en: "Magenta", es: "Magenta" },
  "theme.plum": { de: "Flieder", en: "Plum", es: "Ciruela" },
  "theme.indigo": { de: "Indigo", en: "Indigo", es: "Índigo" },
  "theme.ocean": { de: "Ozean", en: "Ocean", es: "Océano" },
  "theme.teal": { de: "Türkis", en: "Teal", es: "Turquesa" },
  "theme.forest": { de: "Wald", en: "Forest", es: "Bosque" },
  "theme.lime": { de: "Limette", en: "Lime", es: "Lima" },
  "theme.slate": { de: "Schiefer", en: "Slate", es: "Pizarra" },

  // light/dark appearance (per-user)
  "mode.title": { de: "Darstellung", en: "Appearance", es: "Apariencia" },
  "mode.sub": {
    de: "Hell, dunkel oder automatisch nach deinem Gerät.",
    en: "Light, dark, or automatic to match your device.",
    es: "Claro, oscuro o automático según tu dispositivo.",
  },
  "mode.system": { de: "Automatisch", en: "Automatic", es: "Automático" },
  "mode.light": { de: "Hell", en: "Light", es: "Claro" },
  "mode.dark": { de: "Dunkel", en: "Dark", es: "Oscuro" },
  "mode.toggle": {
    de: "Darstellung: {mode} — tippen zum Wechseln",
    en: "Appearance: {mode} — tap to switch",
    es: "Apariencia: {mode} — toca para cambiar",
  },

  // page chrome (header/footer shared across sub-pages)
  "chrome.home": { de: "Zum Tagebuch", en: "To the diary", es: "Al diario" },
  "chrome.settings": { de: "Einstellungen", en: "Settings", es: "Ajustes" },

  // read-only family sharing — navigation + settings card
  "nav.sharing": { de: "Teilen (nur lesen)", en: "Share (read-only)", es: "Compartir (solo lectura)" },
  "settings.sharing_desc": {
    de: "Großeltern & Familie einen schreibgeschützten Blick geben — per Ablauf-Link, ohne Account.",
    en: "Give grandparents & family a read-only view — via an expiring link, no account.",
    es: "Da a los abuelos y la familia una vista de solo lectura — por enlace temporal, sin cuenta.",
  },

  // the public read-only view (app/share/[token])
  "share.eyebrow": { de: "Geteilter Einblick", en: "A shared glimpse", es: "Un vistazo compartido" },
  "share.title_named": { de: "{name}s Tagebuch", en: "{name}'s diary", es: "El diario de {name}" },
  "share.title_memory": { de: "Eine Erinnerung an {name}", en: "A memory of {name}", es: "Un recuerdo de {name}" },
  "share.the_child": { de: "das Kind", en: "the child", es: "el niño" },
  "share.a_parent": { de: "Elternteil", en: "A parent", es: "Madre o padre" },
  "share.age": { de: "{age}", en: "{age}", es: "{age}" },
  "share.readonly_note": {
    de: "Nur zum Ansehen. Private Einträge und Ortsangaben sind ausgeblendet.",
    en: "View only. Private entries and locations are hidden.",
    es: "Solo para ver. Las entradas privadas y las ubicaciones están ocultas.",
  },
  "share.empty": { de: "Hier gibt es noch nichts zu sehen.", en: "There's nothing to see here yet.", es: "Aún no hay nada que ver aquí." },
  "share.footer": {
    de: "Mit Liebe geführt im Benni-Tagebuch.",
    en: "Kept with love in the Benni diary.",
    es: "Cuidado con cariño en el diario de Benni.",
  },
  "share.dead_title": { de: "Dieser Link ist nicht (mehr) gültig", en: "This link isn't available", es: "Este enlace no está disponible" },
  "share.dead_invalid": {
    de: "Der Link ist ungültig. Bitte frag die Eltern nach einem neuen.",
    en: "The link is invalid. Please ask the parents for a new one.",
    es: "El enlace no es válido. Pide uno nuevo a los padres.",
  },
  "share.dead_expired": {
    de: "Der Link ist abgelaufen. Bitte frag die Eltern nach einem neuen.",
    en: "The link has expired. Please ask the parents for a new one.",
    es: "El enlace ha caducado. Pide uno nuevo a los padres.",
  },
  "share.dead_revoked": {
    de: "Der Zugang zu diesem Link wurde beendet.",
    en: "Access to this link has been turned off.",
    es: "El acceso a este enlace se ha desactivado.",
  },
  "share.dead_unavailable": {
    de: "Diese Erinnerung ist nicht mehr verfügbar.",
    en: "This memory is no longer available.",
    es: "Este recuerdo ya no está disponible.",
  },
  "share.dead_unconfigured": {
    de: "Das Teilen ist gerade nicht verfügbar. Bitte später erneut versuchen.",
    en: "Sharing is currently unavailable. Please try again later.",
    es: "Compartir no está disponible ahora. Inténtalo más tarde.",
  },

  // sharing management (app/settings/sharing)
  "sharing.eyebrow": { de: "Teilen", en: "Sharing", es: "Compartir" },
  "sharing.title": { de: "Familien-Lesezugang", en: "Family read-only access", es: "Acceso de solo lectura" },
  "sharing.sub": {
    de: "Erstelle einen Link, mit dem Großeltern & Familie das Tagebuch nur ansehen können — ohne Account, jederzeit widerrufbar.",
    en: "Create a link that lets grandparents & family only view the diary — no account, revocable anytime.",
    es: "Crea un enlace para que abuelos y familia solo vean el diario — sin cuenta, revocable en cualquier momento.",
  },
  "sharing.create": { de: "Neuen Link erstellen", en: "Create a new link", es: "Crear un enlace nuevo" },
  "sharing.create_hint": {
    de: "Der Link zeigt die ganze Timeline — nur zum Ansehen.",
    en: "The link shows the whole timeline — view only.",
    es: "El enlace muestra toda la línea de tiempo — solo para ver.",
  },
  "sharing.label_label": { de: "Bezeichnung (nur für dich)", en: "Label (just for you)", es: "Etiqueta (solo para ti)" },
  "sharing.label_ph": { de: "z. B. Oma & Opa", en: "e.g. Grandma & Grandpa", es: "p. ej. Abuela y abuelo" },
  "sharing.child_label": { de: "Kind", en: "Child", es: "Niño" },
  "sharing.lang_label": { de: "Sprache der Ansicht", en: "Language of the view", es: "Idioma de la vista" },
  "sharing.expiry_label": { de: "Gültigkeit", en: "Validity", es: "Validez" },
  "sharing.expiry_days": { de: "{n} Tage", en: "{n} days", es: "{n} días" },
  "sharing.expiry_never": { de: "Kein Ablauf (Übergabe)", en: "No expiry (handover)", es: "Sin caducidad (entrega)" },
  "sharing.privacy": {
    de: "Private Einträge und genaue Ortsangaben (GPS) werden nie geteilt.",
    en: "Private entries and precise location (GPS) are never shared.",
    es: "Las entradas privadas y la ubicación precisa (GPS) nunca se comparten.",
  },
  "sharing.err_create": { de: "Der Link konnte nicht erstellt werden.", en: "The link couldn't be created.", es: "No se pudo crear el enlace." },
  "sharing.create_btn": { de: "Link erstellen", en: "Create link", es: "Crear enlace" },
  "sharing.link_ready": { de: "Dein Link ist bereit — teile ihn nur mit Menschen, denen du vertraust:", en: "Your link is ready — share it only with people you trust:", es: "Tu enlace está listo — compártelo solo con personas de confianza:" },
  "sharing.share": { de: "Teilen", en: "Share", es: "Compartir" },
  "sharing.share_text": { de: "Ein Einblick in Bennis Tagebuch", en: "A glimpse into Benni's diary", es: "Un vistazo al diario de Benni" },
  "sharing.copy": { de: "Kopieren", en: "Copy", es: "Copiar" },
  "sharing.copied": { de: "Kopiert ✓", en: "Copied ✓", es: "Copiado ✓" },
  "sharing.active_links": { de: "Aktive Links", en: "Active links", es: "Enlaces activos" },
  "sharing.unnamed_link": { de: "Link ohne Bezeichnung", en: "Unnamed link", es: "Enlace sin etiqueta" },
  "sharing.expires_on": { de: "Läuft ab am {date}", en: "Expires on {date}", es: "Caduca el {date}" },
  "sharing.no_expiry": { de: "Kein Ablauf (Übergabe)", en: "No expiry (handover)", es: "Sin caducidad (entrega)" },
  "sharing.viewed": { de: "schon angesehen", en: "already viewed", es: "ya visto" },
  "sharing.status_active": { de: "Aktiv", en: "Active", es: "Activo" },
  "sharing.revoke": { de: "Beenden", en: "Revoke", es: "Revocar" },
  "sharing.revoke_title": { de: "Zugang beenden?", en: "Revoke access?", es: "¿Revocar acceso?" },
  "sharing.revoke_body": {
    de: "Der Link funktioniert danach nicht mehr. Das lässt sich nicht rückgängig machen.",
    en: "The link will stop working. This can't be undone.",
    es: "El enlace dejará de funcionar. Esto no se puede deshacer.",
  },
  "sharing.empty": { de: "Noch keine aktiven Links.", en: "No active links yet.", es: "Aún no hay enlaces activos." },

  // change e-mail address
  "em.title": { de: "E-Mail-Adresse ändern", en: "Change e-mail address", es: "Cambiar correo electrónico" },
  "em.current": { de: "Aktuell: {email}", en: "Current: {email}", es: "Actual: {email}" },
  "em.new": { de: "Neue E-Mail-Adresse", en: "New e-mail address", es: "Nuevo correo electrónico" },
  "em.new_ph": { de: "name@beispiel.de", en: "name@example.com", es: "nombre@ejemplo.com" },
  "em.pw": { de: "Aktuelles Passwort (zur Bestätigung)", en: "Current password (to confirm)", es: "Contraseña actual (para confirmar)" },
  "em.pw_ph": { de: "dein Passwort", en: "your password", es: "tu contraseña" },
  "em.submit": { de: "Adresse ändern", en: "Change address", es: "Cambiar dirección" },
  "em.sent": {
    de: "Wir haben einen Bestätigungslink an die neue Adresse geschickt. Die Änderung wird aktiv, sobald du ihn anklickst.",
    en: "We've sent a confirmation link to the new address. The change takes effect once you click it.",
    es: "Hemos enviado un enlace de confirmación a la nueva dirección. El cambio se aplica cuando lo pulses.",
  },

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

  // backup status + reminder
  "backup.head": { de: "Sicherungs-Status", en: "Backup status", es: "Estado de la copia" },
  "backup.last": { de: "Letzte vollständige Sicherung", en: "Last full backup", es: "Última copia completa" },
  "backup.never": { de: "Noch nie gesichert", en: "Never backed up", es: "Nunca respaldado" },
  "backup.today": { de: "heute", en: "today", es: "hoy" },
  "backup.yesterday": { de: "gestern", en: "yesterday", es: "ayer" },
  "backup.days_ago": { de: "vor {n} Tagen", en: "{n} days ago", es: "hace {n} días" },
  "backup.mark_external": { de: "Extern gesichert", en: "Backed up elsewhere", es: "Copiado en otro sitio" },
  "backup.remind_label": { de: "Erinnerung per E-Mail", en: "E-mail reminder", es: "Recordatorio por correo" },
  "backup.off": { de: "Aus", en: "Off", es: "No" },
  "backup.every_days": { de: "alle {n} Tage", en: "every {n} days", es: "cada {n} días" },
  "backup.remind_hint": {
    de: "Wir erinnern euch per E-Mail und schicken automatisch einen Text-Schnappschuss des Tagebuchs mit (ohne Medien).",
    en: "We'll e-mail you a reminder and automatically attach a text snapshot of the diary (without media).",
    es: "Os enviaremos un recordatorio por correo y adjuntaremos automáticamente una instantánea de texto del diario (sin medios).",
  },
  "backup.test_send": { de: "Test-E-Mail senden", en: "Send test e-mail", es: "Enviar correo de prueba" },
  "backup.test_hint": {
    de: "Schickt dir die Erinnerungs-Mail mit Anhang sofort zu.",
    en: "Sends you the reminder e-mail with attachment right now.",
    es: "Te envía el correo recordatorio con adjunto ahora mismo.",
  },
  "backup.test_sent": {
    de: "Test-E-Mail verschickt — schau in dein Postfach (auch Spam).",
    en: "Test e-mail sent — check your inbox (and spam).",
    es: "Correo de prueba enviado — revisa tu bandeja (y spam).",
  },
  // reminder e-mail
  "backup.mail_subject": {
    de: "Zeit für eine Sicherung von Bennis Tagebuch",
    en: "Time to back up Benni's diary",
    es: "Hora de respaldar el diario de Benni",
  },
  "backup.mail_headline": {
    de: "Sichere euer Tagebuch",
    en: "Back up your diary",
    es: "Respaldad vuestro diario",
  },
  "backup.mail_body": {
    de: "{status} Ein kurzer Klick genügt, um eine vollständige Sicherung (mit allen Fotos & Videos) auf deinem Gerät zu erstellen.",
    en: "{status} A quick click creates a full backup (with all photos & videos) on your device.",
    es: "{status} Un clic rápido crea una copia completa (con todas las fotos y vídeos) en tu dispositivo.",
  },
  "backup.mail_never": {
    de: "Ihr habt noch keine vollständige Sicherung erstellt.",
    en: "You haven't made a full backup yet.",
    es: "Aún no habéis hecho una copia completa.",
  },
  "backup.mail_since": {
    de: "Eure letzte vollständige Sicherung ist {n} Tage her.",
    en: "Your last full backup was {n} days ago.",
    es: "Vuestra última copia completa fue hace {n} días.",
  },
  "backup.mail_cta": { de: "Jetzt sichern", en: "Back up now", es: "Respaldar ahora" },
  "backup.mail_attached": {
    de: "Angehängt: ein aktueller Text-Schnappschuss (JSON) aller Einträge — als automatische Zweitsicherung. Die Fotos/Videos sind darin nicht enthalten.",
    en: "Attached: a current text snapshot (JSON) of all entries — an automatic second copy. Photos/videos are not included in it.",
    es: "Adjunto: una instantánea de texto (JSON) de todas las entradas — una segunda copia automática. Las fotos/vídeos no están incluidos.",
  },
  "backup.mail_tip": {
    de: "Tipp: Stell zur Sicherheit ab und zu testweise eine Datei aus einer Sicherung wieder her — so weißt du, dass sie funktioniert.",
    en: "Tip: now and then, test-restore a single file from a backup — so you know it actually works.",
    es: "Consejo: de vez en cuando, restaura de prueba un solo archivo de una copia — así sabes que funciona.",
  },
  "backup.mail_footer": {
    de: "Du erhältst diese E-Mail, weil die Backup-Erinnerung aktiv ist. Intervall ändern oder abschalten: in den Einstellungen unter Sicherung.",
    en: "You're getting this because the backup reminder is on. Change the interval or turn it off in Settings under Backup.",
    es: "Recibes esto porque el recordatorio de copia está activo. Cambia el intervalo o desactívalo en Ajustes, en Copia de seguridad.",
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

  // "Erste Male" collector
  "firsts.eyebrow": { de: "Sammlung", en: "Collection", es: "Colección" },
  "firsts.title": { de: "Erste Male", en: "Firsts", es: "Primeras veces" },
  "firsts.sub": {
    de: "Sammle {name}s erste Male — halte jedes fest, sobald es passiert, und verknüpfe es mit der Erinnerung.",
    en: "Collect {name}'s firsts — record each one as it happens and link it to the memory.",
    es: "Colecciona las primeras veces de {name} — registra cada una cuando ocurra y enlázala con el recuerdo.",
  },
  "firsts.progress": { de: "{n} von {total} gesammelt", en: "{n} of {total} collected", es: "{n} de {total} recogidas" },
  "firsts.record": { de: "festhalten", en: "record", es: "registrar" },
  "firsts.save": { de: "Festhalten", en: "Record", es: "Registrar" },
  "firsts.no_date": { de: "ohne Datum", en: "no date", es: "sin fecha" },
  "firsts.no_memory": { de: "— Erinnerung verknüpfen (optional) —", en: "— link a memory (optional) —", es: "— enlazar un recuerdo (opcional) —" },
  "firsts.memory_label": { de: "Erinnerung", en: "Memory", es: "Recuerdo" },
  "firsts.del_title": { de: "Erstes Mal löschen?", en: "Delete this first?", es: "¿Eliminar esta primera vez?" },
  "firsts.del_body": { de: "Dieser Eintrag wird aus der Sammlung entfernt.", en: "This will be removed from the collection.", es: "Se eliminará de la colección." },
  "firsts.need_title": { de: "Bitte einen Titel eingeben.", en: "Please enter a title.", es: "Introduce un título." },
  "firsts.custom_head": { de: "Eigene erste Male", en: "Your own firsts", es: "Tus propias primeras veces" },
  "firsts.custom_hint": {
    de: "Etwas Besonderes, das nicht in der Liste steht? Halte {name}s eigenes erstes Mal fest.",
    en: "Something special that's not in the list? Record {name}'s own first.",
    es: "¿Algo especial que no está en la lista? Registra la primera vez propia de {name}.",
  },
  "firsts.custom_label": { de: "Was war es?", en: "What was it?", es: "¿Qué fue?" },
  "firsts.custom_ph": { de: "z. B. Erster Schwimmbadbesuch", en: "e.g. First trip to the pool", es: "p. ej. Primera vez en la piscina" },
  "firsts.custom_add": { de: "Hinzufügen", en: "Add", es: "Añadir" },
  "firsts.growth_count": { de: "{n} festgehalten · ansehen", en: "{n} recorded · view", es: "{n} registradas · ver" },
  "firsts.growth_empty": { de: "Noch nichts gesammelt · ansehen", en: "Nothing collected yet · view", es: "Aún nada · ver" },
  // the 14 canonical firsts
  "firsts.smile": { de: "Erstes Lächeln", en: "First smile", es: "Primera sonrisa" },
  "firsts.laugh": { de: "Erstes Lachen", en: "First laugh", es: "Primera risa" },
  "firsts.slept": { de: "Erste durchgeschlafene Nacht", en: "First night sleeping through", es: "Primera noche durmiendo del tirón" },
  "firsts.roll": { de: "Erstes Umdrehen", en: "First roll-over", es: "Primera vez que se dio la vuelta" },
  "firsts.tooth": { de: "Erster Zahn", en: "First tooth", es: "Primer diente" },
  "firsts.sit": { de: "Erstes Sitzen", en: "First time sitting up", es: "Primera vez sentado" },
  "firsts.solid": { de: "Erster Brei", en: "First solid food", es: "Primera papilla" },
  "firsts.crawl": { de: "Erstes Krabbeln", en: "First crawling", es: "Primer gateo" },
  "firsts.stand": { de: "Erstes Stehen", en: "First pulling up to stand", es: "Primera vez de pie" },
  "firsts.word": { de: "Erstes Wort", en: "First word", es: "Primera palabra" },
  "firsts.wave": { de: "Erstes Winken", en: "First wave", es: "Primer saludo con la mano" },
  "firsts.steps": { de: "Erste Schritte", en: "First steps", es: "Primeros pasos" },
  "firsts.haircut": { de: "Erster Haarschnitt", en: "First haircut", es: "Primer corte de pelo" },
  "firsts.birthday": { de: "Erster Geburtstag", en: "First birthday", es: "Primer cumpleaños" },

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
  "ef.media_hint": {
    de: "Fotos und große Videos werden für einen schnelleren Upload automatisch verkleinert – die Qualität für Handy & Laptop bleibt. Das Original auf deinem Gerät bleibt unverändert.",
    en: "Photos and large videos are shrunk automatically for a faster upload — quality for phone & laptop stays. The original on your device is untouched.",
    es: "Las fotos y los vídeos grandes se reducen automáticamente para subir más rápido — la calidad para móvil y portátil se mantiene. El original en tu dispositivo no se toca.",
  },
  "ef.preparing": {
    de: "Bereite Medien vor … {pct}%",
    en: "Preparing media … {pct}%",
    es: "Preparando medios … {pct}%",
  },
  "ef.uploading": {
    de: "Lade Medien hoch … {done}/{total} · {pct}%",
    en: "Uploading media … {done}/{total} · {pct}%",
    es: "Subiendo medios … {done}/{total} · {pct}%",
  },
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

  // household
  "role.owner": { de: "Eigentümer:in", en: "Owner", es: "Propietario" },
  "role.parent": { de: "Elternteil", en: "Parent", es: "Progenitor" },
  "hh.member_one": { de: "{n} Mitglied", en: "{n} member", es: "{n} miembro" },
  "hh.member_many": { de: "{n} Mitglieder", en: "{n} members", es: "{n} miembros" },
  "hh.your_role": { de: "deine Rolle: {role}", en: "your role: {role}", es: "tu rol: {role}" },
  "inv.not_owner": {
    de: "Nur der/die Haushalts-Eigentümer:in kann einladen.",
    en: "Only the household owner can invite.",
    es: "Solo el propietario del hogar puede invitar.",
  },
  "inv.intro": {
    de: "Lade den zweiten Elternteil ein: erzeuge einen Link und schicke ihn per E-Mail, WhatsApp o. Ä. Der/die Eingeladene registriert sich und tritt damit automatisch bei.",
    en: "Invite the second parent: create a link and send it by email, WhatsApp, etc. The invitee signs up and joins automatically.",
    es: "Invita al segundo progenitor: crea un enlace y envíalo por correo, WhatsApp, etc. La persona invitada se registra y se une automáticamente.",
  },
  "inv.create": { de: "Einladungs-Link erzeugen", en: "Create invite link", es: "Crear enlace de invitación" },
  "inv.valid": { de: "Gültig 14 Tage · einmalig verwendbar:", en: "Valid for 14 days · single use:", es: "Válido 14 días · un solo uso:" },
  "inv.share": { de: "Teilen", en: "Share", es: "Compartir" },
  "inv.copy": { de: "Link kopieren", en: "Copy link", es: "Copiar enlace" },
  "inv.copied": { de: "Kopiert ✓", en: "Copied ✓", es: "Copiado ✓" },
  "inv.share_text": {
    de: "Tritt unserem digitalen Tagebuch für Benni bei:",
    en: "Join our digital diary for Benni:",
    es: "Únete a nuestro diario digital de Benni:",
  },

  // security
  "sec.eyebrow": { de: "Konto & Sicherheit", en: "Account & security", es: "Cuenta y seguridad" },
  "sec.title": { de: "Zwei-Faktor-Authentifizierung", en: "Two-factor authentication", es: "Autenticación de dos factores" },
  "sec.sub": {
    de: "Schütze euer Tagebuch mit einem zweiten Faktor (Authenticator-App / TOTP).",
    en: "Protect your diary with a second factor (authenticator app / TOTP).",
    es: "Protege vuestro diario con un segundo factor (app de autenticación / TOTP).",
  },
  "sec.active": {
    de: "✅ Zwei-Faktor ist aktiv. Damit dich ein verlorenes Handy nicht aussperrt, nutze eine Authenticator-App mit Cloud-Backup (z. B. iPhone-„Passwörter“, 1Password oder Authy). Geht der Zugang trotzdem verloren, kann der/die Haushalts-Eigentümer:in den zweiten Faktor zurücksetzen.",
    en: "✅ Two-factor is active. So a lost phone doesn’t lock you out, use an authenticator app with cloud backup (e.g. iPhone “Passwords”, 1Password or Authy). If access is still lost, the household owner can reset the second factor.",
    es: "✅ La verificación en dos pasos está activa. Para que un móvil perdido no te bloquee, usa una app de autenticación con copia en la nube (p. ej. «Contraseñas» de iPhone, 1Password o Authy). Si aun así pierdes el acceso, el propietario del hogar puede restablecer el segundo factor.",
  },
  "sec.enable": { de: "Zwei-Faktor aktivieren", en: "Enable two-factor", es: "Activar dos factores" },
  "sec.scan": {
    de: "Scanne den QR-Code mit deiner Authenticator-App und gib dann den 6-stelligen Code ein.",
    en: "Scan the QR code with your authenticator app, then enter the 6-digit code.",
    es: "Escanea el código QR con tu app de autenticación e introduce el código de 6 dígitos.",
  },
  "sec.manual": { de: "Manuell:", en: "Manual:", es: "Manual:" },
  "sec.code": { de: "Code", en: "Code", es: "Código" },
  "sec.confirm": { de: "Bestätigen & aktivieren", en: "Confirm & activate", es: "Confirmar y activar" },

  // auth: common
  "auth.email": { de: "E-Mail", en: "Email", es: "Correo electrónico" },
  "auth.password": { de: "Passwort", en: "Password", es: "Contraseña" },

  // login
  "login.title": { de: "Anmelden", en: "Sign in", es: "Iniciar sesión" },
  "login.sub": { de: "Willkommen zurück.", en: "Welcome back.", es: "Bienvenido de nuevo." },
  "login.sub_join": {
    de: "Melde dich an, um dem Tagebuch beizutreten.",
    en: "Sign in to join the diary.",
    es: "Inicia sesión para unirte al diario.",
  },
  "login.no_account": { de: "Noch kein Konto?", en: "No account yet?", es: "¿Aún no tienes cuenta?" },
  "login.register": { de: "Registrieren", en: "Sign up", es: "Registrarse" },

  // signup
  "signup.title": { de: "Konto erstellen", en: "Create account", es: "Crear cuenta" },
  "signup.sub": {
    de: "Ein eigenes Konto pro Elternteil — nie ein geteiltes Login.",
    en: "A separate account per parent — never a shared login.",
    es: "Una cuenta por progenitor — nunca un inicio de sesión compartido.",
  },
  "signup.sub_join": {
    de: "Erstelle dein eigenes Konto — danach trittst du automatisch dem Tagebuch bei.",
    en: "Create your own account — then you join the diary automatically.",
    es: "Crea tu propia cuenta — después te unes al diario automáticamente.",
  },
  "signup.password": {
    de: "Passwort (min. 8 Zeichen)",
    en: "Password (min. 8 characters)",
    es: "Contraseña (mín. 8 caracteres)",
  },
  "signup.have_account": { de: "Schon ein Konto?", en: "Already have an account?", es: "¿Ya tienes cuenta?" },

  // mfa
  "mfa.eyebrow": { de: "Zwei-Faktor", en: "Two-factor", es: "Dos factores" },
  "mfa.title": { de: "Bestätigen", en: "Confirm", es: "Confirmar" },
  "mfa.sub": {
    de: "Gib den 6-stelligen Code aus deiner Authenticator-App ein.",
    en: "Enter the 6-digit code from your authenticator app.",
    es: "Introduce el código de 6 dígitos de tu app de autenticación.",
  },

  // account recovery codes
  "rec.title": { de: "Wiederherstellungs-Codes", en: "Recovery codes", es: "Códigos de recuperación" },
  "rec.sub": {
    de: "Einmal-Codes für den Fall, dass du dein Handy bzw. deine Authenticator-App verlierst. Druck sie aus und bewahre sie sicher auf — jeder Code funktioniert genau einmal.",
    en: "One-time codes in case you lose your phone or authenticator app. Print them and keep them safe — each code works exactly once.",
    es: "Códigos de un solo uso por si pierdes el teléfono o la app de autenticación. Imprímelos y guárdalos a salvo — cada código funciona una sola vez.",
  },
  "rec.not_configured": {
    de: "Hinweis: Die Server-seitige Wiederherstellung ist noch nicht eingerichtet — die Codes lassen sich erst einlösen, wenn der Service-Role-Schlüssel hinterlegt ist.",
    en: "Note: server-side recovery isn't set up yet — codes can't be redeemed until the service-role key is configured.",
    es: "Nota: la recuperación en el servidor aún no está configurada — los códigos no se pueden usar hasta configurar la clave service-role.",
  },
  "rec.remaining": {
    de: "Du hast noch {n} ungenutzte Codes.",
    en: "You have {n} unused codes left.",
    es: "Te quedan {n} códigos sin usar.",
  },
  "rec.none": {
    de: "Du hast noch keine Wiederherstellungs-Codes erzeugt.",
    en: "You haven't generated any recovery codes yet.",
    es: "Aún no has generado códigos de recuperación.",
  },
  "rec.generate": { de: "Codes erzeugen", en: "Generate codes", es: "Generar códigos" },
  "rec.regenerate": { de: "Neue Codes erzeugen", en: "Generate new codes", es: "Generar nuevos códigos" },
  "rec.regenerate_hint": {
    de: "Neue Codes zu erzeugen macht alle bisherigen ungültig.",
    en: "Generating new codes invalidates all previous ones.",
    es: "Generar nuevos códigos anula todos los anteriores.",
  },
  "rec.save_now": {
    de: "Speichere diese Codes jetzt — sie werden nur dieses eine Mal angezeigt.",
    en: "Save these codes now — they're shown only this once.",
    es: "Guarda estos códigos ahora — solo se muestran esta vez.",
  },
  "rec.copy": { de: "Kopieren", en: "Copy", es: "Copiar" },
  "rec.copied": { de: "Kopiert ✓", en: "Copied ✓", es: "Copiado ✓" },
  "rec.download": { de: "Als Datei speichern", en: "Save as file", es: "Guardar como archivo" },
  "rec.print_hint": {
    de: "Tipp: an zwei verschiedenen Orten aufbewahren (z. B. ausgedruckt + Passwort-Manager).",
    en: "Tip: keep them in two different places (e.g. printed + password manager).",
    es: "Consejo: guárdalos en dos lugares distintos (p. ej. impreso + gestor de contraseñas).",
  },
  "rec.file_header": {
    de: "Benni-Tagebuch — Wiederherstellungs-Codes (jeder Code funktioniert einmal):",
    en: "Benni Diary — recovery codes (each code works once):",
    es: "Diario de Benni — códigos de recuperación (cada código funciona una vez):",
  },
  "rec.recovered_note": {
    de: "Deine Zwei-Faktor-Authentifizierung wurde per Wiederherstellungs-Code zurückgesetzt. Bitte richte unten einen neuen Authenticator ein.",
    en: "Your two-factor authentication was reset with a recovery code. Please set up a new authenticator below.",
    es: "Tu autenticación de dos factores se restableció con un código de recuperación. Configura un nuevo autenticador abajo.",
  },
  // recovery on the MFA challenge screen
  "rec.lost_device": {
    de: "Kein Zugriff auf deine Authenticator-App?",
    en: "No access to your authenticator app?",
    es: "¿Sin acceso a tu app de autenticación?",
  },
  "rec.mfa_title": { de: "Wiederherstellungs-Code", en: "Recovery code", es: "Código de recuperación" },
  "rec.mfa_sub": {
    de: "Gib einen deiner Wiederherstellungs-Codes ein. Danach kannst du dich anmelden und einen neuen Authenticator einrichten.",
    en: "Enter one of your recovery codes. You can then sign in and set up a new authenticator.",
    es: "Introduce uno de tus códigos de recuperación. Luego podrás iniciar sesión y configurar un nuevo autenticador.",
  },
  "rec.code_label": { de: "Wiederherstellungs-Code", en: "Recovery code", es: "Código de recuperación" },
  "rec.mfa_submit": { de: "Code einlösen", en: "Redeem code", es: "Usar código" },
  "rec.back_to_totp": { de: "← Zurück zur Authenticator-App", en: "← Back to the authenticator app", es: "← Volver a la app de autenticación" },

  // onboarding
  "ob.eyebrow": { de: "Einrichten", en: "Setup", es: "Configuración" },
  "ob.title": { de: "Haushalt anlegen", en: "Create household", es: "Crear hogar" },
  "ob.sub": {
    de: "Ein Haushalt bündelt eure Erinnerungen. Lege einen neuen an — oder tritt mit einem Einladungs-Code des anderen Elternteils bei.",
    en: "A household holds your memories together. Create a new one — or join with an invite code from the other parent.",
    es: "Un hogar reúne vuestros recuerdos. Crea uno nuevo — o únete con un código de invitación del otro progenitor.",
  },
  "ob.name_label": { de: "Name des Haushalts", en: "Household name", es: "Nombre del hogar" },
  "ob.name_ph": { de: "z. B. Familie Wolter", en: "e.g. The Wolter Family", es: "p. ej. Familia Wolter" },
  "ob.or": { de: "oder", en: "or", es: "o" },
  "ob.code_label": { de: "Einladungs-Code", en: "Invite code", es: "Código de invitación" },
  "ob.code_ph": { de: "Code vom anderen Elternteil", en: "Code from the other parent", es: "Código del otro progenitor" },
  "ob.join": { de: "Mit Code beitreten", en: "Join with code", es: "Unirse con código" },

  // child form
  "child.title": { de: "Kind anlegen", en: "Add child", es: "Añadir niño" },
  "child.sub": { de: "Für wen ist dieses Tagebuch?", en: "Who is this diary for?", es: "¿Para quién es este diario?" },
  "child.name_label": { de: "Name", en: "Name", es: "Nombre" },
  "child.name_ph": { de: "z. B. Benni", en: "e.g. Benni", es: "p. ej. Benni" },
  "child.birth_label": { de: "Geburtsdatum (optional)", en: "Date of birth (optional)", es: "Fecha de nacimiento (opcional)" },

  // join dead-end
  "join.eyebrow": { de: "Einladung", en: "Invitation", es: "Invitación" },
  "join.title": { de: "Beitritt nicht möglich", en: "Can’t join", es: "No se puede unir" },
  "join.sub": {
    de: "Dieser Einladungs-Link ist ungültig, bereits benutzt oder abgelaufen. Bitte den anderen Elternteil um einen neuen Link.",
    en: "This invite link is invalid, already used or expired. Please ask the other parent for a new link.",
    es: "Este enlace de invitación no es válido, ya se usó o caducó. Pide al otro progenitor un enlace nuevo.",
  },
  "join.home": { de: "Zur Startseite", en: "Go to home", es: "Ir al inicio" },

  // letters / time capsule
  "letters.eyebrow": { de: "Zeitkapsel", en: "Time capsule", es: "Cápsula del tiempo" },
  "letters.title": { de: "Briefe an die Zukunft", en: "Letters to the future", es: "Cartas al futuro" },
  "letters.sub": {
    de: "Schreibe {name} einen Brief, der sich zu einem gewählten Datum öffnet — z. B. zum 18. Geburtstag. Bis dahin bleibt er versiegelt (auch für den anderen Elternteil).",
    en: "Write {name} a letter that opens on a chosen date — e.g. their 18th birthday. Until then it stays sealed (even from the other parent).",
    es: "Escribe a {name} una carta que se abre en una fecha elegida — p. ej. su 18.º cumpleaños. Hasta entonces queda sellada (también para el otro progenitor).",
  },
  "letters.write": { de: "Neuen Brief schreiben", en: "Write a new letter", es: "Escribir una carta nueva" },
  "letters.title_ph": { de: "z. B. Zu deinem 18.", en: "e.g. For your 18th", es: "p. ej. Para tus 18" },
  "letters.body_label": { de: "Dein Brief", en: "Your letter", es: "Tu carta" },
  "letters.body_ph": { de: "Liebe/r {name} …", en: "Dear {name} …", es: "Querido/a {name} …" },
  "letters.unlock_label": { de: "Öffnet am", en: "Opens on", es: "Se abre el" },
  "letters.preset_18": { de: "18. Geburtstag", en: "18th birthday", es: "18.º cumpleaños" },
  "letters.preset_1y": { de: "In 1 Jahr", en: "In 1 year", es: "En 1 año" },
  "letters.preset_5y": { de: "In 5 Jahren", en: "In 5 years", es: "En 5 años" },
  "letters.seal": { de: "Versiegeln", en: "Seal", es: "Sellar" },
  "letters.opened": { de: "Geöffnet", en: "Opened", es: "Abiertas" },
  "letters.your_sealed": { de: "Deine versiegelten Briefe", en: "Your sealed letters", es: "Tus cartas selladas" },
  "letters.sealed_until": { de: "🔒 Versiegelt bis {date}", en: "🔒 Sealed until {date}", es: "🔒 Sellada hasta {date}" },
  "letters.opened_on": { de: "Geöffnet am {date}", en: "Opened on {date}", es: "Abierta el {date}" },
  "letters.by": { de: "von {name}", en: "by {name}", es: "de {name}" },
  "letters.from_one": {
    de: "{name} hat einen versiegelten Brief hinterlegt.",
    en: "{name} has left a sealed letter.",
    es: "{name} ha dejado una carta sellada.",
  },
  "letters.from_many": {
    de: "{name} hat {n} versiegelte Briefe hinterlegt.",
    en: "{name} has left {n} sealed letters.",
    es: "{name} ha dejado {n} cartas selladas.",
  },
  "letters.next_opens": { de: "Nächster öffnet {date}.", en: "Next opens {date}.", es: "La próxima se abre el {date}." },
  "letters.waiting": { de: "Wartet auf euch", en: "Waiting for you", es: "Esperándoos" },
  "letters.empty": {
    de: "Noch keine Briefe. Schreibe den ersten.",
    en: "No letters yet. Write the first one.",
    es: "Aún no hay cartas. Escribe la primera.",
  },
  "letters.del_title": { de: "Brief löschen?", en: "Delete letter?", es: "¿Eliminar carta?" },
  "letters.del_body": { de: "Dieser Brief wird entfernt.", en: "This letter will be removed.", es: "Se eliminará esta carta." },

  // Papierkorb (trash) — restore soft-deleted entries
  "trash.eyebrow": { de: "Sicher aufbewahrt", en: "Kept safe", es: "Guardado a salvo" },
  "trash.title": { de: "Papierkorb", en: "Trash", es: "Papelera" },
  "trash.sub": {
    de: "Von dir gelöschte Einträge landen hier und lassen sich wiederherstellen. Nichts geht versehentlich verloren.",
    en: "Entries you deleted land here and can be restored. Nothing is lost by accident.",
    es: "Las entradas que eliminaste llegan aquí y se pueden restaurar. Nada se pierde por accidente.",
  },
  "trash.empty": {
    de: "Der Papierkorb ist leer.",
    en: "The trash is empty.",
    es: "La papelera está vacía.",
  },
  "trash.from": { de: "vom {date}", en: "from {date}", es: "del {date}" },
  "trash.deleted_on": { de: "gelöscht am {date}", en: "deleted on {date}", es: "eliminado el {date}" },
  "trash.restore": { de: "Wiederherstellen", en: "Restore", es: "Restaurar" },

  // activity log ("wer hat was getan")
  "activity.eyebrow": { de: "Nachvollziehbar", en: "Transparent", es: "Transparente" },
  "activity.title": { de: "Aktivitätsprotokoll", en: "Activity log", es: "Registro de actividad" },
  "activity.sub": {
    de: "Wer hat wann was erstellt, geändert, gelöscht oder wiederhergestellt — für Vertrauen zwischen euch beiden.",
    en: "Who created, changed, deleted or restored what, and when — for trust between you two.",
    es: "Quién creó, cambió, eliminó o restauró qué, y cuándo — para la confianza entre vosotros.",
  },
  "activity.empty": { de: "Noch keine Aktivität.", en: "No activity yet.", es: "Aún no hay actividad." },
  "activity.someone": { de: "Jemand", en: "Someone", es: "Alguien" },
  "activity.entry_create": { de: "{name} hat einen Eintrag erstellt", en: "{name} created an entry", es: "{name} creó una entrada" },
  "activity.entry_edit": { de: "{name} hat einen Eintrag bearbeitet", en: "{name} edited an entry", es: "{name} editó una entrada" },
  "activity.entry_delete": {
    de: "{name} hat einen Eintrag in den Papierkorb gelegt",
    en: "{name} moved an entry to the trash",
    es: "{name} movió una entrada a la papelera",
  },
  "activity.entry_restore": { de: "{name} hat einen Eintrag wiederhergestellt", en: "{name} restored an entry", es: "{name} restauró una entrada" },
  "activity.comment_create": { de: "{name} hat kommentiert", en: "{name} commented", es: "{name} comentó" },
  "activity.comment_delete": { de: "{name} hat einen Kommentar gelöscht", en: "{name} deleted a comment", es: "{name} eliminó un comentario" },

  // notifications (in-app bell + preferences)
  "notif.title": { de: "Benachrichtigungen", en: "Notifications", es: "Notificaciones" },
  "notif.aria": {
    de: "Benachrichtigungen ({n} ungelesen)",
    en: "Notifications ({n} unread)",
    es: "Notificaciones ({n} sin leer)",
  },
  "notif.none": { de: "Noch nichts Neues.", en: "Nothing new yet.", es: "Nada nuevo todavía." },
  "notif.mark_all": { de: "Alle gelesen", en: "Mark all read", es: "Marcar todo leído" },
  "notif.someone": { de: "Jemand", en: "Someone", es: "Alguien" },
  "notif.settings_link": { de: "Einstellungen", en: "Settings", es: "Ajustes" },
  "notif.new_entry": {
    de: "{name} hat einen neuen Eintrag hinzugefügt.",
    en: "{name} added a new entry.",
    es: "{name} añadió una entrada nueva.",
  },
  "notif.comment": {
    de: "{name} hat deinen Eintrag kommentiert.",
    en: "{name} commented on your entry.",
    es: "{name} comentó tu entrada.",
  },
  "notif.reaction": {
    de: "{name} hat mit {emoji} auf deinen Eintrag reagiert.",
    en: "{name} reacted {emoji} to your entry.",
    es: "{name} reaccionó {emoji} a tu entrada.",
  },
  // notification settings page
  "notif.settings_eyebrow": { de: "Konto & App", en: "Account & app", es: "Cuenta y app" },
  "notif.settings_title": { de: "Benachrichtigungen", en: "Notifications", es: "Notificaciones" },
  "notif.settings_sub": {
    de: "Lege fest, worüber du in der App benachrichtigt werden möchtest.",
    en: "Choose what you want to be notified about in the app.",
    es: "Elige sobre qué quieres recibir avisos en la app.",
  },
  "notif.opt_head": { de: "Benachrichtige mich, wenn …", en: "Notify me when …", es: "Avísame cuando …" },
  "notif.ch_inapp": { de: "In-App", en: "In-app", es: "En app" },
  "notif.ch_email": { de: "E-Mail", en: "E-mail", es: "Correo" },
  "notif.email_privacy": {
    de: "E-Mails enthalten keine privaten Inhalte — nur einen Hinweis und einen Link zum Tagebuch.",
    en: "E-mails contain no private content — just a note and a link to the diary.",
    es: "Los correos no incluyen contenido privado — solo un aviso y un enlace al diario.",
  },
  "notif.opt_channel_note": {
    de: "Aktuell in der App (Glocke). E-Mail- und Push-Benachrichtigungen folgen.",
    en: "Currently in-app (the bell). E-mail and push notifications will follow.",
    es: "Por ahora en la app (la campana). El correo y las push llegarán después.",
  },
  "notif.opt_entry": { de: "… ein neuer Eintrag erstellt wird", en: "… a new entry is added", es: "… se añade una entrada nueva" },
  "notif.opt_entry_hint": {
    de: "Wenn die andere Person eine Erinnerung hinzufügt.",
    en: "When the other person adds a memory.",
    es: "Cuando la otra persona añade un recuerdo.",
  },
  "notif.opt_comment": { de: "… jemand meinen Eintrag kommentiert", en: "… someone comments on my entry", es: "… alguien comenta mi entrada" },
  "notif.opt_comment_hint": {
    de: "Kommentare zu Einträgen, die du erstellt hast.",
    en: "Comments on entries you created.",
    es: "Comentarios en entradas que creaste.",
  },
  "notif.opt_reaction": { de: "… jemand auf meinen Eintrag reagiert", en: "… someone reacts to my entry", es: "… alguien reacciona a mi entrada" },
  "notif.opt_reaction_hint": {
    de: "Emoji-Reaktionen auf deine Einträge.",
    en: "Emoji reactions on your entries.",
    es: "Reacciones emoji en tus entradas.",
  },
  "notif.mute": { de: "Alle Benachrichtigungen stummschalten", en: "Mute all notifications", es: "Silenciar todas las notificaciones" },
  "notif.mute_hint": {
    de: "Du bekommst vorübergehend gar keine Benachrichtigungen.",
    en: "You temporarily receive no notifications at all.",
    es: "No recibirás ninguna notificación temporalmente.",
  },

  // e-mail notifications (sent server-side, in the recipient's language)
  "email.brand": { de: "Benni-Tagebuch", en: "Benni Diary", es: "Diario de Benni" },
  "email.someone": { de: "Jemand", en: "Someone", es: "Alguien" },
  "email.subject_entry": {
    de: "{name} hat einen neuen Eintrag hinzugefügt",
    en: "{name} added a new entry",
    es: "{name} añadió una entrada nueva",
  },
  "email.subject_comment": {
    de: "{name} hat deinen Eintrag kommentiert",
    en: "{name} commented on your entry",
    es: "{name} comentó tu entrada",
  },
  "email.subject_reaction": {
    de: "{name} hat auf deinen Eintrag reagiert",
    en: "{name} reacted to your entry",
    es: "{name} reaccionó a tu entrada",
  },
  "email.cta": { de: "Im Tagebuch öffnen", en: "Open in the diary", es: "Abrir en el diario" },
  "email.privacy": {
    de: "Aus Datenschutzgründen zeigen wir hier keine Inhalte — öffne das Tagebuch, um alles zu sehen.",
    en: "For privacy we show no content here — open the diary to see everything.",
    es: "Por privacidad no mostramos contenido aquí — abre el diario para verlo todo.",
  },
  "email.footer": {
    de: "Du erhältst diese E-Mail, weil du E-Mail-Benachrichtigungen aktiviert hast. Du kannst das jederzeit in den Einstellungen des Tagebuchs ändern.",
    en: "You're getting this e-mail because you enabled e-mail notifications. You can change this any time in the diary's settings.",
    es: "Recibes este correo porque activaste las notificaciones por correo. Puedes cambiarlo cuando quieras en los ajustes del diario.",
  },

  // guest write page (public, account-less, rendered in the invite's language)
  "guest.eyebrow": { de: "Eine Erinnerung beitragen", en: "Share a memory", es: "Comparte un recuerdo" },
  "guest.title": { de: "Schreib eine Erinnerung", en: "Write a memory", es: "Escribe un recuerdo" },
  "guest.title_named": {
    de: "Eine Erinnerung für {name}",
    en: "A memory for {name}",
    es: "Un recuerdo para {name}",
  },
  "guest.the_child": { de: "das Kind", en: "the child", es: "el niño" },
  "guest.sub": {
    de: "Du wurdest eingeladen, eine Erinnerung oder eine liebe Botschaft für {name} beizusteuern. Kein Konto nötig — dein Beitrag wird von den Eltern gesichtet.",
    en: "You've been invited to add a memory or a kind message for {name}. No account needed — your note is reviewed by the parents.",
    es: "Te han invitado a añadir un recuerdo o un mensaje cariñoso para {name}. Sin cuenta — tu aporte lo revisan los padres.",
  },
  "guest.name_label": { de: "Dein Name", en: "Your name", es: "Tu nombre" },
  "guest.name_ph": { de: "z. B. Oma Ingrid", en: "e.g. Grandma Ingrid", es: "p. ej. Abuela Inés" },
  "guest.title_label": { de: "Titel (optional)", en: "Title (optional)", es: "Título (opcional)" },
  "guest.title_ph": { de: "z. B. Unser Tag im Zoo", en: "e.g. Our day at the zoo", es: "p. ej. Nuestro día en el zoo" },
  "guest.body_label": { de: "Deine Erinnerung", en: "Your memory", es: "Tu recuerdo" },
  "guest.body_ph": {
    de: "Schreibe {name} etwas Schönes …",
    en: "Write {name} something lovely …",
    es: "Escribe a {name} algo bonito …",
  },
  "guest.send": { de: "Absenden", en: "Send", es: "Enviar" },
  "guest.moderated_note": {
    de: "Dein Beitrag erscheint erst nach Freigabe durch die Eltern.",
    en: "Your note appears once a parent approves it.",
    es: "Tu aporte aparece cuando un padre lo aprueba.",
  },
  "guest.thanks": { de: "Vielen Dank!", en: "Thank you!", es: "¡Gracias!" },
  "guest.thanks_sub": {
    de: "Deine Erinnerung wurde übermittelt und wartet auf die Freigabe.",
    en: "Your memory has been submitted and is waiting for approval.",
    es: "Tu recuerdo se ha enviado y espera aprobación.",
  },
  "guest.another": { de: "Noch eine schreiben", en: "Write another", es: "Escribir otro" },
  "guest.err_name": { de: "Bitte gib deinen Namen an.", en: "Please enter your name.", es: "Introduce tu nombre." },
  "guest.err_empty": {
    de: "Bitte schreibe eine Erinnerung oder einen Titel.",
    en: "Please write a memory or a title.",
    es: "Escribe un recuerdo o un título.",
  },
  "guest.err_revoked": {
    de: "Dieser Link wurde deaktiviert.",
    en: "This link has been deactivated.",
    es: "Este enlace se ha desactivado.",
  },
  "guest.err_expired": { de: "Dieser Link ist abgelaufen.", en: "This link has expired.", es: "Este enlace ha caducado." },
  "guest.err_invalid": { de: "Dieser Link ist ungültig.", en: "This link is invalid.", es: "Este enlace no es válido." },
  "guest.err_generic": {
    de: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
    en: "Something went wrong. Please try again.",
    es: "Algo salió mal. Inténtalo de nuevo.",
  },
  "guest.dead_title": { de: "Link nicht verfügbar", en: "Link unavailable", es: "Enlace no disponible" },
  "guest.dead_expired": {
    de: "Dieser Einladungslink ist abgelaufen. Bitte die Eltern um einen neuen.",
    en: "This invite link has expired. Ask the parents for a new one.",
    es: "Este enlace de invitación ha caducado. Pide a los padres uno nuevo.",
  },
  "guest.dead_revoked": {
    de: "Dieser Einladungslink wurde deaktiviert.",
    en: "This invite link has been deactivated.",
    es: "Este enlace de invitación se ha desactivado.",
  },
  "guest.dead_invalid": {
    de: "Dieser Einladungslink ist ungültig. Bitte prüfe den Link.",
    en: "This invite link isn't valid. Please check the link.",
    es: "Este enlace de invitación no es válido. Comprueba el enlace.",
  },

  // guests admin page (parent-facing: create links + moderate contributions)
  "guests.eyebrow": { de: "Familie & Freunde", en: "Family & friends", es: "Familia y amigos" },
  "guests.title": { de: "Gäste-Beiträge", en: "Guest contributions", es: "Aportes de invitados" },
  "guests.sub": {
    de: "Lade Großeltern, Paten oder Freunde per Ablauf-Link ein, eine Erinnerung beizusteuern — ohne Konto. Jeder Beitrag wird von euch freigegeben.",
    en: "Invite grandparents, godparents or friends to add a memory via an expiring link — no account. Every contribution is approved by you.",
    es: "Invita a abuelos, padrinos o amigos a añadir un recuerdo con un enlace temporal — sin cuenta. Cada aporte lo aprobáis vosotros.",
  },
  "guests.create": { de: "Neuen Link erstellen", en: "Create a new link", es: "Crear un enlace nuevo" },
  "guests.create_hint": {
    de: "Der Link funktioniert nur bis zum Ablauf und kann jederzeit deaktiviert werden.",
    en: "The link only works until it expires and can be deactivated any time.",
    es: "El enlace solo funciona hasta que caduca y puede desactivarse cuando quieras.",
  },
  "guests.label_label": { de: "Für wen ist der Link?", en: "Who is the link for?", es: "¿Para quién es el enlace?" },
  "guests.label_ph": { de: "z. B. Oma Ingrid", en: "e.g. Grandma Ingrid", es: "p. ej. Abuela Inés" },
  "guests.msg_label": { de: "Persönliche Nachricht (optional)", en: "Personal message (optional)", es: "Mensaje personal (opcional)" },
  "guests.msg_ph": {
    de: "Wird dem Gast auf der Seite angezeigt …",
    en: "Shown to the guest on the page …",
    es: "Se muestra al invitado en la página …",
  },
  "guests.child_label": { de: "Für welches Kind?", en: "For which child?", es: "¿Para qué niño?" },
  "guests.lang_label": { de: "Sprache der Gäste-Seite", en: "Guest page language", es: "Idioma de la página" },
  "guests.expiry_label": { de: "Gültig für", en: "Valid for", es: "Válido durante" },
  "guests.expiry_days": { de: "{n} Tage", en: "{n} days", es: "{n} días" },
  "guests.create_btn": { de: "Link erstellen", en: "Create link", es: "Crear enlace" },
  "guests.link_ready": {
    de: "Fertig! Teile diesen Link — er wird nur einmal angezeigt:",
    en: "Ready! Share this link — it's shown only once:",
    es: "¡Listo! Comparte este enlace — solo se muestra una vez:",
  },
  "guests.share": { de: "Teilen", en: "Share", es: "Compartir" },
  "guests.share_text": {
    de: "Trag eine Erinnerung ins Tagebuch bei:",
    en: "Add a memory to the diary:",
    es: "Añade un recuerdo al diario:",
  },
  "guests.copy": { de: "Kopieren", en: "Copy", es: "Copiar" },
  "guests.copied": { de: "Kopiert ✓", en: "Copied ✓", es: "Copiado ✓" },
  "guests.err_create": {
    de: "Der Link konnte nicht erstellt werden.",
    en: "Couldn't create the link.",
    es: "No se pudo crear el enlace.",
  },
  "guests.pending": {
    de: "Wartet auf Freigabe ({n})",
    en: "Waiting for approval ({n})",
    es: "Esperando aprobación ({n})",
  },
  "guests.approve": { de: "Freigeben", en: "Approve", es: "Aprobar" },
  "guests.reject": { de: "Ablehnen", en: "Reject", es: "Rechazar" },
  "guests.wall": { de: "Freigegebene Beiträge", en: "Approved contributions", es: "Aportes aprobados" },
  "guests.approved_by": { de: "freigegeben von {name}", en: "approved by {name}", es: "aprobado por {name}" },
  "guests.a_parent": { de: "einem Elternteil", en: "a parent", es: "un progenitor" },
  "guests.active_links": { de: "Aktive Links", en: "Active links", es: "Enlaces activos" },
  "guests.unnamed_link": { de: "Gäste-Link", en: "Guest link", es: "Enlace de invitado" },
  "guests.expires_on": { de: "Läuft ab am {date}", en: "Expires on {date}", es: "Caduca el {date}" },
  "guests.used": { de: "schon genutzt", en: "already used", es: "ya usado" },
  "guests.status_active": { de: "Aktiv", en: "Active", es: "Activo" },
  "guests.revoke": { de: "Deaktivieren", en: "Deactivate", es: "Desactivar" },
  "guests.revoke_title": { de: "Link deaktivieren?", en: "Deactivate link?", es: "¿Desactivar enlace?" },
  "guests.revoke_body": {
    de: "Der Link funktioniert danach nicht mehr. Bereits eingegangene Beiträge bleiben erhalten.",
    en: "The link will stop working. Contributions already received are kept.",
    es: "El enlace dejará de funcionar. Los aportes ya recibidos se conservan.",
  },
  "guests.empty": {
    de: "Noch keine Links oder Beiträge. Erstelle oben den ersten Link.",
    en: "No links or contributions yet. Create the first link above.",
    es: "Aún no hay enlaces ni aportes. Crea el primer enlace arriba.",
  },

  // export bundle (README + offline viewer + sidecars)
  "exp.note": {
    de: "Offline-Sicherung · in jedem Browser ohne Internet lesbar",
    en: "Offline backup · readable in any browser without internet",
    es: "Copia de seguridad sin conexión · legible en cualquier navegador sin internet",
  },
  "exp.v_empty": { de: "Noch keine Einträge.", en: "No entries yet.", es: "Aún no hay entradas." },
  "exp.v_snapshots": { de: "Schnappschüsse", en: "Snapshots", es: "Instantáneas" },
  "exp.v_with": { de: "mit", en: "at", es: "con" },
  "exp.v_highlight": { de: "Höhepunkt", en: "Highlight", es: "Momento destacado" },
  "exp.h_reactions": { de: "Reaktionen", en: "Reactions", es: "Reacciones" },
  "exp.h_comments": { de: "Kommentare", en: "Comments", es: "Comentarios" },
  "exp.h_link": { de: "Link", en: "Link", es: "Enlace" },
  "exp.h_media": { de: "Medien", en: "Media", es: "Medios" },
  "exp.readme": {
    de:
      "Benni-Tagebuch — Offline-Sicherung\n\n" +
      "So öffnest du dein Tagebuch:\n" +
      "1. Diese ZIP-Datei vollständig entpacken.\n" +
      "2. Im entpackten Ordner die Datei 'index.html' mit einem Browser öffnen (Doppelklick).\n" +
      "   Es funktioniert komplett offline — ohne App, ohne Internet.\n\n" +
      "Was ist enthalten:\n" +
      "- index.html   : dein Tagebuch als Webseite, in jedem Browser lesbar.\n" +
      "- media/       : alle Original-Fotos, -Videos und -Audios.\n" +
      "- entries/     : jeder Eintrag als einzelne Textdatei (Markdown, offen lesbar).\n" +
      "- snapshots/   : die „Wer ist … gerade?“-Schnappschüsse als Textdateien.\n" +
      "- links/       : Vorschaubilder der verlinkten Inhalte (Spotify/YouTube/…).\n" +
      "- entries.json : alle Einträge als strukturierte Daten.\n\n" +
      "Tipp: Bewahre mindestens zwei Kopien an verschiedenen Orten auf\n" +
      "(z. B. Computer + externe Festplatte oder ein zweiter Cloud-Speicher).\n",
    en:
      "Benni Diary — Offline backup\n\n" +
      "How to open your diary:\n" +
      "1. Fully extract this ZIP file.\n" +
      "2. In the extracted folder, open 'index.html' in a browser (double-click).\n" +
      "   It works completely offline — no app, no internet.\n\n" +
      "What's included:\n" +
      "- index.html   : your diary as a web page, readable in any browser.\n" +
      "- media/       : all original photos, videos and audio.\n" +
      "- entries/     : each entry as a single text file (Markdown, openly readable).\n" +
      "- snapshots/   : the “Who is … right now?” snapshots as text files.\n" +
      "- links/       : preview images of linked content (Spotify/YouTube/…).\n" +
      "- entries.json : all entries as structured data.\n\n" +
      "Tip: Keep at least two copies in different places\n" +
      "(e.g. computer + external drive or a second cloud storage).\n",
    es:
      "Diario de Benni — Copia de seguridad sin conexión\n\n" +
      "Cómo abrir tu diario:\n" +
      "1. Extrae por completo este archivo ZIP.\n" +
      "2. En la carpeta extraída, abre 'index.html' en un navegador (doble clic).\n" +
      "   Funciona totalmente sin conexión — sin app, sin internet.\n\n" +
      "Qué incluye:\n" +
      "- index.html   : tu diario como página web, legible en cualquier navegador.\n" +
      "- media/       : todas las fotos, vídeos y audios originales.\n" +
      "- entries/     : cada entrada como archivo de texto (Markdown, legible).\n" +
      "- snapshots/   : las instantáneas “¿Quién es … ahora?” como archivos de texto.\n" +
      "- links/       : imágenes de vista previa del contenido enlazado (Spotify/YouTube/…).\n" +
      "- entries.json : todas las entradas como datos estructurados.\n\n" +
      "Consejo: Guarda al menos dos copias en lugares distintos\n" +
      "(p. ej. ordenador + disco externo o un segundo almacenamiento en la nube).\n",
  },
} satisfies Record<string, Msg>;

// Intl locale for each UI language (used by the offline viewer for dates).
export const LOCALE_OF: Record<Lang, string> = { de: "de-DE", en: "en-US", es: "es-ES" };

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
