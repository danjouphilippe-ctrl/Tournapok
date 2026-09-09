"use client";

import { useEffect, useState } from "react";
import { formatChrono, secondesRestantes, type EtatHorloge } from "@/lib/horloge";

/** Le décompte du niveau en cours, sur la page de gestion.
 *
 * L'organisateur pilote l'horloge depuis cet écran mais devait ouvrir
 * l'affichage de salle pour savoir combien de temps il restait.
 *
 * `maintenantInitial` vient du serveur : sans lui, le premier rendu
 * client afficherait une autre seconde que le HTML reçu, et React
 * signalerait un écart d'hydratation. Le composant reprend ensuite la
 * main avec sa propre horloge. */
export function HorlogeTournoi({
  etat,
  maintenantInitial,
}: {
  etat: EtatHorloge;
  maintenantInitial: number;
}) {
  const [maintenant, setMaintenant] = useState(maintenantInitial);

  useEffect(() => {
    const battement = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(battement);
  }, []);

  const restant = secondesRestantes(etat, maintenant);
  const enPause = etat.clock_status !== "running";
  /* Dernière ligne droite : le rouge prévient sans qu'on ait à lire les
   * chiffres, utile quand on gère la table en même temps. */
  const derniereLigneDroite = !enPause && restant > 0 && restant <= 15;

  return (
    <p
      aria-label={`Temps restant sur le niveau : ${formatChrono(restant)}`}
      className={`font-mono text-3xl font-semibold leading-none tabular-nums ${
        enPause ? "text-ink-faint" : derniereLigneDroite ? "text-danger" : "text-ink"
      }`}
    >
      {formatChrono(restant)}
    </p>
  );
}
