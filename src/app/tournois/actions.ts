"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { StructureLevelInput } from "@/app/structures/actions";
import { initialSeating, rebalanceAfterRemoval, seatNewPlayer, type SeatedPlayer } from "@/lib/tableBalancing";
import { assertCanUseClub, getResourceAccess, type ResourceAccess } from "@/lib/resourceAccess";

export type TournamentFormState = {
  error: string | null;
};

function numberOrNull(formData: FormData, key: string): number | null {
  const raw = formData.get(key);
  if (raw === null || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

type TournamentRowInput = {
  name: string;
  description: string | null;
  scheduled_at: string | null;
  location: string | null;
  buy_in: number;
  starting_stack: number;
  min_players: number;
  max_players: number | null;
  table_size: number;
  rebuy_enabled: boolean;
  rebuy_max_per_player: number | null;
  rebuy_price: number | null;
  rebuy_chips: number | null;
  rebuy_stack_threshold: number | null;
  rebuy_until_level: number | null;
  addon_enabled: boolean;
  addon_price: number | null;
  addon_chips: number | null;
  addon_at_level: number | null;
  bounty_enabled: boolean;
  bounty_amount: number | null;
  bounty_progressive: boolean;
  late_registration_enabled: boolean;
  late_registration_until_level: number | null;
  guarantee_amount: number | null;
  payout_places: number | null;
  blind_structure_id: string | null;
  chip_image_url: string | null;
  club_id: string | null;
  visibility: string;
};

export type PayoutInput = { place: number; percentage: number };

type ParsedTournamentFields =
  | { ok: false; error: string }
  | {
      ok: true;
      row: TournamentRowInput;
      blindStructureId: string | null;
      customLevels: StructureLevelInput[];
      payouts: PayoutInput[];
    };

function parseTournamentFields(formData: FormData): ParsedTournamentFields {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const scheduledAt = String(formData.get("scheduled_at") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const buyIn = Number(formData.get("buy_in") ?? 0);
  const startingStack = Number(formData.get("starting_stack") ?? 10000);
  const minPlayers = Number(formData.get("min_players") ?? 2);
  const maxPlayers = numberOrNull(formData, "max_players");
  const tableSize = Number(formData.get("table_size") ?? 9);

  const rebuyEnabled = formData.get("rebuy_enabled") === "on";
  const rebuyMaxPerPlayer = numberOrNull(formData, "rebuy_max_per_player");
  const rebuyPrice = numberOrNull(formData, "rebuy_price");
  const rebuyChips = numberOrNull(formData, "rebuy_chips");
  const rebuyStackThreshold = numberOrNull(formData, "rebuy_stack_threshold");
  const rebuyUntilLevel = numberOrNull(formData, "rebuy_until_level");

  const addonEnabled = formData.get("addon_enabled") === "on";
  const addonPrice = numberOrNull(formData, "addon_price");
  const addonChips = numberOrNull(formData, "addon_chips");
  const addonAtLevel = numberOrNull(formData, "addon_at_level");

  const bountyEnabled = formData.get("bounty_enabled") === "on";
  const bountyAmount = numberOrNull(formData, "bounty_amount");
  const bountyProgressive = formData.get("bounty_progressive") === "on";

  const lateRegEnabled = formData.get("late_registration_enabled") === "on";
  const lateRegUntilLevel = numberOrNull(formData, "late_registration_until_level");

  const guaranteeAmount = numberOrNull(formData, "guarantee_amount");
  const payoutsRaw = String(formData.get("payouts_json") ?? "[]");

  const blindStructureId = String(formData.get("blind_structure_id") ?? "") || null;
  const customLevelsRaw = String(formData.get("custom_levels_json") ?? "[]");
  const chipImageUrl = String(formData.get("chip_image_url") ?? "").trim() || null;
  const clubId = String(formData.get("club_id") ?? "").trim() || null;
  const visibility = String(formData.get("visibility") ?? "private");

  if (!name) {
    return { ok: false, error: "Le tournoi doit avoir un nom." };
  }
  if (!Number.isFinite(buyIn) || buyIn < 0) {
    return { ok: false, error: "Le buy-in doit être un nombre positif." };
  }
  if (!Number.isFinite(startingStack) || startingStack <= 0) {
    return { ok: false, error: "Le tapis de départ doit être un nombre positif." };
  }
  if (!Number.isFinite(tableSize) || tableSize < 2) {
    return { ok: false, error: "Le nombre de joueurs par table doit être d'au moins 2." };
  }
  if (!Number.isFinite(minPlayers) || minPlayers < 1) {
    return { ok: false, error: "Le nombre minimum de joueurs doit être d'au moins 1." };
  }
  if (maxPlayers !== null && maxPlayers < minPlayers) {
    return {
      ok: false,
      error: "Le nombre maximum de joueurs ne peut pas être inférieur au minimum.",
    };
  }
  if (!["public", "club", "private"].includes(visibility)) {
    return { ok: false, error: "Visibilité invalide." };
  }
  if (visibility === "club" && !clubId) {
    return { ok: false, error: "Choisis un club pour une visibilité réservée au club." };
  }
  if (rebuyEnabled && (!rebuyPrice || !rebuyChips)) {
    return { ok: false, error: "Renseigne le prix et les jetons de la recave." };
  }
  if (addonEnabled && (!addonPrice || !addonChips)) {
    return { ok: false, error: "Renseigne le prix et les jetons de l'add-on." };
  }
  if (bountyEnabled && !bountyAmount) {
    return { ok: false, error: "Renseigne le montant de la prime." };
  }

  let customLevels: StructureLevelInput[] = [];
  if (!blindStructureId) {
    try {
      customLevels = JSON.parse(customLevelsRaw);
    } catch {
      return { ok: false, error: "La structure de blindes personnalisée est invalide." };
    }
    if (!Array.isArray(customLevels) || customLevels.length === 0) {
      return { ok: false, error: "Choisis une structure de blindes ou définis des niveaux." };
    }
  }

  let payouts: PayoutInput[] = [];
  try {
    payouts = JSON.parse(payoutsRaw);
  } catch {
    return { ok: false, error: "La répartition des gains est invalide." };
  }
  if (!Array.isArray(payouts)) payouts = [];
  if (payouts.length > 0) {
    if (payouts.some((p) => p.percentage < 0)) {
      return { ok: false, error: "Un pourcentage de gain ne peut pas être négatif." };
    }
    const places = payouts.map((p) => p.place);
    if (new Set(places).size !== places.length) {
      return { ok: false, error: "Chaque place ne peut apparaître qu'une seule fois." };
    }
    const total = payouts.reduce((sum, p) => sum + p.percentage, 0);
    if (Math.abs(total - 100) > 0.5) {
      return {
        ok: false,
        error: `La répartition des gains doit totaliser 100 % (actuellement ${total.toFixed(1)} %).`,
      };
    }
  }

  return {
    ok: true,
    payouts,
    row: {
      name,
      description: description || null,
      scheduled_at: scheduledAt || null,
      location: location || null,
      buy_in: buyIn,
      starting_stack: startingStack,
      min_players: minPlayers,
      max_players: maxPlayers,
      table_size: tableSize,
      rebuy_enabled: rebuyEnabled,
      rebuy_max_per_player: rebuyEnabled ? rebuyMaxPerPlayer : null,
      rebuy_price: rebuyEnabled ? rebuyPrice : null,
      rebuy_chips: rebuyEnabled ? rebuyChips : null,
      rebuy_stack_threshold: rebuyEnabled ? rebuyStackThreshold : null,
      rebuy_until_level: rebuyEnabled ? rebuyUntilLevel : null,
      addon_enabled: addonEnabled,
      addon_price: addonEnabled ? addonPrice : null,
      addon_chips: addonEnabled ? addonChips : null,
      addon_at_level: addonEnabled ? addonAtLevel : null,
      bounty_enabled: bountyEnabled,
      bounty_amount: bountyEnabled ? bountyAmount : null,
      bounty_progressive: bountyEnabled ? bountyProgressive : false,
      late_registration_enabled: lateRegEnabled,
      late_registration_until_level: lateRegEnabled ? lateRegUntilLevel : null,
      guarantee_amount: guaranteeAmount,
      payout_places: payouts.length > 0 ? payouts.length : null,
      blind_structure_id: blindStructureId,
      chip_image_url: chipImageUrl,
      club_id: clubId,
      visibility,
    },
    blindStructureId,
    customLevels,
  };
}


async function applyBlindLevels(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string,
  blindStructureId: string | null,
  customLevels: StructureLevelInput[],
) {
  await supabase.from("tournament_blind_levels").delete().eq("tournament_id", tournamentId);

  if (blindStructureId) {
    const { data: sourceLevels } = await supabase
      .from("blind_structure_levels")
      .select("level_number, is_break, small_blind, big_blind, ante, duration_minutes")
      .eq("structure_id", blindStructureId)
      .order("level_number");

    if (sourceLevels && sourceLevels.length > 0) {
      await supabase.from("tournament_blind_levels").insert(
        sourceLevels.map((l) => ({ ...l, tournament_id: tournamentId })),
      );
    }
  } else {
    await supabase.from("tournament_blind_levels").insert(
      customLevels.map((level, index) => ({
        tournament_id: tournamentId,
        level_number: index + 1,
        is_break: level.isBreak,
        small_blind: level.smallBlind,
        big_blind: level.bigBlind,
        ante: level.ante,
        duration_minutes: level.durationMinutes,
      })),
    );
  }
}

async function applyPayouts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string,
  payouts: PayoutInput[],
) {
  await supabase.from("tournament_payouts").delete().eq("tournament_id", tournamentId);

  if (payouts.length > 0) {
    await supabase.from("tournament_payouts").insert(
      payouts.map((p) => ({
        tournament_id: tournamentId,
        place: p.place,
        percentage: p.percentage,
      })),
    );
  }
}

export async function createTournament(
  _prevState: TournamentFormState,
  formData: FormData,
): Promise<TournamentFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const parsed = parseTournamentFields(formData);
  if (!parsed.ok) return { error: parsed.error };

  const clubError = await assertCanUseClub(supabase, parsed.row.club_id, user.id);
  if (clubError) return { error: clubError };

  const eventId = String(formData.get("event_id") ?? "").trim() || null;

  const { data: tournament, error } = await supabase
    .from("tournaments")
    .insert({ ...parsed.row, created_by: user.id, event_id: eventId })
    .select("id")
    .single();

  if (error || !tournament) {
    return { error: "Impossible de créer le tournoi." };
  }

  await applyBlindLevels(supabase, tournament.id, parsed.blindStructureId, parsed.customLevels);
  await applyPayouts(supabase, tournament.id, parsed.payouts);

  revalidatePath("/tournois");
  if (eventId) revalidatePath(`/evenements/${eventId}`);
  redirect(`/tournois/${tournament.id}`);
}

export async function updateTournament(
  tournamentId: string,
  _prevState: TournamentFormState,
  formData: FormData,
): Promise<TournamentFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("status")
    .eq("id", tournamentId)
    .single();

  if (!tournament || tournament.status !== "inscription") {
    return { error: "Ce tournoi ne peut plus être modifié une fois démarré." };
  }

  const parsed = parseTournamentFields(formData);
  if (!parsed.ok) return { error: parsed.error };

  const clubError = await assertCanUseClub(supabase, parsed.row.club_id, user.id);
  if (clubError) return { error: clubError };

  const { error } = await supabase
    .from("tournaments")
    .update(parsed.row)
    .eq("id", tournamentId);

  if (error) {
    return { error: "Impossible de modifier le tournoi." };
  }

  await applyBlindLevels(supabase, tournamentId, parsed.blindStructureId, parsed.customLevels);
  await applyPayouts(supabase, tournamentId, parsed.payouts);

  revalidatePath(`/tournois/${tournamentId}`);
  redirect(`/tournois/${tournamentId}`);
}

