"use client";

import { useCart } from "@/context/CartContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function FloatingCartBanner() {
  const { cart, totalItems, totalValue } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  
  const [offerThreshold, setOfferThreshold] = useState(139);
  const [offerPercentage, setOfferPercentage] = useState(50);
  const [isOfferActive, setIsOfferActive] = useState(true);

  useEffect(() => {
    // Load global cart offer from Supabase settings
    const fetchOffer = async () => {
      const { data } = await supabase.from('store_settings').select('value').eq('key', 'global_cart_offer').single();
      if (data && data.value) {
        setOfferThreshold(Number(data.value.threshold) || 139);
        setOfferPercentage(Number(data.value.percentage) || 50);
        setIsOfferActive(data.value.isActive !== false);
      }
    };
    fetchOffer();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('public:store_settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_settings', filter: "key=eq.'global_cart_offer'" }, payload => {
        const value = (payload.new as any).value;
        if (value) {
          setOfferThreshold(Number(value.threshold) || 139);
          setOfferPercentage(Number(value.percentage) || 50);
          setIsOfferActive(value.isActive !== false);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Hide on cart and checkout pages (they have their own bottom bars)
  if (cart.length === 0 || pathname === '/cart' || pathname === '/checkout') return null;

  // Calculate progress
  const progressPercent = Math.min((totalValue / offerThreshold) * 100, 100);
  const amountRemaining = Math.max(offerThreshold - totalValue, 0);

  // Push up on product details page to avoid overlapping the mobile Buy Now bar
  const isProductDetailPage = pathname.startsWith('/products/') && pathname.length > '/products/'.length;
  const bottomPositionClass = isProductDetailPage ? "bottom-16 lg:bottom-0" : "bottom-0";

  return (
    <div className={`fixed left-0 right-0 z-50 p-2 sm:p-4 bg-[#cefad0]/60 backdrop-blur-md transition-all duration-300 lg:hidden ${bottomPositionClass}`}>
      <div className="max-w-2xl mx-auto bg-[#eefbf2] rounded-3xl p-4 shadow-xl border border-[#d3f5de]">
        {/* Offer Section */}
        {isOfferActive && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[#0a662e] bg-[#c5eed4] p-1.5 rounded-full">
                <Lock size={16} />
              </span>
              <p className="text-[#0a662e] font-black text-sm md:text-base tracking-tight">
                {amountRemaining > 0
                  ? `Add items for ₹${amountRemaining.toFixed(0)} to get ${offerPercentage}% Off`
                  : `You've unlocked ${offerPercentage}% Off!`}
              </p>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-[#c5eed4] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#22c55e] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Cart Info & Action */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#c5eed4]/50">
          <div className="flex flex-col">
            <span className="text-slate-900 font-black text-base md:text-lg tracking-tight">
              {totalItems} item{totalItems !== 1 && 's'}
            </span>
            <span className="text-slate-500 font-bold text-sm">
              ₹{totalValue.toFixed(0)}
            </span>
          </div>

          <button 
            onClick={() => router.push('/cart')}
            className="bg-[#22c55e] hover:bg-[#15803d] transition-colors text-white px-6 py-3 rounded-2xl font-black text-sm md:text-base tracking-wide flex items-center gap-2"
          >
            View Cart
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
