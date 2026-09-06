import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addEventCoAdmin, removeEventCoAdmin } from "@/app/evenements/actions";
import { DeleteEventButton } from "@/components/DeleteEventButton";
import { PseudoAutocomplete } from "@/components/PseudoAutocomplete";
import { FormattedText } from "@/components/FormattedText";

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

function getPseudo(row: { profiles: { pseudo: string }[] | { pseudo: string } | null }) {
  const profiles = row.profiles;
  if (!profiles) return "—";
  return Array.isArray(profiles) ? (profiles[0]?.pseudo ?? "—") : profiles.pseudo;
}

export default async function EvenementPage({
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

  const { data: event } = await supabase.from("events").select("*").eq("id", id).single();
  if (!event) notFound();

  const [{ data: organizer }, { data: admins }, { data: tournaments }] = await Promise.all([
    supabase.from("profiles").select("pseudo").eq("id", event.created_by).single(),
    supabase
      .from("event_admins")
      .select("user_id, profiles!event_admins_user_id_fkey(pseudo)")
      .eq("event_id", id),
    supabase
      .from("tournaments")
      .select("id, name, buy_in, status, chip_image_url, min_players, max_players")
      .eq("event_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const tournamentIds = (tournaments ?? []).map((t) => t.id);
  const { data: playerRows } = await supabase
    .from("tournament_players")
    .select("tournament_id")
    .in("tournament_id", tournamentIds.length > 0 ? tournamentIds : ["00000000-0000-0000-0000-000000000000"]);
  const playerCountByTournament = new Map<string, number>();
  for (const p of playerRows ?? []) {
    playerCountByTournament.set(p.tournament_id, (playerCountByTournament.get(p.tournament_id) ?? 0) + 1);
  }

  const isOrganizer = event.created_by === user.id;
  const isCoAdmin = (admins ?? []).some((a) => a.user_id === user.id);
  const canManage = isOrganizer || isCoAdmin;

  return (
    <main className="page">
      {erreur && (
        <p className="card text-sm text-danger" role="alert">
          {erreur}
        </p>
      )}
      <div className="hero-card flex flex-col gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {event.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.logo_url}
              alt=""
              className="h-16 w-28 shrink-0 rounded-lg border border-line object-cover"
            />
          )}
          <h1 className="min-w-0 wrap-anywhere text-2xl font-semibold">{event.name}</h1>
        </div>
        {event.description && (
          <p className="text-sm text-ink-soft">
            <FormattedText text={event.description} />
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <span className="chip">👤 Organisé par {organizer?.pseudo ?? "—"}</span>
          {event.scheduled_at && (
            <span className="chip chip-date">
              📅{" "}
              {new Date(event.scheduled_at).toLocaleString("fr-FR", {
                timeZone: "Europe/Paris",
                dateStyle: "long",
                timeStyle: "short",
              })}
            </span>
          )}
          {event.max_players && <span className="chip">👥 Max {event.max_players} joueurs</span>}
        </div>

        {event.location && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
            <span className="flex items-center gap-2 text-sm text-ink-soft">📍 {event.location}</span>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ext-link"
            >
              Voir sur Google Maps ↗
            </a>
          </div>
        )}
      </div>

      {event.organisation && (
        <div className="card">
          <h2 className="mb-1 font-semibold">Organisation</h2>
          <p className="whitespace-pre-wrap text-sm text-ink-soft">
            <FormattedText text={event.organisation} />
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Tournois de l&apos;évènement</h2>
          {canManage && (
            <Link href={`/evenements/${event.id}/tournois/nouveau`} className="btn btn-secondary btn-sm">
              + Nouveau tournoi
            </Link>
          )}
        </div>

        {!tournaments || tournaments.length === 0 ? (
          <p className="text-sm text-ink-soft">Aucun tournoi pour l&apos;instant.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {tournaments.map((t) => {
              const count = playerCountByTournament.get(t.id) ?? 0;
              return (
                <li key={t.id}>
                  <Link
                    href={`/tournois/${t.id}`}
                    className="card card-link flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      {t.chip_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={t.chip_image_url}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-full border border-line object-cover"
                        />
                      ) : null}
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{t.name}</span>
                        <span className="text-sm text-ink-soft">
                          Buy-in {t.buy_in}€ · {count} joueur{count > 1 ? "s" : ""} inscrit
                          {count > 1 ? "s" : ""}
                          {t.max_players ? ` (max ${t.max_players})` : ""}
                        </span>
                      </div>
                    </div>
                    <StatutBadge status={t.status} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {canManage && (
        <div className="flex items-center justify-between">
          <Link href={`/evenements/${event.id}/modifier`} className="link text-sm">
            Modifier l&apos;évènement
          </Link>
          {isOrganizer && <DeleteEventButton eventId={event.id} />}
        </div>
      )}

      <div>
        <h2 className="mb-2 font-semibold">Administrateurs</h2>
        <ul className="card flex flex-col gap-1.5 text-sm">
          <li>Organisateur : {organizer?.pseudo ?? "—"}</li>
          {(admins ?? []).map((a) => (
            <li key={a.user_id} className="flex items-center justify-between">
              <span>Co-administrateur : {getPseudo(a)}</span>
              {isOrganizer && (
                <form action={removeEventCoAdmin.bind(null, event.id, a.user_id)}>
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
            action={addEventCoAdmin.bind(null, event.id)}
            className="mt-2 flex items-center gap-2"
          >
            <PseudoAutocomplete name="pseudo" placeholder="Pseudo à nommer co-admin" />
            <button type="submit" className="btn btn-secondary btn-sm">
              Ajouter
            </button>
          </form>
        )}
      </div>

      <Link href="/evenements" className="link text-sm">
        Retour aux évènements
      </Link>
    </main>
  );
}