export async function deleteTournament(tournamentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("created_by")
    .eq("id", tournamentId)
    .single();

  if (!tournament || tournament.created_by !== user.id) return;

  await supabase.from("tournaments").delete().eq("id", tournamentId);

  revalidatePath("/tournois");
  redirect("/tournois");
}

export async function duplicateTournament(tournamentId: string, inviteSamePlayers: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: source } = await supabase
    .from("tournaments")
    .select(
      "buy_in, starting_stack, min_players, max_players, table_size, rebuy_enabled, rebuy_max_per_player, rebuy_price, rebuy_chips, rebuy_stack_threshold, rebuy_until_level, addon_enabled, addon_price, addon_chips, addon_at_level, bounty_enabled, bounty_amount, bounty_progressive, late_registration_enabled, late_registration_until_level, guarantee_amount, payout_places, blind_structure_id, display_config, chip_image_url",
    )
    .eq("id", tournamentId)
    .single();

  if (!source) return;

  const { data: created, error } = await supabase
    .from("tournaments")
    .insert({
      ...source,
      name: "",
      description: null,
      location: null,
      scheduled_at: null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !created) return;

  const [{ data: levels }, { data: payouts }] = await Promise.all([
    supabase
      .from("tournament_blind_levels")
      .select("level_number, is_break, small_blind, big_blind, ante, duration_minutes")
      .eq("tournament_id", tournamentId)
      .order("level_number"),
    supabase
      .from("tournament_payouts")
      .select("place, percentage")
      .eq("tournament_id", tournamentId)
      .order("place"),
  ]);

  if (levels && levels.length > 0) {
    await supabase
      .from("tournament_blind_levels")
      .insert(levels.map((l) => ({ ...l, tournament_id: created.id })));
  }

  if (payouts && payouts.length > 0) {
    await supabase
      .from("tournament_payouts")
      .insert(payouts.map((p) => ({ ...p, tournament_id: created.id })));
  }

  if (inviteSamePlayers) {
    const { data: players } = await supabase
      .from("tournament_players")
      .select("player_id")
      .eq("tournament_id", tournamentId);

    const inviteeIds = (players ?? [])
      .map((p) => p.player_id)
      .filter((id) => id !== user.id);

    if (inviteeIds.length > 0) {
      await supabase.from("tournament_invitations").insert(
        inviteeIds.map((playerId) => ({
          tournament_id: created.id,
          invited_user_id: playerId,
          invited_by: user.id,
        })),
      );
    }
  }

  revalidatePath("/tournois");
  redirect(`/tournois/${created.id}/modifier`);
}

