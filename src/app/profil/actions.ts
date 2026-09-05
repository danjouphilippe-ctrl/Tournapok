"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ProfileFormState = {
  error: string | null;
};

const PLAYER_TYPES = ["serre_passif", "serre_agressif", "loose_passif", "loose_agressif"];

export async function updateProfile(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const pseudo = String(formData.get("pseudo") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const playerTypeRaw = String(formData.get("player_type") ?? "");
  const playerType = PLAYER_TYPES.includes(playerTypeRaw) ? playerTypeRaw : null;
  const playerTypeCustom = String(formData.get("player_type_custom") ?? "").trim();
  const ageRaw = String(formData.get("age") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  if (!pseudo) {
    return { error: "Le pseudo ne peut pas être vide." };
  }

  if (playerTypeCustom.length > 100) {
    return { error: "Le type de joueur perso doit faire moins de 100 caractères." };
  }

  let age: number | null = null;
  if (ageRaw) {
    age = Number(ageRaw);
    if (!Number.isFinite(age) || age < 0 || age > 120) {
      return { error: "L'âge doit être un nombre entre 0 et 120." };
    }
  }

  if (bio.length > 500) {
    return { error: "La bio doit faire moins de 500 caractères." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      pseudo,
      city: city || null,
      player_type: playerType,
      player_type_custom: playerTypeCustom || null,
      age,
      bio: bio || null,
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "Ce pseudo est déjà pris." };
    }
    return { error: "Impossible de mettre à jour le profil." };
  }

  revalidatePath("/profil");
  return { error: null };
}
