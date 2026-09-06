import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function EvenementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
    <main className="page">
      <div className="flex items-center justify-between">
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
        <ul className="flex flex-col gap-3">
          {events.map((e) => {
            const count = countByEvent.get(e.id) ?? 0;
            return (
              <li key={e.id}>
                <Link
                  href={`/evenements/${e.id}`}
                  className="card card-link flex items-center gap-3"
                >
                  {e.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={e.logo_url}
                      alt=""
                      className="h-14 w-24 shrink-0 rounded-lg border border-line object-cover"
                    />
                  ) : null}
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{e.name}</span>
                    <span className="text-sm text-ink-soft">
                      Par {creatorPseudoById.get(e.created_by) ?? "—"}
                      {e.location ? ` · 📍 ${e.location}` : ""}
                      {e.scheduled_at
                        ? ` · ${new Date(e.scheduled_at).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}`
                        : ""}
                      {" · "}
                      {count} tournoi{count > 1 ? "s" : ""}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Link href="/tableau-de-bord" className="link text-sm">
        Retour au tableau de bord
      </Link>
    </main>
  );
}
