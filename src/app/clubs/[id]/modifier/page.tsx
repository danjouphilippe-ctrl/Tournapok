import { notFound, redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { updateClub } from "@/app/clubs/actions";
import { ClubForm } from "@/components/ClubForm";

export default async function ModifierClubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getUser();
  if (!user) redirect("/connexion");

  const { data: club } = await supabase.from("clubs").select("*").eq("id", id).single();
  if (!club) notFound();

  const { data: member } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const canManage = club.created_by === user.id || member?.role === "owner" || member?.role === "admin";
  if (!canManage) redirect(`/clubs/${id}`);

  return (
    <ClubForm
      action={updateClub.bind(null, id)}
      title="Modifier le club"
      submitLabel="Enregistrer les modifications"
      pendingLabel="Enregistrement..."
      cancelHref={`/clubs/${id}`}
      initial={{
        name: club.name,
        description: club.description ?? "",
        location: club.location ?? "",
        logoUrl: club.logo_url ?? "",
        bannerUrl: club.banner_url ?? "",
        legalForm: club.legal_form ?? "",
        phone: club.phone ?? "",
        email: club.email ?? "",
        address: club.address ?? "",
        visibility: club.visibility,
      }}
      userId={user.id}
    />
  );
}
