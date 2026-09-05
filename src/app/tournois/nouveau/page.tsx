import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createTournament } from "@/app/tournois/actions";
import { TournoiForm } from "@/components/TournoiForm";

export default async function NouveauTournoiPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: structures } = await supabase
    .from("blind_structures")
    .select("id, name, speed_preset")
    .order("created_at", { ascending: false });

  const { data: stats } = await supabase
    .from("blind_structure_stats")
    .select("structure_id, avg_rating, ratings_count");

  const statsById = new Map((stats ?? []).map((s) => [s.structure_id, s]));

  const structureOptions = (structures ?? []).map((s) => {
    const stat = statsById.get(s.id);
    return {
      id: s.id,
      label: stat
        ? `${s.name} · ⭐ ${stat.avg_rating} (${stat.ratings_count})`
        : s.name,
    };
  });

  return (
    <TournoiForm
      structureOptions={structureOptions}
      action={createTournament}
      title="Créer un tournoi"
      submitLabel="Créer le tournoi"
      pendingLabel="Création..."
      cancelHref="/tournois"
      userId={user.id}
    />
  );
}
