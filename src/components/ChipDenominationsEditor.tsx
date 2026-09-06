"use client";

import type { ChipDenominationInput } from "@/app/jetons/actions";

export function defaultDenomination(): ChipDenominationInput {
  return { color: "", value: 1 };
}

const fieldClass =
  "w-28 rounded-md border border-line bg-surface px-2 py-1 text-ink focus:border-accent focus:outline-none";

export function ChipDenominationsEditor({
  denominations,
  onChange,
}: {
  denominations: ChipDenominationInput[];
  onChange: (denominations: ChipDenominationInput[]) => void;
}) {
  function updateDenomination(index: number, patch: Partial<ChipDenominationInput>) {
    onChange(denominations.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  function removeDenomination(index: number) {
    onChange(denominations.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-2">
      {denominations.map((d, index) => (
        <div
          key={index}
          className="flex flex-wrap items-end gap-2 rounded-lg border border-line bg-surface/50 p-3"
        >
          <label className="flex flex-col text-xs text-ink-soft">
            Couleur
            <input
              type="text"
              value={d.color}
              placeholder="Ex: blanc"
              onChange={(e) => updateDenomination(index, { color: e.target.value })}
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col text-xs text-ink-soft">
            Valeur
            <input
              type="number"
              min={1}
              value={d.value}
              onChange={(e) => updateDenomination(index, { value: Number(e.target.value) })}
              className={fieldClass}
            />
          </label>
          <button
            type="button"
            onClick={() => removeDenomination(index)}
            className="link-danger ml-auto text-sm"
          >
            Retirer
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...denominations, defaultDenomination()])}
        className="btn btn-secondary btn-sm w-fit"
      >
        + Dénomination
      </button>
    </div>
  );
}
