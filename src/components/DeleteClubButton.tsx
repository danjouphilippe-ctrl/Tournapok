"use client";

import { deleteClub } from "@/app/clubs/actions";

export function DeleteClubButton({ clubId }: { clubId: string }) {
  return (
    <form
      action={deleteClub.bind(null, clubId)}
      onSubmit={(e) => {
        if (
          !confirm(
            "Supprimer définitivement ce club ? Les tournois et évènements qu'il contient ne seront pas supprimés, mais redeviendront indépendants.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="link-danger link-action text-sm">
        Supprimer le club
      </button>
    </form>
  );
}
