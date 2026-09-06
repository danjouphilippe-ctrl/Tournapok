import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";
import { respondToInvitation } from "@/app/tournois/actions";

const NAV_ITEMS: { href: string; label: string; icon: string; tone: string }[] = [
  { href: "/evenements", label: "Évènement", icon: "📅", tone: "accent" },
  { href: "/tournois", label: "Tournois", icon: "♠", tone: "gold" },
  { href: "/clubs", label: "Mes clubs", icon: "🏛", tone: "teal" },
  { href: "/jetons", label: "Jeux de jetons", icon: "🎰", tone: "gold" },
  { href: "/structures", label: "Structures de blindes", icon: "⏱", tone: "slate" },
  { href: "/profil", label: "Mon profil", icon: "👤", tone: "success" },
];

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
    <main className="page">
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
        <div>
          <h1 className="text-xl font-semibold">Salut {profile?.pseudo ?? user.email}</h1>
          <p className="text-sm text-ink-soft">{user.email}</p>
        </div>
      </div>

      {pendingInvitations.length > 0 && (
        <div className="card section-accent flex flex-col gap-4">
          <p className="section-eyebrow">
            <span className="dot" />
            Invitations reçues
          </p>
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className="tile">
            <span className={`tile-icon tile-icon-${item.tone}`}>{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </div>

      <form action={logout} className="flex justify-center">
        <button type="submit" className="link text-sm">
          Se déconnecter
        </button>
      </form>
    </main>
  );
}
