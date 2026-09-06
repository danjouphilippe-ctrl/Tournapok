"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ClubFormState } from "@/app/clubs/actions";

const emptyState: ClubFormState = { error: null };

export type ClubFormValues = {
  name: string;
  description: string;
  location: string;
  logoUrl: string;
};

const defaultValues: ClubFormValues = {
  name: "",
  description: "",
  location: "",
  logoUrl: "",
};

export function ClubForm({
  action,
  title,
  submitLabel,
  pendingLabel,
  cancelHref,
  initial,
}: {
  action: (state: ClubFormState, formData: FormData) => Promise<ClubFormState>;
  title: string;
  submitLabel: string;
  pendingLabel: string;
  cancelHref: string;
  initial?: Partial<ClubFormValues>;
}) {
  const values = { ...defaultValues, ...initial };
  const [state, formAction, pending] = useActionState(action, emptyState);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-8 px-4 py-12">
      <h1 className="text-2xl font-semibold">{title}</h1>

      <form action={formAction} className="flex flex-col gap-6">
        <Field label="Nom du club">
          <input name="name" type="text" required defaultValue={values.name} className="input" />
        </Field>

        <Field label="Description (optionnel)">
          <textarea name="description" rows={3} defaultValue={values.description} className="input" />
        </Field>

        <Field label="Lieu habituel (optionnel)">
          <input name="location" type="text" defaultValue={values.location} className="input" />
        </Field>

        <Field label="Logo (URL, optionnel)">
          <input name="logo_url" type="url" defaultValue={values.logoUrl} className="input" />
        </Field>

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
