import { redirect } from "next/navigation";
import { getUser, getMembership, enforceSecondFactor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile, getMyProfile } from "@/lib/data";
import ProfileForm from "./ProfileForm";
import AccessibilitySection from "./AccessibilitySection";
import PasswordSection from "./PasswordSection";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getUser();
  if (!user) redirect("/login");
  await enforceSecondFactor();
  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  const supabase = await createClient();
  await ensureProfile(supabase, user.id, user.email ?? undefined);
  const profile = await getMyProfile(supabase, user.id);

  let avatarUrl: string | null = null;
  if (profile.avatar_key) {
    const { data: signed } = await supabase.storage.from("media").createSignedUrl(profile.avatar_key, 3600);
    avatarUrl = signed?.signedUrl ?? null;
  }

  return (
    <main className="page">
      <p className="eyebrow">Dein Profil</p>
      <h1 className="title">Profil bearbeiten</h1>
      <p className="sub">
        Dein Anzeigename und deine Farbe erscheinen an jedem Eintrag und Kommentar, den du
        erstellst. So sieht man auf einen Blick, von wem etwas stammt.
      </p>
      <ProfileForm
        initialName={profile.display_name}
        initialColor={profile.color}
        email={user.email ?? ""}
        householdId={membership.household_id}
        userId={user.id}
        initialAvatarUrl={avatarUrl}
      />

      <div style={{ marginTop: 16 }}>
        <AccessibilitySection
          initialTextSize={profile.text_size}
          initialHighContrast={profile.high_contrast}
          initialReduceMotion={profile.reduce_motion}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <PasswordSection />
      </div>

      <p style={{ marginTop: 24 }}>
        <a href="/">← Zurück</a>
      </p>
    </main>
  );
}
