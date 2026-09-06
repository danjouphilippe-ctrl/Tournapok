"use client";

import { useMemo, useState } from "react";
import type { ChipDenominationOption } from "@/lib/chipSetOptions";
import type { ChipRackEntryInput } from "@/app/tournois/actions";

export function ChipRackEditor({
  denominations,
  initialQuantities,
  targetTotal,
}: {
  denominations: ChipDenominationOption[];
  initialQuantities: ChipRackEntryInput[];
  targetTotal: number;
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const d of denominations) {
      map[d.id] = initialQuantities.find((q) => q.denominationId === d.id)?.quantity ?? 0;
    }
    return map;
  });

  const total = denominations.reduce((sum, d) => sum + (quantities[d.id] ?? 0) * d.value, 0);

  const rackJson = useMemo(
    () =>
      JSON.stringify(
        denominations
          .filter((d) => (quantities[d.id] ?? 0) > 0)
          .map((d) => ({ denominationId: d.id, value: d.value, quantity: quantities[d.id] })),
      ),
    [denominations, quantities],
  );

  function updateQuantity(id: string, value: number) {
    setQuantities((prev) => ({ ...prev, [id]: value }));
  }

  return (
    <div className="flex flex-col gap-2">
      {denominations.map((d) => (
        <div key={d.id} className="flex items-center gap-2">
          <span className="w-24 shrink-0 whitespace-nowrap text-sm text-ink-soft">
            {d.color} ({d.value})
          </span>
          <input
            type="number"
            min={0}
            value={quantities[d.id] ?? 0}
            onChange={(e) => updateQuantity(d.id, Number(e.target.value))}
            className="input w-24"
          />
          <span className="text-sm text-ink-soft">
            = {((quantities[d.id] ?? 0) * d.value).toLocaleString("fr-FR")}
          </span>
        </div>
      ))}

      <input type="hidden" name="chip_rack_json" value={rackJson} />

      <p className={`text-sm ${total === targetTotal ? "text-success" : "text-danger"}`}>
        Total : {total.toLocaleString("fr-FR")} / {targetTotal.toLocaleString("fr-FR")} jetons
      </p>
    </div>
  );
}
