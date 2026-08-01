/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Content paths match your project structure
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./src/features/**/*.{js,jsx,ts,tsx}",
    "./src/shared/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#10b981", // emerald-500
          hover: "#059669",   // emerald-600
          light: "#d1fae5"    // emerald-100
        },
        background: {
          DEFAULT: "#020617", // slate-950
          surface: "#0f172a", // slate-900
          border: "#1e293b"   // slate-800
        }
      }
    },
  },
  plugins: [],
}
