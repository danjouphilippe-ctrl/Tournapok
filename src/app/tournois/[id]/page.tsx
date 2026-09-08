import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import {
  addCoAdmin,
  addOnPlayer,
  addPlayerByPseudo,
  cancelInvitation,
  duplicateTournament,
  eliminatePlayer,
  inviteClubMembers,
  inviteToTournament,
  nextLevel,
  pauseClock,
  prepareTournamentSeating,
  previousLevel,
  rebuyPlayer,
  removeCoAdmin,
  requestToJoinTournament,
  respondToInvitation,
  respondToJoinRequest,
  resumeClock,
  toggleBuyInPaid,
  updateDisplayConfig,
} from "@/app/tournois/actions";
import { DeleteTournamentButton } from "@/components/DeleteTournamentButton";
import { PseudoAutocomplete } from "@/components/PseudoAutocomplete";
import { ConfirmButton } from "@/components/ConfirmButton";
import { FormattedText } from "@/components/FormattedText";
import { formatDuration, structureTotals, withElapsed } from "@/lib/blindStructures";

type DisplayConfig = {
  title: string | null;
  show_entries: boolean;
  show_players_remaining: boolean;
  show_rebuys: boolean;
  show_addons: boolean;
  show_chip_count: boolean;
  show_average_stack: boolean;
  show_prize_pool: boolean;
  show_next_break: boolean;
  /* Ajoutée après coup : absente des tournois plus anciens. */
  show_time_left?: boolean;
  show_payouts: boolean;
};

const STATUT_LABELS: Record<string, string> = {
  inscription: "Inscriptions ouvertes",
  en_cours: "En cours",
  termine: "Terminé",
};

function StatutBadge({ status }: { status: string }) {
  const label = STATUT_LABELS[status] ?? status;
  if (status === "en_cours") return <span className="badge badge-accent">{label}</span>;
  if (status === "inscription") return <span className="badge badge-success">{label}</span>;
  return <span className="badge">{label}</span>;
}

function getPseudo(p: { profiles: { pseudo: string }[] | { pseudo: string } | null }) {
  const profiles = p.profiles;
  if (!profiles) return "Joueur";
  return Array.isArray(profiles) ? (profiles[0]?.pseudo ?? "Joueur") : profiles.pseudo;
}

function getAvatarUrl(p: {
  profiles: { avatar_url: string | null }[] | { avatar_url: string | null } | null;
}) {
  const profiles = p.profiles;
  if (!profiles) return null;
  return Array.isArray(profiles) ? (profiles[0]?.avatar_url ?? null) : profiles.avatar_url;
}

function getEliminatorPseudo(p: { eliminator: { pseudo: string }[] | { pseudo: string } | null }) {
  const eliminator = p.eliminator;
  if (!eliminator) return null;
  return Array.isArray(eliminator) ? (eliminator[0]?.pseudo ?? null) : eliminator.pseudo;
}

function ordinal(place: number) {
  if (place === 1) return "1er";
  return `${place}ème`;
}

function getDenomination(r: {
  chip_denominations: { color: string; value: number }[] | { color: string; value: number } | null;
}) {
  const d = r.chip_denominations;
  if (!d) return { color: "?", value: 0 };
  return Array.isArray(d) ? (d[0] ?? { color: "?", value: 0 }) : d;
}

