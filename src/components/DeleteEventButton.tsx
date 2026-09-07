"use client";

import { deleteEvent } from "@/app/evenements/actions";

export function DeleteEventButton({ eventId }: { eventId: string }) {
  return (
    <form
      action={deleteEvent.bind(null, eventId)}
      onSubmit={(e) => {
        if (
          !confirm(
            "Supprimer définitivement cet évènement ? Les tournois qu'il contient ne seront pas supprimés, mais redeviendront des tournois indépendants.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="link-danger link-action text-sm">
        Supprimer l&apos;évènement
      </button>
    </form>
  );
}
