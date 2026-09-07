"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup, type AuthFormState } from "@/app/auth/actions";

const initialState: AuthFormState = { error: null };

export default function InscriptionPage() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <main className="page page-narrow">
      <div>
        <h1 className="text-2xl font-semibold">Créer un compte</h1>
        <p className="text-sm text-ink-soft">
          Inscris-toi pour rejoindre des tournois de poker.
        </p>
      </div>

      <form action={formAction} className="card flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="pseudo" className="text-sm font-medium">
            Pseudo
          </label>
          <input id="pseudo" name="pseudo" type="text" required autoComplete="nickname" className="input" />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" />
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
          />
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

      <p className="text-sm text-ink-soft">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="link">
          Se connecter
        </Link>
      </p>
    </main>
  );
}
