"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assertCanUseClub, getResourceAccess, type ResourceAccess } from "@/lib/resourceAccess";

export type EventFormState = {
  error: string | null;
};

type EventRowInput = {
  name: string;
  description: string | null;
  scheduled_at: string;
  location: string;
  logo_url: string | null;
  organisation: string | null;
  max_players: number | null;
  club_id: string | null;
  visibility: string;
};

type ParsedEventFields = { ok: false; error: string } | { ok: true; row: EventRowInput };

/** Vérifie que l'utilisateur connecté est l'organisateur ou un
 * co-administrateur de l'évènement (voir getResourceAccess). */
function getEventAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
): Promise<ResourceAccess> {
  return getResourceAccess(supabase, eventId, {
    resourceTable: "events",
    ownerColumn: "created_by",
    adminTable: "event_admins",
    adminResourceColumn: "event_id",
  });
}

function parseEventFields(formData: FormData): ParsedEventFields {
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

export async function createEvent(
  _prevState: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const parsed = parseEventFields(formData);
  if (!parsed.ok) return { error: parsed.error };

  const clubError = await assertCanUseClub(supabase, parsed.row.club_id, user.id);
  if (clubError) return { error: clubError };

  const { data: event, error } = await supabase
    .from("events")
    .insert({ ...parsed.row, created_by: user.id })
    .select("id")
    .single();

  if (error || !event) {
    return { error: "Impossible de créer l'évènement." };
  }

  revalidatePath("/evenements");
  redirect(`/evenements/${event.id}`);
}

export async function updateEvent(
  eventId: string,
  _prevState: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const supabase = await createClient();
  const access = await getEventAccess(supabase, eventId);
  if (!access) {
    return { error: "Tu n'as pas les droits pour modifier cet évènement." };
  }

  const parsed = parseEventFields(formData);
  if (!parsed.ok) return { error: parsed.error };

  const clubError = await assertCanUseClub(supabase, parsed.row.club_id, access.userId);
  if (clubError) return { error: clubError };

  const { error } = await supabase.from("events").update(parsed.row).eq("id", eventId);

  if (error) {
    return { error: "Impossible de modifier l'évènement." };
  }

  revalidatePath(`/evenements/${eventId}`);
  redirect(`/evenements/${eventId}`);
}

export async function deleteEvent(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: event } = await supabase
    .from("events")
    .select("created_by")
    .eq("id", eventId)
    .single();

  if (!event || event.created_by !== user.id) return;

  await supabase.from("events").delete().eq("id", eventId);

  revalidatePath("/evenements");
  redirect("/evenements");
}

export async function addEventCoAdmin(eventId: string, formData: FormData) {
  const supabase = await createClient();
  const access = await getEventAccess(supabase, eventId);
  if (!access?.isOwner) return;

  const pseudo = String(formData.get("pseudo") ?? "").trim();
  if (!pseudo) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("pseudo", pseudo)
    .maybeSingle();

  if (!profile) return;

  const { error } = await supabase.from("event_admins").insert({
    event_id: eventId,
    user_id: profile.id,
    added_by: access.userId,
  });

  if (error) {
    const message =
      error.code === "23505"
        ? "Ce joueur est déjà co-administrateur."
        : error.message;
    redirect(`/evenements/${eventId}?erreur=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/evenements/${eventId}`);
}

export async function removeEventCoAdmin(eventId: string, userId: string) {
  const supabase = await createClient();
  const access = await getEventAccess(supabase, eventId);
  if (!access?.isOwner) return;

  await supabase.from("event_admins").delete().eq("event_id", eventId).eq("user_id", userId);

  revalidatePath(`/evenements/${eventId}`);
}
