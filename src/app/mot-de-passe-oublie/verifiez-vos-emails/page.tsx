import Link from "next/link";

export default function VerifiezVosEmailsPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Vérifie ta boîte mail</h1>
      <p className="text-sm text-ink-soft">
        Si un compte existe avec cette adresse, un lien de réinitialisation vient de lui être
        envoyé. Clique dessus pour choisir un nouveau mot de passe.
      </p>
      <Link href="/connexion" className="link text-sm">
        Retour à la connexion
      </Link>
    </main>
  );
}
