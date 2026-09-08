import { notFound, redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { FormattedText } from "@/components/FormattedText";

const PLAYER_TYPE_LABELS: Record<string, string> = {
  serre_passif: "Serré-passif (Rock)",
  serre_agressif: "Serré-agressif (TAG)",
  loose_passif: "Loose-passif (Calling Station)",
  loose_agressif: "Loose-agressif (LAG)",
};

export default async function JoueurPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getUser();
  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("pseudo, city, player_type, player_type_custom, age, bio, avatar_url")
    .eq("id", id)
    .single();

  if (!profile) notFound();

  return (
    <main className="page">
      <div className="hero-card flex items-center gap-4">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt={profile.pseudo}
            className="h-20 w-20 shrink-0 rounded-full border-2 object-cover"
            style={{ borderColor: "var(--gold-line)" }}
          />
        ) : (
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 bg-surface-2 text-2xl font-medium text-ink-soft"
            style={{ borderColor: "var(--gold-line)" }}
          >
            {profile.pseudo.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h1 className="wrap-anywhere text-2xl font-semibold">{profile.pseudo}</h1>
          {(profile.city || profile.age) && (
            <div className="flex flex-wrap gap-2">
              {profile.city && <span className="chip">📍 {profile.city}</span>}
              {profile.age && <span className="chip">{profile.age} ans</span>}
            </div>
          )}
        </div>
      </div>

      {(profile.player_type || profile.player_type_custom) && (
        <div className="card">
          <p className="eyebrow mb-2">Type de joueur</p>
          <p className="text-sm">
            {[
              profile.player_type
                ? PLAYER_TYPE_LABELS[profile.player_type] ?? profile.player_type
                : null,
              profile.player_type_custom,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      )}

      {profile.bio && (
        <div className="card">
          <p className="whitespace-pre-wrap text-sm text-ink-soft">
            <FormattedText text={profile.bio} />
          </p>
        </div>
      )}
    </main>
  );
}
