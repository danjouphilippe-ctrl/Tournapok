"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type StructureFormState = {
  error: string | null;
};

export type StructureLevelInput = {
  levelNumber: number;
  isBreak: boolean;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  durationMinutes: number;
};

export async function createStructure(
  _prevState: StructureFormState,
  formData: FormData,
): Promise<StructureFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const speedPreset = String(formData.get("speed_preset") ?? "personnalise");
  const levelsRaw = String(formData.get("levels_json") ?? "[]");

  if (!name) {
    return { error: "La structure doit avoir un nom." };
  }

  let levels: StructureLevelInput[];
  try {
    levels = JSON.parse(levelsRaw);
  } catch {
    return { error: "Les niveaux de blindes sont invalides." };
  }

  if (!Array.isArray(levels) || levels.length === 0) {
    return { error: "Ajoute au moins un niveau de blindes." };
  }

  const { data: structure, error } = await supabase
    .from("blind_structures")
    .insert({
      name,
      description: description || null,
      speed_preset: speedPreset,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !structure) {
    return { error: "Impossible de créer la structure." };
  }

  const { error: levelsError } = await supabase.from("blind_structure_levels").insert(
    levels.map((level, index) => ({
      structure_id: structure.id,
      level_number: index + 1,
      is_break: level.isBreak,
      small_blind: level.smallBlind,
      big_blind: level.bigBlind,
      ante: level.ante,
      duration_minutes: level.durationMinutes,
    })),
  );

  if (levelsError) {
    return { error: "La structure a été créée mais les niveaux n'ont pas pu être enregistrés." };
  }

  revalidatePath("/structures");
  redirect(`/structures/${structure.id}`);
}

export async function rateStructure(structureId: string, rating: number) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  await supabase.from("blind_structure_ratings").upsert(
    { structure_id: structureId, user_id: user.id, rating },
    { onConflict: "structure_id,user_id" },
  );

  revalidatePath(`/structures/${structureId}`);
}
