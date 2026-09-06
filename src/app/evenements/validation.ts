import type { ParsedEventFields } from "./actions";

/** Pure, non extraite dans "actions.ts" car un fichier "use server" ne
 * peut exporter que des fonctions async (toute exportation y devient
 * une Server Function) — voir node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md. */
export function parseEventFields(formData: FormData): ParsedEventFields {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const scheduledAt = String(formData.get("scheduled_at") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const logoUrl = String(formData.get("logo_url") ?? "").trim();
  const organisation = String(formData.get("organisation") ?? "").trim();
  const maxPlayersRaw = formData.get("max_players");
  const maxPlayers =
    maxPlayersRaw === null || maxPlayersRaw === "" ? null : Number(maxPlayersRaw);
  const clubId = String(formData.get("club_id") ?? "").trim() || null;
  const visibility = String(formData.get("visibility") ?? "private");

  if (!name) {
    return { ok: false, error: "L'évènement doit avoir un nom." };
  }
  if (!scheduledAt) {
    return { ok: false, error: "La date et l'heure sont obligatoires." };
  }
  if (!location) {
    return { ok: false, error: "Le lieu est obligatoire." };
  }
  if (!["public", "club", "private"].includes(visibility)) {
    return { ok: false, error: "Visibilité invalide." };
  }
  if (visibility === "club" && !clubId) {
    return { ok: false, error: "Choisis un club pour une visibilité réservée au club." };
  }

  return {
    ok: true,
    row: {
      name,
      description: description || null,
      scheduled_at: scheduledAt,
      location,
      logo_url: logoUrl || null,
      organisation: organisation || null,
      max_players: maxPlayers !== null && Number.isFinite(maxPlayers) ? maxPlayers : null,
      club_id: clubId,
      visibility,
    },
  };
}
