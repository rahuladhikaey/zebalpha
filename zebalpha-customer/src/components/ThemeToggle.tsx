"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [isWhite, setIsWhite] = useState(false);

  useEffect(() => {
    // Check initial theme
    const isWhiteMode = document.documentElement.classList.contains("white-mode");
    setIsWhite(isWhiteMode);
  }, []);

  const toggleTheme = () => {
    const newMode = !isWhite;
    setIsWhite(newMode);
    if (newMode) {
      document.documentElement.classList.add("white-mode");
      localStorage.setItem("theme", "white-mode");
    } else {
      document.documentElement.classList.remove("white-mode");
      localStorage.setItem("theme", "default");
    }
  };

  return (
    <div className="mt-6 flex items-center gap-3">
      <span className="text-sm font-semibold text-slate-300">White Mode</span>
      <button
        onClick={toggleTheme}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          isWhite ? "bg-white" : "bg-slate-700"
        }`}
        aria-label="Toggle White Mode"
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
            isWhite ? "translate-x-6 bg-slate-900" : "translate-x-1 bg-white"
          }`}
        />
      </button>
    </div>
  );
}
