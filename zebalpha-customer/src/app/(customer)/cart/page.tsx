"use client";

import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { ArrowLeft, Trash2, Zap, Minus, Plus } from "lucide-react";

export default function CartPage() {
  const router = useRouter();
  const { cart, updateQuantity, removeFromCart, clearCart, totalValue, addToCart } = useCart();
  
  const [crossSellProducts, setCrossSellProducts] = useState<any[]>([]);
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

    const fetchCrossSells = async () => {
      const { data } = await supabase.from('products').select('*').limit(6);
      if (data) {
        const inCartIds = new Set(cart.map(c => c.id));
        setCrossSellProducts(data.filter(p => !inCartIds.has(p.id)));
      }
    };
    if (cart.length > 0) fetchCrossSells();
  }, [cart]);

  if (cart.length === 0) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="h-24 w-24 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 text-white">
          <span className="text-4xl">🛒</span>
        </div>
        <h2 className="text-xl font-black text-white mb-2">Your cart is empty</h2>
        <p className="text-sm font-bold text-zinc-400 mb-6 text-center">Add some limited drops to start your collection!</p>
        <button 
          onClick={() => router.push('/')}
          className="bg-white text-black px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10 cursor-pointer"
        >
          Browse Collection
        </button>
      </main>
    );
  }

  const offerApplied = cartOffer.isActive && totalValue >= cartOffer.threshold;
  const discountAmount = offerApplied ? Math.round(totalValue * cartOffer.percentage / 100) : 0;
  const discountedSubtotal = totalValue - discountAmount;

  const deliveryCost = discountedSubtotal >= billingSettings.freeDeliveryThreshold ? 0 : billingSettings.deliveryFee;
  const grandTotal = discountedSubtotal + deliveryCost + billingSettings.packagingFee + billingSettings.tax;
  const amountToFreeDelivery = Math.max(0, billingSettings.freeDeliveryThreshold - discountedSubtotal);

  return (
    <main className="min-h-screen bg-black text-white pb-32">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()}
            className="h-10 w-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 transition-colors text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-black text-white tracking-tight">Order Confirmation</h1>
        </div>
        <button 
          onClick={clearCart}
          className="text-xs font-black uppercase tracking-widest text-rose-400 hover:text-rose-300 transition-colors px-3 py-2"
        >
          Clear Cart
        </button>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        
        {/* Delivery Estimate */}
        <div className="bg-zinc-950 rounded-3xl p-4 flex items-center gap-4 border border-zinc-800 shadow-xl">
          <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 text-white">
            <Zap size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-tight">Express Pan-India Shipping</h3>
            <p className="text-xs font-bold text-zinc-400">Dispatched within 24-48 hours</p>
          </div>
        </div>

        {/* Cart Items */}
        <div className="bg-zinc-950 rounded-3xl p-4 sm:p-6 border border-zinc-800 shadow-xl">
          <div className="space-y-6">
            {cart.map(item => {
              const outOfStock = (item.stock ?? Infinity) <= 0;
              return (
              <div key={item.id} className={`flex gap-4 items-center ${outOfStock ? 'opacity-50 grayscale' : ''}`}>
                <div className="h-16 w-16 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 relative">
                  {item.images && item.images.length > 0 ? (
                    <img src={item.images[0]} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-zinc-500">🛒</div>
                  )}
                  {outOfStock && (
                    <div className="absolute inset-0 bg-rose-950/80 flex items-center justify-center backdrop-blur-[1px]">
                      <span className="text-[8px] font-black text-rose-300 bg-black/80 px-1 py-0.5 rounded uppercase tracking-widest leading-none">OOS</span>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className={`text-sm font-black text-white truncate ${outOfStock ? 'line-through decoration-rose-500' : ''}`}>{item.name}</h4>
                  <p className="text-xs font-bold text-zinc-400 mt-0.5">₹{item.price}</p>
                  {outOfStock && <p className="text-[10px] font-bold text-rose-400 mt-0.5 uppercase tracking-widest">Out of Stock</p>}
                </div>

                <div className="flex items-center gap-3 bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800 shrink-0">
                  <button 
                    onClick={() => {
                      if (item.quantity > 1) {
                        updateQuantity(item.id, item.quantity - 1);
                      } else {
                        removeFromCart(item.id);
                      }
                    }}
                    className="h-6 w-6 rounded-lg bg-zinc-800 flex items-center justify-center text-white hover:bg-zinc-700 transition-colors shadow-sm"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-xs font-black w-4 text-center text-white">{item.quantity}</span>
                  <button 
                    disabled={outOfStock}
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="h-6 w-6 rounded-lg bg-zinc-800 flex items-center justify-center text-white hover:bg-zinc-700 transition-colors shadow-sm disabled:opacity-50"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )})}
          </div>
        </div>

        {/* Cross Sell Section */}
        {crossSellProducts.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-black text-white tracking-tight px-1">Complete the Look</h3>
            <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar px-1">
              {crossSellProducts.map(product => (
                <div key={product.id} className="w-32 shrink-0 bg-zinc-950 rounded-2xl p-3 border border-zinc-800 flex flex-col gap-2 relative shadow-xl">
                  <div className="h-24 w-full rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden relative">
                    {product.images && product.images.length > 0 ? (
                      <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-zinc-500">🛒</div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-white line-clamp-2 leading-tight">{product.name}</h4>
                    <p className="text-[11px] font-bold text-zinc-400 mt-1">₹{product.price}</p>
                  </div>
                  {product.stock && product.stock > 0 ? (
                    <button 
                      onClick={() => addToCart(product, 1)}
                      className="absolute bottom-3 right-3 h-7 w-7 rounded-lg bg-white text-black flex items-center justify-center shadow-md hover:bg-zinc-200 transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  ) : (
                    <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Out of Stock</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Billing Details */}
        <div className="bg-zinc-950 rounded-3xl p-5 sm:p-6 border border-zinc-800 shadow-xl">
          <h3 className="text-sm font-black text-white tracking-tight mb-4">Billing details</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-zinc-400">Subtotal</span>
              <span className={`font-black ${offerApplied ? 'text-zinc-500 line-through' : 'text-white'}`}>₹{totalValue}</span>
            </div>
            
            {offerApplied && (
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-white flex items-center gap-2">
                  🎉 {cartOffer.percentage}% Off
                  <span className="bg-white/10 text-white border border-white/20 text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-black">Applied</span>
                </span>
                <span className="font-black text-white">-₹{discountAmount}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-zinc-400 flex items-center gap-2">
                Delivery
                {deliveryCost === 0 && <span className="bg-white/10 text-white text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-black">Free</span>}
              </span>
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
                  Add items worth <span className="text-white font-black">₹{amountToFreeDelivery}</span> for <strong className="text-white">Free Delivery</strong>
                </p>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-zinc-400">Packaging Fee</span>
              <div className="flex items-center gap-2">
                {billingSettings.packagingFee === 0 ? (
                  <span className="font-black text-white">FREE</span>
                ) : (
                  <span className="font-black text-white">₹{billingSettings.packagingFee}</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-zinc-400">Taxes</span>
              <span className="font-black text-white">₹{billingSettings.tax}</span>
            </div>

            <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
              <span className="font-black text-white text-base">Total</span>
              <span className="font-black text-white text-xl">₹{grandTotal}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Sticky Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 shadow-2xl">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-5 py-4">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-zinc-400">Item Total</span>
            <span className="text-xl font-black text-white tracking-tight">₹{grandTotal}</span>
          </div>
          <button 
            disabled={cart.filter(item => (item.stock ?? Infinity) > 0).length === 0}
            onClick={() => router.push('/checkout')}
            className={`transition-all text-black px-12 py-4 rounded-2xl font-black text-base tracking-wide shadow-xl active:scale-95 min-w-[160px] text-center cursor-pointer ${
              cart.filter(item => (item.stock ?? Infinity) > 0).length === 0
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                : "bg-white hover:bg-zinc-200 shadow-white/10"
            }`}
          >
            {cart.filter(item => (item.stock ?? Infinity) > 0).length === 0 ? "Out of Stock" : "Proceed to Checkout →"}
          </button>
        </div>
      </div>
    </main>
  );
}
