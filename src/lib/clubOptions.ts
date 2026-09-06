import { createClient } from "@/lib/supabase/server";

/** Liste les clubs que l'utilisateur peut rattacher à un tournoi ou un
 * évènement (propriétaire, ou membre avec le rôle owner/admin). */
export async function getManagedClubOptions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<{ id: string; name: string }[]> {
  const [{ data: owned }, { data: memberships }] = await Promise.all([
    supabase.from("clubs").select("id, name").eq("created_by", userId),
    supabase
      .from("club_members")
      .select("clubs!inner(id, name)")
      .eq("user_id", userId)
      .in("role", ["owner", "admin"]),
  ]);

  const byId = new Map<string, { id: string; name: string }>();
  for (const c of owned ?? []) byId.set(c.id, c);
  for (const m of memberships ?? []) {
    const club = Array.isArray(m.clubs) ? m.clubs[0] : m.clubs;
    if (club) byId.set(club.id, club);
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
}
