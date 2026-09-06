"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getResourceAccess, type ResourceAccess } from "@/lib/resourceAccess";

export type ClubFormState = {
  error: string | null;
};

const MEMBER_ROLES = ["owner", "admin", "treasurer", "member"] as const;
export type ClubMemberRole = (typeof MEMBER_ROLES)[number];

type ClubRowInput = {
  name: string;
  description: string | null;
  location: string | null;
  logo_url: string | null;
};

type ParsedClubFields = { ok: false; error: string } | { ok: true; row: ClubRowInput };

function parseClubFields(formData: FormData): ParsedClubFields {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const logoUrl = String(formData.get("logo_url") ?? "").trim();

  if (!name) {
    return { ok: false, error: "Le club doit avoir un nom." };
  }

  return {
    ok: true,
    row: {
      name,
      description: description || null,
      location: location || null,
      logo_url: logoUrl || null,
    },
  };
}

/** Vérifie que l'utilisateur connecté est le propriétaire ou un
 * administrateur du club (voir getResourceAccess). */
function getClubAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clubId: string,
): Promise<ResourceAccess> {
  return getResourceAccess(supabase, clubId, {
    resourceTable: "clubs",
    ownerColumn: "created_by",
    adminTable: "club_members",
    adminResourceColumn: "club_id",
    adminRoleColumn: "role",
    adminRoleValues: ["owner", "admin"],
  });
}

export async function createClub(
  _prevState: ClubFormState,
  formData: FormData,
): Promise<ClubFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const parsed = parseClubFields(formData);
  if (!parsed.ok) return { error: parsed.error };

  const { data: club, error } = await supabase
    .from("clubs")
    .insert({ ...parsed.row, created_by: user.id })
    .select("id")
    .single();

  if (error || !club) {
    return { error: "Impossible de créer le club." };
  }

  revalidatePath("/clubs");
  redirect(`/clubs/${club.id}`);
}

export async function updateClub(
  clubId: string,
  _prevState: ClubFormState,
  formData: FormData,
): Promise<ClubFormState> {
  const supabase = await createClient();
  if (!(await getClubAccess(supabase, clubId))) {
    return { error: "Tu n'as pas les droits pour modifier ce club." };
  }

  const parsed = parseClubFields(formData);
  if (!parsed.ok) return { error: parsed.error };

  const { error } = await supabase.from("clubs").update(parsed.row).eq("id", clubId);

  if (error) {
    return { error: "Impossible de modifier le club." };
  }

  revalidatePath(`/clubs/${clubId}`);
  redirect(`/clubs/${clubId}`);
}

export async function deleteClub(clubId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: club } = await supabase
    .from("clubs")
    .select("created_by")
    .eq("id", clubId)
    .single();

  if (!club || club.created_by !== user.id) return;

  await supabase.from("clubs").delete().eq("id", clubId);

  revalidatePath("/clubs");
  redirect("/clubs");
}

export async function addClubMember(clubId: string, formData: FormData) {
  const supabase = await createClient();
  const access = await getClubAccess(supabase, clubId);
  if (!access) return;

  const pseudo = String(formData.get("pseudo") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "member");
  const role: ClubMemberRole = MEMBER_ROLES.includes(roleRaw as ClubMemberRole)
    ? (roleRaw as ClubMemberRole)
    : "member";
  if (!pseudo) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("pseudo", pseudo)
    .maybeSingle();

  if (!profile) {
    redirect(`/clubs/${clubId}?erreur=${encodeURIComponent("Aucun joueur avec ce pseudo.")}`);
  }

  const { error } = await supabase.from("club_members").insert({
    club_id: clubId,
    user_id: profile.id,
    role,
    added_by: access.userId,
  });

  if (error) {
    const message =
      error.code === "23505" ? "Ce joueur est déjà membre du club." : error.message;
    redirect(`/clubs/${clubId}?erreur=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/clubs/${clubId}`);
}

export async function changeClubMemberRole(clubId: string, userId: string, formData: FormData) {
  const supabase = await createClient();
  const access = await getClubAccess(supabase, clubId);
  if (!access) return;

  const roleRaw = String(formData.get("role") ?? "");
  if (!MEMBER_ROLES.includes(roleRaw as ClubMemberRole)) return;

  await supabase
    .from("club_members")
    .update({ role: roleRaw })
    .eq("club_id", clubId)
    .eq("user_id", userId);

  revalidatePath(`/clubs/${clubId}`);
}

export async function removeClubMember(clubId: string, userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  // Un membre peut toujours se retirer lui-même ; sinon il faut être
  // propriétaire ou administrateur du club (la policy RLS l'impose de
  // toute façon, mais on évite ainsi un appel inutile).
  if (user.id !== userId) {
    const access = await getClubAccess(supabase, clubId);
    if (!access) return;
  }

  await supabase.from("club_members").delete().eq("club_id", clubId).eq("user_id", userId);

  revalidatePath(`/clubs/${clubId}`);
}
