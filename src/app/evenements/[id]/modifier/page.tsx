import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateEvent } from "@/app/evenements/actions";
import { EventForm, type EventFormValues } from "@/components/EventForm";
import { getManagedClubOptions } from "@/lib/clubOptions";

export default async function ModifierEvenementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: event } = await supabase.from("events").select("*").eq("id", id).single();
  if (!event) notFound();

  const { data: admin } = await supabase
    .from("event_admins")
    .select("user_id")
    .eq("event_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const canManage = event.created_by === user.id || !!admin;
  if (!canManage) redirect(`/evenements/${id}`);

  const initial: Partial<EventFormValues> = {
    name: event.name,
    description: event.description ?? "",
    scheduledAt: event.scheduled_at ?? "",
    location: event.location ?? "",
    logoUrl: event.logo_url ?? "",
    organisation: event.organisation ?? "",
    maxPlayers: event.max_players,
    clubId: event.club_id ?? "",
    visibility: event.visibility,
  };

  const clubOptions = await getManagedClubOptions(supabase, user.id);

  return (
    <EventForm
      action={updateEvent.bind(null, id)}
      clubOptions={clubOptions}
      title="Modifier l'évènement"
      submitLabel="Enregistrer les modifications"
      pendingLabel="Enregistrement..."
      cancelHref={`/evenements/${id}`}
      initial={initial}
      userId={user.id}
    />
  );
}
