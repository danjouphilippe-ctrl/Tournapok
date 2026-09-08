import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";

export default async function EvenementsPage() {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) redirect("/connexion");

  const { data: events } = await supabase
    .from("events")
    .select("id, name, logo_url, location, scheduled_at, created_by")
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  const creatorIds = [...new Set((events ?? []).map((e) => e.created_by))];
  const { data: creators } = await supabase
    .from("profiles")
    .select("id, pseudo")
    .in("id", creatorIds.length > 0 ? creatorIds : ["00000000-0000-0000-0000-000000000000"]);
  const creatorPseudoById = new Map((creators ?? []).map((c) => [c.id, c.pseudo]));

  const eventIds = (events ?? []).map((e) => e.id);
  const { data: tournamentCounts } = await supabase
    .from("tournaments")
    .select("event_id")
    .in("event_id", eventIds.length > 0 ? eventIds : ["00000000-0000-0000-0000-000000000000"]);
  const countByEvent = new Map<string, number>();
  for (const t of tournamentCounts ?? []) {
    if (!t.event_id) continue;
    countByEvent.set(t.event_id, (countByEvent.get(t.event_id) ?? 0) + 1);
  }

  return (
    <main className="page page-list">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Évènements</h1>
        <Link href="/evenements/nouveau" className="btn btn-primary btn-sm">
          + Nouveau
        </Link>
      </div>

      {!events || events.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-14 text-center">
          <span className="tile-icon tile-icon-accent text-2xl">📅</span>
          <p className="text-sm text-ink-soft">Aucun évènement pour l&apos;instant.</p>
          <Link href="/evenements/nouveau" className="btn btn-primary btn-sm">
            Créer le premier évènement
          </Link>
        </div>
      ) : (
        <ul className="list-grid">
          {events.map((e) => {
            const count = countByEvent.get(e.id) ?? 0;
            return (
              <li key={e.id}>
                <Link
                  href={`/evenements/${e.id}`}
                  className="card card-flush card-link flex h-full flex-col"
                >
                  {/* Le logo d'évènement est au format 2:1 : il fait office
                    * de bannière, comme celle d'un tournoi. */}
                  {e.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={e.logo_url}
                      alt=""
                      className="h-28 w-full shrink-0 object-cover sm:h-32"
                    />
                  ) : null}

                  <div className="flex flex-col gap-3 p-5">
                    <span className="wrap-anywhere font-medium">{e.name}</span>

                    <div className="flex flex-wrap gap-2">
                      <span className="chip">👤 {creatorPseudoById.get(e.created_by) ?? "—"}</span>
                      {e.scheduled_at && (
                        <span className="chip chip-date">
                          📅{" "}
                          {new Date(e.scheduled_at).toLocaleDateString("fr-FR", {
                            timeZone: "Europe/Paris",
                          })}
                        </span>
                      )}
                      {e.location && <span className="chip">📍 {e.location}</span>}
                    </div>

                    <div>
                      <span className="badge">
                        ♠ {count} tournoi{count > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
