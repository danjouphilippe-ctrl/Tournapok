import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NouveauJetonForm } from "@/app/jetons/nouveau/NouveauJetonForm";

export default async function NouveauJetonPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  return <NouveauJetonForm />;
}
