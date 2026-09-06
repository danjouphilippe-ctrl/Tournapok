"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ChipSetFormState = {
  error: string | null;
};

export type ChipDenominationInput = { color: string; value: number };

export async function createChipSet(
  _prevState: ChipSetFormState,
  formData: FormData,
): Promise<ChipSetFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const name = String(formData.get("name") ?? "").trim();
  const denominationsRaw = String(formData.get("denominations_json") ?? "[]");

  if (!name) {
    return { error: "Le jeu de jetons doit avoir un nom." };
  }

  let denominations: ChipDenominationInput[];
  try {
    denominations = JSON.parse(denominationsRaw);
  } catch {
    return { error: "Les dénominations sont invalides." };
  }

  if (!Array.isArray(denominations) || denominations.length === 0) {
    return { error: "Ajoute au moins une dénomination (couleur + valeur)." };
  }
  if (denominations.some((d) => !d.color?.trim() || !(d.value > 0))) {
    return { error: "Chaque dénomination doit avoir une couleur et une valeur positive." };
  }

  const { data: chipSet, error } = await supabase
    .from("chip_sets")
    .insert({ name, created_by: user.id })
    .select("id")
    .single();

  if (error || !chipSet) {
    return { error: "Impossible de créer le jeu de jetons." };
  }

  const { error: denomError } = await supabase.from("chip_denominations").insert(
    denominations.map((d) => ({
      chip_set_id: chipSet.id,
      color: d.color.trim(),
      value: d.value,
    })),
  );

  if (denomError) {
    return { error: "Le jeu a été créé mais les dénominations n'ont pas pu être enregistrées." };
  }

  revalidatePath("/jetons");
  redirect("/jetons");
}
