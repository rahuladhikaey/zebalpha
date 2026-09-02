"use client";

import React from "react";
import { CheckCircle2, ShieldCheck, Sparkles, User, Sun, Maximize2 } from "lucide-react";

export function PhotoGuidelines() {
  const guidelines = [
    {
      icon: <User className="text-emerald-400" size={18} />,
      title: "Face the Camera Directly",
      desc: "Stand straight with your head and shoulders aligned towards the lens.",
    },
    {
      icon: <Maximize2 className="text-cyan-400" size={18} />,
      title: "Upper Body Visible",
      desc: "Keep chest, shoulders, and waist in full clear view.",
    },
    {
      icon: <Sun className="text-amber-400" size={18} />,
      title: "Good Lighting",
      desc: "Even lighting from the front without harsh backlights or deep shadows.",
    },
    {
      icon: <CheckCircle2 className="text-purple-400" size={18} />,
      title: "One Person Only",
      desc: "Ensure nobody else is in the frame for precise AI fitting.",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-400">
        <Sparkles size={14} className="text-amber-400" />
        <span>For the Best AI Result</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {guidelines.map((g, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3 rounded-2xl bg-zinc-900/60 p-3.5 border border-zinc-800/80 transition-all hover:border-zinc-700"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-800/90 border border-zinc-700/50">
              {g.icon}
            </div>
            <div>
              <h4 className="text-xs font-bold text-white leading-tight">{g.title}</h4>
              <p className="text-[11px] font-medium text-zinc-400 leading-snug mt-0.5">{g.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Privacy Guarantee Badge */}
      <div className="flex items-center gap-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/30 px-3.5 py-2.5 text-emerald-300">
        <ShieldCheck size={18} className="shrink-0 text-emerald-400" />
        <span className="text-xs font-semibold">
          <strong className="font-bold text-emerald-200">100% Privacy-First:</strong> Your photo is processed ephemerally in RAM and never stored in any database.
        </span>
      </div>
    </div>
  );
}
