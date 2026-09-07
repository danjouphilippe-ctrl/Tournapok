"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assertCanUseClub, getResourceAccess, type ResourceAccess } from "@/lib/resourceAccess";
import { parseEventFields } from "./validation";

export type EventFormState = {
  error: string | null;
};

export type EventRowInput = {
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

export type ParsedEventFields = { ok: false; error: string } | { ok: true; row: EventRowInput };

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
    clubColumn: "club_id",
  });
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

  const { data, error } = await supabase
    .from("event_admins")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .select("id");

  if (error || !data || data.length === 0) {
    redirect(`/evenements/${eventId}?erreur=${encodeURIComponent("Impossible de retirer ce co-administrateur.")}`);
  }

  revalidatePath(`/evenements/${eventId}`);
}

/* ============================================================
 * Invitations à un évènement.
 *
 * Un évènement n'a pas de liste de participants : inviter quelqu'un ne
 * l'inscrit à rien, ça lui rend l'évènement visible (voir la policy de
 * 0026) pour qu'il découvre le programme sans être invité à chaque
 * tournoi. Accepter ou refuser ne change donc que le statut — un refus
 * retirant l'accès.
 * ============================================================ */

export async function inviteToEvent(eventId: string, formData: FormData) {
  const supabase = await createClient();
  const access = await getEventAccess(supabase, eventId);
  if (!access) return;

  const pseudo = String(formData.get("pseudo") ?? "").trim();
  if (!pseudo) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("pseudo", pseudo)
    .maybeSingle();

  if (!profile) {
    redirect(
      `/evenements/${eventId}?erreur=${encodeURIComponent("Aucun joueur ne porte ce pseudo.")}`,
    );
  }

  const { error } = await supabase.from("event_invitations").insert({
    event_id: eventId,
    invited_user_id: profile.id,
    invited_by: access.userId,
  });

  if (error) {
    const message =
      error.code === "23505" ? "Ce joueur a déjà été invité." : error.message;
    redirect(`/evenements/${eventId}?erreur=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/evenements/${eventId}`);
}

export async function cancelEventInvitation(invitationId: string, eventId: string) {
  const supabase = await createClient();
  if (!(await getEventAccess(supabase, eventId))) return;

  const { data, error } = await supabase
    .from("event_invitations")
    .delete()
    .eq("id", invitationId)
    .select("id");

  if (error || !data || data.length === 0) {
    redirect(
      `/evenements/${eventId}?erreur=${encodeURIComponent("Impossible d'annuler cette invitation.")}`,
    );
  }

  revalidatePath(`/evenements/${eventId}`);
}

export async function respondToEventInvitation(invitationId: string, accept: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: invitation } = await supabase
    .from("event_invitations")
    .select("event_id, invited_user_id, status")
    .eq("id", invitationId)
    .single();

  if (!invitation || invitation.invited_user_id !== user.id || invitation.status !== "pending") {
    return;
  }

  /* .select() derrière l'update : sans lui, une écriture bloquée par
   * RLS renvoie un succès avec zéro ligne touchée, et l'invitation
   * resterait en attente sans que personne ne le sache. */
  const { data, error } = await supabase
    .from("event_invitations")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("id", invitationId)
    .select("id");

  if (error || !data || data.length === 0) {
    redirect(
      `/notifications?erreur=${encodeURIComponent("Impossible de répondre à cette invitation.")}`,
    );
  }

  revalidatePath("/notifications");
  revalidatePath(`/evenements/${invitation.event_id}`);
  redirect(accept ? `/evenements/${invitation.event_id}` : "/notifications");
}
