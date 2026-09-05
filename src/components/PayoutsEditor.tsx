"use client";

import { useMemo, useState } from "react";
import type { PayoutInput } from "@/app/tournois/actions";

function autoDistribute(n: number): number[] {
  if (n <= 0) return [];
  const weights = Array.from({ length: n }, (_, i) => n - i);
  const total = weights.reduce((a, b) => a + b, 0);
  const rounded = weights.map((w) => Math.round((w / total) * 100));
  const diff = 100 - rounded.reduce((a, b) => a + b, 0);
  rounded[0] += diff;
  return rounded;
}

export function PayoutsEditor({
  initialPayouts,
  initialBuyIn,
  initialRebuyPrice,
  initialAddonPrice,
  initialGuarantee,
}: {
  initialPayouts: PayoutInput[];
  initialBuyIn: number;
  initialRebuyPrice: number;
  initialAddonPrice: number;
  initialGuarantee: number;
}) {
  const [percentages, setPercentages] = useState<number[]>(
    initialPayouts.length > 0
      ? initialPayouts.sort((a, b) => a.place - b.place).map((p) => p.percentage)
      : [50, 30, 20],
  );

  const [simEntries, setSimEntries] = useState(10);
  const [simRebuys, setSimRebuys] = useState(0);
  const [simAddons, setSimAddons] = useState(0);
  const [simBuyIn, setSimBuyIn] = useState(initialBuyIn || 20);
  const [simRebuyPrice, setSimRebuyPrice] = useState(initialRebuyPrice || 0);
  const [simAddonPrice, setSimAddonPrice] = useState(initialAddonPrice || 0);
  const [simGuarantee, setSimGuarantee] = useState(initialGuarantee || 0);

  const total = percentages.reduce((a, b) => a + b, 0);

  const prizePool =
    simEntries * simBuyIn +
    simRebuys * simRebuyPrice +
    simAddons * simAddonPrice +
    simGuarantee;

  const payoutsJson = useMemo(
    () => JSON.stringify(percentages.map((percentage, i) => ({ place: i + 1, percentage }))),
    [percentages],
  );

  function updatePercentage(index: number, value: number) {
    setPercentages((prev) => prev.map((p, i) => (i === index ? value : p)));
  }

  function addPlace() {
    setPercentages((prev) => [...prev, 0]);
  }

  function removePlace(index: number) {
    setPercentages((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {percentages.map((pct, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-16 shrink-0 whitespace-nowrap text-sm text-ink-soft">Place {i + 1}</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={pct}
              onChange={(e) => updatePercentage(i, Number(e.target.value))}
              className="input w-24"
            />
            <span className="text-sm text-ink-soft">%</span>
            {prizePool > 0 && (
              <span className="whitespace-nowrap text-sm text-ink-soft">
                ≈ {Math.round((prizePool * pct) / 100).toLocaleString("fr-FR")} €
              </span>
            )}
            <button type="button" onClick={() => removePlace(i)} className="link-danger ml-auto text-sm">
              Retirer
            </button>
          </div>
        ))}

        <div className="flex items-center gap-3">
          <button type="button" onClick={addPlace} className="btn btn-secondary btn-sm">
            + Place
          </button>
          <button
            type="button"
            onClick={() => setPercentages(autoDistribute(percentages.length || 3))}
            className="btn btn-secondary btn-sm"
          >
            Répartition auto
          </button>
          <span className={`text-sm ${Math.abs(total - 100) < 0.01 ? "text-success" : "text-danger"}`}>
            Total : {total.toFixed(1)} %
          </span>
        </div>
      </div>

      <input type="hidden" name="payouts_json" value={payoutsJson} />

      <details className="card">
        <summary className="cursor-pointer text-sm font-medium">
          Simulateur (tester avant de valider)
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-ink-soft">Inscrits</span>
              <input
                type="number"
                min={0}
                value={simEntries}
                onChange={(e) => setSimEntries(Number(e.target.value))}
                className="input w-24"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-ink-soft">Recaves</span>
              <input
                type="number"
                min={0}
                value={simRebuys}
                onChange={(e) => setSimRebuys(Number(e.target.value))}
                className="input w-24"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-ink-soft">Add-ons</span>
              <input
                type="number"
                min={0}
                value={simAddons}
                onChange={(e) => setSimAddons(Number(e.target.value))}
                className="input w-24"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-ink-soft">Buy-in (€)</span>
              <input
                type="number"
                min={0}
                value={simBuyIn}
                onChange={(e) => setSimBuyIn(Number(e.target.value))}
                className="input w-24"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-ink-soft">Prix recave (€)</span>
              <input
                type="number"
                min={0}
                value={simRebuyPrice}
                onChange={(e) => setSimRebuyPrice(Number(e.target.value))}
                className="input w-24"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-ink-soft">Prix add-on (€)</span>
              <input
                type="number"
                min={0}
                value={simAddonPrice}
                onChange={(e) => setSimAddonPrice(Number(e.target.value))}
                className="input w-24"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-ink-soft">Garantie (€)</span>
              <input
                type="number"
                min={0}
                value={simGuarantee}
                onChange={(e) => setSimGuarantee(Number(e.target.value))}
                className="input w-24"
              />
            </label>
          </div>

          <p className="text-sm font-medium">
            Prize pool simulé : {prizePool.toLocaleString("fr-FR")} €
          </p>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-soft">
                <th className="py-1 pr-2">Place</th>
                <th className="py-1 pr-2">%</th>
                <th className="py-1 pr-2">Montant</th>
              </tr>
            </thead>
            <tbody>
              {percentages.map((pct, i) => (
                <tr key={i} className="border-b border-line/60">
                  <td className="py-1 pr-2">#{i + 1}</td>
                  <td className="py-1 pr-2">{pct}%</td>
                  <td className="py-1 pr-2">
                    {Math.round((prizePool * pct) / 100).toLocaleString("fr-FR")} €
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
