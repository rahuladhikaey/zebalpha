import { ChefHat, Leaf, BadgeCheck } from "lucide-react";

export function MovingOfferBanner() {
  const BannerContent = () => (
    <div className="flex items-center justify-around w-full shrink-0">
      <div className="flex items-center gap-2">
        <ChefHat className="w-5 h-5 text-emerald-100" />
        <span>Curated by Top-Rated Chefs</span>
      </div>
      <div className="flex items-center gap-2">
        <Leaf className="w-5 h-5 text-emerald-100" />
        <span>Made Fresh • Delivered Fast</span>
      </div>
      <div className="flex items-center gap-2">
        <BadgeCheck className="w-5 h-5 text-emerald-100" />
        <span>Premium Quality</span>
      </div>
    </div>
  );

  return (
    <div className="w-full overflow-hidden bg-[#0a662e] text-white py-2.5 flex items-center shadow-inner relative z-10 border-b border-[#085225]">
      <div className="flex animate-[marquee_25s_linear_infinite] whitespace-nowrap items-center w-[200%]">
        <BannerContent />
        <BannerContent />
      </div>
    </div>
  );
}
