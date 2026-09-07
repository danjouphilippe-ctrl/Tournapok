"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useActionState } from "react";
import type { ChipRackEntryInput, PayoutInput, TournamentFormState } from "@/app/tournois/actions";
import { BlindLevelsEditor, defaultLevel } from "@/components/BlindLevelsEditor";
import { PayoutsEditor } from "@/components/PayoutsEditor";
import { ChipRackEditor } from "@/components/ChipRackEditor";
import { TournamentChipPicker } from "@/components/TournamentChipPicker";
import { TournamentBannerPicker } from "@/components/TournamentBannerPicker";
import type { StructureLevelInput } from "@/app/structures/actions";
import type { ChipSetOption } from "@/lib/chipSetOptions";

const emptyState: TournamentFormState = { error: null };

function splitLocalDateTime(iso: string): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export type TournoiFormValues = {
  name: string;
  description: string;
  scheduledAt: string;
  location: string;
  minPlayers: number;
  maxPlayers: number | null;
  tableSize: number;
  buyIn: number;
  startingStack: number;
  rebuyEnabled: boolean;
  rebuyMaxPerPlayer: number | null;
  rebuyPrice: number | null;
  rebuyChips: number | null;
  rebuyStackThreshold: number | null;
  rebuyUntilLevel: number | null;
  addonEnabled: boolean;
  addonPrice: number | null;
  addonChips: number | null;
  addonAtLevel: number | null;
  bountyEnabled: boolean;
  bountyAmount: number | null;
  bountyProgressive: boolean;
  lateRegEnabled: boolean;
  lateRegUntilLevel: number | null;
  guaranteeAmount: number | null;
  payoutPlaces: number | null;
  payouts: PayoutInput[];
  blindStructureId: string;
  customLevels: StructureLevelInput[];
  bannerUrl: string;
  chipImageUrl: string;
  chipSetId: string;
  chipRack: ChipRackEntryInput[];
  clubId: string;
  visibility: string;
};

const defaultValues: TournoiFormValues = {
  name: "",
  description: "",
  scheduledAt: "",
  location: "",
  minPlayers: 2,
  maxPlayers: null,
  tableSize: 9,
  buyIn: 20,
  startingStack: 10000,
  rebuyEnabled: false,
  rebuyMaxPerPlayer: null,
  rebuyPrice: null,
  rebuyChips: null,
  rebuyStackThreshold: null,
  rebuyUntilLevel: null,
  addonEnabled: false,
  addonPrice: null,
  addonChips: null,
  addonAtLevel: null,
  bountyEnabled: false,
  bountyAmount: null,
  bountyProgressive: false,
  lateRegEnabled: false,
  lateRegUntilLevel: null,
  guaranteeAmount: null,
  payoutPlaces: null,
  payouts: [],
  blindStructureId: "",
  customLevels: [defaultLevel()],
  bannerUrl: "",
  chipImageUrl: "",
  chipSetId: "",
  chipRack: [],
  clubId: "",
  visibility: "private",
};

