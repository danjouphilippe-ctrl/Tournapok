import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-6 px-4 text-center">
      <span className="text-2xl tracking-[0.3em] text-accent">♠ ♥ ♦ ♣</span>
      <h1 className="text-4xl font-semibold">TournaPok</h1>
      <p className="text-ink-soft">
        Gère tes tournois de poker Texas Hold&apos;em, de l&apos;inscription au vainqueur.
      </p>
      <div className="flex gap-3">
        <Link href="/inscription" className="btn btn-primary">
          S&apos;inscrire
        </Link>
        <Link href="/connexion" className="btn btn-secondary">
          Se connecter
        </Link>
      </div>
    </main>
  );
}
