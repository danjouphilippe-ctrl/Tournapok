"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  autoCompleteLevel,
  pauseClock,
  resumeClock,
  nextLevel,
  previousLevel,
  rebuyPlayer,
  addOnPlayer,
  eliminatePlayer,
} from "@/app/tournois/actions";

type Level = {
  level_number: number;
  is_break: boolean;
  small_blind: number;
  big_blind: number;
  ante: number;
  duration_minutes: number;
};

type ProfileRef = { pseudo: string }[] | { pseudo: string } | null;

type Player = {
  player_id: string;
  status: string;
  place: number | null;
  stack: number | null;
  rebuys_count: number;
  addon_used: boolean;
  buy_in_paid: boolean;
  bounty_cash_won: number;
  table_number: number | null;
  seat_number: number | null;
  profiles: ProfileRef;
  eliminator: ProfileRef;
};

function pseudoOf(ref: ProfileRef): string {
  if (!ref) return "Joueur";
  return Array.isArray(ref) ? (ref[0]?.pseudo ?? "Joueur") : ref.pseudo;
}

type Payout = {
  place: number;
  percentage: number;
};

type Tournament = {
  id: string;
  name: string;
  status: string;
  clock_status: string;
  current_level: number;
  level_ends_at: string | null;
  paused_remaining_seconds: number | null;
  buy_in: number;
  rebuy_enabled: boolean;
  rebuy_price: number | null;
  rebuy_max_per_player: number | null;
  addon_enabled: boolean;
  addon_price: number | null;
  bounty_enabled: boolean;
  guarantee_amount: number | null;
  payout_places: number | null;
  starting_stack: number;
  chip_image_url: string | null;
  late_registration_enabled: boolean;
  late_registration_until_level: number | null;
  display_config: {
    title: string | null;
    show_entries: boolean;
    show_players_remaining: boolean;
    show_rebuys: boolean;
    show_addons: boolean;
    show_chip_count: boolean;
    show_average_stack: boolean;
    show_prize_pool: boolean;
    show_next_break: boolean;
    show_payouts: boolean;
  };
};

