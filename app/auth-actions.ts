"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import type { FormState, EnrollResult, InviteState } from "@/app/auth-types";

const NOT_CONFIGURED = "Supabase ist noch nicht konfiguriert — bitte .env.local anlegen (NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY).";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

// ---- sign up / in / out --------------------------------------------
export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  const email = str(formData, "email");
  const password = str(formData, "password");
  if (!email || password.length < 8) return { error: "Bitte E-Mail und ein Passwort (min. 8 Zeichen) angeben." };

  const code = str(formData, "code");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  if (data.session) redirect(code ? `/join?code=${encodeURIComponent(code)}` : "/onboarding");
  return { message: "Fast fertig! Bitte bestätige die E-Mail, die wir dir geschickt haben, und melde dich dann an." };
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  const email = str(formData, "email");
  const password = str(formData, "password");
  const code = str(formData, "code");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    redirect(code ? `/login/mfa?code=${encodeURIComponent(code)}` : "/login/mfa");
  }
  redirect(code ? `/join?code=${encodeURIComponent(code)}` : "/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ---- multi-factor (TOTP) -------------------------------------------
export async function verifyMfa(_prev: FormState, formData: FormData): Promise<FormState> {
  const code = str(formData, "code");
  const inviteCode = str(formData, "invite_code");
  const supabase = await createClient();

  const { data: factors, error: fErr } = await supabase.auth.mfa.listFactors();
  if (fErr) return { error: fErr.message };
  const totp = factors?.totp?.[0];
  if (!totp) return { error: "Kein TOTP-Faktor gefunden." };

  const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: totp.id });
  if (cErr || !challenge) return { error: cErr?.message ?? "Challenge fehlgeschlagen." };

  const { error } = await supabase.auth.mfa.verify({ factorId: totp.id, challengeId: challenge.id, code });
  if (error) return { error: error.message };
  redirect(inviteCode ? `/join?code=${encodeURIComponent(inviteCode)}` : "/");
}

export async function enrollTotp(): Promise<EnrollResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  if (error || !data) return { error: error?.message ?? "Aktivierung fehlgeschlagen." };
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

export async function verifyEnroll(_prev: FormState, formData: FormData): Promise<FormState> {
  const factorId = str(formData, "factorId");
  const code = str(formData, "code");
  const supabase = await createClient();

  const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
  if (cErr || !challenge) return { error: cErr?.message ?? "Challenge fehlgeschlagen." };

  const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
  if (error) return { error: error.message };
  redirect("/settings/security?enrolled=1");
}

// ---- household bootstrap + invites ---------------------------------
export async function createHousehold(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = str(formData, "name") || "Familie";
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_household", { p_name: name });
  if (error) return { error: error.message };
  redirect("/");
}

export async function createInvite(_prev: InviteState, _formData: FormData): Promise<InviteState> {
  const supabase = await createClient();
  const { data: m } = await supabase.from("memberships").select("household_id").limit(1).maybeSingle();
  if (!m) return { error: "Kein Haushalt gefunden." };
  const { data, error } = await supabase.rpc("create_household_invite", {
    p_household: (m as { household_id: string }).household_id,
  });
  if (error) return { error: error.message };
  return { code: String(data) };
}

export async function redeemInvite(_prev: FormState, formData: FormData): Promise<FormState> {
  const code = str(formData, "code");
  if (!code) return { error: "Bitte gib einen Einladungs-Code ein." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("redeem_household_invite", { p_code: code });
  if (error) return { error: error.message };
  redirect("/");
}