export async function requestToJoinTournament(tournamentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  await supabase
    .from("tournament_join_requests")
    .insert({ tournament_id: tournamentId, requester_id: user.id });

  revalidatePath(`/tournois/${tournamentId}`);
}

export async function respondToJoinRequest(requestId: string, approve: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: request } = await supabase
    .from("tournament_join_requests")
    .select("tournament_id, requester_id, status")
    .eq("id", requestId)
    .single();

  if (!request || request.status !== "pending") return;

  if (approve) {
    const { error } = await supabase
      .from("tournament_players")
      .insert({ tournament_id: request.tournament_id, player_id: request.requester_id });
    if (error) {
      redirect(`/tournois/${request.tournament_id}?erreur=${encodeURIComponent(error.message)}`);
    }
    await seatLateJoiner(supabase, request.tournament_id, request.requester_id);
    await supabase
      .from("tournament_join_requests")
      .update({ status: "approved" })
      .eq("id", requestId);
  } else {
    await supabase
      .from("tournament_join_requests")
      .update({ status: "rejected" })
      .eq("id", requestId);
  }

  revalidatePath(`/tournois/${request.tournament_id}`);
}

export async function inviteToTournament(tournamentId: string, formData: FormData) {
  const supabase = await createClient();
  const access = await getManageAccess(supabase, tournamentId);
  if (!access) return;

  const pseudo = String(formData.get("pseudo") ?? "").trim();
  if (!pseudo) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("pseudo", pseudo)
    .maybeSingle();

  if (!profile) return;

  const { error } = await supabase.from("tournament_invitations").insert({
    tournament_id: tournamentId,
    invited_user_id: profile.id,
    invited_by: access.userId,
  });

  if (error) {
    const message =
      error.code === "23505"
        ? "Ce joueur a déjà été invité."
        : error.message;
    redirect(`/tournois/${tournamentId}?erreur=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/tournois/${tournamentId}`);
}

export async function cancelInvitation(invitationId: string, tournamentId: string) {
  const supabase = await createClient();
  if (!(await getManageAccess(supabase, tournamentId))) return;
  await supabase.from("tournament_invitations").delete().eq("id", invitationId);
  revalidatePath(`/tournois/${tournamentId}`);
}

export async function respondToInvitation(invitationId: string, accept: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: invitation } = await supabase
    .from("tournament_invitations")
    .select("tournament_id, invited_user_id, status")
    .eq("id", invitationId)
    .single();

  if (!invitation || invitation.invited_user_id !== user.id || invitation.status !== "pending") {
    return;
  }

  if (accept) {
    const { error } = await supabase
      .from("tournament_players")
      .insert({ tournament_id: invitation.tournament_id, player_id: user.id });
    if (error) {
      redirect(
        `/tournois/${invitation.tournament_id}?erreur=${encodeURIComponent(error.message)}`,
      );
    }
    await seatLateJoiner(supabase, invitation.tournament_id, user.id);
    await supabase
      .from("tournament_invitations")
      .update({ status: "accepted" })
      .eq("id", invitationId);
  } else {
    await supabase
      .from("tournament_invitations")
      .update({ status: "declined" })
      .eq("id", invitationId);
  }

  revalidatePath(`/tournois/${invitation.tournament_id}`);
  revalidatePath("/tableau-de-bord");
}

