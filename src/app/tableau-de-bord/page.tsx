import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { respondToInvitation } from "@/app/tournois/actions";
import { StatutBadge } from "@/components/StatutBadge";
import { byDateAsc, isBeforeNow, isPastTournament } from "@/lib/clubAgenda";
import { recentFeed, type FeedItem } from "@/lib/dashboard";
import { dateTime, ordinal, shortDate } from "@/lib/format";

/* Les jointures de PostgREST renvoient tantôt un objet, tantôt un
 * tableau d'un élément selon la forme de la relation. */
function one<T>(rel: T[] | T | null): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

type Tournoi = {
  id: string;
  name: string;
  buy_in: number;
  status: string;
  scheduled_at: string | null;
  location: string | null;
  banner_url: string | null;
  chip_image_url: string | null;
  events: Evenement[] | Evenement | null;
};

type Evenement = {
  id: string;
  name: string;
  scheduled_at: string | null;
  location: string | null;
  logo_url: string | null;
};

export default async function TableauDeBordPage() {
  const supabase = await createClient();
  const user = await getUser();

  if (!user) {
    redirect("/connexion");
  }

  const [
    { data: profile },
    { data: invitations },
    { data: mesInscriptions },
    { data: invitationsEvenementAcceptees },
    { data: adhesions },
  ] = await Promise.all([
    supabase.from("profiles").select("pseudo, avatar_url").eq("id", user.id).single(),
    supabase
      .from("tournament_invitations")
      .select(
        "id, tournaments(id, name, buy_in, scheduled_at, location, events(name, location, scheduled_at))",
      )
      .eq("invited_user_id", user.id)
      .eq("status", "pending"),
    supabase
      .from("tournament_players")
      .select(
        "place, eliminated_at, tournaments(id, name, buy_in, status, scheduled_at, location, banner_url, chip_image_url, events(id, name, scheduled_at, location, logo_url))",
      )
      .eq("player_id", user.id),
    supabase
      .from("event_invitations")
      .select("id, events(id, name, scheduled_at, location, logo_url)")
      .eq("invited_user_id", user.id)
      .eq("status", "accepted"),
    supabase.from("club_members").select("club_id, clubs(id, name)").eq("user_id", user.id),
  ]);

  const pendingInvitations = invitations ?? [];
  const inscriptions = mesInscriptions ?? [];

  /* Ce à quoi je suis inscrit et qui n'est pas encore passé. */
  const mesTournois = inscriptions
    .map((i) => one(i.tournaments as Tournoi[] | Tournoi | null))
    .filter((t): t is Tournoi => t !== null);
  const tournoisAVenir = mesTournois
    .filter((t) => !isPastTournament(t))
    .sort(byDateAsc);

  /* Un évènement me concerne de deux façons : j'ai accepté une
   * invitation, ou je joue l'un de ses tournois. Les deux sources se
   * recoupent souvent, d'où la déduplication par identifiant. */
  const evenementsParId = new Map<string, Evenement>();
  for (const t of tournoisAVenir) {
    const e = one(t.events);
    if (e) evenementsParId.set(e.id, e);
  }
  for (const inv of invitationsEvenementAcceptees ?? []) {
    const e = one(inv.events as Evenement[] | Evenement | null);
    if (e) evenementsParId.set(e.id, e);
  }
  const evenementsAVenir = [...evenementsParId.values()]
    .filter((e) => !isBeforeNow(e.scheduled_at))
    .sort(byDateAsc);

  /* Actualités : ce qui bouge dans mes clubs, plus mes propres
   * résultats. Une seconde vague de requêtes, car il faut connaître mes
   * clubs avant de pouvoir demander ce qui s'y passe — deux allers-
   * retours désormais sans conséquence, base et serveur étant dans la
   * même région. */
  const clubNomParId = new Map<string, string>();
  for (const a of adhesions ?? []) {
    const c = one(a.clubs as { id: string; name: string }[] | { id: string; name: string } | null);
    if (c) clubNomParId.set(c.id, c.name);
  }
  const clubIds = [...clubNomParId.keys()];

  const [{ data: tournoisDesClubs }, { data: evenementsDesClubs }] =
    clubIds.length > 0
      ? await Promise.all([
          supabase
            .from("tournaments")
            .select("id, name, created_at, club_id")
            .in("club_id", clubIds)
            .order("created_at", { ascending: false })
            .limit(8),
          supabase
            .from("events")
            .select("id, name, created_at, club_id")
            .in("club_id", clubIds)
            .order("created_at", { ascending: false })
            .limit(8),
        ])
      : [{ data: null }, { data: null }];

  const actualites: FeedItem[] = [
    ...(tournoisDesClubs ?? []).map((t) => ({
      key: `t-${t.id}`,
      at: t.created_at,
      icon: "♠",
      text: `${clubNomParId.get(t.club_id ?? "") ?? "Un club"} a programmé « ${t.name} »`,
      href: `/tournois/${t.id}`,
    })),
    ...(evenementsDesClubs ?? []).map((e) => ({
      key: `e-${e.id}`,
      at: e.created_at,
      icon: "📅",
      text: `${clubNomParId.get(e.club_id ?? "") ?? "Un club"} a créé l'évènement « ${e.name} »`,
      href: `/evenements/${e.id}`,
    })),
    ...inscriptions
      .filter((i) => i.place !== null)
      .map((i) => {
        const t = one(i.tournaments as Tournoi[] | Tournoi | null);
        return {
          key: `r-${t?.id ?? i.place}`,
          at: i.eliminated_at,
          icon: i.place === 1 ? "🏆" : "🎯",
          text: `Tu as terminé ${ordinal(i.place as number)} de « ${t?.name ?? "un tournoi"} »`,
          href: t ? `/tournois/${t.id}` : "/tournois",
        };
      }),
  ];
  const fil = recentFeed(actualites);

  return (
    <main className="page page-console">
      <div className="hero-card flex items-center gap-4">
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt={profile.pseudo}
            className="h-14 w-14 shrink-0 rounded-full border-2 object-cover"
            style={{ borderColor: "var(--gold-line)" }}
          />
        ) : (
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 bg-surface-2 text-xl font-medium text-ink-soft"
            style={{ borderColor: "var(--gold-line)" }}
          >
            {(profile?.pseudo ?? user.email ?? "?").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold wrap-anywhere">
            Salut {profile?.pseudo ?? user.email}
          </h1>
          <p className="text-sm text-ink-soft wrap-anywhere">{user.email}</p>
        </div>
      </div>

      {pendingInvitations.length > 0 && (
        <div className="card section-accent flex flex-col gap-4">
          <p className="section-eyebrow">
            <span className="dot" />
            Invitations reçues
          </p>
          {pendingInvitations.map((inv) => {
            const t = one(inv.tournaments);
            if (!t) return null;
            const event = one(t.events);
            const scheduledAt = t.scheduled_at ?? event?.scheduled_at;
            const location = t.location ?? event?.location;
            return (
              <div
                key={inv.id}
                className="flex flex-col gap-2 border-t border-line pt-3 first:border-none first:pt-0"
              >
                <Link href={`/tournois/${t.id}`} className="link font-medium">
                  {t.name}
                </Link>
                <p className="text-sm text-ink-soft">
                  Buy-in {t.buy_in}€{scheduledAt && ` · ${dateTime(scheduledAt)}`}
                  {location && ` · 📍 ${location}`}
                  {event?.name && ` · ${event.name}`}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <form action={respondToInvitation.bind(null, inv.id, true)}>
                    <button type="submit" className="btn btn-primary btn-sm">
                      Accepter
                    </button>
                  </form>
                  <form action={respondToInvitation.bind(null, inv.id, false)}>
                    <button type="submit" className="btn btn-secondary btn-sm">
                      Refuser
                    </button>
                  </form>
                  <Link href={`/tournois/${t.id}`} className="link link-action text-sm">
                    Voir tous les détails
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="console-grid">
        <div className="console-col">
          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Mes prochains tournois</h2>
              <Link href="/tournois" className="link link-action text-sm">
                Tous les tournois
              </Link>
            </div>

            {tournoisAVenir.length === 0 ? (
              <div className="card flex flex-col items-center gap-3 py-10 text-center">
                <span className="tile-icon tile-icon-gold text-2xl">♠</span>
                <p className="text-sm text-ink-soft">
                  Tu n&apos;es inscrit à aucun tournoi à venir.
                </p>
                <Link href="/tournois" className="btn btn-primary btn-sm">
                  Trouver un tournoi
                </Link>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {tournoisAVenir.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/tournois/${t.id}`}
                      className="card card-flush card-link flex flex-col"
                    >
                      {t.banner_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.banner_url} alt="" className="h-24 w-full shrink-0 object-cover" />
                      ) : null}

                      <div className="flex flex-col gap-3 p-5">
                        <div className="flex items-center gap-3">
                          {t.chip_image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={t.chip_image_url}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-full border border-line object-cover"
                            />
                          ) : null}
                          <span className="min-w-0 wrap-anywhere font-medium">{t.name}</span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {t.scheduled_at && (
                            <span className="chip chip-date">📅 {dateTime(t.scheduled_at)}</span>
                          )}
                          <span className="chip chip-money">💶 Buy-in {t.buy_in} €</span>
                          {t.location && <span className="chip">📍 {t.location}</span>}
                        </div>

                        <div>
                          <StatutBadge status={t.status} />
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="console-col">
          {evenementsAVenir.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Mes prochains évènements</h2>
                <Link href="/evenements" className="link link-action text-sm">
                  Tous les évènements
                </Link>
              </div>

              <ul className="flex flex-col gap-3">
                {evenementsAVenir.map((e) => (
                  <li key={e.id}>
                    <Link href={`/evenements/${e.id}`} className="card card-link flex items-center gap-3">
                      {e.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={e.logo_url}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-full border border-line object-cover"
                        />
                      ) : (
                        <span className="tile-icon tile-icon-accent shrink-0">📅</span>
                      )}
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="wrap-anywhere font-medium">{e.name}</span>
                        <span className="text-sm text-ink-soft wrap-anywhere">
                          {e.scheduled_at ? dateTime(e.scheduled_at) : "Date à préciser"}
                          {e.location && ` · 📍 ${e.location}`}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Actualités</h2>

            {fil.length === 0 ? (
              <div className="card flex flex-col items-center gap-3 py-10 text-center">
                <span className="tile-icon tile-icon-teal text-2xl">📣</span>
                <p className="text-sm text-ink-soft">
                  Rien de neuf pour l&apos;instant. Rejoins un club pour suivre ses tournois et ses
                  évènements ici.
                </p>
                <Link href="/clubs" className="btn btn-secondary btn-sm">
                  Voir les clubs
                </Link>
              </div>
            ) : (
              <div className="card flex flex-col gap-3">
                {fil.map((a) => (
                  <Link
                    key={a.key}
                    href={a.href}
                    className="flex items-start gap-3 border-t border-line pt-3 first:border-none first:pt-0"
                  >
                    <span aria-hidden className="shrink-0 text-lg leading-6">
                      {a.icon}
                    </span>
                    <span className="min-w-0 flex-1 wrap-anywhere text-sm">{a.text}</span>
                    {a.at && (
                      <span className="shrink-0 text-xs text-ink-soft">{shortDate(a.at)}</span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
