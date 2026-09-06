import { createClient } from "@/lib/supabase/server";

export type ResourceAccess = { userId: string; isOwner: boolean } | null;

type ResourceAccessConfig = {
  /** Table de la ressource elle-même (ex: "tournaments", "events"). */
  resourceTable: string;
  /** Colonne de cette table qui contient l'id du propriétaire. */
  ownerColumn: string;
  /** Table des co-administrateurs (ex: "tournament_admins", "event_admins"). */
  adminTable: string;
  /** Colonne de la table d'admins qui référence la ressource. */
  adminResourceColumn: string;
  /** Si adminTable distingue plusieurs rôles (ex: club_members.role),
   * restreint l'accès de gestion à ces valeurs — sinon n'importe quelle
   * ligne de adminTable est considérée comme un droit de gestion. */
  adminRoleColumn?: string;
  adminRoleValues?: string[];
};

/** Vérifie que l'utilisateur connecté est le propriétaire ou un
 * co-administrateur d'une ressource (tournoi, évènement...). Ne
 * remplace jamais les policies RLS, qui restent la protection réelle
 * — mais évite qu'une action échoue en silence quand elles bloquent
 * la mise à jour : on le sait tout de suite, avant même de tenter
 * l'écriture. Partagé entre tous les domaines qui suivent ce même
 * schéma propriétaire + co-administrateurs. */
export async function getResourceAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  resourceId: string,
  config: ResourceAccessConfig,
): Promise<ResourceAccess> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: resource } = await supabase
    .from(config.resourceTable)
    .select(config.ownerColumn)
    .eq("id", resourceId)
    .single();
  if (!resource) return null;
  if ((resource as unknown as Record<string, string>)[config.ownerColumn] === user.id) {
    return { userId: user.id, isOwner: true };
  }

  let adminQuery = supabase
    .from(config.adminTable)
    .select("user_id")
    .eq(config.adminResourceColumn, resourceId)
    .eq("user_id", user.id);
  if (config.adminRoleColumn && config.adminRoleValues) {
    adminQuery = adminQuery.in(config.adminRoleColumn, config.adminRoleValues);
  }
  const { data: admin } = await adminQuery.maybeSingle();
  if (!admin) return null;

  return { userId: user.id, isOwner: false };
}

/** Vérifie qu'un club_id choisi dans un formulaire (tournoi ou
 * évènement) est bien géré par l'utilisateur connecté — sinon
 * n'importe qui pourrait prétendre appartenir à n'importe quel club.
 * Retourne un message d'erreur si ce n'est pas le cas, sinon null. */
export async function assertCanUseClub(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clubId: string | null,
  userId: string,
): Promise<string | null> {
  if (!clubId) return null;
  const { data: club } = await supabase
    .from("clubs")
    .select("created_by")
    .eq("id", clubId)
    .maybeSingle();
  if (!club) return "Club introuvable.";
  if (club.created_by === userId) return null;

  const { data: member } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .maybeSingle();
  if (member && (member.role === "owner" || member.role === "admin")) return null;

  return "Tu n'as pas les droits pour rattacher cette ressource à ce club.";
}
