import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AffichageClient } from "@/app/tournois/[id]/affichage/AffichageClient";

export default async function AffichagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();

  if (!tournament) notFound();

  const [{ data: levels }, { data: players }, { data: payouts }, { data: admin }] =
    await Promise.all([
      supabase
        .from("tournament_blind_levels")
        .select("level_number, is_break, small_blind, big_blind, ante, duration_minutes")
        .eq("tournament_id", id)
        .order("level_number"),
      supabase
        .from("tournament_players")
        .select(
          "player_id, status, place, stack, rebuys_count, addon_used, buy_in_paid, bounty_cash_won, table_number, seat_number, profiles!tournament_players_player_id_fkey(pseudo), eliminator:profiles!tournament_players_eliminated_by_fkey(pseudo)",
        )
        .eq("tournament_id", id),
      supabase
        .from("tournament_payouts")
        .select("place, percentage")
        .eq("tournament_id", id)
        .order("place"),
      supabase
        .from("tournament_admins")
        .select("user_id")
        .eq("tournament_id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  const canManage = tournament.created_by === user.id || !!admin;

  // Graine de l'horloge : le client doit démarrer sur la même valeur que
  // le HTML rendu par le serveur, sinon React signale un écart
  // d'hydratation. Il reprend ensuite la main avec son propre timer.
  // eslint-disable-next-line react-hooks/purity
  const initialNow = Date.now();

  return (
    <AffichageClient
      tournamentId={id}
      initialTournament={tournament}
      levels={levels ?? []}
      initialPlayers={players ?? []}
      payouts={payouts ?? []}
      canManage={canManage}
      initialNow={initialNow}
    />
  );
}
