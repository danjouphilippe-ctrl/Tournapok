import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";
import { respondToInvitation } from "@/app/tournois/actions";

export default async function TableauDeBordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion");
  }

  const [{ data: profile }, { data: invitations }] = await Promise.all([
    supabase.from("profiles").select("pseudo, avatar_url").eq("id", user.id).single(),
    supabase
      .from("tournament_invitations")
      .select(
        "id, tournaments(id, name, buy_in, scheduled_at, location, events(name, location, scheduled_at))",
      )
      .eq("invited_user_id", user.id)
      .eq("status", "pending"),
  ]);

  const pendingInvitations = invitations ?? [];

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4 py-12">
      <div className="flex items-center gap-3">
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt={profile.pseudo}
            className="h-12 w-12 rounded-full border border-line object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface-2 text-lg font-medium text-ink-soft">
            {(profile?.pseudo ?? user.email ?? "?").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-xl font-semibold">Salut {profile?.pseudo ?? user.email}</h1>
          <p className="text-sm text-ink-soft">{user.email}</p>
        </div>
      </div>

      {pendingInvitations.length > 0 && (
        <div className="card flex flex-col gap-4">
          <h2 className="font-semibold">Invitations reçues</h2>
          {pendingInvitations.map((inv) => {
            const t = Array.isArray(inv.tournaments) ? inv.tournaments[0] : inv.tournaments;
            if (!t) return null;
            const event = Array.isArray(t.events) ? t.events[0] : t.events;
            const scheduledAt = t.scheduled_at ?? event?.scheduled_at;
            const location = t.location ?? event?.location;
            return (
              <div key={inv.id} className="flex flex-col gap-2 border-t border-line pt-3 first:border-none first:pt-0">
                <Link href={`/tournois/${t.id}`} className="link font-medium">
                  {t.name}
                </Link>
                <p className="text-sm text-ink-soft">
                  Buy-in {t.buy_in}€
                  {scheduledAt &&
                    ` · ${new Date(scheduledAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}`}
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
                  <Link href={`/tournois/${t.id}`} className="link text-sm">
                    Voir tous les détails
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Link href="/evenements" className="btn btn-primary">
          Voir les évènements
        </Link>

        <Link href="/tournois" className="btn btn-secondary">
          Voir les tournois
        </Link>

        <Link href="/clubs" className="btn btn-secondary">
          Mes clubs
        </Link>

        <Link href="/structures" className="btn btn-secondary">
          Structures de blindes
        </Link>

        <Link href="/profil" className="btn btn-secondary">
          Mon profil
        </Link>

        <form action={logout}>
          <button type="submit" className="btn btn-secondary w-full">
            Se déconnecter
          </button>
        </form>
      </div>
    </main>
  );
}
