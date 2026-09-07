import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { respondToInvitation, respondToJoinRequest } from "@/app/tournois/actions";
import { respondToClubJoinRequest } from "@/app/clubs/actions";
import { respondToEventInvitation } from "@/app/evenements/actions";

function getPseudo(row: { profiles: { pseudo: string }[] | { pseudo: string } | null }) {
  const profiles = row.profiles;
  if (!profiles) return "Quelqu'un";
  return Array.isArray(profiles) ? (profiles[0]?.pseudo ?? "Quelqu'un") : profiles.pseudo;
}

function getNom(row: { [k: string]: unknown }, cle: string) {
  const rel = row[cle] as { name: string }[] | { name: string } | null;
  if (!rel) return "—";
  return Array.isArray(rel) ? (rel[0]?.name ?? "—") : rel.name;
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  /* Les politiques d'accès des deux tables de demandes renvoient aussi
   * mes propres demandes en attente. On les exclut : ce sont des choses
   * que j'attends, pas des choses que j'ai à traiter. */
  const [
    { data: invitations },
    { data: invitationsEvenement },
    { data: demandesTournoi },
    { data: demandesClub },
  ] = await Promise.all([
      supabase
        .from("tournament_invitations")
        .select(
          "id, tournaments(id, name, buy_in, scheduled_at), profiles!tournament_invitations_invited_user_id_fkey(pseudo)",
        )
        .eq("invited_user_id", user.id)
        .eq("status", "pending"),
      supabase
        .from("event_invitations")
        .select("id, events(id, name, scheduled_at, location)")
        .eq("invited_user_id", user.id)
        .eq("status", "pending"),
      supabase
        .from("tournament_join_requests")
        .select(
          "id, tournaments(id, name), profiles!tournament_join_requests_requester_id_fkey(pseudo)",
        )
        .eq("status", "pending")
        .neq("requester_id", user.id),
      supabase
        .from("club_join_requests")
        .select("id, clubs(id, name), profiles!club_join_requests_requester_id_fkey(pseudo)")
        .eq("status", "pending")
        .neq("requester_id", user.id),
    ]);

  const mesInvitations = invitations ?? [];
  const mesInvitationsEvenement = invitationsEvenement ?? [];
  const aTraiter = [...(demandesTournoi ?? []), ...(demandesClub ?? [])];
  const rien =
    mesInvitations.length === 0 && mesInvitationsEvenement.length === 0 && aTraiter.length === 0;

  return (
    <main className="page">
      {erreur && (
        <p className="card text-sm text-danger" role="alert">
          {erreur}
        </p>
      )}

      <h1 className="text-2xl font-semibold">Notifications</h1>

      {rien && (
        <div className="card flex flex-col items-center gap-3 py-14 text-center">
          <span className="tile-icon tile-icon-success text-2xl">🔔</span>
          <p className="text-sm text-ink-soft">
            Rien qui t&apos;attende. Les invitations reçues et les demandes à traiter
            apparaîtront ici.
          </p>
        </div>
      )}

      {(mesInvitations.length > 0 || mesInvitationsEvenement.length > 0) && (
        <div className="card section-accent flex flex-col gap-4">
          <p className="section-eyebrow">
            <span className="dot" />
            Pour toi
          </p>
          {mesInvitations.map((inv) => {
            const t = Array.isArray(inv.tournaments) ? inv.tournaments[0] : inv.tournaments;
            if (!t) return null;
            return (
              <div
                key={inv.id}
                className="flex flex-col gap-2 border-t border-line pt-3 first:border-none first:pt-0"
              >
                <p className="text-sm text-ink-soft">
                  Tu es invité au tournoi{" "}
                  <Link href={`/tournois/${t.id}`} className="link font-medium">
                    {t.name}
                  </Link>
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="chip chip-money">💶 Buy-in {t.buy_in} €</span>
                  {t.scheduled_at && (
                    <span className="chip chip-date">
                      📅{" "}
                      {new Date(t.scheduled_at).toLocaleDateString("fr-FR", {
                        timeZone: "Europe/Paris",
                        dateStyle: "long",
                      })}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <form action={respondToInvitation.bind(null, inv.id, true)}>
                    <button type="submit" className="pill-btn pill-approve">
                      Accepter
                    </button>
                  </form>
                  <form action={respondToInvitation.bind(null, inv.id, false)}>
                    <button type="submit" className="pill-btn pill-reject">
                      Refuser
                    </button>
                  </form>
                </div>
              </div>
            );
          })}

          {mesInvitationsEvenement.map((inv) => {
            const e = Array.isArray(inv.events) ? inv.events[0] : inv.events;
            if (!e) return null;
            return (
              <div
                key={inv.id}
                className="flex flex-col gap-2 border-t border-line pt-3 first:border-none first:pt-0"
              >
                <p className="text-sm text-ink-soft">
                  Tu es invité à l&apos;évènement{" "}
                  <Link href={`/evenements/${e.id}`} className="link font-medium">
                    {e.name}
                  </Link>
                </p>
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
                <div className="flex flex-wrap items-center gap-2">
                  <form action={respondToEventInvitation.bind(null, inv.id, true)}>
                    <button type="submit" className="pill-btn pill-approve">
                      Accepter
                    </button>
                  </form>
                  <form action={respondToEventInvitation.bind(null, inv.id, false)}>
                    <button type="submit" className="pill-btn pill-reject">
                      Refuser
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {aTraiter.length > 0 && (
        <div className="card section-manage flex flex-col gap-4">
          <p className="section-eyebrow">
            <span className="dot" />
            À traiter
          </p>

          {(demandesTournoi ?? []).map((r) => {
            const t = Array.isArray(r.tournaments) ? r.tournaments[0] : r.tournaments;
            return (
              <div
                key={`t-${r.id}`}
                className="flex flex-col gap-2 border-t border-line pt-3 first:border-none first:pt-0"
              >
                <p className="text-sm text-ink-soft">
                  <span className="font-medium text-ink">{getPseudo(r)}</span> demande à rejoindre
                  le tournoi{" "}
                  <Link href={`/tournois/${t?.id ?? ""}`} className="link font-medium">
                    {getNom(r, "tournaments")}
                  </Link>
                </p>
                <div className="flex flex-wrap items-center gap-2">
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
            );
          })}

          {(demandesClub ?? []).map((r) => {
            const c = Array.isArray(r.clubs) ? r.clubs[0] : r.clubs;
            return (
              <div
                key={`c-${r.id}`}
                className="flex flex-col gap-2 border-t border-line pt-3 first:border-none first:pt-0"
              >
                <p className="text-sm text-ink-soft">
                  <span className="font-medium text-ink">{getPseudo(r)}</span> demande à rejoindre
                  le club{" "}
                  <Link href={`/clubs/${c?.id ?? ""}`} className="link font-medium">
                    {getNom(r, "clubs")}
                  </Link>
                </p>
                <div className="flex flex-wrap items-center gap-2">
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
            );
          })}
        </div>
      )}
    </main>
  );
}
