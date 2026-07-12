import { hasSupabaseEnv } from "@/lib/env";

// Static landing/status page for the foundation build. Once auth + timeline
// land, this becomes the app entry (redirect to /login or the timeline).
export default function HomePage() {
  const configured = hasSupabaseEnv();
  return (
    <main
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "12vh 24px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <p style={{ letterSpacing: "0.16em", textTransform: "uppercase", fontSize: 12, color: "var(--gold)", margin: 0 }}>
        Fundament
      </p>
      <h1 style={{ fontSize: "clamp(2rem, 6vw, 3rem)", margin: 0, letterSpacing: "-0.02em" }}>
        Benni-Tagebuch
      </h1>
      <p style={{ color: "var(--muted)", margin: 0 }}>
        Ein privates, sicheres digitales Tagebuch — EU-gehostet, DSGVO-konform und darauf ausgelegt,
        18+ Jahre zu halten. Dieses Repository enthält das Sicherheits- und Datenfundament; die
        Oberfläche folgt schrittweise.
      </p>
      <div
        style={{
          marginTop: 8,
          padding: 16,
          borderRadius: 14,
          background: "var(--surface)",
          border: "1px solid var(--faint)",
          fontSize: 14,
        }}
      >
        <strong>Status:</strong>{" "}
        {configured
          ? "Mit Supabase verbunden."
          : "Supabase noch nicht konfiguriert — siehe .env.example und docs/."}
      </div>
    </main>
  );
}
