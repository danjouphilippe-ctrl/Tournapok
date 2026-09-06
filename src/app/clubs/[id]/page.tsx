import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  addClubMember,
  changeClubMemberRole,
  removeClubMember,
} from "@/app/clubs/actions";
import { DeleteClubButton } from "@/components/DeleteClubButton";
import { PseudoAutocomplete } from "@/components/PseudoAutocomplete";
import { ClubMemberRoleSelect } from "@/components/ClubMemberRoleSelect";

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

  const [{ data: organizer }, { data: members }, { data: tournaments }, { data: events }] =
    await Promise.all([
      supabase.from("profiles").select("pseudo").eq("id", club.created_by).single(),
      supabase
        .from("club_members")
        .select("user_id, role, profiles!club_members_user_id_fkey(pseudo)")
        .eq("club_id", id)
        .order("role"),
      supabase
        .from("tournaments")
        .select("id, name, status, visibility")
        .eq("club_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("events")
        .select("id, name, visibility")
        .eq("club_id", id)
        .order("created_at", { ascending: false }),
    ]);

  const allMembers = members ?? [];
  const myMembership = allMembers.find((m) => m.user_id === user.id);
  const isOwner = club.created_by === user.id;
  const canManage = isOwner || myMembership?.role === "owner" || myMembership?.role === "admin";

  return (
    <main className="page">
      {erreur && (
        <p className="card text-sm text-danger" role="alert">
          {erreur}
        </p>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {club.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={club.logo_url}
              alt=""
              className="h-14 w-14 shrink-0 rounded-full border border-line object-cover"
            />
          ) : null}
          <h1 className="text-2xl font-semibold">{club.name}</h1>
        </div>
      </div>

      {club.description && <p className="text-sm text-ink-soft">{club.description}</p>}
      <p className="text-sm text-ink-soft">
        Créé par {organizer?.pseudo ?? "—"}
        {club.location && ` · 📍 ${club.location}`}
      </p>

      {(tournaments && tournaments.length > 0) || (events && events.length > 0) ? (
        <div className="card flex flex-col gap-3">
          <h2 className="font-semibold">Tournois et évènements du club</h2>
          <ul className="flex flex-col gap-2">
            {(events ?? []).map((e) => (
              <li key={`event-${e.id}`}>
                <Link href={`/evenements/${e.id}`} className="link text-sm">
                  {e.name}
                </Link>{" "}
                <span className="text-xs text-ink-faint">évènement · {e.visibility}</span>
              </li>
            ))}
            {(tournaments ?? []).map((t) => (
              <li key={`tournament-${t.id}`}>
                <Link href={`/tournois/${t.id}`} className="link text-sm">
                  {t.name}
                </Link>{" "}
                <span className="text-xs text-ink-faint">tournoi · {t.visibility}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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
                    <button type="submit" className="link-danger text-xs">
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
          <Link href={`/clubs/${id}/modifier`} className="link text-sm">
            Modifier le club
          </Link>
          {isOwner && <DeleteClubButton clubId={id} />}
        </div>
      )}

      <Link href="/clubs" className="link text-sm">
        Retour aux clubs
      </Link>
    </main>
  );
}