async function getLevel(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string,
  levelNumber: number,
) {
  const { data } = await supabase
    .from("tournament_blind_levels")
    .select("level_number, duration_minutes")
    .eq("tournament_id", tournamentId)
    .eq("level_number", levelNumber)
    .maybeSingle();
  return data;
}

async function getMaxLevel(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string,
) {
  const { data } = await supabase
    .from("tournament_blind_levels")
    .select("level_number")
    .eq("tournament_id", tournamentId)
    .order("level_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.level_number ?? 1;
}

/** Vérifie que l'utilisateur connecté est l'organisateur ou un
 * co-administrateur du tournoi (voir getResourceAccess). */
function getManageAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string,
): Promise<ResourceAccess> {
  return getResourceAccess(supabase, tournamentId, {
    resourceTable: "tournaments",
    ownerColumn: "created_by",
    adminTable: "tournament_admins",
    adminResourceColumn: "tournament_id",
    clubColumn: "club_id",
  });
}

async function writeSeating(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string,
  seats: SeatedPlayer[],
) {
  await Promise.all(
    seats.map((s) =>
      supabase
        .from("tournament_players")
        .update({ table_number: s.tableNumber, seat_number: s.seatNumber })
        .eq("tournament_id", tournamentId)
        .eq("player_id", s.playerId),
    ),
  );
}

