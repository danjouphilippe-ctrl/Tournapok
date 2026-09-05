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
};

const defaultValues: EventFormValues = {
  name: "",
  description: "",
  scheduledAt: "",
  location: "",
  logoUrl: "",
  organisation: "",
  maxPlayers: null,
};

export function EventForm({
  action,
  title,
  submitLabel,
  pendingLabel,
  cancelHref,
  initial,
  userId,
}: {
  action: (state: EventFormState, formData: FormData) => Promise<EventFormState>;
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
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-8 px-4 py-12">
      <h1 className="text-2xl font-semibold">{title}</h1>

      <form action={formAction} onSubmit={computeScheduledAt} className="flex flex-col gap-6">
        <Field label="Logo de l'évènement (optionnel)">
          <EventLogoPicker userId={userId} initialValue={values.logoUrl} />
          <span className="text-xs text-ink-faint">
            Format recommandé : au moins 800 × 400 pixels (ratio 2:1) pour un rendu net.
          </span>
        </Field>

        <Field label="Nom de l'évènement">
          <input name="name" type="text" required defaultValue={values.name} className="input" />
        </Field>

        <Field label="Description (optionnel)">
          <textarea name="description" rows={3} defaultValue={values.description} className="input" />
        </Field>

        <div className="flex gap-3">
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

        <Field label="Nombre de joueurs max (optionnel)">
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
            <span className="font-medium">Organisation (optionnel)</span>
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

        {state.error && (
          <p className="text-sm text-danger" role="alert">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? pendingLabel : submitLabel}
        </button>
      </form>

      <Link href={cancelHref} className="link text-sm">
        Annuler
      </Link>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}