export default async function TournoiPage({
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
    .select("*")
    .eq("id", id)
    .single();

  if (!tournament) notFound();

  const [
    { data: players },
    { data: admins },
    { data: blindLevels },
    { data: organizer },
    { data: payouts },
    { data: invitations },
    { data: joinRequests },
    { data: chipRack },
  ] = await Promise.all([
    supabase
      .from("tournament_players")
      .select(
        "player_id, status, place, stack, rebuys_count, addon_used, bounty_cash_won, buy_in_paid, eliminated_by, profiles!tournament_players_player_id_fkey(pseudo, avatar_url), eliminator:profiles!tournament_players_eliminated_by_fkey(pseudo)",
      )
      .eq("tournament_id", id),
    supabase
      .from("tournament_admins")
      .select("user_id, profiles!tournament_admins_user_id_fkey(pseudo)")
      .eq("tournament_id", id),
    supabase
      .from("tournament_blind_levels")
      .select("level_number, is_break, small_blind, big_blind, ante, duration_minutes")
      .eq("tournament_id", id)
      .order("level_number"),
    supabase.from("profiles").select("pseudo").eq("id", tournament.created_by).single(),
    supabase
      .from("tournament_payouts")
      .select("place, percentage")
      .eq("tournament_id", id)
      .order("place"),
    supabase
      .from("tournament_invitations")
      .select("id, invited_user_id, status, profiles!tournament_invitations_invited_user_id_fkey(pseudo)")
      .eq("tournament_id", id)
      .eq("status", "pending"),
    supabase
      .from("tournament_join_requests")
      .select("id, requester_id, status, profiles!tournament_join_requests_requester_id_fkey(pseudo)")
      .eq("tournament_id", id)
      .eq("status", "pending"),
    supabase
      .from("tournament_chip_rack")
      .select("quantity, chip_denominations(color, value)")
      .eq("tournament_id", id),
  ]);

  const { data: chipSet } = tournament.chip_set_id
    ? await supabase.from("chip_sets").select("name").eq("id", tournament.chip_set_id).single()
    : { data: null };

  const { data: parentEvent } = tournament.event_id
    ? await supabase.from("events").select("id, name").eq("id", tournament.event_id).single()
    : { data: null };

  const { data: clubMembers } = tournament.club_id
    ? await supabase
        .from("club_members")
        .select("user_id, profiles!club_members_user_id_fkey(pseudo)")
        .eq("club_id", tournament.club_id)
    : { data: null };

  const allPlayers = players ?? [];
  const allAdmins = admins ?? [];
  const levels = blindLevels ?? [];
  const pendingInvitations = invitations ?? [];
  const pendingRequests = joinRequests ?? [];

  const isOrganizer = tournament.created_by === user.id;
  const isCoAdmin = allAdmins.some((a) => a.user_id === user.id);
  const canManage = isOrganizer || isCoAdmin;

  const isRegistered = allPlayers.some((p) => p.player_id === user.id);
  const myInvitation = pendingInvitations.find((i) => i.invited_user_id === user.id);
  const myRequest = pendingRequests.find((r) => r.requester_id === user.id);
  const invitableClubMembers = (clubMembers ?? []).filter(
    (m) =>
      !allPlayers.some((p) => p.player_id === m.user_id) &&
      !pendingInvitations.some((i) => i.invited_user_id === m.user_id),
  );
  const active = allPlayers.filter((p) => p.status === "inscrit");
  const finished = allPlayers
    .filter((p) => p.status !== "inscrit")
    .sort((a, b) => (a.place ?? 0) - (b.place ?? 0));
  const enoughActivePlayers = active.length >= tournament.min_players;
  const allActivePaid = active.length > 0 && active.every((p) => p.buy_in_paid);

  /* Mêmes calculs que sur la fiche d'une structure : le cumul se lit
   * « à la fin de ce niveau », donc la dernière ligne vaut la durée
   * totale annoncée au-dessus du tableau. */
  const levelsWithElapsed = withElapsed(levels);
  const { total: structureTotal, play: structurePlay } = structureTotals(levels);

  const currentLevel = levels.find((l) => l.level_number === tournament.current_level);
  const paidCount = allPlayers.filter((p) => p.buy_in_paid).length;
  const rebuysTotal = allPlayers.reduce((sum, p) => sum + p.rebuys_count, 0);
  const addonsTotal = allPlayers.filter((p) => p.addon_used).length;
  const prizePool =
    paidCount * tournament.buy_in +
    rebuysTotal * (tournament.rebuy_price ?? 0) +
    addonsTotal * (tournament.addon_price ?? 0) +
    (tournament.guarantee_amount ?? 0);
  const payoutByPlace = new Map((payouts ?? []).map((p) => [p.place, p.percentage]));

  function invested(p: { buy_in_paid: boolean; rebuys_count: number; addon_used: boolean }) {
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
  const canJoin =
    tournament.status === "inscription" ||
    (tournament.status === "en_cours" && tournament.late_registration_enabled);

  return (
    <main className="page page-console">
      {erreur && (
        <p className="card text-sm text-danger" role="alert">
          {erreur}
        </p>
      )}

      {tournament.banner_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={tournament.banner_url}
          alt=""
          className="h-40 w-full rounded-lg border border-line object-cover sm:h-56"
        />
      )}

      <div className="hero-card flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {tournament.chip_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tournament.chip_image_url}
                alt=""
                className="h-14 w-14 shrink-0 rounded-full border-2 object-cover"
                style={{ borderColor: "var(--gold-line)" }}
              />
            )}
            <h1 className="min-w-0 wrap-anywhere text-2xl font-semibold">{tournament.name}</h1>
          </div>
          <StatutBadge status={tournament.status} />
        </div>
        {parentEvent && (
          <Link href={`/evenements/${parentEvent.id}`} className="link link-action text-sm w-fit">
            ↑ Fait partie de : {parentEvent.name}
          </Link>
        )}

        {tournament.description && (
          <p className="text-sm text-ink-soft">
            <FormattedText text={tournament.description} />
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <span className="chip">👤 Organisé par {organizer?.pseudo ?? "—"}</span>
          <span className="chip">
            👥 {tournament.min_players} à {tournament.max_players ?? "∞"} joueurs
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="chip chip-money">💶 Buy-in {tournament.buy_in} €</span>
          <span className="chip chip-money">🎰 {tournament.starting_stack} jetons</span>
        </div>

        {(tournament.rebuy_enabled ||
          tournament.addon_enabled ||
          tournament.bounty_enabled ||
          tournament.guarantee_amount) && (
          <div className="flex flex-wrap gap-2">
            {tournament.rebuy_enabled && (
              <span className="badge">
                Recave {tournament.rebuy_price}€ → {tournament.rebuy_chips} jetons
                {tournament.rebuy_max_per_player ? ` (max ${tournament.rebuy_max_per_player})` : ""}
              </span>
            )}
            {tournament.addon_enabled && (
              <span className="badge">
                Add-on {tournament.addon_price}€ → {tournament.addon_chips} jetons
              </span>
            )}
            {tournament.bounty_enabled && (
              <span className="badge">
                Bounty {tournament.bounty_amount}€{tournament.bounty_progressive ? " (progressif)" : ""}
              </span>
            )}
            {tournament.guarantee_amount && (
              <span className="badge">Garantie {tournament.guarantee_amount}€</span>
            )}
          </div>
        )}

        {(tournament.scheduled_at || tournament.location) && (
          <div className="flex flex-col gap-2 border-t border-line pt-3">
            {tournament.scheduled_at && (
              <span className="chip chip-date w-fit">
                📅{" "}
                {new Date(tournament.scheduled_at).toLocaleString("fr-FR", {
                  timeZone: "Europe/Paris",
                  dateStyle: "long",
                  timeStyle: "short",
                })}
              </span>
            )}
            {tournament.location && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm text-ink-soft">
                  📍 {tournament.location}
                </span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tournament.location)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ext-link"
                >
                  Voir sur Google Maps ↗
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sur un portable, la colonne unique oblige à faire défiler entre
        * l'horloge et la liste des joueurs alors qu'on a besoin des deux en
        * même temps. Au-delà de 80rem la page se scinde : à gauche ce qui se
        * pilote, à droite ce qui se consulte. */}
      <div className="console-grid">
        <div className="console-col">
        {tournament.status === "en_cours" && currentLevel && (
          <div className="clock-tile">
            <p className="eyebrow">
              Niveau {currentLevel.level_number} ·{" "}
              {tournament.clock_status === "paused" ? "En pause" : "En cours"}
            </p>
            {currentLevel.is_break ? (
              <p className="text-xl font-semibold">Pause ({currentLevel.duration_minutes} min)</p>
            ) : (
              <p className="text-xl font-semibold">
                {currentLevel.small_blind} / {currentLevel.big_blind}
                {currentLevel.ante > 0 ? ` (ante ${currentLevel.ante})` : ""}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/tournois/${tournament.id}/affichage`} target="_blank" className="ext-link">
                Ouvrir l&apos;écran d&apos;affichage ↗
              </Link>
              <Link href={`/tournois/${tournament.id}/tables`} className="ext-link">
                Voir les tables ↗
              </Link>
            </div>

            {canManage && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <form action={previousLevel.bind(null, tournament.id)}>
                  <button type="submit" className="btn btn-secondary btn-sm">
                    Niveau -
                  </button>
                </form>
                <form action={nextLevel.bind(null, tournament.id)}>
                  <button type="submit" className="btn btn-secondary btn-sm">
                    Niveau +
                  </button>
                </form>
                {tournament.clock_status === "paused" ? (
                  <form action={resumeClock.bind(null, tournament.id)}>
                    <button type="submit" className="btn btn-primary btn-sm">
                      Reprendre
                    </button>
                  </form>
                ) : (
                  <form action={pauseClock.bind(null, tournament.id)}>
                    <button type="submit" className="btn btn-primary btn-sm">
                      Pause
                    </button>
                  </form>
                )}
              </div>
            )}

            {canManage && (
              <form
                action={addPlayerByPseudo.bind(null, tournament.id)}
                className="mt-3 flex items-center gap-2 border-t border-line pt-3"
              >
                <PseudoAutocomplete name="pseudo" placeholder="Pseudo à inscrire" />
                <button type="submit" className="btn btn-secondary btn-sm">
                  + Joueur
                </button>
              </form>
            )}

            {canManage && (
              <details className="mt-3 border-t border-line pt-3 text-sm">
                <summary className="cursor-pointer font-medium text-ink-soft">
                  Personnaliser l&apos;écran d&apos;affichage
                </summary>
                <DisplayConfigForm tournamentId={tournament.id} config={tournament.display_config} />
              </details>
            )}
          </div>
        )}

        {canJoin && !isRegistered && (
          <div className="card">
            {myInvitation ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm">Tu as été invité à ce tournoi.</p>
                <div className="flex gap-2">
                  <form action={respondToInvitation.bind(null, myInvitation.id, true)}>
                    <button type="submit" className="btn btn-primary btn-sm">
                      Accepter
                    </button>
                  </form>
                  <form action={respondToInvitation.bind(null, myInvitation.id, false)}>
                    <button type="submit" className="btn btn-secondary btn-sm">
                      Refuser
                    </button>
                  </form>
                </div>
              </div>
            ) : myRequest ? (
              <p className="text-sm text-ink-soft">
                Demande envoyée, en attente de validation par l&apos;organisateur.
              </p>
            ) : (
              <form action={requestToJoinTournament.bind(null, tournament.id)}>
                <button type="submit" className="btn btn-primary w-full">
                  Demander à participer
                </button>
              </form>
            )}
          </div>
        )}

        {canManage && canJoin && (
          <div className="card section-manage flex flex-col gap-3">
            <p className="section-eyebrow">
              <span className="dot" />
              Gestion — invitations &amp; demandes
            </p>

            <form action={inviteToTournament.bind(null, tournament.id)} className="flex items-center gap-2">
              <PseudoAutocomplete name="pseudo" placeholder="Pseudo à inviter" />
              <button type="submit" className="btn btn-secondary btn-sm">
                Inviter
              </button>
            </form>

            {tournament.club_id && invitableClubMembers.length > 0 && (
              <form
                action={inviteClubMembers.bind(null, tournament.id)}
                className="flex flex-col gap-2 border-t border-line pt-3"
              >
                <p className="eyebrow">Membres du club</p>
                {invitableClubMembers.map((m) => (
                  <label key={m.user_id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="member_id" value={m.user_id} />
                    {getPseudo(m)}
                  </label>
                ))}
                <button type="submit" className="btn btn-secondary btn-sm w-fit">
                  Inviter la sélection
                </button>
              </form>
            )}

            {pendingRequests.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="eyebrow">Demandes en attente</p>
                {pendingRequests.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <span>{getPseudo(r)}</span>
                    <div className="flex gap-2">
                      <form action={respondToJoinRequest.bind(null, r.id, true)}>
                        <button type="submit" className="pill-btn pill-approve">
                          Approuver
                        </button>
                      </form>
                      <form action={respondToJoinRequest.bind(null, r.id, false)}>
                        <button type="submit" className="pill-btn pill-reject">
                          Refuser
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pendingInvitations.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="eyebrow">Invitations envoyées</p>
                {pendingInvitations.map((i) => (
                  <div key={i.id} className="flex items-center justify-between text-sm">
                    <span>{getPseudo(i)}</span>
                    <form action={cancelInvitation.bind(null, i.id, tournament.id)}>
                      <button type="submit" className="link-danger">
                        Annuler
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tournament.status === "inscription" && canManage && (
          <form action={prepareTournamentSeating.bind(null, tournament.id)}>
            <button
              type="submit"
              disabled={!enoughActivePlayers || !allActivePaid}
              className="btn btn-primary w-full"
            >
              Démarrer le tournoi
            </button>
            {!enoughActivePlayers && (
              <p className="mt-1 text-xs text-ink-faint">
                Il faut au moins {tournament.min_players} joueurs inscrits.
              </p>
            )}
            {enoughActivePlayers && !allActivePaid && (
              <p className="mt-1 text-xs text-ink-faint">
                Tous les buy-ins doivent être payés avant de démarrer.
              </p>
            )}
          </form>
        )}

        <div>
          <h2 className="mb-2 font-semibold">Joueurs en jeu ({active.length})</h2>
          <ul className="flex flex-col gap-2">
            {active.map((p) => (
              <li key={p.player_id} className="card flex flex-col gap-2 py-3">
                <div className="flex items-center justify-between">
                  <Link href={`/joueurs/${p.player_id}`} className="flex items-center gap-2">
                    {getAvatarUrl(p) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getAvatarUrl(p)!}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded-full border border-line object-cover"
                      />
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-xs font-medium text-ink-soft">
                        {getPseudo(p).slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="link font-medium">{getPseudo(p)}</span>
                  </Link>
                  <span className="text-sm text-ink-soft">
                    {p.stack ?? tournament.starting_stack} jetons
                    {p.rebuys_count > 0 ? ` · ${p.rebuys_count} recave(s)` : ""}
                    {p.addon_used ? " · add-on" : ""}
                    {tournament.bounty_enabled && p.bounty_cash_won > 0
                      ? ` · +${p.bounty_cash_won}€ bounty`
                      : ""}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  {p.buy_in_paid ? (
                    <span className="badge badge-success">Buy-in payé</span>
                  ) : (
                    <span className="badge">Buy-in non payé</span>
                  )}
                  {canManage && (
                    <form action={toggleBuyInPaid.bind(null, tournament.id, p.player_id)}>
                      <button type="submit" className="link text-xs">
                        {p.buy_in_paid ? "Marquer non payé" : "Marquer payé"}
                      </button>
                    </form>
                  )}
                </div>

                {tournament.status === "en_cours" && canManage && (
                  <div className="flex flex-wrap items-center gap-3 border-t border-line pt-2 text-sm">
                    {tournament.rebuy_enabled && (
                      <ConfirmButton
                        label="Recave"
                        confirmLabel="Valider la recave"
                        message={`Valider l'achat d'une recave pour ${getPseudo(p)} ?`}
                        disabled={
                          (tournament.rebuy_max_per_player !== null &&
                            p.rebuys_count >= tournament.rebuy_max_per_player) ||
                          (tournament.rebuy_stack_threshold !== null &&
                            (p.stack ?? 0) > tournament.rebuy_stack_threshold) ||
                          (tournament.rebuy_until_level !== null &&
                            tournament.current_level > tournament.rebuy_until_level)
                        }
                        onConfirm={rebuyPlayer.bind(null, tournament.id, p.player_id)}
                        className="btn btn-success btn-sm"
                      />
                    )}
                    {tournament.addon_enabled && (
                      <ConfirmButton
                        label="Add-on"
                        confirmLabel="Valider l'add-on"
                        message={`Valider l'achat d'un add-on pour ${getPseudo(p)} ?`}
                        disabled={
                          p.addon_used ||
                          (tournament.addon_at_level !== null &&
                            tournament.current_level < tournament.addon_at_level)
                        }
                        onConfirm={addOnPlayer.bind(null, tournament.id, p.player_id)}
                        className="btn btn-success btn-sm"
                      />
                    )}
                    <form
                      action={eliminatePlayer.bind(null, tournament.id, p.player_id)}
                      className="flex items-center gap-2"
                    >
                      <select name="eliminated_by" required className="input" defaultValue="">
                        <option value="" disabled>
                          Éliminé par...
                        </option>
                        {active
                          .filter((other) => other.player_id !== p.player_id)
                          .map((other) => (
                            <option key={other.player_id} value={other.player_id}>
                              {getPseudo(other)}
                            </option>
                          ))}
                      </select>
                      <button type="submit" className="pill-btn pill-reject">
                        Valider l&apos;élimination
                      </button>
                    </form>
                  </div>
                )}
              </li>
            ))}
            {active.length === 0 && (
              <div className="card flex flex-col items-center gap-3 py-12 text-center">
                <span className="tile-icon tile-icon-success text-2xl">👥</span>
                <p className="text-sm text-ink-soft">
                  Aucun joueur inscrit pour l&apos;instant.
                  {canManage && canJoin ? " Invite des joueurs ci-dessus pour démarrer." : ""}
                </p>
              </div>
            )}
          </ul>
        </div>

        {finished.length > 0 && (
          <div>
            <h2 className="mb-2 font-semibold">Classement</h2>
            <ol className="flex flex-col gap-2">
              {finished.map((p) => {
                const gain = payoutGain(p.place) + (tournament.bounty_enabled ? p.bounty_cash_won : 0);
                const cost = invested(p);
                const eliminatorPseudo = getEliminatorPseudo(p);
                return (
                  <li key={p.player_id} className="card flex flex-col gap-1 py-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-ink-faint">#{p.place}</span>
                        <Link href={`/joueurs/${p.player_id}`} className="flex items-center gap-2">
                          {getAvatarUrl(p) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getAvatarUrl(p)!}
                              alt=""
                              className="h-7 w-7 shrink-0 rounded-full border border-line object-cover"
                            />
                          ) : (
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-xs font-medium text-ink-soft">
                              {getPseudo(p).slice(0, 1).toUpperCase()}
                            </span>
                          )}
                          <span className="link">{getPseudo(p)}</span>
                        </Link>
                        {p.status === "vainqueur" && <span>🏆</span>}
                      </div>
                      <span className="text-sm text-ink-soft">
                        Investi {cost}€{gain > 0 ? ` · Gagné ${gain}€` : ""}
                      </span>
                    </div>
                    {eliminatorPseudo && (
                      <p className="text-xs text-ink-faint">Éliminé par {eliminatorPseudo}</p>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        )}
        </div>

        <div className="console-col">
        {payouts && payouts.length > 0 && (
          <div className="card section-money">
            <p className="section-eyebrow">
              <span className="dot" />
              Cagnotte
            </p>
            <h2 className="text-3xl font-semibold" style={{ color: "var(--gold-strong)" }}>
              {prizePool.toLocaleString("fr-FR")} €
            </h2>
            <p className="mb-3 mt-1 text-xs text-ink-faint">
              {paidCount} buy-in{paidCount > 1 ? "s" : ""} payé{paidCount > 1 ? "s" : ""} sur{" "}
              {allPlayers.length} inscrit{allPlayers.length > 1 ? "s" : ""}
            </p>
            <ul className="flex flex-wrap gap-2 text-sm">
              {payouts.map((p) => (
                <li key={p.place} className="badge">
                  {ordinal(p.place)} : {Math.round((prizePool * p.percentage) / 100).toLocaleString("fr-FR")} €
                  <span className="text-ink-faint"> ({p.percentage}%)</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {levels.length > 0 && (
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Structure de blindes</h2>
              <div className="flex flex-wrap gap-2">
                <span className="chip chip-money">⌛ Durée {formatDuration(structureTotal)}</span>
                <span className="chip chip-money">▶ Jeu {formatDuration(structurePlay)}</span>
              </div>
            </div>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-line text-left text-ink-soft">
                    <th className="py-1 pr-2">#</th>
                    <th className="py-1 pr-2">SB</th>
                    <th className="py-1 pr-2">BB</th>
                    <th className="py-1 pr-2">Ante</th>
                    <th className="py-1 pr-2">Durée</th>
                    <th className="py-1 pr-2 whitespace-nowrap">Temps cumulé</th>
                  </tr>
                </thead>
                <tbody>
                  {levelsWithElapsed.map((l) => {
                    /* Pendant le tournoi, le niveau en cours est mis en
                     * avant : c'est ce qui rend la colonne cumulée utile
                     * en pleine partie — on voit d'un coup où on en est. */
                    const isCurrent =
                      tournament.status === "en_cours" &&
                      l.level_number === tournament.current_level;
                    return (
                      <tr
                        key={l.level_number}
                        className={`border-b border-line/60 last:border-0${
                          isCurrent ? " bg-surface-2 font-medium text-ink" : ""
                        }`}
                      >
                        <td className="py-1 pr-2">
                          {isCurrent && <span className="mr-1 text-accent-strong">▸</span>}
                          {l.level_number}
                        </td>
                        {l.is_break ? (
                          <td className="py-1 pr-2 text-ink-faint" colSpan={3}>
                            Pause
                          </td>
                        ) : (
                          <>
                            <td className="py-1 pr-2">{l.small_blind}</td>
                            <td className="py-1 pr-2">{l.big_blind}</td>
                            <td className="py-1 pr-2">{l.ante}</td>
                          </>
                        )}
                        <td className="py-1 pr-2">{l.duration_minutes} min</td>
                        <td className="py-1 pr-2 whitespace-nowrap text-ink-soft">
                          {formatDuration(l.elapsed)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {chipRack && chipRack.length > 0 && (
          <div>
            <h2 className="mb-2 font-semibold">Jetons en jeu{chipSet ? ` — ${chipSet.name}` : ""}</h2>
            <ul className="card flex flex-wrap gap-2 text-sm">
              {chipRack
                .map((r) => ({ quantity: r.quantity, ...getDenomination(r) }))
                .sort((a, b) => a.value - b.value)
                .map((r, i) => (
                  <li key={i} className="badge">
                    {r.quantity} × {r.color} ({r.value})
                  </li>
                ))}
            </ul>
          </div>
        )}

        <div>
          <h2 className="mb-2 font-semibold">Administrateurs</h2>
          <ul className="card flex flex-col gap-1.5 text-sm">
            <li>Organisateur : {organizer?.pseudo ?? "—"}</li>
            {allAdmins.map((a) => (
              <li key={a.user_id} className="flex items-center justify-between">
                <span>Co-administrateur : {getPseudo(a)}</span>
                {isOrganizer && (
                  <form action={removeCoAdmin.bind(null, tournament.id, a.user_id)}>
                    <button type="submit" className="link-danger">
                      Retirer
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          {isOrganizer && (
            <form
              action={addCoAdmin.bind(null, tournament.id)}
              className="mt-2 flex items-center gap-2"
            >
              <PseudoAutocomplete name="pseudo" placeholder="Pseudo à nommer co-admin" />
              <button type="submit" className="btn btn-secondary btn-sm">
                Ajouter
              </button>
            </form>
          )}
        </div>

        {tournament.status === "inscription" && canManage && (
          <div className="flex items-center justify-between">
            <Link href={`/tournois/${tournament.id}/modifier`} className="link link-action text-sm">
              Modifier le tournoi
            </Link>
            {isOrganizer && <DeleteTournamentButton tournamentId={tournament.id} />}
          </div>
        )}
        {tournament.status !== "inscription" && isOrganizer && (
          <div>
            <DeleteTournamentButton tournamentId={tournament.id} />
          </div>
        )}

        {canManage && (
          <div className="card flex flex-col gap-2">
            <h2 className="font-semibold">Dupliquer ce tournoi</h2>
            <p className="text-sm text-ink-soft">
              Crée un nouveau tournoi avec la même configuration (buy-in, structure de blindes,
              recave, add-on, répartition des gains...). Le nom, le lieu, la date et la description
              seront à renseigner.
            </p>
            <div className="flex flex-wrap gap-2">
              <form action={duplicateTournament.bind(null, tournament.id, true)}>
                <button type="submit" className="btn btn-secondary btn-sm">
                  Dupliquer avec les mêmes joueurs
                </button>
              </form>
              <form action={duplicateTournament.bind(null, tournament.id, false)}>
                <button type="submit" className="btn btn-secondary btn-sm">
                  Dupliquer sans les joueurs
                </button>
              </form>
            </div>
          </div>
        )}
        </div>
      </div>
    </main>
  );
}

function DisplayConfigForm({
  tournamentId,
  config,
}: {
  tournamentId: string;
  config: DisplayConfig;
}) {
  const fields: { name: keyof DisplayConfig; label: string }[] = [
    { name: "show_entries", label: "Entrées" },
    { name: "show_players_remaining", label: "Joueurs restants" },
    { name: "show_rebuys", label: "Recaves" },
    { name: "show_addons", label: "Add-ons" },
    { name: "show_chip_count", label: "Total des jetons" },
    { name: "show_average_stack", label: "Tapis moyen" },
    { name: "show_prize_pool", label: "Prize pool" },
    { name: "show_next_break", label: "Prochaine pause" },
    { name: "show_time_left", label: "Fin prévue" },
    { name: "show_payouts", label: "Répartition des gains" },
  ];

  return (
    <form
      action={updateDisplayConfig.bind(null, tournamentId)}
      className="mt-2 flex flex-col gap-2"
    >
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-ink-soft">Titre personnalisé <span className="font-normal text-ink-faint">optionnel</span></span>
        <input
          name="title"
          type="text"
          defaultValue={config.title ?? ""}
          className="input"
        />
      </label>

      <div className="grid grid-cols-2 gap-1">
        {fields.map((f) => (
          <label key={f.name} className="flex items-center gap-2 text-sm">
            {/* ?? true : une option ajoutée après coup est absente des
              * tournois plus anciens. L'écran l'affiche par défaut, la
              * case doit dire la même chose — sinon un simple
              * enregistrement la désactiverait sans qu'on l'ait voulu. */}
            <input
              type="checkbox"
              name={f.name}
              defaultChecked={(config[f.name] as boolean | undefined) ?? true}
            />
            {f.label}
          </label>
        ))}
      </div>

      <button type="submit" className="btn btn-secondary btn-sm mt-1 self-start">
        Enregistrer
      </button>
    </form>
  );
}
