"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type AuthFormState } from "@/app/auth/actions";

const initialState: AuthFormState = { error: null };

export default function ConnexionPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <main className="page page-narrow">
      <div>
        <h1 className="text-2xl font-semibold">Connexion</h1>
        <p className="text-sm text-ink-soft">Content de te revoir.</p>
      </div>

      <form action={formAction} className="card flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">
              Mot de passe
            </label>
            <Link href="/mot-de-passe-oublie" className="link text-xs">
              Mot de passe oublié ?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="input"
          />
        </div>

        {state.error && (
          <p className="text-sm text-danger" role="alert">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Connexion..." : "Se connecter"}
        </button>
      </form>

      <div className="flex flex-col gap-2 text-sm text-ink-soft">
        <p>
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="link">
            S&apos;inscrire
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
