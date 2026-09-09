"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PokerTable, type Siege } from "@/components/PokerTable";
import { playBell, playTick } from "@/lib/clockSounds";
import { ETAPES_TIRAGE, melanger, rythmeDuTirage } from "@/lib/tirageAuSort";

export type TableTiree = { tableNumber: number; seats: Siege[] };

type Phase = "attente" | "tirage" | "fini";

/** Le tirage au sort des places, mis en scène.
 *
 * Les places sont déjà attribuées en base — l'animation ne tire rien,
 * elle révèle. Comme à la télévision : le résultat est connu, c'est le
 * dévoilement qui fait la soirée.
 *
 * On garde en mémoire locale que le tirage a eu lieu, pour ne pas le
 * rejouer à chaque rechargement de page. Un bouton discret permet de le
 * refaire quand on veut. */
export function SalleDeTirage({
  tournamentId,
  tables,
}: {
  tournamentId: string;
  tables: TableTiree[];
}) {
  const cle = `tirage-fait-${tournamentId}`;

  /* Le tirage déjà joué sur cet appareil.
   *
   * useSyncExternalStore plutôt qu'un effet qui pose l'état : le serveur
   * rend « pas encore joué », le client lit la mémoire locale, et React
   * gère l'écart sans qu'on ait à synchroniser deux sources à la main.
   * Aucun abonnement — la valeur ne change que de notre fait. */
  const dejaJoue = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return window.localStorage.getItem(cle) === "1";
      } catch {
        // Stockage indisponible (navigation privée, site bloqué) :
        // l'écran d'attente n'est pas un état dégradé.
        return false;
      }
    },
    () => false,
  );

  /* null tant que personne n'a agi : la phase se déduit alors de la
   * mémoire, plutôt que d'être recopiée dedans. */
  const [phaseChoisie, setPhaseChoisie] = useState<Phase | null>(null);
  const [brassage, setBrassage] = useState<TableTiree[] | null>(null);
  const minuteurs = useRef<number[]>([]);
  const phase: Phase = phaseChoisie ?? (dejaJoue ? "fini" : "attente");

  useEffect(() => () => minuteurs.current.forEach(clearTimeout), []);

  function memoriser() {
    try {
      window.localStorage.setItem(cle, "1");
    } catch {
      // Sans mémoire, le tirage se rejouera au prochain chargement.
    }
  }

  function lancer() {
    minuteurs.current.forEach(clearTimeout);
    minuteurs.current = [];

    /* Mouvement réduit demandé : on place sans animer ni sonner. Une
     * salle de tournoi n'est pas une raison d'ignorer ce réglage. */
    const sansMouvement =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (sansMouvement) {
      setBrassage(null);
      setPhaseChoisie("fini");
      memoriser();
      return;
    }

    const places = tables.flatMap((t) =>
      t.seats.map((s) => ({ tableNumber: t.tableNumber, seatNumber: s.seatNumber })),
    );
    const joueurs = tables.flatMap((t) => t.seats);
    const rythme = rythmeDuTirage(ETAPES_TIRAGE);

    setPhaseChoisie("tirage");
    let cumul = 0;
    rythme.forEach((delai, i) => {
      cumul += delai;
      const dernier = i === rythme.length - 1;
      minuteurs.current.push(
        window.setTimeout(() => {
          if (dernier) {
            setBrassage(null);
            setPhaseChoisie("fini");
            memoriser();
            playBell();
            return;
          }
          const tires = melanger(joueurs);
          setBrassage(
            tables.map((t) => ({
              tableNumber: t.tableNumber,
              seats: places
                .map((p, index) => ({ ...tires[index], ...p }))
                .filter((p) => p.tableNumber === t.tableNumber),
            })),
          );
          // La hauteur monte à mesure que ça ralentit : on entend la
          // roue s'arrêter sans quitter la table des yeux.
          playTick(500 + (i / rythme.length) * 320);
        }, cumul),
      );
    });
  }

  const affichees = brassage ?? tables;
  const enAttente = phase === "attente";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          {enAttente
            ? "Les places sont tirées au sort. Prêts ?"
            : phase === "tirage"
              ? "Tirage en cours…"
              : "Places attribuées."}
        </p>
        {phase !== "tirage" && (
          <button type="button" onClick={lancer} className="btn btn-primary btn-sm">
            {enAttente ? "🎲 Tirage au sort" : "Rejouer le tirage"}
          </button>
        )}
      </div>

      <ul className="grid gap-3 2xl:grid-cols-2">
        {affichees.map((t) => (
          <li key={t.tableNumber}>
            <PokerTable
              tableNumber={t.tableNumber}
              seats={enAttente ? [] : t.seats}
              nbAnnonce={tables.find((x) => x.tableNumber === t.tableNumber)?.seats.length ?? 0}
              fige={phase === "tirage"}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
