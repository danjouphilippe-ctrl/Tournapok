import Link from "next/link";
import { DATE_OUVERTURE, INSCRIPTIONS_OUVERTES } from "@/lib/inscriptions";

/* Cette page a deux publics qui n'attendent pas la même chose.
 *
 * En haut, la porte : quelqu'un qu'un organisateur vient d'inviter et
 * qui veut juste entrer. C'est l'usage réel aujourd'hui.
 *
 * En dessous, la vitrine : quelqu'un qui découvre et se demande à quoi
 * sert ce site. C'est le seul écran qu'un moteur de recherche pourra
 * lire — tout le reste est derrière la connexion — et ce sera le corps
 * de la page à l'ouverture des inscriptions. */

const CAPACITES: { icone: string; ton: string; titre: string; texte: string }[] = [
  {
    icone: "⏱",
    ton: "gold",
    titre: "L'horloge et les blindes",
    texte:
      "Des structures réutilisables, de l'hyper-turbo au deepstack. Chaque niveau affiche son temps cumulé, et la structure annonce la durée du tournoi, pauses comprises.",
  },
  {
    icone: "📺",
    ton: "accent",
    titre: "L'écran de salle",
    texte:
      "Un affichage plein écran pour un téléviseur ou un vidéoprojecteur : niveau en cours, temps restant, prochaines blindes. Les joueurs lèvent les yeux et savent où ils en sont.",
  },
  {
    icone: "🪑",
    ton: "teal",
    titre: "Les tables",
    texte:
      "Placement des joueurs au démarrage, puis rééquilibrage au fil des éliminations — sans recompter les sièges à la main entre deux mains.",
  },
  {
    icone: "💶",
    ton: "success",
    titre: "La cagnotte",
    texte:
      "Buy-in, recaves, add-on, bounty. La répartition des gains se saisit en pourcentages, avec le total vérifié et le montant de chaque place calculé en direct.",
  },
  {
    icone: "🎰",
    ton: "gold",
    titre: "Les jetons",
    texte:
      "Des jeux de jetons enregistrés une fois pour toutes, et la composition de la cave de départ contrôlée face au tapis annoncé.",
  },
  {
    icone: "🏛",
    ton: "slate",
    titre: "Les clubs et les évènements",
    texte:
      "Un club avec ses membres et ses demandes d'adhésion. Un évènement qui regroupe plusieurs tournois sur une même soirée ou un même week-end.",
  },
];

export default function Home() {
  return (
    <main className="page page-list">
      <section className="flex flex-col items-center gap-4 py-8 text-center">
        <span className="text-2xl tracking-[0.3em] text-accent">♠ ♥ ♦ ♣</span>
        <h1 className="text-4xl font-semibold">TournaPok</h1>
        <p className="max-w-xl text-lg text-ink-soft">
          L&apos;outil qui tient ton tournoi de poker pendant que tu joues : l&apos;horloge, les
          blindes, les tables et la cagnotte.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/connexion" className="btn btn-primary">
            Se connecter
          </Link>
          <Link href="/inscription" className="btn btn-secondary">
            Créer un compte
          </Link>
        </div>

        {!INSCRIPTIONS_OUVERTES && (
          <p className="text-sm text-ink-soft">
            Site en test privé — les inscriptions ouvrent le{" "}
            <strong className="text-ink">{DATE_OUVERTURE}</strong>.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <p className="section-eyebrow">
            <span className="dot" />
            Ce que ça fait
          </p>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            Organiser un tournoi, c&apos;est tenir une horloge, replacer des joueurs, compter des
            jetons et partager une cagnotte — en même temps qu&apos;on essaie de jouer. TournaPok
            s&apos;occupe de tout ça.
          </p>
        </div>

        <ul className="list-grid">
          {CAPACITES.map((c) => (
            <li key={c.titre}>
              <div className="card flex h-full flex-col gap-3">
                <span className={`tile-icon tile-icon-${c.ton} text-xl`}>{c.icone}</span>
                <h2 className="font-semibold">{c.titre}</h2>
                <p className="text-sm text-ink-soft">{c.texte}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card section-accent flex flex-col items-center gap-3 py-8 text-center">
        <h2 className="text-xl font-semibold">Tu as reçu une invitation ?</h2>
        <p className="max-w-lg text-sm text-ink-soft">
          Connecte-toi avec le compte lié à l&apos;adresse où tu as reçu l&apos;invitation : le
          tournoi t&apos;attend sur ton tableau de bord.
        </p>
        <Link href="/connexion" className="btn btn-primary">
          Se connecter
        </Link>
      </section>
    </main>
  );
}
