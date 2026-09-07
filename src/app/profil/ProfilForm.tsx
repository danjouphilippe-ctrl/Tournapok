"use client";

import { useState } from "react";
import { useActionState } from "react";
import { updateProfile, type ProfileFormState } from "@/app/profil/actions";

const initialState: ProfileFormState = { error: null };

const PLAYER_TYPE_OPTIONS = [
  { value: "", label: "Non renseigné" },
  { value: "serre_passif", label: "Serré-passif (Rock)" },
  { value: "serre_agressif", label: "Serré-agressif (TAG)" },
  { value: "loose_passif", label: "Loose-passif (Calling Station)" },
  { value: "loose_agressif", label: "Loose-agressif (LAG)" },
];

export function ProfilForm({
  pseudo,
  city,
  playerType,
  playerTypeCustom,
  age,
  bio,
}: {
  pseudo: string;
  city: string;
  playerType: string;
  playerTypeCustom: string;
  age: number | null;
  bio: string;
}) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);
  const [bioValue, setBioValue] = useState(bio);

  return (
    <form action={formAction} className="card flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Pseudo</span>
        <input
          name="pseudo"
          type="text"
          required
          defaultValue={pseudo}
          className="input"
        />
      </label>

      {/* items-end : les champs restent alignés même si un libellé passe
        * sur deux lignes. */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-sm">
          <span className="font-medium">Ville <span className="ml-1.5 text-xs font-normal text-ink-faint">optionnel</span></span>
          <input name="city" type="text" defaultValue={city} className="input" />
        </label>
        <label className="flex w-28 flex-col gap-1 text-sm">
          <span className="font-medium">Âge <span className="ml-1.5 text-xs font-normal text-ink-faint">optionnel</span></span>
          <input name="age" type="number" min={0} max={120} defaultValue={age ?? ""} className="input" />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Type de joueur <span className="ml-1.5 text-xs font-normal text-ink-faint">optionnel</span></span>
        <select name="player_type" defaultValue={playerType} className="input">
          {PLAYER_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Type de joueur maison <span className="ml-1.5 text-xs font-normal text-ink-faint">optionnel</span></span>
        <input
          name="player_type_custom"
          type="text"
          maxLength={100}
          placeholder="Ex : passif endormi, agressif le dimanche..."
          defaultValue={playerTypeCustom}
          className="input"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="flex items-baseline justify-between">
          <span className="font-medium">Bio <span className="ml-1.5 text-xs font-normal text-ink-faint">optionnel</span></span>
          <span className="text-xs text-ink-faint">{bioValue.length}/500</span>
        </span>
        <textarea
          name="bio"
          rows={4}
          maxLength={500}
          value={bioValue}
          onChange={(e) => setBioValue(e.target.value)}
          placeholder="Quelques mots sur toi, ton style, tes bad beats préférés..."
          className="input"
        />
      </label>

      {state.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}
