import type { Metadata } from "next";

/* La page est un composant client — elle ne peut pas exporter de
 * métadonnées. Cette mise en page ne sert qu'à nommer l'onglet. */
export const metadata: Metadata = {
  title: "Connexion",
  description: "Connecte-toi pour retrouver tes tournois.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