/** Place un joueur qui rejoint un tournoi déjà en cours (recave
 * tardive, invitation acceptée, demande approuvée, +Joueur). */
async function seatLateJoiner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string,
  playerId: string,
) {
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("status, table_size")
    .eq("id", tournamentId)
    .single();
  if (!tournament || tournament.status !== "en_cours") return;

  const { data: seatedRows } = await supabase
    .from("tournament_players")
    .select("player_id, table_number, seat_number")
    .eq("tournament_id", tournamentId)
    .eq("status", "inscrit")
    .not("table_number", "is", null);

  const current: SeatedPlayer[] = (seatedRows ?? [])
    .filter((r) => r.player_id !== playerId)
    .map((r) => ({ playerId: r.player_id, tableNumber: r.table_number!, seatNumber: r.seat_number! }));

  const updated = seatNewPlayer(current, playerId, tournament.table_size);
  const mine = updated.find((s) => s.playerId === playerId);
  if (mine) await writeSeating(supabase, tournamentId, [mine]);
}

export async function startTournament(tournamentId: string) {
  const supabase = await createClient();
  if (!(await getManageAccess(supabase, tournamentId))) return;

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("status, min_players, table_size")
    .eq("id", tournamentId)
    .single();

  if (!tournament || tournament.status !== "inscription") return;

  const { data: players } = await supabase
    .from("tournament_players")
    .select("player_id")
    .eq("tournament_id", tournamentId)
    .eq("status", "inscrit");

  if (!players || players.length < tournament.min_players) return;

  const firstLevel = await getLevel(supabase, tournamentId, 1);
  const durationSeconds = (firstLevel?.duration_minutes ?? 20) * 60;

  await supabase
    .from("tournaments")
    .update({
      status: "en_cours",
      started_at: new Date().toISOString(),
      current_level: 1,
      clock_status: "running",
      level_ends_at: new Date(Date.now() + durationSeconds * 1000).toISOString(),
      paused_remaining_seconds: null,
    })
    .eq("id", tournamentId);

  const seats = initialSeating(players.map((p) => p.player_id), tournament.table_size);
  await writeSeating(supabase, tournamentId, seats);

  revalidatePath(`/tournois/${tournamentId}`);
}

export async function pauseClock(tournamentId: string) {
  const supabase = await createClient();
  if (!(await getManageAccess(supabase, tournamentId))) return;

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("clock_status, level_ends_at")
    .eq("id", tournamentId)
    .single();

  if (!tournament || tournament.clock_status !== "running" || !tournament.level_ends_at) return;

  const remaining = Math.max(
    0,
    Math.round((new Date(tournament.level_ends_at).getTime() - Date.now()) / 1000),
  );

  await supabase
    .from("tournaments")
    .update({
      clock_status: "paused",
      paused_remaining_seconds: remaining,
      level_ends_at: null,
    })
    .eq("id", tournamentId);

  revalidatePath(`/tournois/${tournamentId}`);
}

