import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createEvent } from "@/app/evenements/actions";
import { EventForm } from "@/components/EventForm";

export default async function NouvelEvenementPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  return (
    <EventForm
      action={createEvent}
      title="Créer un évènement"
      submitLabel="Créer l'évènement"
      pendingLabel="Création..."
      cancelHref="/evenements"
      userId={user.id}
    />
  );
}
