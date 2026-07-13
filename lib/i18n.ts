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
