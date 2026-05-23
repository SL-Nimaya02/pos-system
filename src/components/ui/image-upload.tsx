"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import toast from "react-hot-toast";

interface ImageUploadProps {
  value: string;          // current URL stored in DB
  onChange: (url: string) => void;
  bucket: string;         // used as folder name under public/images/
  folder?: string;        // alias — same as bucket if omitted
  label?: string;
  className?: string;
}

export function ImageUpload({ value, onChange, bucket, folder, label = "Image", className = "" }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef  = useRef<HTMLInputElement>(null);
  const uploadFolder = folder ?? bucket;

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file",   file);
      fd.append("folder", uploadFolder);

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();

      if (!res.ok) throw new Error(json?.error ?? "Upload failed");

      onChange(json.url);
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-surface-500 mb-1">{label}</label>

      {/* Preview */}
      {value && (
        <div className="relative w-full h-36 mb-2 rounded-xl overflow-hidden border border-surface-200 bg-surface-50 group">
          <img src={value} alt="preview" className="w-full h-full object-contain" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-1.5 right-1.5 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Drop zone */}
      {!value && (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          className="w-full h-36 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-surface-300 rounded-xl cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-all"
        >
          {uploading ? (
            <Loader2 size={24} className="animate-spin text-brand-500" />
          ) : (
            <>
              <ImageIcon size={24} className="text-surface-300" />
              <p className="text-xs text-surface-400 text-center px-4">
                Click or drag &amp; drop<br />
                <span className="text-surface-300">PNG, JPG, WEBP · max 5 MB</span>
              </p>
            </>
          )}
        </div>
      )}

      {/* Change button */}
      {value && !uploading && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-surface-500 hover:text-brand-600 py-1 transition-colors"
        >
          <Upload size={12} /> Change image
        </button>
      )}

      {uploading && value && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-brand-500 py-1">
          <Loader2 size={12} className="animate-spin" /> Uploading…
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </div>
  );
}
