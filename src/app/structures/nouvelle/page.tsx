import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { NouvelleStructureForm } from "@/app/structures/nouvelle/NouvelleStructureForm";

export default async function NouvelleStructurePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const supabase = await createClient();
  const user = await getUser();
  if (!user) redirect("/connexion");

  if (!from) {
    return <NouvelleStructureForm />;
  }

  const [{ data: source }, { data: levels }] = await Promise.all([
    supabase.from("blind_structures").select("name, description, speed_preset").eq("id", from).single(),
    supabase
      .from("blind_structure_levels")
      .select("level_number, is_break, small_blind, big_blind, ante, duration_minutes")
      .eq("structure_id", from)
      .order("level_number"),
  ]);

  if (!source) {
    return <NouvelleStructureForm />;
  }

  return (
    <NouvelleStructureForm
      initialName={`Copie de ${source.name}`}
      initialDescription={source.description ?? ""}
      initialSpeedPreset={source.speed_preset}
      initialLevels={(levels ?? []).map((l) => ({
        levelNumber: l.level_number,
        isBreak: l.is_break,
        smallBlind: l.small_blind,
        bigBlind: l.big_blind,
        ante: l.ante,
        durationMinutes: l.duration_minutes,
      }))}
    />
  );
}
