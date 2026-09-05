"use client";

import { useState } from "react";

export function ConfirmButton({
  label,
  confirmLabel = "Valider",
  message,
  onConfirm,
  className,
  disabled,
}: {
  label: string;
  confirmLabel?: string;
  message: string;
  onConfirm: () => Promise<{ error?: string } | void> | { error?: string } | void;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setChecked(false);
    setError(null);
  }

  async function handleConfirm() {
    setPending(true);
    setError(null);
    const result = await onConfirm();
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    close();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={className}
      >
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="card flex w-full max-w-sm flex-col gap-4">
            <p className="font-medium">{message}</p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
              />
              Je confirme
            </label>
            {error && (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={close} disabled={pending} className="btn btn-secondary btn-sm">
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!checked || pending}
                className="btn btn-primary btn-sm"
              >
                {pending ? "..." : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
