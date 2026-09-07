"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ClubFormState } from "@/app/clubs/actions";
import { ClubBannerPicker } from "@/components/ClubBannerPicker";
import { ClubLogoPicker } from "@/components/ClubLogoPicker";

const emptyState: ClubFormState = { error: null };

export type ClubFormValues = {
  name: string;
  description: string;
  location: string;
  logoUrl: string;
  bannerUrl: string;
  legalForm: string;
  phone: string;
  email: string;
  address: string;
  visibility: string;
};

const defaultValues: ClubFormValues = {
  name: "",
  description: "",
  location: "",
  logoUrl: "",
  bannerUrl: "",
  legalForm: "",
  phone: "",
  email: "",
  address: "",
  visibility: "private",
};

export function ClubForm({
  action,
  title,
  submitLabel,
  pendingLabel,
  cancelHref,
  initial,
  userId,
}: {
  action: (state: ClubFormState, formData: FormData) => Promise<ClubFormState>;
  title: string;
  submitLabel: string;
  pendingLabel: string;
  cancelHref: string;
  initial?: Partial<ClubFormValues>;
  userId: string;
}) {
  const values = { ...defaultValues, ...initial };
  const [state, formAction, pending] = useActionState(action, emptyState);

  return (
    <main className="page">
      <h1 className="text-2xl font-semibold">{title}</h1>

      <form action={formAction} className="flex flex-col gap-6">
        <Field label="Bannière" optional>
          <ClubBannerPicker userId={userId} initialValue={values.bannerUrl} />
        </Field>

        <Field label="Logo" optional>
          <ClubLogoPicker userId={userId} initialValue={values.logoUrl} />
        </Field>

        <Field label="Nom du club">
          <input name="name" type="text" required defaultValue={values.name} className="input" />
        </Field>

        <Field label="Description / philosophie" optional>
          <textarea name="description" rows={3} defaultValue={values.description} className="input" />
        </Field>

        <Field label="Lieu habituel" optional>
          <input name="location" type="text" defaultValue={values.location} className="input" />
        </Field>

        <Field label="Forme juridique" optional>
          <input
            name="legal_form"
            type="text"
            placeholder="Ex: Association loi 1901"
            defaultValue={values.legalForm}
            className="input"
          />
        </Field>

        <Field label="Téléphone" optional>
          <input name="phone" type="tel" defaultValue={values.phone} className="input" />
        </Field>

        <Field label="Email" optional>
          <input name="email" type="email" defaultValue={values.email} className="input" />
        </Field>

        <Field label="Adresse" optional>
          <input name="address" type="text" defaultValue={values.address} className="input" />
        </Field>

        <Field label="Visibilité">
          <select name="visibility" defaultValue={values.visibility} className="input">
            <option value="private">Privé — sur invitation uniquement</option>
            <option value="public">Public — les joueurs peuvent demander à adhérer</option>
          </select>
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
    <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-sm">
      <span className="font-medium">
        {label}
        {optional && <span className="ml-1.5 text-xs font-normal text-ink-faint">optionnel</span>}
      </span>
      {children}
    </label>
  );
}
