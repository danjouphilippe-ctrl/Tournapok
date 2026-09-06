import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getManageAccess, startTournament } from "@/app/tournois/actions";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-12">
      {erreur && (
        <p className="card text-sm text-danger" role="alert">
          {erreur}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Tables — {tournament.name}</h1>
        <Link href={`/tournois/${id}`} className="link text-sm">
          Retour au tournoi
        </Link>
      </div>

      {tableNumbers.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Les tables seront tirées au sort au démarrage du tournoi.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          {tableNumbers.map((tableNumber) => (
            <PokerTable
              key={tableNumber}
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
          ))}
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

function PokerTable({
  tableNumber,
  tableSize,
  seats,
}: {
  tableNumber: number;
  tableSize: number;
  seats: {
    seatNumber: number;
    pseudo: string;
    avatarUrl: string | null;
    stack: number | null;
    playerId: string;
  }[];
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="eyebrow">Table {tableNumber}</p>
      <div className="relative aspect-[8/5] w-full max-w-sm">
        <div
          className="absolute inset-[12%] rounded-[50%] border-4 border-line"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(138,35,50,0.35), rgba(28,22,21,0.9))",
          }}
        />
        {seats.map((seat) => {
          const angle = ((seat.seatNumber - 1) / tableSize) * 2 * Math.PI - Math.PI / 2;
          const left = 50 + 46 * Math.cos(angle);
          const top = 50 + 46 * Math.sin(angle);
          return (
            <Link
              key={seat.playerId}
              href={`/joueurs/${seat.playerId}`}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              {seat.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={seat.avatarUrl}
                  alt={seat.pseudo}
                  className="h-10 w-10 rounded-full border-2 border-accent object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-accent bg-surface-2 text-sm font-medium text-ink-soft">
                  {seat.pseudo.slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="whitespace-nowrap rounded-md bg-surface px-1.5 py-0.5 text-[11px] text-ink shadow">
                {seat.pseudo}
                {seat.stack != null && (
                  <span className="text-ink-faint"> · {seat.stack.toLocaleString("fr-FR")}</span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
