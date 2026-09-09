"use client";

import Link from "next/link";
import { useRef } from "react";

export type Siege = {
  seatNumber: number;
  pseudo: string;
  avatarUrl: string | null;
  stack: number | null;
  playerId: string;
};

/** Une table et ses joueurs, dans une tuile agrandissable.
 *
 * Le tapis n'est volontairement pas affiché : cet écran répond à « qui
 * est assis où », pas à « qui est devant ». Le détail des tapis vit sur
 * la page du tournoi. */
export function PokerTable({ tableNumber, seats }: { tableNumber: number; seats: Siege[] }) {
  const parSiege = [...seats].sort((a, b) => a.seatNumber - b.seatNumber);
  const dialogue = useRef<HTMLDialogElement>(null);

  return (
    <div className="card card-table flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Table {tableNumber}</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink-soft">
            {seats.length} {seats.length > 1 ? "joueurs" : "joueur"}
          </span>
          {/* Un bouton plutôt que la tuile entière cliquable : les sièges
            * sont déjà des liens vers les joueurs, et rendre le fond
            * cliquable rendrait chaque clic ambigu. Masqué sur téléphone,
            * où la liste se lit déjà en pleine largeur. */}
          {/* La bascule d'affichage vit sur l'enveloppe, pas sur le
            * bouton : .link-action est déclarée après Tailwind et impose
            * display:inline-flex, ce qui annulait .hidden — le bouton
            * restait visible sur téléphone. */}
          <span className="hidden sm:inline">
            <button
              type="button"
              onClick={() => dialogue.current?.showModal()}
              className="link link-action text-sm"
            >
              Agrandir
            </button>
          </span>
        </div>
      </div>

      {/* Sur téléphone, l'ellipse est intenable : les sièges autour d'un
        * ovale de 340 px se chevauchent quel que soit le rayon. Une liste
        * dit la même chose sans rien tronquer, et c'est de toute façon
        * sur un portable ou un téléviseur qu'on montre le placement. */}
      <ol className="flex flex-col gap-2 sm:hidden">
        {parSiege.map((seat) => (
          <li key={seat.playerId}>
            <Link
              href={`/joueurs/${seat.playerId}`}
              className="flex items-center gap-3 rounded-lg border border-line px-3 py-2"
            >
              <span className="w-5 shrink-0 text-center text-xs tabular-nums text-ink-faint">
                {seat.seatNumber}
              </span>
              <Avatar seat={seat} taille="h-11 w-11" />
              <span className="min-w-0 flex-1 wrap-anywhere font-medium">{seat.pseudo}</span>
            </Link>
          </li>
        ))}
      </ol>

      <Ovale seats={parSiege} className="mx-auto hidden w-full max-w-lg sm:block" />

      {/* Échap referme nativement. On ajoute le clic sur le fond, comme
        * dans une galerie de photos : c'est le geste qu'on tente
        * spontanément, et il ne dépend pas du clavier. Le clic sur le
        * fond vise le <dialog> lui-même, jamais son contenu. */}
      <dialog
        ref={dialogue}
        className="table-dialog"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogue.current?.close();
        }}
      >
        <div className="flex items-center justify-between gap-4 pb-4">
          <h2 className="text-xl font-semibold">Table {tableNumber}</h2>
          <button
            type="button"
            onClick={() => dialogue.current?.close()}
            className="btn btn-secondary btn-sm"
          >
            Fermer
          </button>
        </div>
        <Ovale seats={parSiege} className="w-full" grand />
      </dialog>
    </div>
  );
}

/** L'ovale et ses sièges.
 *
 * Les places sont réparties sur les joueurs *présents*, et non sur les
 * places physiques de la table : à six joueurs sur une table de huit,
 * les deux places vides ouvraient un trou dans l'ellipse. Le numéro de
 * siège reste lisible sur une pastille, pour retrouver sa place. */
function Ovale({
  seats,
  className,
  grand = false,
}: {
  seats: Siege[];
  className?: string;
  grand?: boolean;
}) {
  return (
    <div className={`relative aspect-[8/5] ${className ?? ""}`}>
      <div
        className="absolute inset-[14%] rounded-[50%] border-4 border-line"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(138,35,50,0.35), rgba(28,22,21,0.9))",
        }}
      />
      <span
        aria-hidden
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-accent opacity-30 ${
          grand ? "text-6xl" : "text-3xl"
        }`}
      >
        ♠
      </span>

      {seats.map((seat, index) => {
        const angle = (index / seats.length) * 2 * Math.PI - Math.PI / 2;
        /* Même rayon que le tapis (inset 14 % ⇒ 36 %) : les avatars sont
         * ainsi centrés *sur* le bord, tous à cheval de la même façon.
         * Avec 46 % à l'horizontale et 40 % à la verticale, seuls le
         * haut et le bas touchaient le feutre, les côtés flottaient. */
        const left = 50 + 36 * Math.cos(angle);
        const top = 50 + 36 * Math.sin(angle);
        return (
          <Link
            key={seat.playerId}
            href={`/joueurs/${seat.playerId}`}
            /* Le lien a exactement la taille de l'avatar : c'est lui, et
             * non le bloc avatar + nom, qui doit être centré sur le bord
             * du tapis. L'étiquette est donc sortie du flux, sinon le
             * demi-décalage vertical la faisait remonter l'avatar. */
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <Avatar seat={seat} taille={grand ? "h-20 w-20" : "h-14 w-14"} />
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-surface text-[10px] tabular-nums text-ink-soft">
              {seat.seatNumber}
            </span>
            <span
              title={seat.pseudo}
              /* Toujours centrée sous l'avatar. Le décalage latéral qu'on
               * appliquait aux sièges de flanc datait d'un rayon de 46 %,
               * où ils touchaient le bord du cadre ; sur le tapis à 36 %
               * il ne servait qu'à pousser l'étiquette vers l'intérieur,
               * donc sur l'avatar du voisin en diagonale. */
              className={`seat-label absolute left-1/2 top-full mt-1.5 -translate-x-1/2 ${
                grand ? "seat-label-lg" : ""
              }`}
            >
              {seat.pseudo}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function Avatar({
  seat,
  taille,
}: {
  seat: { pseudo: string; avatarUrl: string | null };
  taille: string;
}) {
  if (seat.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={seat.avatarUrl}
        alt=""
        className={`${taille} shrink-0 rounded-full border-2 border-accent object-cover`}
      />
    );
  }
  return (
    <span
      className={`${taille} flex shrink-0 items-center justify-center rounded-full border-2 border-accent bg-surface-2 font-medium text-ink-soft`}
    >
      {seat.pseudo.slice(0, 1).toUpperCase()}
    </span>
  );
}
