import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("pseudo, city, player_type, player_type_custom, age, bio, avatar_url")
    .eq("id", id)
    .single();

  if (!profile) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col gap-6 px-4 py-12">
      <div className="flex items-center gap-4">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt={profile.pseudo}
            className="h-20 w-20 rounded-full border border-line object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-line bg-surface-2 text-2xl font-medium text-ink-soft">
            {profile.pseudo.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold">{profile.pseudo}</h1>
          <p className="text-sm text-ink-soft">
            {[profile.city, profile.age ? `${profile.age} ans` : null].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      {(profile.player_type || profile.player_type_custom) && (
        <p className="text-sm">
          <span className="font-medium">Type de joueur : </span>
          {[
            profile.player_type ? PLAYER_TYPE_LABELS[profile.player_type] ?? profile.player_type : null,
            profile.player_type_custom,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}

      {profile.bio && (
        <p className="whitespace-pre-wrap text-sm text-ink-soft">{profile.bio}</p>
      )}

      <Link href="/tournois" className="link text-sm">
        Retour aux tournois
      </Link>
    </main>
  );
}
