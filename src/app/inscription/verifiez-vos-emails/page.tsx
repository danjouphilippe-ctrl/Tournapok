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
    <BoiteMail
      intro="On t'a envoyé un lien de confirmation. Clique dessus pour activer ton compte, puis connecte-toi."
      email={email}
      relance="/inscription"
      libelleRelance="Recommencer l'inscription"
    />
  );
}
