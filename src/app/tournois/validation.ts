import type { StructureLevelInput } from "@/app/structures/actions";
import type { ParsedTournamentFields, PayoutInput } from "./actions";

function numberOrNull(formData: FormData, key: string): number | null {
  const raw = formData.get(key);
  if (raw === null || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/** Pure, non extraite dans "actions.ts" car un fichier "use server" ne
 * peut exporter que des fonctions async (toute exportation y devient
 * une Server Function) — voir node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md. */
export function parseTournamentFields(formData: FormData): ParsedTournamentFields {
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
