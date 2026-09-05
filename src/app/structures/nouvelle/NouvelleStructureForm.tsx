"use client";

import Link from "next/link";
import { useState } from "react";
import { useActionState } from "react";
import { createStructure, type StructureFormState, type StructureLevelInput } from "@/app/structures/actions";
import { BlindLevelsEditor, defaultLevel } from "@/components/BlindLevelsEditor";

const initialState: StructureFormState = { error: null };

export function NouvelleStructureForm({
  initialName = "",
  initialDescription = "",
  initialSpeedPreset = "personnalise",
  initialLevels,
}: {
  initialName?: string;
  initialDescription?: string;
  initialSpeedPreset?: string;
  initialLevels?: StructureLevelInput[];
}) {
  const [state, formAction, pending] = useActionState(createStructure, initialState);
  const [levels, setLevels] = useState(initialLevels ?? [defaultLevel()]);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold">
        {initialName ? "Dupliquer une structure de blindes" : "Créer une structure de blindes"}
      </h1>

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
            defaultValue={initialName}
            placeholder="Ex: Standard 20 min"
            className="input"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="description" className="text-sm font-medium">
            Description (optionnel)
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            defaultValue={initialDescription}
            className="input"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="speed_preset" className="text-sm font-medium">
            Type
          </label>
          <select id="speed_preset" name="speed_preset" defaultValue={initialSpeedPreset} className="input">
            <option value="standard">Standard</option>
            <option value="turbo">Turbo</option>
            <option value="hyperturbo">Hyper-turbo</option>
            <option value="deepstack">Deepstack</option>
            <option value="personnalise">Personnalisée</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Niveaux</span>
          <BlindLevelsEditor levels={levels} onChange={setLevels} />
        </div>

        <input type="hidden" name="levels_json" value={JSON.stringify(levels)} />

        {state.error && (
          <p className="text-sm text-danger" role="alert">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Création..." : "Créer la structure"}
        </button>
      </form>

      <Link href="/structures" className="link text-sm">
        Annuler
      </Link>
    </main>
  );
}
