import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { createClub } from "@/app/clubs/actions";
import { ClubForm } from "@/components/ClubForm";

export default async function NouveauClubPage() {
  const user = await getUser();
  if (!user) redirect("/connexion");

  return (
    <ClubForm
      action={createClub}
      title="Créer un club"
      submitLabel="Créer le club"
      pendingLabel="Création..."
      cancelHref="/clubs"
      userId={user.id}
    />
  );
}
