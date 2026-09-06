import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createEvent } from "@/app/evenements/actions";
import { EventForm } from "@/components/EventForm";
import { getManagedClubOptions } from "@/lib/clubOptions";

export default async function NouvelEvenementPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const clubOptions = await getManagedClubOptions(supabase, user.id);

  return (
    <EventForm
      action={createEvent}
      clubOptions={clubOptions}
      title="Créer un évènement"
      submitLabel="Créer l'évènement"
      pendingLabel="Création..."
      cancelHref="/evenements"
      userId={user.id}
    />
  );
}
