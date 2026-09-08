import { notFound, redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { createTournament } from "@/app/tournois/actions";
import { TournoiForm } from "@/components/TournoiForm";
import { getManagedClubOptions } from "@/lib/clubOptions";
import { getChipSetOptions } from "@/lib/chipSetOptions";

export default async function NouveauTournoiDansEvenementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getUser();
  if (!user) redirect("/connexion");

  const { data: event } = await supabase.from("events").select("id, created_by").eq("id", id).single();
  if (!event) notFound();

  const { data: admin } = await supabase
    .from("event_admins")
    .select("user_id")
    .eq("event_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const canManage = event.created_by === user.id || !!admin;
  if (!canManage) redirect(`/evenements/${id}`);

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
      label: stat ? `${s.name} · ⭐ ${stat.avg_rating} (${stat.ratings_count})` : s.name,
    };
  });

  const clubOptions = await getManagedClubOptions(supabase, user.id);
  const chipSetOptions = await getChipSetOptions(supabase);

  return (
    <TournoiForm
      structureOptions={structureOptions}
      chipSetOptions={chipSetOptions}
      clubOptions={clubOptions}
      action={createTournament}
      title="Créer un tournoi dans l'évènement"
      submitLabel="Créer le tournoi"
      pendingLabel="Création..."
      cancelHref={`/evenements/${id}`}
      userId={user.id}
      eventId={id}
    />
  );
}
