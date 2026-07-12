import { redirect } from "next/navigation";
import { getUser, getMembership, needsSecondFactor } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import { signOut } from "@/app/auth-actions";

// Depends on the session cookie — never statically cache.
export const dynamic = "force-dynamic";

export default async function Home() {
  // Before Supabase is configured, show a friendly foundation notice.
  if (!hasSupabaseEnv()) {
    return (
      <main className="page">
        <p className="eyebrow">Fundament</p>
        <h1 className="title">Benni-Tagebuch</h1>
        <p className="sub">
          Supabase ist noch nicht konfiguriert. Folge <code>docs/setup-supabase.md</code>, lege eine
          <code> .env.local</code> an und starte den Dev-Server neu.
        </p>
      </main>
    );
  }

  const user = await getUser();
  if (!user) redirect("/login");
  if (await needsSecondFactor()) redirect("/login/mfa");
  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  return (
    <main className="page">
      <div className="spread">
        <div>
          <p className="eyebrow">Angemeldet</p>
          <h1 className="title">Willkommen 👋</h1>
        </div>
        <form action={signOut}>
          <button className="btn">Abmelden</button>
        </form>
      </div>
      <p className="sub">{user.email}</p>
      <div className="msg" style={{ marginTop: 8 }}>
        Der Zeitstrahl und das Hinzufügen von Erinnerungen folgen als Nächstes. Das
        Sicherheitsfundament — Login, Zwei-Faktor und Haushalt — steht.
      </div>
      <div className="row" style={{ marginTop: 18 }}>
        <a className="btn" href="/settings/security">Zwei-Faktor einrichten</a>
        <a className="btn" href="/settings/household">Haushalt &amp; Einladung</a>
      </div>
    </main>
  );
}
