"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ImageCropper } from "@/components/ImageCropper";

const MAX_SIZE_BYTES = 3 * 1024 * 1024;

export function AvatarUploader({
  userId,
  avatarUrl,
  pseudo,
}: {
  userId: string;
  avatarUrl: string | null;
  pseudo: string;
}) {
  const [preview, setPreview] = useState(avatarUrl);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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
    const supabase = createClient();
    const path = `${userId}/avatar-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { upsert: true, contentType: "image/jpeg" });

    if (uploadError) {
      setError("Échec de l'envoi de la photo.");
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);

    setUploading(false);

    if (updateError) {
      setError("Impossible d'enregistrer la photo.");
      return;
    }

    setPreview(publicUrl);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt={pseudo}
          className="h-20 w-20 rounded-full border border-line object-cover"
        />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-line bg-surface-2 text-2xl font-medium text-ink-soft">
          {pseudo.slice(0, 1).toUpperCase()}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="btn btn-secondary btn-sm"
        >
          {uploading ? "Envoi..." : "Changer la photo"}
        </button>
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
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>

      {cropSrc && (
        <ImageCropper
          imageSrc={cropSrc}
          title="Ajuster la photo de profil"
          onCancel={closeCropper}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}