export async function resumeClock(tournamentId: string) {
  const supabase = await createClient();
  if (!(await getManageAccess(supabase, tournamentId))) return;

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("clock_status, paused_remaining_seconds")
    .eq("id", tournamentId)
    .single();

  if (!tournament || tournament.clock_status !== "paused") return;

  const remaining = tournament.paused_remaining_seconds ?? 0;

  await supabase
    .from("tournaments")
    .update({
      clock_status: "running",
      level_ends_at: new Date(Date.now() + remaining * 1000).toISOString(),
      paused_remaining_seconds: null,
    })
    .eq("id", tournamentId);

  revalidatePath(`/tournois/${tournamentId}`);
}

async function setLevelPaused(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string,
  newLevel: number,
) {
  const level = await getLevel(supabase, tournamentId, newLevel);
  const durationSeconds = (level?.duration_minutes ?? 20) * 60;

  await supabase
    .from("tournaments")
    .update({
      current_level: newLevel,
      clock_status: "paused",
      level_ends_at: null,
      paused_remaining_seconds: durationSeconds,
    })
    .eq("id", tournamentId);
}

export async function nextLevel(tournamentId: string) {
  const supabase = await createClient();
  if (!(await getManageAccess(supabase, tournamentId))) return;

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("current_level")
    .eq("id", tournamentId)
    .single();

  if (!tournament) return;

  const maxLevel = await getMaxLevel(supabase, tournamentId);
  const newLevel = Math.min(tournament.current_level + 1, maxLevel);
  await setLevelPaused(supabase, tournamentId, newLevel);

  revalidatePath(`/tournois/${tournamentId}`);
}

export async function previousLevel(tournamentId: string) {
  const supabase = await createClient();
  if (!(await getManageAccess(supabase, tournamentId))) return;

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("current_level")
    .eq("id", tournamentId)
    .single();

  if (!tournament) return;

  const newLevel = Math.max(tournament.current_level - 1, 1);
  await setLevelPaused(supabase, tournamentId, newLevel);

  revalidatePath(`/tournois/${tournamentId}`);
}

export async function autoCompleteLevel(tournamentId: string, expectedLevel: number) {
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("current_level, clock_status")
    .eq("id", tournamentId)
    .single();

  if (
    !tournament ||
    tournament.current_level !== expectedLevel ||
    tournament.clock_status !== "running"
  ) {
    return;
  }

  const maxLevel = await getMaxLevel(supabase, tournamentId);
  if (expectedLevel >= maxLevel) {
    await supabase
      .from("tournaments")
      .update({ clock_status: "paused", level_ends_at: null, paused_remaining_seconds: 0 })
      .eq("id", tournamentId);
    revalidatePath(`/tournois/${tournamentId}`);
    return;
  }

  const newLevel = expectedLevel + 1;
  const level = await getLevel(supabase, tournamentId, newLevel);
  const durationSeconds = (level?.duration_minutes ?? 20) * 60;

  await supabase
    .from("tournaments")
    .update({
      current_level: newLevel,
      level_ends_at: new Date(Date.now() + durationSeconds * 1000).toISOString(),
    })
    .eq("id", tournamentId);

  revalidatePath(`/tournois/${tournamentId}`);
}

export async function addPlayerByPseudo(tournamentId: string, formData: FormData) {
  const supabase = await createClient();

  const pseudo = String(formData.get("pseudo") ?? "").trim();
  if (!pseudo) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("pseudo", pseudo)
    .maybeSingle();

  if (!profile) return;

  const { error } = await supabase
    .from("tournament_players")
    .insert({ tournament_id: tournamentId, player_id: profile.id });
  if (error) {
    redirect(`/tournois/${tournamentId}?erreur=${encodeURIComponent(error.message)}`);
  }
  await seatLateJoiner(supabase, tournamentId, profile.id);

  revalidatePath(`/tournois/${tournamentId}`);
}

export async function updateDisplayConfig(tournamentId: string, formData: FormData) {
  const supabase = await createClient();
  if (!(await getManageAccess(supabase, tournamentId))) return;

  const config = {
    title: String(formData.get("title") ?? "").trim() || null,
    show_entries: formData.get("show_entries") === "on",
    show_players_remaining: formData.get("show_players_remaining") === "on",
    show_rebuys: formData.get("show_rebuys") === "on",
    show_addons: formData.get("show_addons") === "on",
    show_chip_count: formData.get("show_chip_count") === "on",
    show_average_stack: formData.get("show_average_stack") === "on",
    show_prize_pool: formData.get("show_prize_pool") === "on",
    show_next_break: formData.get("show_next_break") === "on",
    show_payouts: formData.get("show_payouts") === "on",
  };

  await supabase.from("tournaments").update({ display_config: config }).eq("id", tournamentId);

  revalidatePath(`/tournois/${tournamentId}`);
  revalidatePath(`/tournois/${tournamentId}/affichage`);

  revalidatePath(`/tournois/${tournamentId}`);
}

