import Link from "next/link";

/* Écran d'attente commun à la confirmation d'inscription et à la
 * réinitialisation de mot de passe.
 *
 * Les deux versions ne disaient que « on t'a envoyé un lien » et
 * laissaient seul quiconque ne recevait rien — c'est pourtant le cas le
 * plus probable : dossier indésirables, adresse mal tapée, ou plafond
 * d'envoi de Supabase atteint. */
export function BoiteMail({
  intro,
  email,
  relance,
  libelleRelance,
}: {
  intro: string;
  email?: string;
  /** Où retourner pour redemander un lien. */
  relance: string;
  libelleRelance: string;
}) {
  return (
    <main className="page page-narrow">
      <div className="card flex flex-col items-center gap-3 py-10 text-center">
        <span className="tile-icon tile-icon-success text-2xl">✉️</span>
        <h1 className="text-2xl font-semibold">Vérifie ta boîte mail</h1>
        <p className="text-sm text-ink-soft">{intro}</p>
        {email && (
          <p className="wrap-anywhere text-sm">
            Envoyé à <strong>{email}</strong>
          </p>
        )}
      </div>

      <div className="card flex flex-col gap-3">
        <p className="section-eyebrow">
          <span className="dot" />
          Rien reçu ?
        </p>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-ink-soft">
          <li>Le message met parfois une minute ou deux à arriver.</li>
          <li>
            Regarde dans les <strong>indésirables</strong> ou les <strong>promotions</strong> —
            c&apos;est là qu&apos;il atterrit le plus souvent.
          </li>
          <li>
            Vérifie l&apos;adresse{email ? " ci-dessus" : " saisie"} : une lettre de travers
            suffit à envoyer le message dans le vide.
          </li>
        </ul>
        <div>
          <Link href={relance} className="btn btn-secondary btn-sm">
            {libelleRelance}
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-2 text-sm text-ink-soft">
        <p>
          <Link href="/connexion" className="link link-action">
            Retour à la connexion
          </Link>
        </p>
        <p>
          <Link href="/" className="link link-action">
            Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    </main>
  );
}
