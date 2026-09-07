import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  addClubMember,
  changeClubMemberRole,
  removeClubMember,
  requestToJoinClub,
  respondToClubJoinRequest,
} from "@/app/clubs/actions";
import { DeleteClubButton } from "@/components/DeleteClubButton";
import { PseudoAutocomplete } from "@/components/PseudoAutocomplete";
import { ClubMemberRoleSelect } from "@/components/ClubMemberRoleSelect";
import { FormattedText } from "@/components/FormattedText";

const ROLE_LABELS: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  treasurer: "Trésorier",
  member: "Membre",
};

function getPseudo(row: { profiles: { pseudo: string }[] | { pseudo: string } | null }) {
  const profiles = row.profiles;
  if (!profiles) return "—";
  return Array.isArray(profiles) ? (profiles[0]?.pseudo ?? "—") : profiles.pseudo;
}

/** Isolée du composant : un évènement sans date n'est jamais "passé"
 * (mieux vaut l'afficher que le perdre par erreur). */
function isBeforeNow(scheduledAt: string | null): boolean {
  return scheduledAt !== null && new Date(scheduledAt).getTime() < Date.now();
}

export default async function ClubPage({
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

  const { data: club } = await supabase.from("clubs").select("*").eq("id", id).single();
  if (!club) notFound();

  const [{ data: organizer }, { data: members }, { data: tournaments }, { data: events }, { data: joinRequests }] =
    await Promise.all([
      supabase.from("profiles").select("pseudo").eq("id", club.created_by).single(),
      supabase
        .from("club_members")
        .select("user_id, role, profiles!club_members_user_id_fkey(pseudo)")
        .eq("club_id", id)
        .order("role"),
      /* Bannières, logos, dates et buy-in : ce qui suit ne se contente
       * plus de lister des noms, il faut donner envie d'y aller. */
      supabase
        .from("tournaments")
        .select("id, name, status, visibility, banner_url, chip_image_url, scheduled_at, buy_in")
        .eq("club_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("events")
        .select("id, name, visibility, scheduled_at, logo_url, location")
        .eq("club_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("club_join_requests")
        .select("id, requester_id, status, profiles!club_join_requests_requester_id_fkey(pseudo)")
        .eq("club_id", id)
        .eq("status", "pending"),
    ]);

  const allMembers = members ?? [];
  const myMembership = allMembers.find((m) => m.user_id === user.id);
  const isOwner = club.created_by === user.id;
  const canManage = isOwner || myMembership?.role === "owner" || myMembership?.role === "admin";
  const pendingRequests = joinRequests ?? [];
  const myRequest = pendingRequests.find((r) => r.requester_id === user.id);

  const upcomingTournaments = (tournaments ?? []).filter((t) => t.status !== "termine");
  const pastTournaments = (tournaments ?? []).filter((t) => t.status === "termine");
  const upcomingEvents = (events ?? []).filter((e) => !isBeforeNow(e.scheduled_at));
  const pastEvents = (events ?? []).filter((e) => isBeforeNow(e.scheduled_at));

  return (
    <main className="page">
      {erreur && (
        <p className="card text-sm text-danger" role="alert">
          {erreur}
        </p>
      )}

      {club.banner_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={club.banner_url}
          alt=""
          className="h-40 w-full rounded-lg border border-line object-cover sm:h-56"
        />
      ) : null}

      <div className="hero-card flex flex-col gap-3 sm:flex-row sm:items-center">
        {club.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={club.logo_url}
            alt=""
            className="h-20 w-20 shrink-0 rounded-full border-2 object-cover"
            style={{ borderColor: "var(--gold-line)" }}
          />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <h1 className="wrap-anywhere text-2xl font-semibold">{club.name}</h1>
          {club.description && (
            <p className="wrap-anywhere text-sm text-ink-soft">
              <FormattedText text={club.description} />
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <span className="chip">👤 Créé par {organizer?.pseudo ?? "—"}</span>
            {club.location && <span className="chip">📍 {club.location}</span>}
            <span className="chip">
              👥 {allMembers.length} membre{allMembers.length > 1 ? "s" : ""}
            </span>
          </div>

          {/* Même traitement que sur la carte de la liste : la visibilité
            * occupe le créneau du statut, en badge et non en chip. */}
          <div>
            <span className={`badge${club.visibility === "public" ? " badge-success" : ""}`}>
              {club.visibility === "public" ? "🌐 Club public" : "🔒 Club privé"}
            </span>
          </div>
        </div>
      </div>

      {(club.legal_form || club.phone || club.email || club.address) && (
        <div className="card section-manage flex flex-col gap-1 text-sm text-ink-soft">
          <p className="section-eyebrow">
            <span className="dot" />
            Coordonnées
          </p>
          {club.legal_form && <p>{club.legal_form}</p>}
          {club.address && <p>📍 {club.address}</p>}
          {club.phone && <p>☎ {club.phone}</p>}
          {club.email && <p>✉ {club.email}</p>}
        </div>
      )}

      {(upcomingEvents.length > 0 || upcomingTournaments.length > 0) && (
        <div className="flex flex-col gap-3">
          <h2 className="font-semibold">À venir</h2>
          <ul className="flex flex-col gap-3">
            {upcomingEvents.map((e) => (
              <li key={`event-${e.id}`}>
                <Link
                  href={`/evenements/${e.id}`}
                  className="card card-flush card-link flex flex-col"
                >
                  {e.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={e.logo_url}
                      alt=""
                      className="h-28 w-full shrink-0 object-cover sm:h-36"
                    />
                  ) : null}
                  <div className="flex flex-col gap-3 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge badge-accent">Évènement</span>
                      <span className="wrap-anywhere font-medium">{e.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {e.scheduled_at && (
                        <span className="chip chip-date">
                          📅{" "}
                          {new Date(e.scheduled_at).toLocaleDateString("fr-FR", {
                            timeZone: "Europe/Paris",
                            dateStyle: "long",
                          })}
                        </span>
                      )}
                      {e.location && <span className="chip">📍 {e.location}</span>}
                    </div>
                  </div>
                </Link>
              </li>
            ))}

            {upcomingTournaments.map((t) => (
              <li key={`tournament-${t.id}`}>
                <Link
                  href={`/tournois/${t.id}`}
                  className="card card-flush card-link flex flex-col"
                >
                  {t.banner_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.banner_url}
                      alt=""
                      className="h-28 w-full shrink-0 object-cover sm:h-36"
                    />
                  ) : null}
                  <div className="flex flex-col gap-3 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge">Tournoi</span>
                      {t.chip_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={t.chip_image_url}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-full border border-line object-cover"
                        />
                      ) : null}
                      <span className="wrap-anywhere font-medium">{t.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {t.scheduled_at && (
                        <span className="chip chip-date">
                          📅{" "}
                          {new Date(t.scheduled_at).toLocaleDateString("fr-FR", {
                            timeZone: "Europe/Paris",
                            dateStyle: "long",
                          })}
                        </span>
                      )}
                      <span className="chip chip-money">💶 Buy-in {t.buy_in} €</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Le passé se consulte, il n'a pas à séduire : liste sobre. */}
      {(pastEvents.length > 0 || pastTournaments.length > 0) && (
        <div className="flex flex-col gap-2">
          <h2 className="font-semibold">Passés</h2>
          <ul className="card flex flex-col gap-1">
            {pastEvents.map((e) => (
              <li key={`event-${e.id}`}>
                <Link href={`/evenements/${e.id}`} className="link link-action text-sm">
                  {e.name}
                </Link>{" "}
                <span className="text-xs text-ink-faint">évènement</span>
              </li>
            ))}
            {pastTournaments.map((t) => (
              <li key={`tournament-${t.id}`}>
                <Link href={`/tournois/${t.id}`} className="link link-action text-sm">
                  {t.name}
                </Link>{" "}
                <span className="text-xs text-ink-faint">tournoi</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {club.visibility === "public" && !myMembership && (
        <div className="card">
          {myRequest ? (
            <p className="text-sm text-ink-soft">
              Demande envoyée, en attente de validation par l&apos;organisateur.
            </p>
          ) : (
            <form action={requestToJoinClub.bind(null, id)}>
              <button type="submit" className="btn btn-primary w-full">
                Rejoindre le club
              </button>
            </form>
          )}
        </div>
      )}

      {canManage && pendingRequests.length > 0 && (
        <div className="card section-manage flex flex-col gap-2">
          <p className="section-eyebrow">
            <span className="dot" />
            Demandes d&apos;adhésion en attente
          </p>
          {pendingRequests.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-sm">
              <span>{getPseudo(r)}</span>
              <div className="flex gap-2">
                <form action={respondToClubJoinRequest.bind(null, r.id, true)}>
                  <button type="submit" className="pill-btn pill-approve">
                    Approuver
                  </button>
                </form>
                <form action={respondToClubJoinRequest.bind(null, r.id, false)}>
                  <button type="submit" className="pill-btn pill-reject">
                    Refuser
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card flex flex-col gap-3">
        <h2 className="font-semibold">Membres ({allMembers.length})</h2>
        <ul className="flex flex-col gap-2">
          {allMembers.map((m) => (
            <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>{getPseudo(m)}</span>
              <div className="flex items-center gap-2">
                {canManage && m.role !== "owner" ? (
                  <ClubMemberRoleSelect
                    action={changeClubMemberRole.bind(null, id, m.user_id)}
                    defaultRole={m.role}
                  />
                ) : (
                  <span className="text-xs text-ink-faint">{ROLE_LABELS[m.role] ?? m.role}</span>
                )}
                {(canManage || m.user_id === user.id) && m.role !== "owner" && (
                  <form action={removeClubMember.bind(null, id, m.user_id)}>
                    <button type="submit" className="link-danger link-action text-xs">
                      {m.user_id === user.id ? "Quitter" : "Retirer"}
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>

        {canManage && (
          <form
            action={addClubMember.bind(null, id)}
            className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-3"
          >
            <PseudoAutocomplete name="pseudo" placeholder="Pseudo à ajouter" />
            <select name="role" defaultValue="member" className="input py-1 text-sm">
              <option value="member">Membre</option>
              <option value="treasurer">Trésorier</option>
              <option value="admin">Administrateur</option>
            </select>
            <button type="submit" className="btn btn-secondary btn-sm">
              Ajouter
            </button>
          </form>
        )}
      </div>

      {canManage && (
        <div className="flex items-center gap-3">
          <Link href={`/clubs/${id}/modifier`} className="link link-action text-sm">
            Modifier le club
          </Link>
          {isOwner && <DeleteClubButton clubId={id} />}
        </div>
      )}

      <Link href="/clubs" className="link link-action text-sm">
        Retour aux clubs
      </Link>
    </main>
  );
}
