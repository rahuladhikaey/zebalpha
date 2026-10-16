"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Product, ProductPackage } from "@/lib/types";
import { LiveBodyTracker, TrackedBodyPose } from "@/lib/vto/LiveBodyTracker";
import { LiveGarmentRenderer } from "@/lib/vto/LiveGarmentRenderer";
import { evaluateProductTryOnEligibility, TryOnEligibilityResult } from "@/shared/constants/tryOnEligibility";
import { useCart } from "@/context/CartContext";
import Link from "next/link";
import {
  Camera,
  CameraOff,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Shirt,
  ShoppingCart,
  Check,
  ExternalLink,
  X,
  ChevronRight,
  Maximize2
} from "lucide-react";

interface LiveCameraFittingRoomProps {
  selectedProduct: Product | null;
  selectedColor?: string;
  selectedSize?: string;
  onColorChange?: (color: string) => void;
  onSizeChange?: (size: string) => void;
  onExitFittingRoom: () => void;
  onScrollToCollection?: () => void;
}

type CameraStatus = "idle" | "requesting" | "active" | "denied" | "unavailable" | "stopped";

export function LiveCameraFittingRoom({
  selectedProduct,
  selectedColor = "",
  selectedSize = "",
  onColorChange,
  onSizeChange,
  onExitFittingRoom,
  onScrollToCollection,
}: LiveCameraFittingRoomProps) {
  const { addToCart } = useCart();

  // Camera Stream References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const arCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const guideCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Engine Instances
  const bodyTrackerRef = useRef<LiveBodyTracker | null>(null);
  const garmentRendererRef = useRef<LiveGarmentRenderer | null>(null);

  // Component States
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [poseData, setPoseData] = useState<TrackedBodyPose | null>(null);
  const [isAddedToBag, setIsAddedToBag] = useState(false);

  // Evaluate Server Eligibility on Current Product
  const eligibility: TryOnEligibilityResult = evaluateProductTryOnEligibility(selectedProduct);

  // Packages & Variant Data
  const packages: ProductPackage[] = (selectedProduct?.packages as ProductPackage[]) || [];
  const colorGroups: string[] = Array.from(
    new Set(packages.map((p) => p.color).filter((c): c is string => Boolean(c)))
  );
  const sizeOptions: string[] = Array.from(
    new Set(packages.map((p) => p.size).filter((s): s is string => Boolean(s)))
  );

  const activeColor = selectedColor || colorGroups[0] || "";
  const activeSize = selectedSize || sizeOptions[0] || "M";

  const selectedVariant = packages.find(
    (p) => (activeColor ? p.color === activeColor : true) && (activeSize ? p.size === activeSize : true)
  ) || packages[0];

  const activeGarmentImage =
    selectedVariant?.image_url ||
    selectedProduct?.virtual_tryon_image ||
    (Array.isArray(selectedProduct?.images) && selectedProduct.images[0]) ||
    selectedProduct?.image_url ||
    "";

  // Check whether product has live 3D fitting support
  // Upper body (t-shirts, shirts, hoodies, jackets) and dresses are enabled for live 3D AR drape
  const hasLive3DFitting = Boolean(
    eligibility.isEligible &&
    eligibility.categoryType &&
    ["upper_body", "hoodies", "outerwear", "dresses", "lower_body"].includes(eligibility.categoryType)
  );

  /**
   * STOP ALL ACTIVE CAMERA TRACKS
   * Strict privacy enforcement: releases hardware device immediately.
   */
  const stopCameraTracks = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (bodyTrackerRef.current) {
      bodyTrackerRef.current.stop();
    }
    if (garmentRendererRef.current) {
      garmentRendererRef.current.stop();
    }
  }, []);

  /**
   * REQUEST CAMERA PERMISSION & START STREAM
   * Strictly requests video only (NO audio / microphone).
   */
  const startCamera = useCallback(
    async (targetFacingMode: "user" | "environment" = facingMode) => {
      // Check for mediaDevices availability (HTTPS or localhost requirement)
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCameraStatus("unavailable");
        setErrorMessage("Camera access is not supported by your browser or requires a secure HTTPS connection.");
        return;
      }

      try {
        setCameraStatus("requesting");
        setErrorMessage(null);

        // Stop existing tracks before requesting a new device/facing mode
        stopCameraTracks();

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: targetFacingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false, // MANDATORY: NO MICROPHONE ACCESS EVER
        });

        mediaStreamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();

          // Initialize local engines if not already initialized
          initEngines();

          setCameraStatus("active");
        }
      } catch (err: any) {
        console.error("[Live Camera VTO] Permission error:", err);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setCameraStatus("denied");
          setErrorMessage("Camera permission was denied. Please allow camera access in your browser settings to enter the fitting room.");
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setCameraStatus("unavailable");
          setErrorMessage("No camera device was detected on your system.");
        } else {
          setCameraStatus("unavailable");
          setErrorMessage(err.message || "Failed to initialize live camera. Please check your device settings.");
        }
      }
    },
    [facingMode, stopCameraTracks]
  );

  // Handle Resize for Canvases
  const updateCanvasSizes = useCallback(() => {
    if (!videoRef.current) return;
    const w = videoRef.current.clientWidth || videoRef.current.videoWidth || 640;
    const h = videoRef.current.clientHeight || videoRef.current.videoHeight || 850;

    if (arCanvasRef.current) {
      arCanvasRef.current.width = w;
      arCanvasRef.current.height = h;
      garmentRendererRef.current?.resize(w, h);
    }
    if (guideCanvasRef.current) {
      guideCanvasRef.current.width = w;
      guideCanvasRef.current.height = h;
    }
  }, []);

  /**
   * INITIALIZE COMPUTER VISION & THREE.JS ENGINES
   */
  const initEngines = useCallback(() => {
    if (!videoRef.current) return;

    // 1. Live Body Tracker
    if (!bodyTrackerRef.current) {
      bodyTrackerRef.current = new LiveBodyTracker((pose) => {
        setPoseData(pose);

        // Update 3D Garment Pose directly
        if (garmentRendererRef.current) {
          garmentRendererRef.current.updatePose(pose);
        }

        // Render 2D Guides
        if (guideCanvasRef.current) {
          const ctx = guideCanvasRef.current.getContext("2d");
          if (ctx) {
            bodyTrackerRef.current?.drawGuidanceOverlay(
              ctx,
              guideCanvasRef.current.width,
              guideCanvasRef.current.height
            );
          }
        }
      });
    }

    bodyTrackerRef.current.start(videoRef.current);

    // 2. Live Garment Three.js Renderer
    if (arCanvasRef.current && !garmentRendererRef.current) {
      garmentRendererRef.current = new LiveGarmentRenderer(arCanvasRef.current);
      garmentRendererRef.current.updateConfig({
        category: eligibility.categoryType || "upper_body",
        colorName: activeColor,
        colorHex: selectedVariant?.color_hex,
        size: activeSize,
        productName: selectedProduct?.name,
        garmentImageUrl: activeGarmentImage,
      });
      garmentRendererRef.current.start();

      // Immediately sync dimensions
      setTimeout(updateCanvasSizes, 50);
    }
  }, [activeColor, activeGarmentImage, activeSize, eligibility.categoryType, selectedProduct?.name, selectedVariant?.color_hex, updateCanvasSizes]);

  /**
   * FLIP CAMERA (Front / Rear)
   */
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    if (cameraStatus === "active") {
      startCamera(nextMode);
    }
  };

  /**
   * TURN CAMERA OFF
   */
  const handleTurnCameraOff = () => {
    stopCameraTracks();
    setCameraStatus("stopped");
  };

  /**
   * EXIT FITTING ROOM
   */
  const handleExit = () => {
    stopCameraTracks();
    onExitFittingRoom();
  };

  /**
   * ADD TO BAG
   */
  const handleAddToCart = () => {
    if (!selectedProduct) return;
    const pkgName = selectedVariant
      ? activeColor
        ? `${activeColor} / ${activeSize}`
        : activeSize
      : activeColor || "Standard";

    addToCart(selectedProduct, 1, pkgName);
    setIsAddedToBag(true);
    setTimeout(() => setIsAddedToBag(false), 2200);
  };

  // Sync Variant & Product updates to Three.js Renderer
  useEffect(() => {
    if (garmentRendererRef.current && selectedProduct) {
      garmentRendererRef.current.updateConfig({
        category: eligibility.categoryType || "upper_body",
        colorName: activeColor,
        colorHex: selectedVariant?.color_hex,
        size: activeSize,
        productName: selectedProduct.name,
        garmentImageUrl: activeGarmentImage,
      });
    }
  }, [selectedProduct, activeColor, activeSize, eligibility.categoryType, selectedVariant?.color_hex, activeGarmentImage]);

  useEffect(() => {
    window.addEventListener("resize", updateCanvasSizes);
    return () => window.removeEventListener("resize", updateCanvasSizes);
  }, [updateCanvasSizes]);

  // Cleanup on Component Unmount (Strict Zero-Retention Lifecycle)
  useEffect(() => {
    return () => {
      stopCameraTracks();
      if (bodyTrackerRef.current) {
        bodyTrackerRef.current.dispose();
        bodyTrackerRef.current = null;
      }
      if (garmentRendererRef.current) {
        garmentRendererRef.current.dispose();
        garmentRendererRef.current = null;
      }
    };
  }, [stopCameraTracks]);

  return (
    <div className="flex flex-col w-full rounded-3xl bg-zinc-950 border border-zinc-850 p-4 sm:p-5 shadow-2xl space-y-4">
      {/* =========================================================================
          FITTING ROOM TOP CONTROLS BAR
         ========================================================================= */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-850">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] sm:text-xs font-black uppercase tracking-wider text-white">
            <span
              className={`h-2 w-2 rounded-full ${
                cameraStatus === "active" ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
              }`}
            />
            <span>{cameraStatus === "active" ? "Live Fitting Room" : "Fitting Room"}</span>
          </div>

          {cameraStatus === "active" && (
            <span className="hidden sm:inline-block text-[10px] font-bold text-zinc-400">
              30 FPS • Local AR Drape
            </span>
          )}
        </div>

        {/* Action Controls: Flip Camera, Turn Off, Exit */}
        <div className="flex items-center gap-2">
          {cameraStatus === "active" && (
            <>
              {/* Flip Camera (Mobile Front/Rear) */}
              <button
                type="button"
                onClick={handleToggleFacingMode}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition active:scale-95 cursor-pointer"
                title={`Switch to ${facingMode === "user" ? "rear" : "front"} camera`}
              >
                <RefreshCw size={13} />
                <span className="hidden sm:inline">Flip</span>
              </button>

              {/* Turn Camera Off */}
              <button
                type="button"
                onClick={handleTurnCameraOff}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-amber-300 hover:text-amber-200 text-xs font-bold transition active:scale-95 cursor-pointer"
                title="Pause live camera feed"
              >
                <CameraOff size={13} />
                <span className="hidden sm:inline">Camera Off</span>
              </button>
            </>
          )}

          {/* Exit Fitting Room */}
          <button
            type="button"
            onClick={handleExit}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition active:scale-95 cursor-pointer"
            title="Exit fitting room"
          >
            <X size={14} />
            <span>Exit</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          LIVE VIEWPORT CANVAS STAGE
         ========================================================================= */}
      <div className="relative aspect-[3/4] w-full max-h-[64vh] rounded-2xl overflow-hidden bg-black border border-zinc-800 shadow-2xl flex items-center justify-center">
        {/* Underneath: HTML5 Video Stream */}
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          onLoadedMetadata={updateCanvasSizes}
          onLoadedData={updateCanvasSizes}
          onCanPlay={updateCanvasSizes}
          onPlay={updateCanvasSizes}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            cameraStatus === "active" ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
        />

        {/* Middle Layer: Three.js WebGL 3D Garment Render Canvas (z-10) */}
        <canvas
          ref={arCanvasRef}
          className={`absolute inset-0 h-full w-full pointer-events-none transition-opacity duration-300 z-10 ${
            cameraStatus === "active" && hasLive3DFitting ? "opacity-100" : "opacity-0"
          }`}
          style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
        />

        {/* Top Layer: 2D Body Alignment Guides Canvas (z-20) */}
        <canvas
          ref={guideCanvasRef}
          className={`absolute inset-0 h-full w-full pointer-events-none transition-opacity duration-300 z-20 ${
            cameraStatus === "active" ? "opacity-100" : "opacity-0"
          }`}
          style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
        />

        {/* ---------------------------------------------------------------------
            VIEWPORT STATE 1: IDLE / PRE-PERMISSION (STRICT PRIVACY NOTICE)
           --------------------------------------------------------------------- */}
        {cameraStatus === "idle" && (
          <div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-4 max-w-md z-10 animate-in fade-in">
            <div className="h-16 w-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shadow-xl">
              <Camera size={30} className="text-white animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                Live Virtual Fitting Room
              </h3>
              {/* EXACT MANDATORY PRIVACY NOTICE TEXT (Section 7) */}
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-medium bg-zinc-900/80 p-3.5 rounded-xl border border-zinc-800">
                “Your camera is used for a live virtual-fitting preview. Zebalpha does not upload or save your camera images. You can turn off the camera or exit at any time.”
              </p>
            </div>

            <div className="pt-2 w-full space-y-2">
              <button
                type="button"
                onClick={() => startCamera("user")}
                className="w-full py-3.5 px-6 rounded-xl bg-white text-black text-xs font-black uppercase tracking-wider hover:bg-zinc-200 transition-all shadow-xl active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles size={15} />
                <span>Open Live Fitting Room</span>
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400">
                <ShieldCheck size={13} className="text-emerald-400" />
                <span>Strict view-only privacy • Zero photo storage</span>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------------
            VIEWPORT STATE 2: PERMISSION REQUESTING
           --------------------------------------------------------------------- */}
        {cameraStatus === "requesting" && (
          <div className="p-6 flex flex-col items-center justify-center text-center space-y-3 z-10 animate-in fade-in">
            <RefreshCw size={28} className="text-white animate-spin" />
            <h4 className="text-sm font-bold text-white">Requesting Camera Access...</h4>
            <p className="text-xs text-zinc-400 max-w-xs">
              Please grant camera permission in your browser prompt to view the live fitting mirror.
            </p>
          </div>
        )}

        {/* ---------------------------------------------------------------------
            VIEWPORT STATE 3: PERMISSION DENIED
           --------------------------------------------------------------------- */}
        {cameraStatus === "denied" && (
          <div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-4 max-w-sm z-10 animate-in fade-in">
            <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertCircle size={26} />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-sm font-black text-white">Camera Permission Blocked</h4>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {errorMessage || "Camera permission is required to display your live fitting room. Please allow camera permissions in your browser URL bar."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => startCamera("user")}
              className="px-5 py-2.5 rounded-xl bg-white text-black text-xs font-black uppercase tracking-wider hover:bg-zinc-200 transition active:scale-95 cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}

        {/* ---------------------------------------------------------------------
            VIEWPORT STATE 4: CAMERA UNAVAILABLE / INSECURE CONTEXT
           --------------------------------------------------------------------- */}
        {cameraStatus === "unavailable" && (
          <div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-4 max-w-sm z-10 animate-in fade-in">
            <div className="h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <AlertTriangle size={26} />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-sm font-black text-white">Camera Unavailable</h4>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {errorMessage || "No compatible camera was detected or your connection is not secure (requires HTTPS)."}
              </p>
            </div>
            {onScrollToCollection && (
              <button
                type="button"
                onClick={onScrollToCollection}
                className="px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs font-black uppercase tracking-wider hover:bg-zinc-850 transition cursor-pointer"
              >
                Browse Outfits Without Camera
              </button>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------------
            VIEWPORT STATE 5: CAMERA PAUSED / TURNED OFF
           --------------------------------------------------------------------- */}
        {cameraStatus === "stopped" && (
          <div className="p-6 flex flex-col items-center justify-center text-center space-y-4 z-10 animate-in fade-in">
            <div className="h-14 w-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
              <CameraOff size={26} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">Camera is Paused</h4>
              <p className="text-xs text-zinc-400">
                All camera hardware tracks are completely stopped.
              </p>
            </div>
            <button
              type="button"
              onClick={() => startCamera(facingMode)}
              className="px-5 py-2.5 rounded-xl bg-white text-black text-xs font-black uppercase tracking-wider hover:bg-zinc-200 transition active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Camera size={14} />
              <span>Resume Camera Feed</span>
            </button>
          </div>
        )}

        {/* ---------------------------------------------------------------------
            ACTIVE CAMERA OVERLAYS: REAL-TIME GUIDANCE PILL
           --------------------------------------------------------------------- */}
        {cameraStatus === "active" && (
          <div className="absolute bottom-3 inset-x-3 flex items-center justify-center pointer-events-none z-20">
            <div className="px-3.5 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold shadow-2xl flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{poseData?.guidanceMessage || "Align shoulders within mirror frame"}</span>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          HONEST 3D / LIVE FITTING STATUS NOTICE
         ========================================================================= */}
      {selectedProduct && (
        <>
          {hasLive3DFitting ? (
            <div className="px-3.5 py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-600/30 text-emerald-300 flex items-center gap-2.5 text-xs">
              <Sparkles size={15} className="text-emerald-400 shrink-0" />
              <span>
                <strong>Live 3D Drape Active</strong> • Garment aligns to your shoulders and moves in real time.
              </span>
            </div>
          ) : (
            /* HONEST STATUS WHEN ITEM DOES NOT HAVE A 3D ASSET YET (Section 4) */
            <div className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-start gap-2.5 text-xs">
              <Shirt size={15} className="text-zinc-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-white">Live fitting is not available for this item yet.</span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  This product is currently available as a flat catalogue item. You can customize colors, sizes, and order it below, or choose another eligible outfit from the collection on the right.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* =========================================================================
          SELECTED GARMENT DETAILS & SHOPPING ACTIONS BAR
         ========================================================================= */}
      {selectedProduct ? (
        <div className="pt-2 space-y-4 border-t border-zinc-850">
          <div className="flex items-start gap-3.5">
            {/* Thumbnail */}
            <div className="h-16 w-14 shrink-0 rounded-xl overflow-hidden bg-black border border-zinc-800">
              <img
                src={activeGarmentImage || "/placeholder.jpg"}
                alt={selectedProduct.name}
                className="h-full w-full object-cover"
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                {selectedProduct.brand || "ZEBALPHA"}
              </span>
              <h4 className="text-xs sm:text-sm font-black text-white truncate">
                {selectedProduct.name}
              </h4>
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-xs sm:text-sm font-black text-white">
                  ₹{selectedVariant?.price || selectedProduct.price}
                </span>
                {(selectedVariant?.mrp || selectedProduct.mrp) && (
                  <span className="text-[10px] text-zinc-500 line-through">
                    ₹{selectedVariant?.mrp || selectedProduct.mrp}
                  </span>
                )}
                <span className="text-[10px] font-bold text-emerald-400">In Stock</span>
              </div>
            </div>
          </div>

          {/* Color Selection Swatches */}
          {colorGroups.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-bold text-zinc-400">Color Variant:</span>
                <span className="text-[11px] font-black text-white capitalize">{activeColor || "Default"}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {colorGroups.map((col) => {
                  const isSelected = activeColor === col;
                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => onColorChange?.(col)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-white text-black font-black shadow-md"
                          : "bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-zinc-700"
                      }`}
                    >
                      {col}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size Selection */}
          {sizeOptions.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-bold text-zinc-400">Size:</span>
                <span className="text-[11px] font-black text-white">{activeSize || "Free Size"}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sizeOptions.map((sz) => {
                  const isSelected = activeSize === sz;
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => onSizeChange?.(sz)}
                      className={`h-8 min-w-8 px-2.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                        isSelected
                          ? "bg-white text-black shadow-md"
                          : "bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-zinc-700"
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions: Add to Bag & View Product Details */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleAddToCart}
              className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                isAddedToBag
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                  : "bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/10"
              }`}
            >
              {isAddedToBag ? (
                <>
                  <Check size={14} />
                  <span>Added to Bag</span>
                </>
              ) : (
                <>
                  <ShoppingCart size={14} />
                  <span>Add to Bag</span>
                </>
              )}
            </button>

            <Link
              href={`/products/${selectedProduct.id}`}
              className="py-2.5 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-bold hover:text-white hover:bg-zinc-850 flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <span>Product Page</span>
              <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="py-6 text-center text-zinc-500 text-xs">
          Select an outfit from the collection to preview in the fitting room.
        </div>
      )}
    </div>
  );
}
