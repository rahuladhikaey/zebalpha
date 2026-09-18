"use client";

import React, { useState } from "react";
import { 
  Scan, 
  X, 
  CheckCircle2, 
  Truck, 
  AlertCircle, 
  ArrowRight, 
  Camera, 
  ShieldCheck,
  Zap
} from "lucide-react";

interface RiderScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: () => void;
  prefilledAwb?: string;
  orderNumber?: string;
}

export const RiderScanModal: React.FC<RiderScanModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  prefilledAwb = "",
  orderNumber = ""
}) => {
  const [awbInput, setAwbInput] = useState(prefilledAwb);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [responseMsg, setResponseMsg] = useState("");
  const [scannedDetails, setScannedDetails] = useState<any | null>(null);

  React.useEffect(() => {
    if (prefilledAwb) {
      setAwbInput(prefilledAwb);
    }
  }, [prefilledAwb]);

  if (!isOpen) return null;

  // Play realistic scanner beep using Web Audio API
  const playBeepSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1760, audioCtx.currentTime); // High pitch supermarket scanner beep
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.warn("AudioContext not supported", e);
    }
  };

  const handleExecuteScan = async (awbToScan?: string) => {
    const targetAwb = (awbToScan || awbInput).trim();
    if (!targetAwb) {
      setScanStatus("error");
      setResponseMsg("Please enter or scan an AWB barcode number.");
      return;
    }

    setScanStatus("loading");
    setResponseMsg("Verifying AWB & Handover Manifest...");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${apiUrl}/api/shipments/scan-pickup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          awbNumber: targetAwb,
          riderName: "Delhivery Hub Agent #DH-782",
          location: "Seller Warehouse Gate 1"
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        playBeepSound();
        setScanStatus("success");
        setResponseMsg(data.message || "Parcel successfully scanned and marked as SHIPPED!");
        setScannedDetails(data.order);
        setTimeout(() => {
          onScanSuccess();
        }, 1800);
      } else {
        setScanStatus("error");
        setResponseMsg(data.message || "Failed to process scan. Please verify AWB.");
      }
    } catch (err: any) {
      setScanStatus("error");
      setResponseMsg(err.message || "Network error connecting to logistics gateway.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Scan className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Rider Pickup Scanner</h3>
              <p className="text-[10px] font-bold text-zinc-400">Delivery Boy Barcode Verification</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scanner Simulation Body */}
        <div className="p-6 space-y-5">
          
          {/* Laser Scanner Viewport */}
          <div className="relative h-44 w-full bg-zinc-900/80 rounded-2xl border-2 border-dashed border-zinc-700 overflow-hidden flex flex-col items-center justify-center p-4">
            
            {/* Animated Laser Line */}
            <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_#ef4444] animate-bounce" />

            {/* Corner Crosshairs */}
            <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-amber-400" />
            <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-amber-400" />
            <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-amber-400" />
            <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-amber-400" />

            <Camera className="h-10 w-10 text-zinc-600 mb-2 opacity-60" />
            <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
              Align Barcode in Camera Frame
            </span>
            <span className="text-[10px] font-bold text-zinc-500 mt-0.5">
              Simulating Courier Rider Handheld Scanner
            </span>
          </div>

          {/* Quick Barcode Input & Trigger */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400">
              AWB Number / Barcode ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={awbInput}
                onChange={(e) => setAwbInput(e.target.value)}
                placeholder="e.g. DEL-849201948"
                className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-sm font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 uppercase"
              />
              <button
                type="button"
                onClick={() => handleExecuteScan()}
                disabled={scanStatus === "loading"}
                className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-black text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                <Zap className="h-4 w-4" />
                {scanStatus === "loading" ? "Scanning..." : "Scan"}
              </button>
            </div>
          </div>

          {/* Status Notifications */}
          {scanStatus === "success" && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 animate-in fade-in zoom-in duration-200">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                  Pickup Handover Confirmed!
                </h4>
                <p className="text-[11px] font-bold text-zinc-300 mt-0.5">{responseMsg}</p>
                <p className="text-[10px] font-bold text-emerald-400 mt-1">
                  ✓ Order moved to "Shipped" tab automatically.
                </p>
              </div>
            </div>
          )}

          {scanStatus === "error" && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black text-rose-400 uppercase tracking-wider">Scan Failed</h4>
                <p className="text-[11px] font-bold text-zinc-300 mt-0.5">{responseMsg}</p>
              </div>
            </div>
          )}

          {/* Quick Pre-fill helper */}
          {prefilledAwb && scanStatus === "idle" && (
            <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 block">Ready to pick up:</span>
                <span className="text-xs font-mono font-black text-white">{prefilledAwb}</span>
              </div>
              <button
                onClick={() => handleExecuteScan(prefilledAwb)}
                className="text-[10px] font-black uppercase tracking-wider text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
              >
                1-Click Pickup <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default RiderScanModal;
