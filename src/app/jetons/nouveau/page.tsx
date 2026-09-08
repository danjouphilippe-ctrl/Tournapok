import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { NouveauJetonForm } from "@/app/jetons/nouveau/NouveauJetonForm";

export default async function NouveauJetonPage() {
  const user = await getUser();
  if (!user) redirect("/connexion");

  return <NouveauJetonForm />;
}
