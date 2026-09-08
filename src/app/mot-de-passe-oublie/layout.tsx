import type { Metadata } from "next";

/* La page est un composant client — elle ne peut pas exporter de
 * métadonnées. Cette mise en page ne sert qu'à nommer l'onglet. */
export const metadata: Metadata = {
  /* Objet et non simple chaîne : cette route a des pages enfants,
   * et un titre nu ne leur transmettrait aucun gabarit — leur
   * onglet perdrait le nom du site. */
  title: { default: "Mot de passe oublié", template: "%s · TournaPok" },
  description: "Reçois un lien pour choisir un nouveau mot de passe.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
