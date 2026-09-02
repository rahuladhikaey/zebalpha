"use client";

import { useCart } from "@/context/CartContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Minus, Plus, ShoppingBag, Zap } from "lucide-react";

export default function DesktopSideCart() {
  const router = useRouter();
  const pathname = usePathname();
  const { cart, updateQuantity, removeFromCart, totalValue, totalItems } = useCart();
  
  const [billingSettings, setBillingSettings] = useState({
    deliveryFee: 29,
    freeDeliveryThreshold: 100,
    packagingFee: 9,
    tax: 3
  });
  const [cartOffer, setCartOffer] = useState({
    threshold: 139,
    percentage: 50,
    isActive: true
  });
  
  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('store_settings').select('value').eq('key', 'billing').single();
      if (data && data.value) {
        setBillingSettings(data.value);
      }
    };
    fetchSettings();

    const fetchOffer = async () => {
      const { data } = await supabase.from('store_settings').select('value').eq('key', 'global_cart_offer').single();
      if (data && data.value) {
        setCartOffer(data.value);
      }
    };
    fetchOffer();
  }, []);

  if (cart.length === 0 || pathname === '/checkout' || pathname === '/cart') {
    return null; // Side cart only shows when items are in cart, and is hidden on checkout/cart pages
  }

  const offerApplied = cartOffer.isActive && totalValue >= cartOffer.threshold;
  const discountAmount = offerApplied ? Math.round(totalValue * cartOffer.percentage / 100) : 0;
  const discountedSubtotal = totalValue - discountAmount;

  const deliveryCost = discountedSubtotal >= billingSettings.freeDeliveryThreshold ? 0 : billingSettings.deliveryFee;
  const grandTotal = discountedSubtotal + deliveryCost + billingSettings.packagingFee + billingSettings.tax;
  const amountToFreeDelivery = Math.max(0, billingSettings.freeDeliveryThreshold - discountedSubtotal);

  return (
    <aside className="hidden lg:flex w-96 xl:w-[400px] shrink-0 border-l border-zinc-800 bg-black text-white flex-col h-full sticky top-0 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="bg-zinc-950 px-6 py-5 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20">
            <ShoppingBag size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">Your Cart</h2>
            <p className="text-xs font-bold text-zinc-400">{totalItems} {totalItems === 1 ? 'item' : 'items'}</p>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
        
        {/* Delivery Estimate */}
        <div className="bg-zinc-950 rounded-2xl p-4 flex items-center gap-4 border border-zinc-800">
          <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-white">
            <Zap size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-tight">Express Pan-India Shipping</h3>
            <p className="text-[11px] font-bold text-zinc-400 mt-0.5">Dispatched within 24-48 hours</p>
          </div>
        </div>

        {/* Cart Items */}
        <div className="bg-zinc-950 rounded-3xl p-5 border border-zinc-800 shadow-xl">
          <div className="space-y-5">
            {cart.map(item => (
              <div key={item.id} className="flex gap-4 items-center">
                <div className="h-16 w-16 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0">
                  {item.images && item.images.length > 0 ? (
                    <img src={item.images[0]} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-zinc-500">🛒</div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-black text-white truncate">{item.name}</h4>
                  <p className="text-xs font-bold text-zinc-400 mt-0.5">₹{item.price}</p>
                </div>

                <div className="flex items-center gap-2 bg-zinc-900 px-2 py-1.5 rounded-xl border border-zinc-800 shrink-0">
                  <button 
                    onClick={() => {
                      if (item.quantity > 1) {
                        updateQuantity(item.id, item.quantity - 1);
                      } else {
                        removeFromCart(item.id);
                      }
                    }}
                    className="h-6 w-6 rounded-lg bg-zinc-800 flex items-center justify-center text-white hover:bg-zinc-700 transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-xs font-black w-4 text-center text-white">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="h-6 w-6 rounded-lg bg-zinc-800 flex items-center justify-center text-white hover:bg-zinc-700 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Billing Details */}
        <div className="bg-zinc-950 rounded-3xl p-5 border border-zinc-800 shadow-xl">
          <h3 className="text-sm font-black text-white tracking-tight mb-4">Bill Summary</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-zinc-400">Item Total</span>
              <span className={`font-black ${offerApplied ? 'text-zinc-500 line-through' : 'text-white'}`}>₹{totalValue}</span>
            </div>
            
            {offerApplied && (
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-white flex items-center gap-2">
                  🎉 {cartOffer.percentage}% Off
                </span>
                <span className="font-black text-white">-₹{discountAmount}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-zinc-400">Delivery</span>
              <div className="flex items-center gap-2">
                {deliveryCost === 0 ? (
                  <>
                    <span className="text-zinc-500 line-through font-bold text-xs">₹{billingSettings.deliveryFee}</span>
                    <span className="font-black text-white">FREE</span>
                  </>
                ) : (
                  <span className="font-black text-white">₹{deliveryCost}</span>
                )}
              </div>
            </div>
            
            {amountToFreeDelivery > 0 && (
              <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                <p className="text-[10px] font-bold text-zinc-300 leading-tight">
                  Add <span className="text-white font-black">₹{amountToFreeDelivery}</span> more for <strong className="text-white">Free Delivery</strong>
                </p>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-zinc-400">Handling Fee</span>
              <div className="flex items-center gap-2">
                {billingSettings.packagingFee === 0 ? (
                  <span className="font-black text-white">FREE</span>
                ) : (
                  <span className="font-black text-white">₹{billingSettings.packagingFee}</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-zinc-400">Tax</span>
              <div className="flex items-center gap-2">
                {billingSettings.tax === 0 ? (
                  <span className="font-black text-white">FREE</span>
                ) : (
                  <span className="font-black text-white">₹{billingSettings.tax}</span>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
              <span className="font-black text-white text-base">To Pay</span>
              <span className="font-black text-white text-xl">₹{grandTotal}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Action */}
      <div className="bg-zinc-950 p-6 border-t border-zinc-800 shrink-0">
        <button 
          onClick={() => router.push('/checkout')}
          className="w-full bg-white hover:bg-zinc-200 transition-all text-black py-4 rounded-2xl font-black text-sm tracking-widest uppercase shadow-xl shadow-white/10 active:scale-[0.98] cursor-pointer"
        >
          Checkout
        </button>
      </div>
    </aside>
  );
}
