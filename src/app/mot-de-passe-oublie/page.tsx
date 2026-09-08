"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type AuthFormState } from "@/app/auth/actions";

const initialState: AuthFormState = { error: null };

export default function MotDePasseOubliePage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  return (
    <main className="page page-narrow">
      <div>
        <h1 className="text-2xl font-semibold">Mot de passe oublié</h1>
        <p className="text-sm text-ink-soft">
          Indique ton email, on t&apos;envoie un lien pour en choisir un nouveau.
        </p>
      </div>

      <form action={formAction} className="card flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" />
        </div>

        {state.error && (
          <p className="text-sm text-danger" role="alert">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Envoi..." : "Envoyer le lien"}
        </button>
      </form>

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
