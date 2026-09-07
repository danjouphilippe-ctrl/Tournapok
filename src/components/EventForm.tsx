"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useActionState } from "react";
import type { EventFormState } from "@/app/evenements/actions";
import { EventLogoPicker } from "@/components/EventLogoPicker";

const emptyState: EventFormState = { error: null };

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

export type EventFormValues = {
  name: string;
  description: string;
  scheduledAt: string;
  location: string;
  logoUrl: string;
  organisation: string;
  maxPlayers: number | null;
  clubId: string;
  visibility: string;
};

const defaultValues: EventFormValues = {
  name: "",
  description: "",
  scheduledAt: "",
  location: "",
  logoUrl: "",
  organisation: "",
  maxPlayers: null,
  clubId: "",
  visibility: "private",
};

export function EventForm({
  action,
  clubOptions,
  title,
  submitLabel,
  pendingLabel,
  cancelHref,
  initial,
  userId,
}: {
  action: (state: EventFormState, formData: FormData) => Promise<EventFormState>;
  clubOptions: { id: string; name: string }[];
  title: string;
  submitLabel: string;
  pendingLabel: string;
  cancelHref: string;
  initial?: Partial<EventFormValues>;
  userId: string;
}) {
  const values = { ...defaultValues, ...initial };
  const [state, formAction, pending] = useActionState(action, emptyState);
  const [organisationValue, setOrganisationValue] = useState(values.organisation);
  const [clubId, setClubId] = useState(values.clubId);
  const [visibility, setVisibility] = useState(values.visibility);

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

      <form action={formAction} onSubmit={computeScheduledAt} className="flex flex-col gap-6">
        <Field label="Logo de l'évènement" optional>
          <EventLogoPicker userId={userId} initialValue={values.logoUrl} />
          <span className="text-xs text-ink-faint">
            Format recommandé : au moins 800 × 400 pixels (ratio 2:1) pour un rendu net.
          </span>
        </Field>

        <Field label="Nom de l'évènement">
          <input name="name" type="text" required defaultValue={values.name} className="input" />
        </Field>

        <Field label="Description" optional>
          <textarea name="description" rows={3} defaultValue={values.description} className="input" />
        </Field>

        <div className="flex flex-wrap items-end gap-3">
          <Field label="Date">
            <input
              ref={dateRef}
              type="date"
              required
              defaultValue={initialDateTime.date}
              className="input"
            />
          </Field>
          <Field label="Heure">
            <input
              ref={timeRef}
              type="time"
              required
              defaultValue={initialDateTime.time}
              className="input"
            />
          </Field>
        </div>
        <input ref={scheduledAtRef} type="hidden" name="scheduled_at" />

        <Field label="Lieu">
          <input
            name="location"
            type="text"
            required
            defaultValue={values.location}
            className="input"
          />
        </Field>

        <Field label="Nombre de joueurs max" optional>
          <input
            name="max_players"
            type="number"
            min={1}
            defaultValue={values.maxPlayers ?? undefined}
            className="input"
          />
        </Field>

        <label className="flex flex-col gap-1 text-sm">
          <span className="flex items-baseline justify-between">
            <span className="font-medium">Organisation <span className="ml-1.5 text-xs font-normal text-ink-faint">optionnel</span></span>
            <span className="text-xs text-ink-faint">{organisationValue.length}/500</span>
          </span>
          <textarea
            name="organisation"
            rows={4}
            maxLength={500}
            value={organisationValue}
            onChange={(e) => setOrganisationValue(e.target.value)}
            placeholder="Ex : rendez-vous sur place avec à boire et à manger. Amenez vos duvets et oreillers. Philippe ramène les tapis de poker et Charles les mallettes de jetons."
            className="input"
          />
        </label>

        <Field label="Club" optional>
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

function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    /* min-w-[8rem] : sur un écran de téléphone, deux champs sur une même
     * ligne deviennent illisibles — mieux vaut qu'ils passent à la ligne. */
    <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-sm">
      <span className="font-medium">
        {label}
        {optional && <span className="ml-1.5 text-xs font-normal text-ink-faint">optionnel</span>}
      </span>
      {children}
    </label>
  );
}
