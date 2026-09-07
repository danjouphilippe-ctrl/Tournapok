"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ImageCropper } from "@/components/ImageCropper";

const MAX_SIZE_BYTES = 3 * 1024 * 1024;
const PRESET_COUNT = 20;
const PRESETS = Array.from(
  { length: PRESET_COUNT },
  (_, i) => `/chips/preset-${String(i + 1).padStart(2, "0")}.svg`,
);

export function TournamentChipPicker({
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
    const path = `${userId}/chip-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("tournament-chips")
      .upload(path, blob, { upsert: true, contentType: "image/jpeg" });

    setUploading(false);

    if (uploadError) {
      setError("Échec de l'envoi de l'image.");
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("tournament-chips").getPublicUrl(path);

    setSelected(publicUrl);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {selected ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={selected}
            alt="Jeton du tournoi"
            className="h-16 w-16 rounded-full border border-line object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-line bg-surface-2 text-xs text-ink-faint">
            Aucun
          </div>
        )}
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="btn btn-secondary btn-sm"
          >
            {uploading ? "Envoi..." : "Importer mon propre design"}
          </button>
          {selected && (
            <button
              type="button"
              onClick={() => setSelected("")}
              className="link-danger link-action self-start text-xs"
            >
              Retirer le jeton
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

      <p className="text-sm font-medium">Ou choisir un design existant</p>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
        {PRESETS.map((src) => (
          <button
            key={src}
            type="button"
            onClick={() => setSelected(src)}
            className={`h-12 w-12 rounded-full border-2 ${
              selected === src ? "border-accent" : "border-transparent"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full rounded-full object-cover" />
          </button>
        ))}
      </div>

      <input type="hidden" name="chip_image_url" value={selected} />

      {cropSrc && (
        <ImageCropper
          imageSrc={cropSrc}
          title="Ajuster le design du jeton"
          onCancel={closeCropper}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}