function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function AffichageClient({
  tournamentId,
  initialTournament,
  levels,
  initialPlayers,
  payouts,
  canManage,
  initialNow,
}: {
  tournamentId: string;
  initialTournament: Tournament;
  levels: Level[];
  initialPlayers: Player[];
  payouts: Payout[];
  canManage: boolean;
  initialNow: number;
}) {
  const [tournament, setTournament] = useState(initialTournament);
  const [players, setPlayers] = useState(initialPlayers);
  // Reçu du serveur pour que le premier rendu client (hydratation) soit
  // identique au HTML rendu côté serveur — sinon Date.now() donnerait
  // deux valeurs différentes et React signalerait un hydration mismatch.
  const [now, setNow] = useState(initialNow);
  const autoAdvanceGuard = useRef<number | null>(null);

  useEffect(() => {
    const supabase = createClient();

    let cancelled = false;

    async function refetch() {
      const [{ data: t }, { data: p }] = await Promise.all([
        supabase.from("tournaments").select("*").eq("id", tournamentId).single(),
        supabase
          .from("tournament_players")
          .select(
            "player_id, status, place, stack, rebuys_count, addon_used, buy_in_paid, bounty_cash_won, table_number, seat_number, profiles!tournament_players_player_id_fkey(pseudo), eliminator:profiles!tournament_players_eliminated_by_fkey(pseudo)",
          )
          .eq("tournament_id", tournamentId),
      ]);
      if (cancelled) return;
      if (t) setTournament(t as Tournament);
      if (p) setPlayers(p as Player[]);
    }

    // Le client temps réel a besoin du jeton de la session en cours
    // pour être autorisé à recevoir les changements (RLS).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) supabase.realtime.setAuth(session.access_token);
    });

    const channel = supabase
      .channel(`affichage-${tournamentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournaments", filter: `id=eq.${tournamentId}` },
        refetch,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_players",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        refetch,
      )
      .subscribe();

    // Filet de sécurité : au cas où un événement temps réel serait
    // manqué, on se resynchronise périodiquement.
    const pollInterval = setInterval(refetch, 5000);

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const currentLevel = levels.find((l) => l.level_number === tournament.current_level);
  const nextLevelData = levels.find((l) => l.level_number === tournament.current_level + 1);

  const remainingSeconds =
    tournament.clock_status === "running" && tournament.level_ends_at
      ? Math.max(0, (new Date(tournament.level_ends_at).getTime() - now) / 1000)
      : (tournament.paused_remaining_seconds ?? 0);

  useEffect(() => {
    if (
      tournament.clock_status === "running" &&
      remainingSeconds <= 0 &&
      autoAdvanceGuard.current !== tournament.current_level
    ) {
      autoAdvanceGuard.current = tournament.current_level;
      autoCompleteLevel(tournamentId, tournament.current_level);
    }
  }, [remainingSeconds, tournament.clock_status, tournament.current_level, tournamentId]);

  let nextBreakSeconds: number | null = null;
  if (currentLevel && !currentLevel.is_break) {
    let acc = remainingSeconds;
    for (const l of levels) {
      if (l.level_number <= tournament.current_level) continue;
      if (l.is_break) {
        nextBreakSeconds = acc;
        break;
      }
      acc += l.duration_minutes * 60;
    }
  }

  let lateRegSeconds: number | null = null;
  if (tournament.late_registration_enabled && tournament.late_registration_until_level !== null) {
    if (tournament.current_level > tournament.late_registration_until_level) {
      lateRegSeconds = 0;
    } else {
      let acc = remainingSeconds;
      for (const l of levels) {
        if (l.level_number <= tournament.current_level) continue;
        if (l.level_number > tournament.late_registration_until_level) break;
        acc += l.duration_minutes * 60;
      }
      lateRegSeconds = acc;
    }
  }

  const levelTotalSeconds = currentLevel ? currentLevel.duration_minutes * 60 : 0;
  const levelProgress =
    levelTotalSeconds > 0 ? Math.min(1, Math.max(0, 1 - remainingSeconds / levelTotalSeconds)) : 0;

  const active = players.filter((p) => p.status === "inscrit");
  const entries = players.length;
  const paidCount = players.filter((p) => p.buy_in_paid).length;
  const totalChips = players.reduce((sum, p) => sum + (p.stack ?? tournament.starting_stack), 0);
  const rebuysTotal = players.reduce((sum, p) => sum + p.rebuys_count, 0);
  const addonsTotal = players.filter((p) => p.addon_used).length;
  const prizePool =
    paidCount * tournament.buy_in +
    rebuysTotal * (tournament.rebuy_price ?? 0) +
    addonsTotal * (tournament.addon_price ?? 0) +
    (tournament.guarantee_amount ?? 0);

  const cfg = tournament.display_config;

  const isPaused = tournament.clock_status === "paused";

  const payoutByPlace = new Map(payouts.map((p) => [p.place, p.percentage]));
  const finished = players
    .filter((p) => p.status !== "inscrit")
    .sort((a, b) => (a.place ?? 0) - (b.place ?? 0));
  const champion = finished.find((p) => p.status === "vainqueur");

  function invested(p: Player) {
    return (
      (p.buy_in_paid ? tournament.buy_in : 0) +
      p.rebuys_count * (tournament.rebuy_price ?? 0) +
      (p.addon_used ? (tournament.addon_price ?? 0) : 0)
    );
  }

  function payoutGain(place: number | null) {
    if (!place) return 0;
    const pct = payoutByPlace.get(place);
    return pct ? Math.round((prizePool * pct) / 100) : 0;
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 bg-background px-4 py-6 text-foreground lg:px-8">
      <div className="flex flex-col items-center gap-2">
        <span className="text-lg tracking-[0.4em] text-accent">♠ ♥ ♦ ♣</span>
        {tournament.chip_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tournament.chip_image_url}
            alt=""
            className="h-16 w-16 rounded-full border border-line object-cover"
          />
        )}
        <h1 className="text-center text-2xl font-semibold">{cfg.title || tournament.name}</h1>
      </div>

      {tournament.status === "termine" ? (
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6">
          {champion && (
            <div className="flex flex-col items-center gap-2">
              <span className="text-5xl">🏆</span>
              <p className="eyebrow">Champion</p>
              <p className="text-center text-6xl font-bold text-accent">{pseudoOf(champion.profiles)}</p>
            </div>
          )}

          <p className="text-lg text-ink-soft">Prize pool : {prizePool.toLocaleString("fr-FR")} €</p>

          <ol className="flex w-full flex-col gap-2">
            {finished.map((p) => {
              const gain = payoutGain(p.place) + (tournament.bounty_enabled ? p.bounty_cash_won : 0);
              return (
                <li key={p.player_id} className="card flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      #{p.place} {pseudoOf(p.profiles)} {p.status === "vainqueur" && "🏆"}
                    </span>
                    <span className="text-sm text-ink-soft">
                      Investi {invested(p)}€{gain > 0 ? ` · Gagné ${gain}€` : ""}
                    </span>
                  </div>
                  {p.eliminator && (
                    <p className="text-xs text-ink-faint">Éliminé par {pseudoOf(p.eliminator)}</p>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      ) : tournament.status !== "en_cours" ? (
        <p className="text-center text-xl text-ink-soft">Le tournoi n&apos;est pas en cours.</p>
      ) : (
        <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[240px_1fr_300px]">
          {/* Colonne gauche : statistiques */}
          <div className="flex flex-col gap-3">
            {cfg.show_entries && <Stat label="Entrées" value={entries} />}
            {cfg.show_players_remaining && <Stat label="Joueurs restants" value={`${active.length} / ${entries}`} />}
            {cfg.show_rebuys && <Stat label="Recaves" value={rebuysTotal} />}
            {cfg.show_addons && <Stat label="Add-ons" value={addonsTotal} />}
            {cfg.show_average_stack && active.length > 0 && (
              <Stat
                label="Tapis moyen"
                value={Math.round(totalChips / active.length).toLocaleString("fr-FR")}
              />
            )}
            {cfg.show_chip_count && (
              <Stat label="Total des jetons" value={totalChips.toLocaleString("fr-FR")} />
            )}
            {cfg.show_prize_pool && (
              <Stat label="Prize pool" value={`${prizePool.toLocaleString("fr-FR")} €`} />
            )}
            {cfg.show_payouts && payouts.length > 0 && (
              <div className="card flex flex-col gap-1">
                <p className="text-sm text-ink-soft">Répartition des gains</p>
                {payouts.map((p) => (
                  <p key={p.place} className="text-sm">
                    #{p.place} :{" "}
                    <span className="font-semibold">
                      {Math.round((prizePool * p.percentage) / 100).toLocaleString("fr-FR")} €
                    </span>
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Colonne centrale : horloge */}
          <div className="flex flex-col items-center gap-3">
            {canManage && (
              <div className="flex items-center gap-2">
                <form action={previousLevel.bind(null, tournamentId)}>
                  <button type="submit" className="btn btn-secondary btn-sm">
                    Niveau -
                  </button>
                </form>
                {isPaused ? (
                  <form action={resumeClock.bind(null, tournamentId)}>
                    <button type="submit" className="btn btn-primary btn-sm">
                      Reprendre
                    </button>
                  </form>
                ) : (
                  <form action={pauseClock.bind(null, tournamentId)}>
                    <button type="submit" className="btn btn-primary btn-sm">
                      Pause
                    </button>
                  </form>
                )}
                <form action={nextLevel.bind(null, tournamentId)}>
                  <button type="submit" className="btn btn-secondary btn-sm">
                    Niveau +
                  </button>
                </form>
              </div>
            )}

            <p className="eyebrow text-base">
              Niveau {tournament.current_level}
              {isPaused && <span className="text-danger"> · EN PAUSE</span>}
            </p>

            <p
              className={`font-mono text-8xl font-bold tabular-nums ${isPaused ? "text-ink-faint" : "text-foreground"}`}
            >
              {formatDuration(remainingSeconds)}
            </p>

            <div className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${levelProgress * 100}%` }}
              />
            </div>

            {currentLevel?.is_break ? (
              <p className="text-4xl font-semibold text-accent">Pause</p>
            ) : (
              <p className="text-4xl font-semibold">
                Blindes : {currentLevel?.small_blind ?? "-"} / {currentLevel?.big_blind ?? "-"}
                {currentLevel && currentLevel.ante > 0 ? ` · Ante ${currentLevel.ante}` : ""}
              </p>
            )}

            {nextLevelData && (
              <p className="text-lg text-ink-soft">
                Prochain niveau :{" "}
                {nextLevelData.is_break
                  ? "Pause"
                  : `${nextLevelData.small_blind} / ${nextLevelData.big_blind}${
                      nextLevelData.ante > 0 ? ` · Ante ${nextLevelData.ante}` : ""
                    }`}
              </p>
            )}
          </div>

          {/* Colonne droite : joueurs */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              {cfg.show_next_break && nextBreakSeconds !== null && (
                <Stat label="Pause dans" value={formatDuration(nextBreakSeconds)} />
              )}
              {lateRegSeconds !== null && (
                <Stat
                  label="Fin enr. tardif"
                  value={lateRegSeconds > 0 ? formatDuration(lateRegSeconds) : "Fermé"}
                />
              )}
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto">
              {active.map((p) => (
                <div key={p.player_id} className="card flex flex-col gap-1 py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{pseudoOf(p.profiles)}</span>
                    {p.table_number && (
                      <span className="text-xs text-ink-faint">
                        T{p.table_number} · S{p.seat_number}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-ink-soft">
                    {(p.stack ?? tournament.starting_stack).toLocaleString("fr-FR")} jetons
                    {p.rebuys_count > 0 ? ` · ${p.rebuys_count} recave(s)` : ""}
                    {p.addon_used ? " · add-on" : ""}
                  </span>

                  {canManage && (
                    <PlayerActions
                      tournamentId={tournamentId}
                      player={p}
                      rebuyEnabled={tournament.rebuy_enabled}
                      addonEnabled={tournament.addon_enabled}
                      addonUsed={p.addon_used}
                      rebuyMaxed={
                        tournament.rebuy_max_per_player !== null &&
                        p.rebuys_count >= tournament.rebuy_max_per_player
                      }
                      others={active.filter((o) => o.player_id !== p.player_id)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

function PlayerActions({
  tournamentId,
  player,
  rebuyEnabled,
  addonEnabled,
  addonUsed,
  rebuyMaxed,
  others,
}: {
  tournamentId: string;
  player: Player;
  rebuyEnabled: boolean;
  addonEnabled: boolean;
  addonUsed: boolean;
  rebuyMaxed: boolean;
  others: Player[];
}) {
  return (
    <div className="flex flex-col gap-1.5 border-t border-line pt-1.5">
      <div className="flex flex-wrap gap-1.5">
        {rebuyEnabled && !rebuyMaxed && (
          <form action={rebuyPlayer.bind(null, tournamentId, player.player_id)}>
            <button type="submit" className="link text-xs">
              Recave
            </button>
          </form>
        )}
        {addonEnabled && !addonUsed && (
          <form action={addOnPlayer.bind(null, tournamentId, player.player_id)}>
            <button type="submit" className="link text-xs">
              Add-on
            </button>
          </form>
        )}
      </div>
      <form
        action={eliminatePlayer.bind(null, tournamentId, player.player_id)}
        className="flex items-center gap-1.5"
      >
        <select name="eliminated_by" required className="input py-0.5 text-xs">
          <option value="">Éliminé par...</option>
          {others.map((o) => (
            <option key={o.player_id} value={o.player_id}>
              {pseudoOf(o.profiles)}
            </option>
          ))}
        </select>
        <button type="submit" className="link-danger shrink-0 text-xs">
          Éliminer
        </button>
      </form>
    </div>
  );
}
