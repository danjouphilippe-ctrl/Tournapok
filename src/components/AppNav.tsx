"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/auth/actions";

export type NavDestination = {
  href: string;
  label: string;
  /** Libellé court, pour la barre du bas où la place manque. */
  court: string;
  icon: string;
};

/** Les quatre premières tiennent dans la barre du bas sur téléphone ;
 * les suivantes vivent dans le tiroir. Sur ordinateur, la colonne
 * latérale les affiche toutes. */
export const DESTINATIONS: NavDestination[] = [
  { href: "/tableau-de-bord", label: "Tableau de bord", court: "Accueil", icon: "🏠" },
  { href: "/tournois", label: "Tournois", court: "Tournois", icon: "♠" },
  { href: "/evenements", label: "Évènements", court: "Évènem.", icon: "📅" },
  { href: "/clubs", label: "Clubs", court: "Clubs", icon: "🏛" },
  { href: "/jetons", label: "Jeux de jetons", court: "Jetons", icon: "🎰" },
  { href: "/structures", label: "Structures de blindes", court: "Structures", icon: "⏱" },
];

const DANS_LA_BARRE = 4;

/** Écrans qui ne doivent porter aucune navigation.
 *
 * L'écran d'affichage d'un tournoi est projeté dans une salle : ni
 * barre, ni colonne, à aucune taille. Les pages de compte et l'accueil
 * public n'ont pas encore de session à qui proposer un menu. */
const SANS_MENU = [
  "/",
  "/connexion",
  "/inscription",
  "/mot-de-passe-oublie",
  "/reinitialiser-mot-de-passe",
];

export function estSansMenu(pathname: string): boolean {
  if (pathname.endsWith("/affichage")) return true;
  return SANS_MENU.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function estActif(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({
  pseudo,
  notifications,
}: {
  pseudo: string | null;
  notifications: number;
}) {
  const pathname = usePathname();

  /* Le tiroir retient la page sur laquelle il a été ouvert, plutôt qu'un
   * simple booléen : dès qu'on change de page il se referme de lui-même,
   * y compris par le bouton « précédent » du navigateur. Un booléen
   * demanderait de le synchroniser dans un effet, ce qui provoque un
   * rendu en cascade. */
  const [ouvertSur, setOuvertSur] = useState<string | null>(null);
  const tiroirOuvert = ouvertSur === pathname;
  const fermerTiroir = () => setOuvertSur(null);

  if (estSansMenu(pathname)) return null;

  const dansLaBarre = DESTINATIONS.slice(0, DANS_LA_BARRE);
  const dansLeTiroir = DESTINATIONS.slice(DANS_LA_BARRE);

  return (
    <>
      {/* ---------- colonne latérale, à partir de 64rem ---------- */}
      <aside className="app-side">
        <Link href="/tableau-de-bord" className="app-side-brand">
          TournaPok
        </Link>
        <nav className="app-side-nav">
          {DESTINATIONS.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              className={`app-side-item${estActif(pathname, d.href) ? " on" : ""}`}
            >
              <span className="ic" aria-hidden="true">
                {d.icon}
              </span>
              {d.label}
            </Link>
          ))}
        </nav>
        <div className="app-side-foot">
          <Link
            href="/notifications"
            className={`app-side-item${estActif(pathname, "/notifications") ? " on" : ""}`}
          >
            <span className="ic" aria-hidden="true">
              🔔
            </span>
            Notifications
            {notifications > 0 && <span className="app-badge">{notifications}</span>}
          </Link>
          <Link
            href="/profil"
            className={`app-side-item${estActif(pathname, "/profil") ? " on" : ""}`}
          >
            <span className="ic" aria-hidden="true">
              👤
            </span>
            {pseudo ?? "Mon profil"}
          </Link>
          <form action={logout}>
            <button type="submit" className="app-side-item app-side-quit">
              <span className="ic" aria-hidden="true">
                ↩
              </span>
              Se déconnecter
            </button>
          </form>
        </div>
      </aside>

      {/* ---------- barre du haut, en dessous de 64rem ---------- */}
      <header className="app-top">
        <Link href="/tableau-de-bord" className="app-top-brand">
          TournaPok
        </Link>
        <div className="app-top-actions">
          <Link href="/notifications" className="app-icbtn" aria-label="Notifications">
            🔔
            {notifications > 0 && <span className="app-badge app-badge-flottant">{notifications}</span>}
          </Link>
          <button
            type="button"
            className="app-icbtn"
            aria-expanded={tiroirOuvert}
            aria-label="Ouvrir le menu"
            onClick={() => setOuvertSur(tiroirOuvert ? null : pathname)}
          >
            ☰
          </button>
        </div>
      </header>

      {/* ---------- barre du bas, en dessous de 64rem ---------- */}
      <nav className="app-tabs">
        {dansLaBarre.map((d) => (
          <Link
            key={d.href}
            href={d.href}
            className={`app-tab${estActif(pathname, d.href) ? " on" : ""}`}
          >
            <span className="ic" aria-hidden="true">
              {d.icon}
            </span>
            {d.court}
          </Link>
        ))}
      </nav>

      {/* ---------- tiroir ---------- */}
      {tiroirOuvert && (
        <div
          className="app-drawer"
          role="dialog"
          aria-label="Menu"
          onClick={(e) => {
            if (e.target === e.currentTarget) fermerTiroir();
          }}
        >
          <div className="app-drawer-panel">
            <p className="app-drawer-title">Tout le reste</p>
            {dansLeTiroir.map((d) => (
              <Link key={d.href} href={d.href} className="app-drawer-item">
                <span className="ic" aria-hidden="true">
                  {d.icon}
                </span>
                {d.label}
              </Link>
            ))}
            <Link href="/profil" className="app-drawer-item">
              <span className="ic" aria-hidden="true">
                👤
              </span>
              {pseudo ?? "Mon profil"}
            </Link>
            <form action={logout} className="app-drawer-quit">
              <button type="submit" className="app-drawer-item">
                <span className="ic" aria-hidden="true">
                  ↩
                </span>
                Se déconnecter
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/** Applique au contenu le décalage qu'impose la navigation — à gauche
 * pour la colonne, en bas pour la barre. Séparé de la navigation
 * elle-même pour que les écrans sans menu n'héritent d'aucune marge. */
export function AppMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className={estSansMenu(pathname) ? undefined : "app-main"}>{children}</div>;
}
