import Link from "next/link";

export default function VerifiezVosEmailsPage() {
  return (
    <main className="page page-narrow text-center">
      <h1 className="text-2xl font-semibold">Vérifie ta boîte mail</h1>
      <p className="text-sm text-ink-soft">
        Si un compte existe avec cette adresse, un lien de réinitialisation vient de lui être
        envoyé. Clique dessus pour choisir un nouveau mot de passe.
      </p>
      <Link href="/connexion" className="link link-action text-sm">
        Retour à la connexion
      </Link>
    </main>
  );
}
