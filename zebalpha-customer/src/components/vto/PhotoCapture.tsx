"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Camera, RefreshCw, AlertCircle, ArrowLeft, Check, UploadCloud, Zap } from "lucide-react";
import { compressAndPrepareImage } from "@/services/virtualTryOnService";

interface PhotoCaptureProps {
  onPhotoCaptured: (base64Image: string) => void;
  onSwitchToUpload: () => void;
  onCancel: () => void;
}

export function PhotoCapture({ onPhotoCaptured, onSwitchToUpload, onCancel }: PhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    try {
      setErrorMessage(null);

      // Stop previous stream if running
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setHasPermission(true);
    } catch (err: any) {
      console.error("[Camera Error]", err);
      setHasPermission(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMessage("Camera access was denied. Please allow camera permissions in your browser or choose Upload Photo.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setErrorMessage("No camera was found on your device. Please use the Upload Photo option.");
      } else {
        setErrorMessage("Unable to open camera stream. Please try uploading a photo instead.");
      }
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [startCamera]);

  // Flip Front/Back Camera
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  // Capture Frame
  const takeSnapshot = async () => {
    if (!videoRef.current) return;

    try {
      setIsProcessing(true);
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 1280;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // If front camera, flip horizontally for mirror effect
      if (facingMode === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Stop camera stream while previewing
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const compressedBase64 = await compressAndPrepareImage(blob, 1280, 0.88);
        setCapturedPreview(compressedBase64);
        setIsProcessing(false);
      }, "image/jpeg", 0.9);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  // Trigger 3s countdown before snapshot
  const startCountdown = () => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          takeSnapshot();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Retake
  const handleRetake = () => {
    setCapturedPreview(null);
    startCamera();
  };

  // Confirm photo
  const handleConfirm = () => {
    if (capturedPreview) {
      onPhotoCaptured(capturedPreview);
    }
  };

  // If permission denied or camera error
  if (hasPermission === false || errorMessage) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 bg-zinc-950 rounded-3xl border border-zinc-800">
        <div className="h-16 w-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          <AlertCircle size={32} />
        </div>
        <div className="space-y-2 max-w-sm">
          <h3 className="text-lg font-black text-white">Camera Access Required</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">{errorMessage}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <button
            onClick={onSwitchToUpload}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-white text-black text-xs font-black uppercase tracking-wider hover:bg-zinc-200 transition active:scale-95 cursor-pointer"
          >
            <UploadCloud size={16} />
            Upload Photo
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-black uppercase tracking-wider hover:bg-zinc-800 transition active:scale-95 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center w-full overflow-hidden rounded-3xl bg-black border border-zinc-800 shadow-2xl">
      {/* Top Controls Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-auto">
        <button
          onClick={capturedPreview ? handleRetake : onCancel}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white hover:bg-black/80 transition cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>

        {!capturedPreview && (
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFacingMode}
              className="flex h-10 px-3.5 items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-xs font-bold hover:bg-black/80 transition cursor-pointer"
              aria-label="Flip Camera"
            >
              <RefreshCw size={14} />
              <span className="hidden sm:inline">Flip</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Viewfinder / Captured Preview Area */}
      <div className="relative aspect-[3/4] w-full max-h-[65vh] bg-zinc-950 overflow-hidden flex items-center justify-center">
        {capturedPreview ? (
          <img
            src={capturedPreview}
            alt="Captured Preview"
            className="h-full w-full object-cover animate-in fade-in zoom-in-95 duration-200"
          />
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`h-full w-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
            />

            {/* Silhouette / Fitting Guide Overlay */}
            <div className="pointer-events-none absolute inset-0 border-2 border-white/15 rounded-2xl m-4 flex flex-col items-center justify-center">
              <div className="h-44 w-36 rounded-full border border-dashed border-white/30 mb-2 opacity-60" />
              <div className="w-56 h-28 border border-dashed border-white/30 rounded-t-3xl opacity-60" />
              <span className="mt-4 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-zinc-300 border border-white/10">
                Align upper body inside frame
              </span>
            </div>

            {/* Countdown Overlay */}
            {countdown !== null && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
                <span className="text-7xl font-black text-white drop-shadow-2xl animate-ping">
                  {countdown}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Shutter / Action Controls */}
      <div className="w-full bg-zinc-950 border-t border-zinc-800/80 p-5 flex items-center justify-around">
        {capturedPreview ? (
          <div className="flex items-center gap-4 w-full max-w-sm">
            <button
              onClick={handleRetake}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white text-xs font-black uppercase tracking-wider hover:bg-zinc-800 transition active:scale-95 cursor-pointer"
            >
              Retake
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-white text-black text-xs font-black uppercase tracking-wider hover:bg-zinc-200 transition shadow-xl shadow-white/10 active:scale-95 cursor-pointer"
            >
              <Check size={16} />
              Use Photo
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-6">
            <button
              onClick={onSwitchToUpload}
              className="text-xs font-bold text-zinc-400 hover:text-white transition flex flex-col items-center gap-1 cursor-pointer"
            >
              <UploadCloud size={20} />
              <span className="text-[10px] uppercase tracking-wider">Upload</span>
            </button>

            {/* Shutter Button */}
            <button
              onClick={takeSnapshot}
              disabled={isProcessing}
              className="h-18 w-18 rounded-full border-4 border-white/30 p-1 flex items-center justify-center hover:border-white transition active:scale-90 cursor-pointer shadow-2xl"
              aria-label="Capture Photo"
            >
              <div className="h-full w-full rounded-full bg-white transition hover:bg-zinc-200" />
            </button>

            <button
              onClick={startCountdown}
              className="text-xs font-bold text-zinc-400 hover:text-white transition flex flex-col items-center gap-1 cursor-pointer"
              aria-label="3s Timer"
            >
              <Zap size={20} />
              <span className="text-[10px] uppercase tracking-wider">3s Timer</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
