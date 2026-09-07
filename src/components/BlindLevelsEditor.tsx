"use client";

import type { StructureLevelInput } from "@/app/structures/actions";

export function defaultLevel(): StructureLevelInput {
  return {
    levelNumber: 0,
    isBreak: false,
    smallBlind: 25,
    bigBlind: 50,
    ante: 0,
    durationMinutes: 20,
  };
}

export function defaultBreak(): StructureLevelInput {
  return {
    levelNumber: 0,
    isBreak: true,
    smallBlind: 0,
    bigBlind: 0,
    ante: 0,
    durationMinutes: 15,
  };
}

/* text-base explicite : sans lui, l'input hérite du text-xs du label et
 * iOS zoome la page au focus. */
const fieldClass =
  "w-20 rounded-md border border-line bg-surface px-2 py-1 text-base text-ink focus:border-accent";

export function BlindLevelsEditor({
  levels,
  onChange,
}: {
  levels: StructureLevelInput[];
  onChange: (levels: StructureLevelInput[]) => void;
}) {
  function updateLevel(index: number, patch: Partial<StructureLevelInput>) {
    onChange(levels.map((level, i) => (i === index ? { ...level, ...patch } : level)));
  }

  function removeLevel(index: number) {
    onChange(levels.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-2">
      {levels.map((level, index) => (
        <div
          key={index}
          className="flex flex-wrap items-end gap-2 rounded-lg border border-line bg-surface/50 p-3"
        >
          <span className="w-6 text-sm text-ink-soft">#{index + 1}</span>

          {level.isBreak ? (
            <>
              <span className="text-sm font-medium">Pause</span>
              <label className="flex flex-col text-xs text-ink-soft">
                Minutes
                <input
                  type="number"
                  min={1}
                  value={level.durationMinutes}
                  onChange={(e) =>
                    updateLevel(index, { durationMinutes: Number(e.target.value) })
                  }
                  className={fieldClass}
                />
              </label>
            </>
          ) : (
            <>
              <label className="flex flex-col text-xs text-ink-soft">
                Petite blinde
                <input
                  type="number"
                  min={0}
                  value={level.smallBlind}
                  onChange={(e) =>
                    updateLevel(index, { smallBlind: Number(e.target.value) })
                  }
                  className={fieldClass}
                />
              </label>
              <label className="flex flex-col text-xs text-ink-soft">
                Grosse blinde
                <input
                  type="number"
                  min={0}
                  value={level.bigBlind}
                  onChange={(e) =>
                    updateLevel(index, { bigBlind: Number(e.target.value) })
                  }
                  className={fieldClass}
                />
              </label>
              <label className="flex flex-col text-xs text-ink-soft">
                Ante
                <input
                  type="number"
                  min={0}
                  value={level.ante}
                  onChange={(e) => updateLevel(index, { ante: Number(e.target.value) })}
                  className={`${fieldClass} w-16`}
                />
              </label>
              <label className="flex flex-col text-xs text-ink-soft">
                Minutes
                <input
                  type="number"
                  min={1}
                  value={level.durationMinutes}
                  onChange={(e) =>
                    updateLevel(index, { durationMinutes: Number(e.target.value) })
                  }
                  className={`${fieldClass} w-16`}
                />
              </label>
            </>
          )}

          <button type="button" onClick={() => removeLevel(index)} className="link-danger link-action ml-auto text-sm">
            Retirer
          </button>
        </div>
      ))}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange([...levels, defaultLevel()])}
          className="btn btn-secondary btn-sm"
        >
          + Niveau
        </button>
        <button
          type="button"
          onClick={() => onChange([...levels, defaultBreak()])}
          className="btn btn-secondary btn-sm"
        >
          + Pause
        </button>
      </div>
    </div>
  );
}
