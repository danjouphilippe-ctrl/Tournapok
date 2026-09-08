import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { AvatarUploader } from "@/components/AvatarUploader";
import { ProfilForm } from "@/app/profil/ProfilForm";

export default async function ProfilPage() {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("pseudo, city, player_type, player_type_custom, age, bio, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/tableau-de-bord");

  return (
    <main className="page">
      <h1 className="text-2xl font-semibold">Mon profil</h1>

      <AvatarUploader userId={user.id} avatarUrl={profile.avatar_url} pseudo={profile.pseudo} />

      <ProfilForm
        pseudo={profile.pseudo}
        city={profile.city ?? ""}
        playerType={profile.player_type ?? ""}
        playerTypeCustom={profile.player_type_custom ?? ""}
        age={profile.age}
        bio={profile.bio ?? ""}
      />
    </main>
  );
}
