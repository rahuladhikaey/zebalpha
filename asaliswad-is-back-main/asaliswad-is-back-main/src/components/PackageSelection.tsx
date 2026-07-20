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
              className={`relative flex min-w-[120px] flex-col items-center justify-center rounded-xl border-2 p-3 text-center transition-all ${
                isSelected
                  ? "border-slate-900 bg-white"
                  : "border-slate-100 bg-white hover:border-slate-200"
              }`}
            >
              {pkg.isBestSeller && (
                <div className="absolute -right-2 -top-2 rounded bg-black px-2 py-0.5 text-[10px] font-black text-white shadow-sm">
                  Best
                </div>
              )}
              
              <span className="text-[10px] font-bold text-rose-800/80 mb-1">
                {pkg.name}
              </span>
              
              <span className="text-sm font-black text-slate-800 mb-0.5">
                ₹{pkg.price.toFixed(2)}
              </span>
              
              {saveAmount > 0 && (
                <span className="text-[10px] font-bold text-emerald-600">
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
