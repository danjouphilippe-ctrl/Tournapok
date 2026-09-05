"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { ConfirmButton } from "@/components/ConfirmButton";
import { playBeep, playBell } from "@/lib/clockSounds";

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
  rebuy_stack_threshold: number | null;
  rebuy_until_level: number | null;
  addon_enabled: boolean;
  addon_price: number | null;
  addon_at_level: number | null;
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
  const [navBusy, setNavBusy] = useState(false);
  const autoAdvanceGuard = useRef<number | null>(null);
  const supabaseRef = useRef(createClient());

  const refetch = useCallback(async () => {
    const supabase = supabaseRef.current;
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from("tournaments").select("*").eq("id", tournamentId).single(),
      supabase
        .from("tournament_players")
        .select(
          "player_id, status, place, stack, rebuys_count, addon_used, buy_in_paid, bounty_cash_won, table_number, seat_number, profiles!tournament_players_player_id_fkey(pseudo), eliminator:profiles!tournament_players_eliminated_by_fkey(pseudo)",
        )
        .eq("tournament_id", tournamentId),
    ]);
    if (t) setTournament(t as Tournament);
    if (p) setPlayers(p as Player[]);
  }, [tournamentId]);

  // Exécute une action serveur puis rafraîchit immédiatement l'état
  // local, au lieu d'attendre l'évènement temps réel ou le sondage
  // périodique — ça évite la sensation de lenteur au clic.
  async function runAction(fn: () => Promise<void>) {
    setNavBusy(true);
    try {
      await fn();
    } finally {
      await refetch();
      setNavBusy(false);
    }
  }

  useEffect(() => {
    const supabase = supabaseRef.current;

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

    // Filet de sécurité : au cas où un évènement temps réel serait
    // manqué, on se resynchronise périodiquement.
    const pollInterval = setInterval(refetch, 5000);

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [tournamentId, refetch]);

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

  // Alerte sonore : cloche à 1 minute de la fin du niveau, bip chaque
  // seconde dans les 15 dernières. On ne joue jamais deux fois pour la
  // même seconde (lastSoundSecond) et on réinitialise à chaque
  // changement de niveau pour ne pas hériter d'un état obsolète.
  const lastSoundSecond = useRef<number | null>(null);
  useEffect(() => {
    lastSoundSecond.current = null;
  }, [tournament.current_level]);

  useEffect(() => {
    if (tournament.clock_status !== "running" || currentLevel?.is_break) return;
    const sec = Math.ceil(remainingSeconds);
    if (sec === lastSoundSecond.current) return;
    lastSoundSecond.current = sec;
    if (sec === 60) {
      playBell();
    } else if (sec >= 1 && sec <= 15) {
      playBeep();
    }
  }, [remainingSeconds, tournament.clock_status, currentLevel?.is_break]);

  const isFinalCountdown =
    tournament.clock_status === "running" &&
    !currentLevel?.is_break &&
    remainingSeconds > 0 &&
    remainingSeconds <= 15;

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
  const sortedActive = [...active].sort((a, b) =>
    pseudoOf(a.profiles).localeCompare(pseudoOf(b.profiles), "fr"),
  );
  const entries = players.length;
  const paidCount = players.filter((p) => p.buy_in_paid).length;
  const totalChips = players.reduce((sum, p) => sum + (p.stack ?? tournament.starting_stack), 0);
  const avgStack = active.length > 0 ? Math.round(totalChips / active.length) : 0;
  const avgStackBB =
    currentLevel && currentLevel.big_blind > 0 && active.length > 0
      ? Math.round(avgStack / currentLevel.big_blind)
      : null;
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

  const isRunningScreen = tournament.status === "en_cours";

  return (
    <main
      className={`flex flex-col gap-3 bg-background px-4 py-3 text-foreground lg:px-6 ${
        isRunningScreen ? "h-screen overflow-hidden" : "min-h-screen py-6 gap-6"
      }`}
    >
      {!isRunningScreen && (
        <div className="flex flex-col items-center gap-1">
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
      )}

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
                <li
                  key={p.player_id}
                  className={`clock-tile flex flex-col gap-1 ${gain > 0 ? "clock-tile-success" : ""}`}
                >
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
        <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[320px_1fr_320px]">
          {/* Colonne gauche : logo + statistiques d'inscription */}
          <div className="flex h-full flex-col gap-2">
            {tournament.chip_image_url && (
              <div className="clock-tile flex shrink-0 items-center justify-center py-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={tournament.chip_image_url}
                  alt=""
                  className="h-40 w-40 shrink-0 rounded-full border border-line object-cover"
                />
              </div>
            )}
            {cfg.show_entries && <Stat label="Entrées" value={entries} grow />}
            {cfg.show_players_remaining && (
              <Stat label="Joueurs restants" value={`${active.length} / ${entries}`} grow />
            )}
            {cfg.show_rebuys && <Stat label="Recaves" value={rebuysTotal} grow />}
            {cfg.show_addons && <Stat label="Add-ons" value={addonsTotal} grow />}
          </div>

          {/* Colonne centrale : horloge + stats de jeu */}
          <div className="flex min-h-0 flex-col gap-3">
            <div className="clock-tile flex flex-1 flex-col items-center justify-evenly py-4">
              <h2 className="mb-8 text-center font-display text-6xl font-bold leading-tight">
                {cfg.title || tournament.name}
              </h2>

              {canManage && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={navBusy}
                    onClick={() => runAction(() => previousLevel(tournamentId))}
                    className="btn btn-secondary btn-sm"
                  >
                    Niveau -
                  </button>
                  {isPaused ? (
                    <button
                      type="button"
                      disabled={navBusy}
                      onClick={() => runAction(() => resumeClock(tournamentId))}
                      className="btn btn-primary btn-sm"
                    >
                      Reprendre
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={navBusy}
                      onClick={() => runAction(() => pauseClock(tournamentId))}
                      className="btn btn-primary btn-sm"
                    >
                      Pause
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={navBusy}
                    onClick={() => runAction(() => nextLevel(tournamentId))}
                    className="btn btn-secondary btn-sm"
                  >
                    Niveau +
                  </button>
                </div>
              )}

              <p className="eyebrow text-base">
                Niveau {tournament.current_level}
                {isPaused && <span className="text-danger"> · EN PAUSE</span>}
              </p>

              <p
                className={`font-mono text-[10rem] font-bold leading-none tabular-nums ${
                  isPaused
                    ? "text-ink-faint"
                    : isFinalCountdown
                      ? "animate-pulse text-danger"
                      : "text-foreground"
                }`}
              >
                {formatDuration(remainingSeconds)}
              </p>

              <div className="h-2 w-full max-w-lg overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${levelProgress * 100}%` }}
                />
              </div>

              <div className="flex flex-col items-center gap-2">
                {currentLevel?.is_break ? (
                  <p className="text-5xl font-semibold text-accent">Pause</p>
                ) : (
                  <p className="text-5xl font-semibold">
                    Blindes : {currentLevel?.small_blind ?? "-"} / {currentLevel?.big_blind ?? "-"}
                    {currentLevel && currentLevel.ante > 0 ? ` · Ante ${currentLevel.ante}` : ""}
                  </p>
                )}
                {nextLevelData && (
                  <p className="text-2xl text-ink-soft">
                    Prochain :{" "}
                    {nextLevelData.is_break
                      ? "Pause"
                      : `${nextLevelData.small_blind} / ${nextLevelData.big_blind}${
                          nextLevelData.ante > 0 ? ` · Ante ${nextLevelData.ante}` : ""
                        }`}
                  </p>
                )}
                {cfg.show_next_break && nextBreakSeconds !== null && (
                  <p className="text-2xl text-ink-soft">
                    Prochaine pause :{" "}
                    <span className="font-semibold text-foreground">
                      {formatDuration(nextBreakSeconds)}
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-3">
              {lateRegSeconds !== null && (
                <Stat
                  label="Fin enr. tardif"
                  value={lateRegSeconds > 0 ? formatDuration(lateRegSeconds) : "Fermé"}
                  grow
                />
              )}
              {cfg.show_average_stack && active.length > 0 && (
                <Stat
                  label="Tapis moyen (BB)"
                  value={avgStackBB !== null ? `${avgStackBB} BB` : "-"}
                  grow
                />
              )}
              {cfg.show_average_stack && active.length > 0 && (
                <Stat label="Tapis moyen" value={avgStack.toLocaleString("fr-FR")} grow />
              )}
              {cfg.show_chip_count && (
                <Stat label="Total des jetons" value={totalChips.toLocaleString("fr-FR")} grow />
              )}
            </div>
          </div>

          {/* Colonne droite : joueurs, triés par ordre alphabétique */}
          <div className="clock-tile flex min-h-0 flex-col overflow-hidden py-2">
            <p className="mb-1 text-xs text-ink-faint">Joueurs ({active.length})</p>
            <div className="flex min-h-0 flex-1 flex-col divide-y divide-line overflow-y-auto">
              {sortedActive.map((p) => {
                const rebuyAllowed =
                  tournament.rebuy_enabled &&
                  (tournament.rebuy_max_per_player === null ||
                    p.rebuys_count < tournament.rebuy_max_per_player) &&
                  (tournament.rebuy_stack_threshold === null ||
                    (p.stack ?? 0) <= tournament.rebuy_stack_threshold) &&
                  (tournament.rebuy_until_level === null ||
                    tournament.current_level <= tournament.rebuy_until_level);
                const addonAllowed =
                  tournament.addon_enabled &&
                  !p.addon_used &&
                  (tournament.addon_at_level === null ||
                    tournament.current_level >= tournament.addon_at_level);
                return (
                  <PlayerRow
                    key={p.player_id}
                    tournamentId={tournamentId}
                    player={p}
                    startingStack={tournament.starting_stack}
                    rebuyEnabled={tournament.rebuy_enabled}
                    addonEnabled={tournament.addon_enabled}
                    rebuyAllowed={rebuyAllowed}
                    addonAllowed={addonAllowed}
                    canManage={canManage}
                    others={sortedActive.filter((o) => o.player_id !== p.player_id)}
                    refetch={refetch}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {cfg.show_prize_pool && (
          <div className="clock-tile clock-tile-success flex shrink-0 flex-wrap items-center justify-center gap-x-10 gap-y-2 py-5">
            <p className="text-2xl">
              Prize pool :{" "}
              <span className="text-3xl font-semibold">
                {prizePool.toLocaleString("fr-FR")} €
              </span>
            </p>
            {cfg.show_payouts &&
              payouts.map((p) => (
              <p key={p.place} className="text-2xl">
                {p.place === 1 ? "🏆 1er" : `${p.place}e`} :{" "}
                <span className="text-3xl font-semibold">
                  {Math.round((prizePool * p.percentage) / 100).toLocaleString("fr-FR")} €
                </span>
              </p>
            ))}
          </div>
        )}
        </div>
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  variant,
  compact,
  grow,
}: {
  label: string;
  value: string | number;
  variant?: "success";
  compact?: boolean;
  grow?: boolean;
}) {
  return (
    <div
      className={`clock-tile ${variant === "success" ? "clock-tile-success" : ""} ${
        grow
          ? "flex flex-1 flex-col items-center justify-center gap-1 py-8 text-center"
          : compact
            ? "py-2"
            : ""
      }`}
    >
      <p className={grow ? "text-base text-ink-soft" : "text-xs text-ink-soft"}>{label}</p>
      <p
        className={
          grow
            ? "text-4xl font-semibold"
            : compact
              ? "text-lg font-semibold"
              : "text-2xl font-semibold"
        }
      >
        {value}
      </p>
    </div>
  );
}

function PlayerRow({
  tournamentId,
  player,
  startingStack,
  rebuyEnabled,
  addonEnabled,
  rebuyAllowed,
  addonAllowed,
  canManage,
  others,
  refetch,
}: {
  tournamentId: string;
  player: Player;
  startingStack: number;
  rebuyEnabled: boolean;
  addonEnabled: boolean;
  rebuyAllowed: boolean;
  addonAllowed: boolean;
  canManage: boolean;
  others: Player[];
  refetch: () => Promise<void>;
}) {
  const [eliminatedBy, setEliminatedBy] = useState("");
  const [eliminating, setEliminating] = useState(false);
  const [showEliminate, setShowEliminate] = useState(false);
  const pseudo = pseudoOf(player.profiles);

  async function handleEliminate() {
    if (!eliminatedBy) return;
    setEliminating(true);
    const formData = new FormData();
    formData.set("eliminated_by", eliminatedBy);
    try {
      await eliminatePlayer(tournamentId, player.player_id, formData);
    } finally {
      await refetch();
      setEliminating(false);
      setShowEliminate(false);
    }
  }

  return (
    <div className="py-1.5 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-medium">{pseudo}</span>
        {player.table_number && (
          <span className="shrink-0 text-xs text-ink-faint">
            T{player.table_number} · S{player.seat_number}
          </span>
        )}
        <span className="w-32 shrink-0 text-right text-xs text-ink-soft">
          {(player.stack ?? startingStack).toLocaleString("fr-FR")} j
          {player.rebuys_count > 0 ? ` · ${player.rebuys_count}R` : ""}
          {player.addon_used ? " · A" : ""}
        </span>

        {canManage && (
          <div className="flex shrink-0 items-center gap-1.5">
            {rebuyEnabled && (
              <ConfirmButton
                label="Recave"
                confirmLabel="Valider la recave"
                message={`Valider l'achat d'une recave pour ${pseudo} ?`}
                disabled={!rebuyAllowed}
                onConfirm={async () => {
                  const result = await rebuyPlayer(tournamentId, player.player_id);
                  await refetch();
                  return result;
                }}
                className="btn btn-success btn-sm"
              />
            )}
            {addonEnabled && (
              <ConfirmButton
                label="Add-on"
                confirmLabel="Valider l'add-on"
                message={`Valider l'achat d'un add-on pour ${pseudo} ?`}
                disabled={!addonAllowed}
                onConfirm={async () => {
                  const result = await addOnPlayer(tournamentId, player.player_id);
                  await refetch();
                  return result;
                }}
                className="btn btn-success btn-sm"
              />
            )}
            <button
              type="button"
              onClick={() => setShowEliminate((v) => !v)}
              className="btn btn-danger btn-sm"
            >
              Éliminer {showEliminate ? "▴" : "▾"}
            </button>
          </div>
        )}
      </div>

      {showEliminate && (
        <div className="mt-1.5 flex items-center justify-end gap-1.5">
          <select
            value={eliminatedBy}
            onChange={(e) => setEliminatedBy(e.target.value)}
            className="input py-0.5 text-xs"
          >
            <option value="">Éliminé par...</option>
            {others.map((o) => (
              <option key={o.player_id} value={o.player_id}>
                {pseudoOf(o.profiles)}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!eliminatedBy || eliminating}
            onClick={handleEliminate}
            className="btn btn-danger btn-sm shrink-0"
          >
            Valider l&apos;élimination
          </button>
        </div>
      )}
    </div>
  );
}
