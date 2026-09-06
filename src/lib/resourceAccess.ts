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

  const { data: admin } = await supabase
    .from(config.adminTable)
    .select("user_id")
    .eq(config.adminResourceColumn, resourceId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!admin) return null;

  return { userId: user.id, isOwner: false };
}
