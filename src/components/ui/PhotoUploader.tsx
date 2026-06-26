import React, { useRef } from 'react';
import { resizeImage } from '../../utils/imageUtils';

interface Props {
  onPhoto: (dataUrl: string) => void;
  label?: string;
  multiple?: boolean;
  count?: number;
}

export function PhotoUploader({ onPhoto, label = '📷 Choisir une photo', multiple = false, count = 1 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, count);
    for (const file of files) {
      const dataUrl = await resizeImage(file, 900);
      onPhoto(dataUrl);
    }
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <label className="flex flex-col items-center gap-3 cursor-pointer group">
      <div className="border-2 border-dashed border-stone-600 group-hover:border-amber-500 rounded-2xl p-8 text-center transition-colors">
        <div className="text-5xl mb-3">📸</div>
        <p className="text-stone-300 font-medium">{label}</p>
        <p className="text-stone-500 text-sm mt-1">JPG, PNG, WEBP — max 900px</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={handleChange}
        className="sr-only"
      />
    </label>
  );
}
