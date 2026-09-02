import { ProductPackage } from "@/lib/types";

interface PackageSelectionProps {
  packages: ProductPackage[];
  selectedPackage: ProductPackage | null;
  onSelect: (pkg: ProductPackage) => void;
}

export function PackageSelection({ packages, selectedPackage, onSelect }: PackageSelectionProps) {
  if (!packages || packages.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="flex gap-3 overflow-x-auto pb-2 pt-3 px-2 -mx-2 no-scrollbar">
        {packages.map((pkg) => {
          const isSelected = selectedPackage?.id === pkg.id;
          const saveAmount = pkg.mrp && pkg.mrp > pkg.price ? pkg.mrp - pkg.price : 0;

          return (
            <button
              key={pkg.id}
              onClick={() => onSelect(pkg)}
              className={`relative flex min-w-[120px] flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all cursor-pointer ${
                isSelected
                  ? "border-white bg-zinc-900 shadow-xl"
                  : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
              }`}
            >
              {pkg.isBestSeller && (
                <div className="absolute -right-2 -top-2 rounded-full bg-white px-2 py-0.5 text-[9px] font-black text-black shadow-xl">
                  Best
                </div>
              )}
              
              <span className="text-[10px] font-bold text-zinc-400 mb-1">
                {pkg.name}
              </span>
              
              <span className="text-sm font-black text-white mb-0.5">
                ₹{pkg.price.toFixed(2)}
              </span>
              
              {saveAmount > 0 && (
                <span className="text-[10px] font-extrabold text-white bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded-md mt-1">
                  Save ₹{saveAmount.toFixed(2)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
