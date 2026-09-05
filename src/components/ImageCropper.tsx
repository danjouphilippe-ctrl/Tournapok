"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossible de charger l'image."));
    img.src = src;
  });
}

async function getCroppedBlob(
  imageSrc: string,
  area: Area,
  outputWidth: number,
  outputHeight: number,
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Le recadrage a échoué.");

  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Le recadrage a échoué."))),
      "image/jpeg",
      0.9,
    );
  });
}

export function ImageCropper({
  imageSrc,
  title = "Ajuster l'image",
  aspect = 1,
  cropShape = "round",
  outputWidth = 512,
  outputHeight = 512,
  onCancel,
  onConfirm,
}: {
  imageSrc: string;
  title?: string;
  aspect?: number;
  cropShape?: "round" | "rect";
  outputWidth?: number;
  outputHeight?: number;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  async function handleValidate() {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    setError(null);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels, outputWidth, outputHeight);
      onConfirm(blob);
    } catch {
      setError("Le recadrage a échoué, réessaie.");
      setProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="card flex w-full max-w-sm flex-col gap-4">
        <h2 className="font-semibold">{title}</h2>

        <div className="relative h-72 w-full overflow-hidden rounded-lg bg-surface-2">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropShape}
            showGrid={cropShape === "rect"}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          Zoom
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="btn btn-secondary btn-sm"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleValidate}
            disabled={processing || !croppedAreaPixels}
            className="btn btn-primary btn-sm"
          >
            {processing ? "Enregistrement..." : "Valider"}
          </button>
        </div>
      </div>
    </div>
  );
}