export function TournoiForm({
  structureOptions,
  chipSetOptions,
  clubOptions,
  action,
  title,
  submitLabel,
  pendingLabel,
  cancelHref,
  initial,
  userId,
  eventId,
}: {
  structureOptions: { id: string; label: string }[];
  chipSetOptions: ChipSetOption[];
  clubOptions: { id: string; name: string }[];
  action: (state: TournamentFormState, formData: FormData) => Promise<TournamentFormState>;
  title: string;
  submitLabel: string;
  pendingLabel: string;
  cancelHref: string;
  initial?: Partial<TournoiFormValues>;
  userId: string;
  eventId?: string;
}) {
  const values = { ...defaultValues, ...initial };
  const [state, formAction, pending] = useActionState(action, emptyState);

  const [blindStructureId, setBlindStructureId] = useState(values.blindStructureId);
  const [customLevels, setCustomLevels] = useState(values.customLevels);
  const [chipSetId, setChipSetId] = useState(values.chipSetId);
  const [startingStack, setStartingStack] = useState(values.startingStack);
  const [clubId, setClubId] = useState(values.clubId);
  const [visibility, setVisibility] = useState(values.visibility);

  const selectedChipSet = chipSetOptions.find((s) => s.id === chipSetId);

  const [rebuyEnabled, setRebuyEnabled] = useState(values.rebuyEnabled);
  const [addonEnabled, setAddonEnabled] = useState(values.addonEnabled);
  const [bountyEnabled, setBountyEnabled] = useState(values.bountyEnabled);
  const [lateRegEnabled, setLateRegEnabled] = useState(values.lateRegEnabled);

  const dateRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);
  const scheduledAtRef = useRef<HTMLInputElement>(null);

  function computeScheduledAt() {
    const date = dateRef.current?.value;
    const time = timeRef.current?.value || "00:00";
    if (scheduledAtRef.current) {
      scheduledAtRef.current.value = date ? new Date(`${date}T${time}`).toISOString() : "";
    }
  }

  const initialDateTime = splitLocalDateTime(values.scheduledAt);

  return (
    <main className="page">
      <h1 className="text-2xl font-semibold">{title}</h1>

      <form action={formAction} onSubmit={computeScheduledAt} className="flex flex-col gap-8">
        {eventId && <input type="hidden" name="event_id" value={eventId} />}

        <Section title="Bannière du tournoi">
          <TournamentBannerPicker userId={userId} initialValue={values.bannerUrl} />
        </Section>

        <Section title="Jeton du tournoi">
          <TournamentChipPicker userId={userId} initialValue={values.chipImageUrl} />
        </Section>

        <Section title="Informations générales">
          <Field label="Nom du tournoi">
            <input name="name" type="text" required defaultValue={values.name} className="input" />
          </Field>
          <Field label="Description (optionnel)">
            <textarea name="description" rows={2} defaultValue={values.description} className="input" />
          </Field>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Date (optionnel)">
              <input
                ref={dateRef}
                type="date"
                defaultValue={initialDateTime.date}
                className="input"
              />
            </Field>
            <Field label="Heure (optionnel)">
              <input
                ref={timeRef}
                type="time"
                defaultValue={initialDateTime.time}
                className="input"
              />
            </Field>
          </div>
          <input ref={scheduledAtRef} type="hidden" name="scheduled_at" />
          <Field label="Lieu (optionnel)">
            <input name="location" type="text" defaultValue={values.location} className="input" />
          </Field>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Joueurs min">
              <input
                name="min_players"
                type="number"
                min={2}
                defaultValue={values.minPlayers}
                required
                className="input"
              />
            </Field>
            <Field label="Joueurs max (optionnel)">
              <input
                name="max_players"
                type="number"
                min={2}
                defaultValue={values.maxPlayers ?? undefined}
                className="input"
              />
            </Field>
            <Field label="Joueurs / table">
              <input
                name="table_size"
                type="number"
                min={2}
                defaultValue={values.tableSize}
                required
                className="input"
              />
            </Field>
          </div>
        </Section>

        <Section title="Club & visibilité">
          <Field label="Club (optionnel)">
            <select
              value={clubId}
              onChange={(e) => {
                setClubId(e.target.value);
                if (!e.target.value && visibility === "club") setVisibility("private");
              }}
              className="input"
            >
              <option value="">— Aucun club —</option>
              {clubOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <input type="hidden" name="club_id" value={clubId} />
          <Field label="Visibilité">
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="input"
            >
              <option value="private">Privé — sur invitation uniquement</option>
              <option value="club" disabled={!clubId}>
                Club — visible par les membres du club
              </option>
              <option value="public">Public — visible par tous les joueurs connectés</option>
            </select>
          </Field>
          <input type="hidden" name="visibility" value={visibility} />
        </Section>

        <Section title="Buy-in & tapis de départ">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Buy-in (€)">
              <input
                name="buy_in"
                type="number"
                min={0}
                defaultValue={values.buyIn}
                required
                className="input"
              />
            </Field>
            <Field label="Tapis de départ (jetons)">
              <input
                name="starting_stack"
                type="number"
                min={0}
                step={100}
                value={startingStack}
                onChange={(e) => setStartingStack(Number(e.target.value))}
                required
                className="input"
              />
            </Field>
          </div>
        </Section>

        <Section title="Jetons de la cave de départ">
          <Field label="Jeu de jetons">
            <select
              value={chipSetId}
              onChange={(e) => setChipSetId(e.target.value)}
              className="input"
            >
              <option value="">— Aucun —</option>
              {chipSetOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <input type="hidden" name="chip_set_id" value={chipSetId} />
          {selectedChipSet && selectedChipSet.denominations.length > 0 && (
            <ChipRackEditor
              key={selectedChipSet.id}
              denominations={selectedChipSet.denominations}
              initialQuantities={values.chipRack}
              targetTotal={startingStack}
            />
          )}
        </Section>

        <Section title="Recaves">
          <Toggle
            name="rebuy_enabled"
            label="Autoriser les recaves"
            checked={rebuyEnabled}
            onChange={setRebuyEnabled}
          />
          {rebuyEnabled && (
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Nombre max par joueur (vide = illimité)">
                <input
                  name="rebuy_max_per_player"
                  type="number"
                  min={1}
                  defaultValue={values.rebuyMaxPerPlayer ?? undefined}
                  className="input"
                />
              </Field>
              <Field label="Prix (€)">
                <input
                  name="rebuy_price"
                  type="number"
                  min={0}
                  defaultValue={values.rebuyPrice ?? undefined}
                  className="input"
                />
              </Field>
              <Field label="Jetons">
                <input
                  name="rebuy_chips"
                  type="number"
                  min={0}
                  defaultValue={values.rebuyChips ?? undefined}
                  className="input"
                />
              </Field>
              <Field label="Autorisée si tapis ≤ (vide = toujours)">
                <input
                  name="rebuy_stack_threshold"
                  type="number"
                  min={0}
                  defaultValue={values.rebuyStackThreshold ?? undefined}
                  className="input"
                />
              </Field>
              <Field label="Jusqu'au niveau (vide = illimité)">
                <input
                  name="rebuy_until_level"
                  type="number"
                  min={1}
                  defaultValue={values.rebuyUntilLevel ?? undefined}
                  className="input"
                />
              </Field>
            </div>
          )}
        </Section>

        <Section title="Add-on">
          <Toggle
            name="addon_enabled"
            label="Autoriser l'add-on"
            checked={addonEnabled}
            onChange={setAddonEnabled}
          />
          {addonEnabled && (
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Prix (€)">
                <input
                  name="addon_price"
                  type="number"
                  min={0}
                  defaultValue={values.addonPrice ?? undefined}
                  className="input"
                />
              </Field>
              <Field label="Jetons">
                <input
                  name="addon_chips"
                  type="number"
                  min={0}
                  defaultValue={values.addonChips ?? undefined}
                  className="input"
                />
              </Field>
              <Field label="À partir du niveau">
                <input
                  name="addon_at_level"
                  type="number"
                  min={1}
                  defaultValue={values.addonAtLevel ?? undefined}
                  className="input"
                />
              </Field>
            </div>
          )}
        </Section>

        <Section title="Bounty (prime à l'élimination)">
          <Toggle
            name="bounty_enabled"
            label="Activer le bounty"
            checked={bountyEnabled}
            onChange={setBountyEnabled}
          />
          {bountyEnabled && (
            <div className="flex flex-wrap items-center gap-3">
              <Field label="Montant par joueur (€)">
                <input
                  name="bounty_amount"
                  type="number"
                  min={0}
                  defaultValue={values.bountyAmount ?? undefined}
                  className="input"
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="bounty_progressive"
                  defaultChecked={values.bountyProgressive}
                />
                Progressif (PKO) — la moitié de la prime s&apos;ajoute à celle de l&apos;éliminateur
              </label>
            </div>
          )}
        </Section>

        <Section title="Structure de blindes">
          <Field label="Choisir une structure existante">
            <select
              value={blindStructureId}
              onChange={(e) => setBlindStructureId(e.target.value)}
              className="input"
            >
              <option value="">— Structure personnalisée —</option>
              {structureOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <input type="hidden" name="blind_structure_id" value={blindStructureId} />

          {!blindStructureId && (
            <>
              <BlindLevelsEditor levels={customLevels} onChange={setCustomLevels} />
              <input
                type="hidden"
                name="custom_levels_json"
                value={JSON.stringify(customLevels)}
              />
            </>
          )}
        </Section>

        <Section title="Inscriptions tardives">
          <Toggle
            name="late_registration_enabled"
            label="Autoriser l'inscription après le début du tournoi"
            checked={lateRegEnabled}
            onChange={setLateRegEnabled}
          />
          {lateRegEnabled && (
            <Field label="Jusqu'au niveau">
              <input
                name="late_registration_until_level"
                type="number"
                min={1}
                defaultValue={values.lateRegUntilLevel ?? undefined}
                className="input"
              />
            </Field>
          )}
        </Section>

        <Section title="Prize pool & répartition des gains">
          <Field label="Garantie (€, optionnel)">
            <input
              name="guarantee_amount"
              type="number"
              min={0}
              defaultValue={values.guaranteeAmount ?? undefined}
              className="input max-w-[10rem]"
            />
          </Field>
          <PayoutsEditor
            initialPayouts={values.payouts}
            initialBuyIn={values.buyIn}
            initialRebuyPrice={values.rebuyPrice ?? 0}
            initialAddonPrice={values.addonPrice ?? 0}
            initialGuarantee={values.guaranteeAmount ?? 0}
          />
        </Section>

        {state.error && (
          <p className="text-sm text-danger" role="alert">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? pendingLabel : submitLabel}
        </button>
      </form>

      <Link href={cancelHref} className="link link-action text-sm">
        Annuler
      </Link>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3 border-t border-line pt-4">
      <legend className="eyebrow mb-1 px-0">{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    /* min-w-[8rem] : sur un écran de téléphone, trois champs sur une même
     * ligne deviennent illisibles — mieux vaut qu'ils passent à la ligne. */
    <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  name,
  label,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
