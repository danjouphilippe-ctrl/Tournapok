import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClub } from "@/app/clubs/actions";
import { ClubForm } from "@/components/ClubForm";

export default async function NouveauClubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
