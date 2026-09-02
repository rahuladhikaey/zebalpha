"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Product } from "@/lib/types";
import { runVirtualTryOn } from "@/services/virtualTryOnService";
import { PhotoGuidelines } from "./PhotoGuidelines";
import { PhotoCapture } from "./PhotoCapture";
import { PhotoUploader } from "./PhotoUploader";
import { VirtualTryOnLoading } from "./VirtualTryOnLoading";
import { VirtualTryOnResult } from "./VirtualTryOnResult";
import { TryAnotherProductDrawer } from "./TryAnotherProductDrawer";
import { 
  Sparkles, 
  Camera, 
  UploadCloud, 
  X, 
  AlertTriangle, 
  ShieldCheck, 
  ChevronLeft 
} from "lucide-react";

interface VirtualTryOnModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onProductChange?: (newProduct: Product) => void;
}

type ModalStep = "CHOICE" | "CAPTURE" | "UPLOAD" | "PROCESSING" | "RESULT" | "SWITCH_PRODUCT";

export function VirtualTryOnModal({
  isOpen,
  onClose,
  product,
  onProductChange,
}: VirtualTryOnModalProps) {
  const [step, setStep] = useState<ModalStep>("CHOICE");
  const [activeProduct, setActiveProduct] = useState<Product>(product);
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync active product when prop changes
  useEffect(() => {
    setActiveProduct(product);
  }, [product]);

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setStep("CHOICE");
    setPersonImage(null);
    setGeneratedImage(null);
    setErrorMessage(null);
    onClose();
  }, [onClose]);

  // Handle ESC key to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Execute AI Virtual Try-On
  const executeTryOn = async (personImg: string, targetProduct: Product) => {
    try {
      setStep("PROCESSING");
      setErrorMessage(null);

      const garmentImg = 
        targetProduct.virtual_tryon_image ||
        (Array.isArray(targetProduct.images) && targetProduct.images[0]) ||
        targetProduct.image_url;

      const response = await runVirtualTryOn({
        personImage: personImg,
        productId: targetProduct.id,
        garmentImage: garmentImg,
        category: targetProduct.virtual_tryon_category || "upper_body",
      });

      if (!response.success || !response.imageUrl) {
        throw new Error(response.error || "Virtual Try-On is temporarily unavailable. Please try again.");
      }

      setGeneratedImage(response.imageUrl);
      setStep("RESULT");
    } catch (err: any) {
      console.error("[VTO Execution Error]", err);
      setErrorMessage(err.message || "Failed to generate virtual try-on. Please try again.");
      setStep("CHOICE");
    }
  };

  // When photo is captured via camera
  const handlePhotoCaptured = (base64: string) => {
    setPersonImage(base64);
    executeTryOn(base64, activeProduct);
  };

  // When photo is uploaded via file uploader
  const handlePhotoUploaded = (base64: string) => {
    setPersonImage(base64);
    executeTryOn(base64, activeProduct);
  };

  // When user selects a different product to try with their existing photo
  const handleSelectDifferentProduct = (newProd: Product) => {
    setActiveProduct(newProd);
    if (onProductChange) {
      onProductChange(newProd);
    }
    if (personImage) {
      executeTryOn(personImage, newProd);
    } else {
      setStep("CHOICE");
    }
  };

  if (!isOpen) return null;

  const garmentPreviewImg =
    activeProduct.virtual_tryon_image ||
    (Array.isArray(activeProduct.images) && activeProduct.images[0]) ||
    activeProduct.image_url;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 md:p-6 bg-black/85 backdrop-blur-xl animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vto-modal-title"
    >
      {/* Modal Container */}
      <div className="relative flex flex-col w-full h-full sm:h-auto sm:max-h-[92vh] max-w-2xl bg-zinc-950 sm:rounded-[2.5rem] border border-zinc-800/90 shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            {step !== "CHOICE" && step !== "PROCESSING" && (
              <button
                onClick={() => setStep(step === "SWITCH_PRODUCT" ? "RESULT" : "CHOICE")}
                className="h-8 w-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer"
                aria-label="Go Back"
              >
                <ChevronLeft size={18} />
              </button>
            )}

            <div>
              <h2
                id="vto-modal-title"
                className="text-base sm:text-lg font-black text-white flex items-center gap-1.5"
              >
                <Sparkles size={18} className="text-white" />
                <span>Virtual Try-On</span>
              </h2>
              <p className="text-[11px] font-medium text-zinc-400">
                See yourself wearing &ldquo;{activeProduct.name}&rdquo;
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="h-9 w-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 no-scrollbar">
          {/* Global Error Banner */}
          {errorMessage && (
            <div className="flex items-start gap-3 rounded-2xl bg-red-950/40 border border-red-900/50 p-4 text-xs font-medium text-red-300 animate-in fade-in">
              <AlertTriangle size={18} className="shrink-0 text-red-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-red-200">Unable to complete try-on</p>
                <p className="mt-0.5 text-red-300/90">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* STEP 1: INITIAL CHOICE (Take Photo / Upload Photo + Guidelines) */}
          {step === "CHOICE" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Product preview ribbon */}
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800">
                <div className="h-14 w-14 rounded-xl bg-zinc-950 border border-zinc-800 p-1 flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    src={garmentPreviewImg}
                    alt={activeProduct.name}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Selected Garment</span>
                  <h4 className="text-xs font-bold text-white truncate">{activeProduct.name}</h4>
                  <p className="text-xs font-black text-white mt-0.5">₹{activeProduct.price}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Option 1: Take Photo */}
                <button
                  onClick={() => setStep("CAPTURE")}
                  className="group flex flex-col items-center justify-center p-6 rounded-3xl bg-zinc-900 border border-zinc-800 hover:border-white hover:bg-zinc-850 transition-all duration-300 shadow-xl active:scale-95 cursor-pointer text-center space-y-3"
                >
                  <div className="h-14 w-14 rounded-2xl bg-white text-black flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-white/10">
                    <Camera size={26} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">Take Photo</h3>
                    <p className="text-xs font-medium text-zinc-400 mt-0.5">Use device camera</p>
                  </div>
                </button>

                {/* Option 2: Upload Photo */}
                <button
                  onClick={() => setStep("UPLOAD")}
                  className="group flex flex-col items-center justify-center p-6 rounded-3xl bg-zinc-900 border border-zinc-800 hover:border-white hover:bg-zinc-850 transition-all duration-300 shadow-xl active:scale-95 cursor-pointer text-center space-y-3"
                >
                  <div className="h-14 w-14 rounded-2xl bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                    <UploadCloud size={26} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">Upload Photo</h3>
                    <p className="text-xs font-medium text-zinc-400 mt-0.5">Select existing image</p>
                  </div>
                </button>
              </div>

              {/* Photo Guidelines Checklist */}
              <PhotoGuidelines />
            </div>
          )}

          {/* STEP 2: CAMERA CAPTURE */}
          {step === "CAPTURE" && (
            <PhotoCapture
              onPhotoCaptured={handlePhotoCaptured}
              onSwitchToUpload={() => setStep("UPLOAD")}
              onCancel={() => setStep("CHOICE")}
            />
          )}

          {/* STEP 3: PHOTO UPLOAD */}
          {step === "UPLOAD" && (
            <div className="space-y-6">
              <PhotoUploader
                onPhotoSelected={handlePhotoUploaded}
                onSwitchToCamera={() => setStep("CAPTURE")}
                onCancel={() => setStep("CHOICE")}
              />
              <PhotoGuidelines />
            </div>
          )}

          {/* STEP 4: PROCESSING STATE */}
          {step === "PROCESSING" && (
            <VirtualTryOnLoading
              garmentImageUrl={garmentPreviewImg}
              productName={activeProduct.name}
            />
          )}

          {/* STEP 5: RESULT SCREEN */}
          {step === "RESULT" && generatedImage && personImage && (
            <VirtualTryOnResult
              originalImage={personImage}
              generatedImage={generatedImage}
              product={activeProduct}
              onTryAnotherPhoto={() => {
                setPersonImage(null);
                setGeneratedImage(null);
                setStep("CHOICE");
              }}
              onTryAnotherProduct={() => setStep("SWITCH_PRODUCT")}
              onClose={handleClose}
            />
          )}

          {/* STEP 6: SWITCH PRODUCT DRAWER */}
          {step === "SWITCH_PRODUCT" && (
            <TryAnotherProductDrawer
              currentProductId={activeProduct.id}
              onSelectProduct={handleSelectDifferentProduct}
              onClose={() => setStep("RESULT")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
