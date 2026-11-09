"use client";

import { Bell, Sparkles } from "lucide-react";

interface HeaderProps {
  title: string;
  description?: string;
}

export default function Header({ title, description }: HeaderProps) {
  return (
    <header className="h-16 border-b border-dark-800 bg-dark-900/60 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          {title}
        </h1>
        {description && <p className="text-xs text-zinc-400 mt-0.5">{description}</p>}
      </div>

      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          Connected: api.zebalpha.shop
        </span>
      </div>
    </header>
  );
}

