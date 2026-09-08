"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup, type AuthFormState } from "@/app/auth/actions";
import { DATE_OUVERTURE, INSCRIPTIONS_OUVERTES } from "@/lib/inscriptions";

const initialState: AuthFormState = { error: null };

export default function InscriptionPage() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <main className="page page-narrow">
      <div>
        <h1 className="text-2xl font-semibold">Créer un compte</h1>
        <p className="text-sm text-ink-soft">
          Un compte suffit pour rejoindre les tournois auxquels on t&apos;invite.
        </p>
      </div>

      {/* Annoncé avant le formulaire, et non après l'envoi : jusqu'ici le
        * visiteur remplissait les trois champs pour apprendre seulement
        * alors que les inscriptions étaient fermées. */}
      {!INSCRIPTIONS_OUVERTES && (
        <div className="card section-accent flex flex-col gap-2">
          <p className="section-eyebrow">
            <span className="dot" />
            Inscriptions bientôt ouvertes
          </p>
          <p className="text-sm text-ink-soft">
            TournaPok est en test privé jusqu&apos;au <strong>{DATE_OUVERTURE}</strong>. La
            création de compte n&apos;est pas encore ouverte au public — si tu as déjà un compte,
            tu peux te connecter normalement.
          </p>
        </div>
      )}

      <form action={formAction} className="card flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="pseudo" className="text-sm font-medium">
            Pseudo
          </label>
          <input
            id="pseudo"
            name="pseudo"
            type="text"
            required
            autoComplete="nickname"
            className="input"
            aria-describedby="aide-pseudo"
          />
          <p id="aide-pseudo" className="text-xs text-ink-soft">
            C&apos;est le nom que verront les autres joueurs, à table et au classement.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="input"
            aria-describedby="aide-email"
          />
          <p id="aide-email" className="text-xs text-ink-soft">
            Sert à confirmer ton compte et à recevoir les invitations aux tournois.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium">
            Mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="input"
            aria-describedby="aide-mdp"
          />
          <p id="aide-mdp" className="text-xs text-ink-soft">
            6 caractères minimum.
          </p>
        </div>

        {state.error && (
          <p className="text-sm text-danger" role="alert">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Création..." : "S'inscrire"}
        </button>
      </form>

      <div className="flex flex-col gap-2 text-sm text-ink-soft">
        <p>
          Déjà un compte ?{" "}
          <Link href="/connexion" className="link">
            Se connecter
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
