"use client";

import { useCart } from "@/context/CartContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Minus, Plus, ShoppingBag, Zap } from "lucide-react";
import { useExperienceTheme } from "@/context/ExperienceThemeContext";

export default function DesktopSideCart() {
  const router = useRouter();
  const pathname = usePathname();
  const { cart, updateQuantity, removeFromCart, totalValue, totalItems } = useCart();
  const { experience, isFestivalOverride } = useExperienceTheme();
  const t = experience.themeTokens;
  const isLightBtnText =
    (t.primaryButtonText || "").toUpperCase() === "#FFFFFF" ||
    (t.primaryButtonText || "").toUpperCase() === "#FFFDF8";
  
  const [billingSettings, setBillingSettings] = useState({
    deliveryFee: 0,
    freeDeliveryThreshold: 0,
    packagingFee: 0,
    tax: 0
  });
  const [cartOffer, setCartOffer] = useState<{ threshold: number; percentage: number; isActive: boolean } | null>(null);
  
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data: bData } = await supabase
          .from('store_settings')
          .select('key, value')
          .in('key', ['billing', 'marketplace_rules']);

        const map: Record<string, any> = {};
        (bData || []).forEach((row: any) => { map[row.key] = row.value; });
        const b = map.billing || {};
        const m = map.marketplace_rules || {};

        const parseNum = (val: any, fallback = 0) => {
          if (val !== undefined && val !== null && val !== "" && !isNaN(Number(val))) {
            return Number(val);
          }
          return fallback;
        };

        const delivery = parseNum(m.deliveryCharge ?? b.deliveryFee, 0);
        const freeThresh = parseNum(m.freeShippingThreshold ?? b.freeDeliveryThreshold, 0);
        const appFee = parseNum(m.appCharge ?? b.packagingFee, 0);
        const tax = parseNum(b.tax, 0);

        setBillingSettings({
          deliveryFee: delivery,
          freeDeliveryThreshold: freeThresh,
          packagingFee: appFee,
          tax: tax
        });
      } catch (_) {}
    };
    fetchSettings();

    const fetchOffer = async () => {
      try {
        const { data } = await supabase.from('store_settings').select('value').eq('key', 'global_cart_offer').maybeSingle();
        if (data && data.value && data.value.isActive === true && Number(data.value.threshold) > 0 && Number(data.value.percentage) > 0) {
          setCartOffer({
            threshold: Number(data.value.threshold),
            percentage: Number(data.value.percentage),
            isActive: true
          });
        } else {
          setCartOffer(null);
        }
      } catch (_) {
        setCartOffer(null);
      }
    };
    fetchOffer();
  }, []);

  if (cart.length === 0 || pathname === '/checkout' || pathname === '/cart') {
    return null; // Side cart only shows when items are in cart, and is hidden on checkout/cart pages
  }

  const offerApplied = Boolean(cartOffer && cartOffer.isActive && cartOffer.threshold > 0 && totalValue >= cartOffer.threshold && cartOffer.percentage > 0);
  const discountAmount = offerApplied && cartOffer ? Math.round(totalValue * cartOffer.percentage / 100) : 0;
  const discountedSubtotal = totalValue - discountAmount;

  const isFreeDelivery = billingSettings.freeDeliveryThreshold > 0 && discountedSubtotal >= billingSettings.freeDeliveryThreshold;
  const deliveryCost = isFreeDelivery ? 0 : billingSettings.deliveryFee;
  const grandTotal = discountedSubtotal + deliveryCost + billingSettings.packagingFee + billingSettings.tax;
  const amountToFreeDelivery = billingSettings.freeDeliveryThreshold > 0 ? Math.max(0, billingSettings.freeDeliveryThreshold - discountedSubtotal) : 0;

  return (
    <aside className="hidden lg:flex w-96 xl:w-[400px] shrink-0 border-l border-[#E4C988] bg-[#FFFDF8] text-[#14120F] flex-col h-full sticky top-0 overflow-hidden shadow-[0_0_32px_rgba(166,124,28,0.1)]">
      {/* Header */}
      <div className="bg-[#FAF2DC] px-6 py-5 border-b border-[#E4C988] shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#FFFDF8] flex items-center justify-center text-[#9A6503] border border-[#DFBE6F] shadow-sm">
            <ShoppingBag size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#14120F] tracking-tight">Your Cart</h2>
            <p className="text-xs font-bold text-[#6E624D]">{totalItems} {totalItems === 1 ? 'item' : 'items'}</p>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6 bg-[#FCF9F2]">
        
        {/* Delivery Estimate */}
        <div className="bg-[#FFFDF8] rounded-2xl p-4 flex items-center gap-4 border border-[#E7CF94] shadow-sm">
          <div className="h-10 w-10 rounded-xl bg-[#FAF2DC] border border-[#E4C988] flex items-center justify-center shrink-0 text-[#9A6503]">
            <Zap size={20} className="text-[#9A6503]" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#14120F] tracking-tight">Express Pan-India Shipping</h3>
            <p className="text-[11px] font-bold text-[#6E624D] mt-0.5">Dispatched within 24-48 hours</p>
          </div>
        </div>

        {/* Cart Items */}
        <div className="bg-[#FFFDF8] rounded-3xl p-5 border border-[#E7CF94] shadow-sm">
          <div className="space-y-5">
            {cart.map(item => (
              <div key={item.id} className="flex gap-4 items-center">
                <div className="h-16 w-16 rounded-2xl bg-[#FAF2DC] border border-[#E4C988] overflow-hidden shrink-0">
                  {item.images && item.images.length > 0 ? (
                    <img src={item.images[0]} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-[#8A7754]">🛒</div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-black text-[#14120F] truncate">{item.name}</h4>
                  <p className="text-xs font-bold text-[#6E624D] mt-0.5">₹{item.price}</p>
                </div>

                <div className="flex items-center gap-2 bg-[#FAF2DC] px-2 py-1.5 rounded-xl border border-[#DFBE6F] shrink-0">
                  <button 
                    onClick={() => {
                      if (item.quantity > 1) {
                        updateQuantity(item.id, item.quantity - 1);
                      } else {
                        removeFromCart(item.id);
                      }
                    }}
                    className="h-6 w-6 rounded-lg bg-[#FFFDF8] border border-[#E4C988] flex items-center justify-center text-[#14120F] hover:bg-[#F3E2B3] transition-colors cursor-pointer"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-xs font-black w-4 text-center text-[#14120F]">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="h-6 w-6 rounded-lg bg-[#FFFDF8] border border-[#E4C988] flex items-center justify-center text-[#14120F] hover:bg-[#F3E2B3] transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Billing Details */}
        <div className="bg-[#FFFDF8] rounded-3xl p-5 border border-[#E7CF94] shadow-sm">
          <h3 className="text-sm font-black text-[#14120F] tracking-tight mb-4">Bill Summary</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-[#6E624D]">Item Total</span>
              <span className={`font-black ${offerApplied ? 'text-[#8C7B5B] line-through' : 'text-[#14120F]'}`}>₹{totalValue}</span>
            </div>
            
            {offerApplied && cartOffer && (
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-emerald-700 flex items-center gap-2">
                  🎉 {cartOffer.percentage}% Off
                </span>
                <span className="font-black text-emerald-700">-₹{discountAmount}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-[#6E624D]">Delivery</span>
              <div className="flex items-center gap-2">
                {deliveryCost === 0 ? (
                  <>
                    <span className="text-[#8C7B5B] line-through font-bold text-xs">₹{billingSettings.deliveryFee}</span>
                    <span className="font-black text-emerald-700">FREE</span>
                  </>
                ) : (
                  <span className="font-black text-[#14120F]">₹{deliveryCost}</span>
                )}
              </div>
            </div>
            
            {amountToFreeDelivery > 0 && (
              <div className="bg-[#FAF2DC] p-2.5 rounded-xl border border-[#E4C988]">
                <p className="text-[10px] font-bold text-[#4A3E2A] leading-tight">
                  Add <span className="text-[#14120F] font-black">₹{amountToFreeDelivery}</span> more for <strong className="text-[#14120F]">Free Delivery</strong>
                </p>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-[#6E624D]">Handling Fee</span>
              <div className="flex items-center gap-2">
                {billingSettings.packagingFee === 0 ? (
                  <span className="font-black text-emerald-700">FREE</span>
                ) : (
                  <span className="font-black text-[#14120F]">₹{billingSettings.packagingFee}</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-[#6E624D]">Tax</span>
              <div className="flex items-center gap-2">
                {billingSettings.tax === 0 ? (
                  <span className="font-black text-emerald-700">FREE</span>
                ) : (
                  <span className="font-black text-[#14120F]">₹{billingSettings.tax}</span>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-[#EDE0BF] flex items-center justify-between">
              <span className="font-black text-[#14120F] text-base">To Pay</span>
              <span className="font-black text-[#14120F] text-xl">₹{grandTotal}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Action */}
      <div
        style={
          isFestivalOverride
            ? { backgroundColor: t.surfaceColor, borderColor: t.borderColor }
            : undefined
        }
        className="bg-[#FAF2DC] p-6 border-t border-[#E4C988] shrink-0"
      >
        <button 
          onClick={() => router.push('/checkout')}
          data-photo-overlay={isFestivalOverride && isLightBtnText ? "true" : undefined}
          style={
            isFestivalOverride
              ? {
                  background: t.primaryButtonBg || t.primaryColor,
                  color: t.primaryButtonText || "#14120F",
                  borderColor: t.borderColor,
                }
              : undefined
          }
          className="w-full bg-gradient-to-r from-[#FCE89C] via-[#F2C34B] to-[#DDA216] hover:brightness-105 transition-all text-[#111111] border border-[#D49A18]/70 py-4 rounded-2xl font-black text-sm tracking-widest uppercase shadow-[0_6px_18px_rgba(202,138,4,0.28)] active:scale-[0.98] cursor-pointer"
        >
          Checkout
        </button>
      </div>
    </aside>
  );
}
