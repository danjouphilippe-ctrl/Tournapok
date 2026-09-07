import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type NotificationCounts = {
  /** Invitations (tournoi et évènement) qui m'attendent. */
  invitations: number;
  /** Demandes d'adhésion à traiter, sur mes tournois et mes clubs. */
  demandes: number;
  total: number;
};

export const AUCUNE_NOTIFICATION: NotificationCounts = {
  invitations: 0,
  demandes: 0,
  total: 0,
};

/** Compte ce qui appelle un geste de ma part — rien d'autre.
 *
 * Les politiques d'accès des deux tables de demandes renvoient à la fois
 * mes propres demandes (celles où j'attends une réponse) et celles que
 * j'ai à traiter comme organisateur. Seules les secondes comptent, d'où
 * le filtre sur requester_id : voir arriver son propre badge parce qu'on
 * a demandé à rejoindre un club n'aurait aucun sens. */
export async function getNotificationCounts(
  supabase: Supabase,
  userId: string,
): Promise<NotificationCounts> {
  const [invitations, invitationsEvenement, demandesTournoi, demandesClub] = await Promise.all([
    supabase
      .from("tournament_invitations")
      .select("id", { count: "exact", head: true })
      .eq("invited_user_id", userId)
      .eq("status", "pending"),
    supabase
      .from("event_invitations")
      .select("id", { count: "exact", head: true })
      .eq("invited_user_id", userId)
      .eq("status", "pending"),
    supabase
      .from("tournament_join_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .neq("requester_id", userId),
    supabase
      .from("club_join_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .neq("requester_id", userId),
  ]);

  const nbInvitations = (invitations.count ?? 0) + (invitationsEvenement.count ?? 0);
  const nbDemandes = (demandesTournoi.count ?? 0) + (demandesClub.count ?? 0);

  return {
    invitations: nbInvitations,
    demandes: nbDemandes,
    total: nbInvitations + nbDemandes,
  };
}
