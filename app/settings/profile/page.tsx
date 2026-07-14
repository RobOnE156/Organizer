import { redirect } from "next/navigation";
import { getUser, getMembership, enforceSecondFactor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile, getMyProfile } from "@/lib/data";
import { translator, normalizeLang } from "@/lib/i18n";
import ProfileForm from "./ProfileForm";
import ThemeSection from "./ThemeSection";
import AccessibilitySection from "./AccessibilitySection";
import PasswordSection from "./PasswordSection";
import EmailSection from "./EmailSection";
import LanguageSection from "./LanguageSection";

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

  const t = translator(normalizeLang(profile.ui_language));

  return (
    <main className="page">
      <p className="eyebrow">{t("profile.eyebrow")}</p>
      <h1 className="title">{t("profile.title")}</h1>
      <p className="sub">{t("profile.sub")}</p>
      <ProfileForm
        initialName={profile.display_name}
        initialColor={profile.color}
        email={user.email ?? ""}
        householdId={membership.household_id}
        userId={user.id}
        initialAvatarUrl={avatarUrl}
      />

      <div style={{ marginTop: 16 }}>
        <ThemeSection initialTheme={profile.theme} />
      </div>

      <div style={{ marginTop: 16 }}>
        <AccessibilitySection
          initialTextSize={profile.text_size}
          initialHighContrast={profile.high_contrast}
          initialReduceMotion={profile.reduce_motion}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <LanguageSection initialLang={profile.ui_language} />
      </div>

      <div style={{ marginTop: 16 }}>
        <EmailSection currentEmail={user.email ?? ""} />
      </div>

      <div style={{ marginTop: 16 }}>
        <PasswordSection />
      </div>

      <p style={{ marginTop: 24 }}>
        <a href="/settings">{t("common.back")}</a>
      </p>
    </main>
  );
}
