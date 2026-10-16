"use server";

import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site";

export interface LoginState {
  ok: boolean;
  message: string;
}

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = String(formData.get("next") ?? "/join");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/join";
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(safeNext)}` },
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: `Magic link sent to ${email}. Open it on this device to sign in.` };
}
