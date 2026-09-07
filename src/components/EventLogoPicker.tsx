"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ImageCropper } from "@/components/ImageCropper";

const MAX_SIZE_BYTES = 3 * 1024 * 1024;

export function EventLogoPicker({
  userId,
  initialValue,
}: {
  userId: string;
  initialValue: string;
}) {
  const [selected, setSelected] = useState(initialValue);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileSelected(file: File) {
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Choisis une image.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("L'image doit faire moins de 3 Mo.");
      return;
    }

    setCropSrc(URL.createObjectURL(file));
  }

  function closeCropper() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleCropConfirm(blob: Blob) {
    closeCropper();
    setUploading(true);
    setError(null);
    const supabase = createClient();
    const path = `${userId}/logo-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("event-logos")
      .upload(path, blob, { upsert: true, contentType: "image/jpeg" });

    setUploading(false);

    if (uploadError) {
      setError("Échec de l'envoi de l'image.");
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("event-logos").getPublicUrl(path);

    setSelected(publicUrl);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {selected ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={selected}
            alt="Logo de l'évènement"
            className="h-16 w-32 rounded-lg border border-line object-cover"
          />
        ) : (
          <div className="flex h-16 w-32 items-center justify-center rounded-lg border border-line bg-surface-2 text-xs text-ink-faint">
            Aucun logo
          </div>
        )}
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="btn btn-secondary btn-sm"
          >
            {uploading ? "Envoi..." : "Importer un logo"}
          </button>
          {selected && (
            <button
              type="button"
              onClick={() => setSelected("")}
              className="link-danger link-action self-start text-xs"
            >
              Retirer le logo
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelected(file);
          }}
        />
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <input type="hidden" name="logo_url" value={selected} />

      {cropSrc && (
        <ImageCropper
          imageSrc={cropSrc}
          title="Ajuster le logo de l'évènement"
          aspect={2}
          cropShape="rect"
          outputWidth={800}
          outputHeight={400}
          onCancel={closeCropper}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}
