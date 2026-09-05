import Link from "next/link";

export default function VerifiezVosEmailsPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Vérifie ta boîte mail</h1>
      <p className="text-sm text-ink-soft">
        On t&apos;a envoyé un lien de confirmation. Clique dessus pour activer
        ton compte, puis connecte-toi.
      </p>
      <Link href="/connexion" className="link text-sm">
        Retour à la connexion
      </Link>
    </main>
  );
}