export async function rebuyPlayer(
  tournamentId: string,
  playerId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  if (!(await getManageAccess(supabase, tournamentId))) {
    return { error: "Tu n'as pas les droits pour gérer ce tournoi." };
  }

  const { data: tournament } = await supabase
    .from("tournaments")
    .select(
      "rebuy_enabled, rebuy_max_per_player, rebuy_chips, rebuy_stack_threshold, rebuy_until_level, current_level, status",
    )
    .eq("id", tournamentId)
    .single();

  const { data: player } = await supabase
    .from("tournament_players")
    .select("stack, rebuys_count, status")
    .eq("tournament_id", tournamentId)
    .eq("player_id", playerId)
    .single();

  if (!tournament || !player) return { error: "Impossible de trouver le tournoi ou le joueur." };
  if (!tournament.rebuy_enabled || player.status !== "inscrit") {
    return { error: "La recave n'est pas disponible pour ce joueur." };
  }
  if (
    tournament.rebuy_max_per_player !== null &&
    player.rebuys_count >= tournament.rebuy_max_per_player
  ) {
    return { error: `Nombre maximum de recaves déjà atteint (${tournament.rebuy_max_per_player}).` };
  }
  if (
    tournament.rebuy_stack_threshold !== null &&
    (player.stack ?? 0) > tournament.rebuy_stack_threshold
  ) {
    return {
      error: `La recave n'est autorisée que si le tapis est ≤ ${tournament.rebuy_stack_threshold} jetons.`,
    };
  }
  if (
    tournament.rebuy_until_level !== null &&
    tournament.current_level > tournament.rebuy_until_level
  ) {
    return {
      error: `La recave n'est plus autorisée après le niveau ${tournament.rebuy_until_level}.`,
    };
  }

  await supabase
    .from("tournament_players")
    .update({
      stack: (player.stack ?? 0) + (tournament.rebuy_chips ?? 0),
      rebuys_count: player.rebuys_count + 1,
    })
    .eq("tournament_id", tournamentId)
    .eq("player_id", playerId);

  revalidatePath(`/tournois/${tournamentId}`);
  return {};
}

export async function addOnPlayer(
  tournamentId: string,
  playerId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  if (!(await getManageAccess(supabase, tournamentId))) {
    return { error: "Tu n'as pas les droits pour gérer ce tournoi." };
  }

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("addon_enabled, addon_chips, addon_at_level, current_level")
    .eq("id", tournamentId)
    .single();

  const { data: player } = await supabase
    .from("tournament_players")
    .select("stack, addon_used, status")
    .eq("tournament_id", tournamentId)
    .eq("player_id", playerId)
    .single();

  if (!tournament || !player) return { error: "Impossible de trouver le tournoi ou le joueur." };
  if (!tournament.addon_enabled || player.status !== "inscrit") {
    return { error: "L'add-on n'est pas disponible pour ce joueur." };
  }
  if (player.addon_used) return { error: "L'add-on a déjà été utilisé." };
  if (
    tournament.addon_at_level !== null &&
    tournament.current_level < tournament.addon_at_level
  ) {
    return {
      error: `L'add-on n'est pas encore disponible (à partir du niveau ${tournament.addon_at_level}, niveau actuel ${tournament.current_level}).`,
    };
  }

  await supabase
    .from("tournament_players")
    .update({
      stack: (player.stack ?? 0) + (tournament.addon_chips ?? 0),
      addon_used: true,
    })
    .eq("tournament_id", tournamentId)
    .eq("player_id", playerId);

  revalidatePath(`/tournois/${tournamentId}`);
  return {};
}

export async function toggleBuyInPaid(tournamentId: string, playerId: string) {
  const supabase = await createClient();
  if (!(await getManageAccess(supabase, tournamentId))) return;

  const { data: player } = await supabase
    .from("tournament_players")
    .select("buy_in_paid")
    .eq("tournament_id", tournamentId)
    .eq("player_id", playerId)
    .single();

  if (!player) return;

  await supabase
    .from("tournament_players")
    .update({ buy_in_paid: !player.buy_in_paid })
    .eq("tournament_id", tournamentId)
    .eq("player_id", playerId);

  revalidatePath(`/tournois/${tournamentId}`);
}

