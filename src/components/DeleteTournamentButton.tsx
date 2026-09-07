"use client";

import { deleteTournament } from "@/app/tournois/actions";

export function DeleteTournamentButton({ tournamentId }: { tournamentId: string }) {
  return (
    <form
      action={deleteTournament.bind(null, tournamentId)}
      onSubmit={(e) => {
        if (!confirm("Supprimer définitivement ce tournoi ? Cette action est irréversible.")) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="link-danger link-action text-sm">
        Supprimer le tournoi
      </button>
    </form>
  );
}
