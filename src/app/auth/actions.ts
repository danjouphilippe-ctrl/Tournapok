"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

async function getSiteOrigin() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export type AuthFormState = {
  error: string | null;
};

// Le site est encore en phase de test privée (avant l'évènement du
// 28/11/2026) : seul le compte du créateur et ses alias +xxx peuvent
// s'inscrire. Les comptes déjà créés ne sont pas concernés — ce verrou
// ne s'applique qu'à la création d'un nouveau compte. À retirer une
// fois le site ouvert aux joueurs du club/de l'évènement.
function isAllowedSignupEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return (
    normalized === "danjouphilippe@gmail.com" ||
    (normalized.startsWith("danjouphilippe+") && normalized.endsWith("@gmail.com"))
  );
}

export async function signup(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const supabase = await createClient();

  const pseudo = String(formData.get("pseudo") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!pseudo || !email || !password) {
    return { error: "Merci de remplir tous les champs." };
  }
  if (password.length < 6) {
    return { error: "Le mot de passe doit faire au moins 6 caractères." };
  }
  if (!isAllowedSignupEmail(email)) {
    return {
      error: "Les inscriptions sont fermées pour le moment (site en phase de test privée).",
    };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { pseudo },
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/inscription/verifiez-vos-emails");
}

export async function login(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Merci de remplir tous les champs." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Email ou mot de passe incorrect." };
  }

  revalidatePath("/", "layout");
  redirect("/tableau-de-bord");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/connexion");
}

export async function requestPasswordReset(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Merci de renseigner ton email." };
  }

  const origin = await getSiteOrigin();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/reinitialiser-mot-de-passe`,
  });

  // On redirige vers le même message que l'email existe ou non,
  // pour ne pas révéler quels emails sont inscrits sur le site.
  redirect("/mot-de-passe-oublie/verifiez-vos-emails");
}

export async function updatePassword(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const supabase = await createClient();

  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (password.length < 6) {
    return { error: "Le mot de passe doit faire au moins 6 caractères." };
  }
  if (password !== confirmPassword) {
    return { error: "Les mots de passe ne correspondent pas." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "Impossible de mettre à jour le mot de passe. Redemande un lien." };
  }

  redirect("/tableau-de-bord");
}
