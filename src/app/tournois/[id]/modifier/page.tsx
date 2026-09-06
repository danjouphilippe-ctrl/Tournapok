import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateTournament } from "@/app/tournois/actions";
import { TournoiForm, type TournoiFormValues } from "@/components/TournoiForm";
import { getManagedClubOptions } from "@/lib/clubOptions";
import { getChipSetOptions } from "@/lib/chipSetOptions";

export default async function ModifierTournoiPage({
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

  const { data: admin } = await supabase
    .from("tournament_admins")
    .select("user_id")
    .eq("tournament_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const canManage = tournament.created_by === user.id || !!admin;
  if (!canManage || tournament.status !== "inscription") {
    redirect(`/tournois/${id}`);
  }

  const [{ data: structures }, { data: stats }, { data: blindLevels }, { data: payouts }, { data: rackRows }, chipSetOptions] =
    await Promise.all([
      supabase.from("blind_structures").select("id, name, speed_preset").order("created_at", { ascending: false }),
      supabase.from("blind_structure_stats").select("structure_id, avg_rating, ratings_count"),
      supabase
        .from("tournament_blind_levels")
        .select("level_number, is_break, small_blind, big_blind, ante, duration_minutes")
        .eq("tournament_id", id)
        .order("level_number"),
      supabase
        .from("tournament_payouts")
        .select("place, percentage")
        .eq("tournament_id", id)
        .order("place"),
      supabase
        .from("tournament_chip_rack")
        .select("denomination_id, quantity")
        .eq("tournament_id", id),
      getChipSetOptions(supabase),
    ]);

  const selectedChipSet = chipSetOptions.find((s) => s.id === tournament.chip_set_id);
  const chipRack = (rackRows ?? []).map((r) => {
    const denomination = selectedChipSet?.denominations.find((d) => d.id === r.denomination_id);
    return {
      denominationId: r.denomination_id,
      value: denomination?.value ?? 0,
      quantity: r.quantity,
    };
  });

  const statsById = new Map((stats ?? []).map((s) => [s.structure_id, s]));
  const structureOptions = (structures ?? []).map((s) => {
    const stat = statsById.get(s.id);
    return {
      id: s.id,
      label: stat ? `${s.name} · ⭐ ${stat.avg_rating} (${stat.ratings_count})` : s.name,
    };
  });

  const initial: Partial<TournoiFormValues> = {
    name: tournament.name,
    description: tournament.description ?? "",
    scheduledAt: tournament.scheduled_at ?? "",
    location: tournament.location ?? "",
    minPlayers: tournament.min_players,
    maxPlayers: tournament.max_players,
    tableSize: tournament.table_size,
    buyIn: tournament.buy_in,
    startingStack: tournament.starting_stack,
    rebuyEnabled: tournament.rebuy_enabled,
    rebuyMaxPerPlayer: tournament.rebuy_max_per_player,
    rebuyPrice: tournament.rebuy_price,
    rebuyChips: tournament.rebuy_chips,
    rebuyStackThreshold: tournament.rebuy_stack_threshold,
    rebuyUntilLevel: tournament.rebuy_until_level,
    addonEnabled: tournament.addon_enabled,
    addonPrice: tournament.addon_price,
    addonChips: tournament.addon_chips,
    addonAtLevel: tournament.addon_at_level,
    bountyEnabled: tournament.bounty_enabled,
    bountyAmount: tournament.bounty_amount,
    bountyProgressive: tournament.bounty_progressive,
    lateRegEnabled: tournament.late_registration_enabled,
    lateRegUntilLevel: tournament.late_registration_until_level,
    guaranteeAmount: tournament.guarantee_amount,
    payoutPlaces: tournament.payout_places,
    payouts: (payouts ?? []).map((p) => ({ place: p.place, percentage: p.percentage })),
    blindStructureId: tournament.blind_structure_id ?? "",
    chipImageUrl: tournament.chip_image_url ?? "",
    chipSetId: tournament.chip_set_id ?? "",
    chipRack,
    customLevels: (blindLevels ?? []).map((l) => ({
      levelNumber: l.level_number,
      isBreak: l.is_break,
      smallBlind: l.small_blind,
      bigBlind: l.big_blind,
      ante: l.ante,
      durationMinutes: l.duration_minutes,
    })),
    clubId: tournament.club_id ?? "",
    visibility: tournament.visibility,
  };

  const clubOptions = await getManagedClubOptions(supabase, user.id);

  return (
    <TournoiForm
      structureOptions={structureOptions}
      chipSetOptions={chipSetOptions}
      clubOptions={clubOptions}
      action={updateTournament.bind(null, id)}
      title="Modifier le tournoi"
      submitLabel="Enregistrer les modifications"
      pendingLabel="Enregistrement..."
      cancelHref={`/tournois/${id}`}
      initial={initial}
      userId={user.id}
    />
  );
}
