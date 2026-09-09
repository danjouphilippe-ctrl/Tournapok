import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { getManageAccess, startTournament } from "@/app/tournois/actions";
import { PokerTable } from "@/components/PokerTable";

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
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { id } = await params;
  const { erreur } = await searchParams;
  const supabase = await createClient();
  const user = await getUser();
  if (!user) redirect("/connexion");

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, name, table_size, status")
    .eq("id", id)
    .single();

  if (!tournament) notFound();

  const canManage = Boolean(await getManageAccess(supabase, id));

  const { data: players } = await supabase
    .from("tournament_players")
    .select(
      "player_id, table_number, seat_number, stack, profiles!tournament_players_player_id_fkey(pseudo, avatar_url)",
    )
    .eq("tournament_id", id)
    .eq("status", "inscrit")
    .not("table_number", "is", null)
    .order("seat_number");

  const tables = new Map<number, typeof players>();
  for (const p of players ?? []) {
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
        <ul className="grid gap-3 2xl:grid-cols-2">
          {/* Deux tables de front seulement au-delà de 96rem. La barre
            * latérale prend 240 px : à 1280 il ne reste que 1040 px, et
            * deux ovales de 444 px s'y resserrent au point que les
            * étiquettes recouvrent les avatars voisins. */}
          {tableNumbers.map((tableNumber) => (
            <li key={tableNumber}>
              <PokerTable
                tableNumber={tableNumber}
                tableSize={tournament.table_size}
                seats={tables.get(tableNumber)!.map((p) => {
                  const profile = getPseudo(p);
                  return {
                    seatNumber: p.seat_number!,
                    pseudo: profile.pseudo,
                    avatarUrl: profile.avatar_url,
                    stack: p.stack,
                    playerId: p.player_id,
                  };
                })}
              />
            </li>
          ))}
        </ul>
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
