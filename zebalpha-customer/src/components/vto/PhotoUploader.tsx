"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, Image as ImageIcon, AlertCircle, Check, ArrowLeft, Loader2 } from "lucide-react";
import { compressAndPrepareImage } from "@/services/virtualTryOnService";

interface PhotoUploaderProps {
  onPhotoSelected: (base64Image: string) => void;
  onSwitchToCamera: () => void;
  onCancel: () => void;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

export function PhotoUploader({ onPhotoSelected, onSwitchToCamera, onCancel }: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Please select a valid image file (JPG, PNG, or WebP).");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError("Image file is too large. Please choose an image under 20MB.");
      return;
    }

    try {
      setIsLoading(true);
      // Auto-compress in browser memory
      const compressedBase64 = await compressAndPrepareImage(file, 1280, 0.88);
      setPreviewImage(compressedBase64);
    } catch (err: any) {
      console.error(err);
      setError("Unable to process this image. Please try another photo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleConfirm = () => {
    if (previewImage) {
      onPhotoSelected(previewImage);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {previewImage ? (
        <div className="relative aspect-[3/4] w-full max-h-[60vh] rounded-3xl overflow-hidden bg-black border border-zinc-800 shadow-2xl flex flex-col items-center justify-center">
          <img
            src={previewImage}
            alt="Uploaded Preview"
            className="h-full w-full object-cover animate-in fade-in zoom-in-95 duration-200"
          />

          {/* Action Overlay Bar */}
          <div className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-black via-black/80 to-transparent flex items-center gap-3">
            <button
              onClick={() => {
                setPreviewImage(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="flex-1 py-3 px-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-white text-xs font-black uppercase tracking-wider hover:bg-zinc-800 transition active:scale-95 cursor-pointer backdrop-blur-md"
            >
              Choose Other
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white text-black text-xs font-black uppercase tracking-wider hover:bg-zinc-200 transition shadow-xl shadow-white/10 active:scale-95 cursor-pointer"
            >
              <Check size={16} />
              Confirm Photo
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`group relative w-full aspect-[4/3] sm:aspect-[16/10] rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-all duration-300 ${
            dragActive
              ? "border-white bg-zinc-900/90 scale-[1.01]"
              : "border-zinc-800 hover:border-zinc-600 bg-zinc-950/60 hover:bg-zinc-900/40"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          {isLoading ? (
            <div className="flex flex-col items-center gap-3 text-zinc-400">
              <Loader2 className="animate-spin text-white" size={36} />
              <p className="text-xs font-bold text-white">Optimizing photo in memory...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:text-white group-hover:scale-110 group-hover:border-zinc-700 transition-all">
                <UploadCloud size={30} />
              </div>

              <div className="space-y-1">
                <p className="text-sm font-black text-white">
                  Drag & Drop your photo here, or <span className="text-white underline decoration-zinc-500 underline-offset-4">Browse</span>
                </p>
                <p className="text-xs font-medium text-zinc-400">
                  Supports High-Res JPG, PNG, and WebP (Up to 20MB)
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-950/40 border border-red-900/40 px-4 py-2.5 text-xs font-medium text-red-300">
          <AlertCircle size={16} className="shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
