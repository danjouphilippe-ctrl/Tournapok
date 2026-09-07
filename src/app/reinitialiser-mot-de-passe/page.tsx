"use client";

import { useActionState } from "react";
import { updatePassword, type AuthFormState } from "@/app/auth/actions";

const initialState: AuthFormState = { error: null };

export default function ReinitialiserMotDePassePage() {
  const [state, formAction, pending] = useActionState(updatePassword, initialState);

  return (
    <main className="page page-narrow">
      <div>
        <h1 className="text-2xl font-semibold">Nouveau mot de passe</h1>
        <p className="text-sm text-ink-soft">Choisis un nouveau mot de passe pour ton compte.</p>
      </div>

      <form action={formAction} className="card flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium">
            Nouveau mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            className="input"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="confirm_password" className="text-sm font-medium">
            Confirmer le mot de passe
          </label>
          <input
            id="confirm_password"
            name="confirm_password"
            type="password"
            required
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
          {pending ? "Enregistrement..." : "Enregistrer le nouveau mot de passe"}
        </button>
      </form>
    </main>
  );
}