export async function eliminatePlayer(
  tournamentId: string,
  playerId: string,
  formData: FormData,
) {
  const supabase = await createClient();
  if (!(await getManageAccess(supabase, tournamentId))) return;

  const eliminatedById = String(formData.get("eliminated_by") ?? "") || null;

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("bounty_enabled, bounty_amount, bounty_progressive, table_size")
    .eq("id", tournamentId)
    .single();

  const { data: players } = await supabase
    .from("tournament_players")
    .select("player_id, status, bounty_current, bounty_cash_won, table_number, seat_number")
    .eq("tournament_id", tournamentId);

  if (!players || !tournament) return;

  const total = players.length;
  const alreadyOut = players.filter((p) => p.status !== "inscrit").length;
  const place = total - alreadyOut;

  const eliminated = players.find((p) => p.player_id === playerId);
  if (!eliminated || eliminated.status !== "inscrit") return;

  await supabase
    .from("tournament_players")
    .update({
      status: "elimine",
      place,
      eliminated_at: new Date().toISOString(),
      eliminated_by: eliminatedById,
    })
    .eq("tournament_id", tournamentId)
    .eq("player_id", playerId);

  if (tournament.bounty_enabled && eliminatedById && eliminated) {
    const eliminator = players.find((p) => p.player_id === eliminatedById);
    if (eliminator) {
      if (tournament.bounty_progressive) {
        const potBounty = eliminated.bounty_current ?? 0;
        // Arrondi au centime (et non à l'unité) pour ne pas perdre de
        // fractions à chaque élimination sur un tournoi à bounty progressif.
        const cashGain = Math.round((potBounty / 2) * 100) / 100;
        await supabase
          .from("tournament_players")
          .update({
            bounty_current: (eliminator.bounty_current ?? 0) + (potBounty - cashGain),
            bounty_cash_won: (eliminator.bounty_cash_won ?? 0) + cashGain,
          })
          .eq("tournament_id", tournamentId)
          .eq("player_id", eliminatedById);
      } else {
        await supabase
          .from("tournament_players")
          .update({
            bounty_cash_won: (eliminator.bounty_cash_won ?? 0) + (tournament.bounty_amount ?? 0),
          })
          .eq("tournament_id", tournamentId)
          .eq("player_id", eliminatedById);
      }
    }
  }

  const remaining = players.filter(
    (p) => p.status === "inscrit" && p.player_id !== playerId,
  );

  if (remaining.length === 1) {
    const winnerId = remaining[0].player_id;
    await supabase
      .from("tournament_players")
      .update({ status: "vainqueur", place: 1 })
      .eq("tournament_id", tournamentId)
      .eq("player_id", winnerId);

    await supabase
      .from("tournaments")
      .update({ status: "termine" })
      .eq("id", tournamentId);
  } else if (remaining.length > 1) {
    const previousSeats: SeatedPlayer[] = remaining
      .filter((p) => p.table_number !== null && p.seat_number !== null)
      .map((p) => ({
        playerId: p.player_id,
        tableNumber: p.table_number!,
        seatNumber: p.seat_number!,
      }));
    const rebalanced = rebalanceAfterRemoval(
      remaining.map((p) => p.player_id),
      previousSeats,
      tournament.table_size,
    );
    await writeSeating(supabase, tournamentId, rebalanced);
  }

  revalidatePath(`/tournois/${tournamentId}`);
}

export async function addCoAdmin(tournamentId: string, formData: FormData) {
  const supabase = await createClient();
  const access = await getManageAccess(supabase, tournamentId);
  if (!access?.isOwner) return;

  const pseudo = String(formData.get("pseudo") ?? "").trim();
  if (!pseudo) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("pseudo", pseudo)
    .maybeSingle();

  if (!profile) return;

  const { error } = await supabase.from("tournament_admins").insert({
    tournament_id: tournamentId,
    user_id: profile.id,
    added_by: access.userId,
  });

  if (error) {
    const message =
      error.code === "23505"
        ? "Ce joueur est déjà co-administrateur."
        : error.message;
    redirect(`/tournois/${tournamentId}?erreur=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/tournois/${tournamentId}`);
}

export async function removeCoAdmin(tournamentId: string, userId: string) {
  const supabase = await createClient();
  const access = await getManageAccess(supabase, tournamentId);
  if (!access?.isOwner) return;

  await supabase
    .from("tournament_admins")
    .delete()
    .eq("tournament_id", tournamentId)
    .eq("user_id", userId);

  revalidatePath(`/tournois/${tournamentId}`);
}
