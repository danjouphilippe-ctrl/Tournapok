import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import {
  getManageAccess,
  redrawTournamentSeating,
  startTournament,
} from "@/app/tournois/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { peutRefaireLeTirage } from "@/lib/tournoiPhase";
import { SalleDeTirage } from "@/components/SalleDeTirage";

function getPseudo(p: { profiles: { pseudo: string; avatar_url: string | null }[] | { pseudo: string; avatar_url: string | null } | null }) {
  const profiles = p.profiles;
  if (!profiles) return { pseudo: "Joueur", avatar_url: null };
  return Array.isArray(profiles) ? (profiles[0] ?? { pseudo: "Joueur", avatar_url: null }) : profiles;
}

export default async function TablesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string; retire?: string }>;
}) {
  const { id } = await params;
  const { erreur, retire } = await searchParams;
  const supabase = await createClient();
  const user = await getUser();
  if (!user) redirect("/connexion");

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, name, status, created_by, min_players")
    .eq("id", id)
    .single();

  if (!tournament) notFound();

  const canManage = Boolean(await getManageAccess(supabase, id));

  const { data: players } = await supabase
    .from("tournament_players")
    .select(
      "player_id, table_number, seat_number, stack, buy_in_paid, profiles!tournament_players_player_id_fkey(pseudo, avatar_url)",
    )
    .eq("tournament_id", id)
    .eq("status", "inscrit")
    .order("seat_number");

  const peutRetirer =
    peutRefaireLeTirage(tournament, user.id, players ?? []) && (players ?? []).length > 0;

  const tables = new Map<number, typeof players>();
  // Un joueur ajouté après le tirage n'a pas encore de place : il compte
  // pour les conditions du re-tirage, pas pour l'affichage des tables.
  for (const p of (players ?? []).filter((p) => p.table_number !== null)) {
    const list = tables.get(p.table_number!);
    if (list) list.push(p);
    else tables.set(p.table_number!, [p]);
  }
  const tableNumbers = [...tables.keys()].sort((a, b) => a - b);

  return (
    <main className="page page-console">
      {erreur && (
        <p className="card text-sm text-danger" role="alert">
          {erreur}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Tables — {tournament.name}</h1>
        <Link href={`/tournois/${id}`} className="link link-action text-sm">
          Retour au tournoi
        </Link>
      </div>

      {tableNumbers.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-14 text-center">
          <span className="tile-icon tile-icon-teal text-2xl">🪑</span>
          <p className="text-sm text-ink-soft">
            Les tables seront tirées au sort au démarrage du tournoi.
          </p>
          <Link href={`/tournois/${id}`} className="btn btn-secondary btn-sm">
            Retour au tournoi
          </Link>
        </div>
      ) : (
        <SalleDeTirage
          tournamentId={tournament.id}
          retire={retire === "1"}
          tables={tableNumbers.map((tableNumber) => ({
            tableNumber,
            seats: tables.get(tableNumber)!.map((p) => {
              const profile = getPseudo(p);
              return {
                seatNumber: p.seat_number!,
                pseudo: profile.pseudo,
                avatarUrl: profile.avatar_url,
                stack: p.stack,
                playerId: p.player_id,
              };
            }),
          }))}
        />
      )}

      {/* Refaire le tirage annule un placement que la salle a peut-être
        * déjà vu : réservé à l'organisateur, et confirmé. */}
      {peutRetirer && tableNumbers.length > 0 && (
        <div className="flex justify-center">
          <ConfirmButton
            label="Refaire le tirage au sort"
            confirmLabel="Refaire le tirage"
            message="Les places actuelles seront remplacées par un nouveau tirage. Si les joueurs ont déjà vu leur table, ils devront la revérifier."
            onConfirm={redrawTournamentSeating.bind(null, tournament.id)}
            className="btn btn-secondary btn-sm"
          />
        </div>
      )}

      {tournament.status === "inscription" && canManage && tableNumbers.length > 0 && (
        <form action={startTournament.bind(null, tournament.id)}>
          <button type="submit" className="btn btn-primary w-full">
            Les joueurs sont prêts : démarrer le tournoi
          </button>
        </form>
      )}
    </main>
  );
}
