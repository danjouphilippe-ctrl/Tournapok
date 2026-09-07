import Link from "next/link";

export default function VerifiezVosEmailsPage() {
  return (
    <main className="page page-narrow text-center">
      <h1 className="text-2xl font-semibold">Vérifie ta boîte mail</h1>
      <p className="text-sm text-ink-soft">
        On t&apos;a envoyé un lien de confirmation. Clique dessus pour activer
        ton compte, puis connecte-toi.
      </p>
      <Link href="/connexion" className="link link-action text-sm">
        Retour à la connexion
      </Link>
    </main>
  );
}
