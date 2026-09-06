import { createClient } from "@/lib/supabase/server";

export type ChipDenominationOption = { id: string; color: string; value: number };
export type ChipSetOption = { id: string; name: string; denominations: ChipDenominationOption[] };

/** Liste tous les jeux de jetons réutilisables (visibles par tous),
 * avec leurs dénominations groupées, pour peupler le sélecteur de
 * jeu de la fiche tournoi. */
export async function getChipSetOptions(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<ChipSetOption[]> {
  const [{ data: chipSets }, { data: denominations }] = await Promise.all([
    supabase.from("chip_sets").select("id, name").order("created_at", { ascending: false }),
    supabase.from("chip_denominations").select("id, chip_set_id, color, value").order("value"),
  ]);

  const denomsBySet = new Map<string, ChipDenominationOption[]>();
  for (const d of denominations ?? []) {
    const list = denomsBySet.get(d.chip_set_id);
    const entry = { id: d.id, color: d.color, value: d.value };
    if (list) list.push(entry);
    else denomsBySet.set(d.chip_set_id, [entry]);
  }

  return (chipSets ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    denominations: denomsBySet.get(s.id) ?? [],
  }));
}
