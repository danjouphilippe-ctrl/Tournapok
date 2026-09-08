import type { Metadata } from "next";
import { BoiteMail } from "@/components/BoiteMail";

export const metadata: Metadata = { title: "Vérifie ta boîte mail" };

export default async function VerifiezVosEmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return (
    /* Le message reste volontairement conditionnel : on répond la même
     * chose que l'adresse existe ou non, pour ne pas révéler qui est
     * inscrit sur le site. */
    <BoiteMail
      intro="Si un compte existe avec cette adresse, un lien de réinitialisation vient de lui être envoyé. Clique dessus pour choisir un nouveau mot de passe."
      email={email}
      relance="/mot-de-passe-oublie"
      libelleRelance="Redemander un lien"
    />
  );
}
