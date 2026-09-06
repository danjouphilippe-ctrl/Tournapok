"use client";

import Link from "next/link";
import { useState } from "react";
import { useActionState } from "react";
import { createChipSet, type ChipDenominationInput, type ChipSetFormState } from "@/app/jetons/actions";
import { ChipDenominationsEditor, defaultDenomination } from "@/components/ChipDenominationsEditor";

const initialState: ChipSetFormState = { error: null };

export function NouveauJetonForm() {
  const [state, formAction, pending] = useActionState(createChipSet, initialState);
  const [denominations, setDenominations] = useState<ChipDenominationInput[]>([defaultDenomination()]);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold">Créer un jeu de jetons</h1>

      <form action={formAction} className="card flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium">
            Nom
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Ex: Mallette 500 jetons"
            className="input"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Dénominations (couleur + valeur)</span>
          <ChipDenominationsEditor denominations={denominations} onChange={setDenominations} />
        </div>

        <input type="hidden" name="denominations_json" value={JSON.stringify(denominations)} />

        {state.error && (
          <p className="text-sm text-danger" role="alert">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Création..." : "Créer le jeu de jetons"}
        </button>
      </form>

      <Link href="/jetons" className="link text-sm">
        Annuler
      </Link>
    </main>
  );
}
