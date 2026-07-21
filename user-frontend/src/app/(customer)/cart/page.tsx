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
        // filter out items already in cart
        const inCartIds = new Set(cart.map(c => c.id));
        setCrossSellProducts(data.filter(p => !inCartIds.has(p.id)));
      }
    };
    if (cart.length > 0) fetchCrossSells();
  }, [cart]);

  if (cart.length === 0) {
    return (
      <main className="min-h-screen bg-[#cefad0] flex flex-col items-center justify-center p-4">
        <div className="h-24 w-24 rounded-full bg-slate-200 flex items-center justify-center mb-4">
          <span className="text-4xl">🛒</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2">Your cart is empty</h2>
        <p className="text-sm font-bold text-slate-500 mb-6 text-center">Add some spices to start cooking!</p>
        <button 
          onClick={() => router.push('/')}
          className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-colors"
        >
          Browse Products
        </button>
      </main>
    );
  }

  // Offer discount applies ONLY on subtotal (item prices)
  const offerApplied = cartOffer.isActive && totalValue >= cartOffer.threshold;
  const discountAmount = offerApplied ? Math.round(totalValue * cartOffer.percentage / 100) : 0;
  const discountedSubtotal = totalValue - discountAmount;

  const deliveryCost = discountedSubtotal >= billingSettings.freeDeliveryThreshold ? 0 : billingSettings.deliveryFee;
  const grandTotal = discountedSubtotal + deliveryCost + billingSettings.packagingFee + billingSettings.tax;
  const amountToFreeDelivery = Math.max(0, billingSettings.freeDeliveryThreshold - discountedSubtotal);

  return (
    <main className="min-h-screen bg-[#cefad0] pb-32">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()}
            className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <h1 className="text-lg font-black text-slate-900 tracking-tight">Order confirmation</h1>
        </div>
        <button 
          onClick={clearCart}
          className="text-xs font-black uppercase tracking-widest text-rose-500 hover:text-rose-700 transition-colors px-3 py-2"
        >
          Clear Cart
        </button>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        
        {/* Delivery Estimate */}
        <div className="bg-white rounded-3xl p-4 flex items-center gap-4 shadow-sm border border-slate-100">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
            <Zap size={24} className="text-indigo-600 fill-indigo-600/20" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight">10 minutes</h3>
            <p className="text-xs font-bold text-slate-500">From our neighbourhood kitchens</p>
          </div>
        </div>

        {/* Cart Items */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-100">
          <div className="space-y-6">
            {cart.map(item => {
              const outOfStock = (item.stock ?? Infinity) <= 0;
              return (
              <div key={item.id} className={`flex gap-4 items-center ${outOfStock ? 'opacity-50 grayscale' : ''}`}>
                <div className="h-16 w-16 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0 relative">
                  {item.images && item.images.length > 0 ? (
                    <img src={item.images[0]} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-300">🛒</div>
                  )}
                  {outOfStock && (
                    <div className="absolute inset-0 bg-rose-500/20 flex items-center justify-center backdrop-blur-[1px]">
                      <span className="text-[8px] font-black text-rose-700 bg-white/80 px-1 py-0.5 rounded uppercase tracking-widest leading-none">OOS</span>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className={`text-sm font-black text-slate-900 truncate ${outOfStock ? 'line-through decoration-rose-500' : ''}`}>{item.name}</h4>
                  <p className="text-xs font-bold text-slate-500 mt-0.5">₹{item.price}</p>
                  {outOfStock && <p className="text-[10px] font-bold text-rose-500 mt-0.5 uppercase tracking-widest">Out of Stock</p>}
                </div>

                <div className="flex items-center gap-3 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 shrink-0">
                  <button 
                    onClick={() => {
                      if (item.quantity > 1) {
                        updateQuantity(item.id, item.quantity - 1);
                      } else {
                        removeFromCart(item.id);
                      }
                    }}
                    className="h-6 w-6 rounded-lg bg-white flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition-colors shadow-sm"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-xs font-black w-4 text-center text-emerald-900">{item.quantity}</span>
                  <button 
                    disabled={outOfStock}
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="h-6 w-6 rounded-lg bg-white flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition-colors shadow-sm disabled:opacity-50"
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
            <h3 className="text-sm font-black text-slate-900 tracking-tight px-1">You might like this</h3>
            <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar px-1">
              {crossSellProducts.map(product => (
                <div key={product.id} className="w-32 shrink-0 bg-white rounded-2xl p-3 shadow-sm border border-slate-100 flex flex-col gap-2 relative">
                  <div className="h-24 w-full rounded-xl bg-slate-50 overflow-hidden relative">
                    {product.images && product.images.length > 0 ? (
                      <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-300">🛒</div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-slate-900 line-clamp-2 leading-tight">{product.name}</h4>
                    <p className="text-[11px] font-bold text-slate-500 mt-1">₹{product.price}</p>
                  </div>
                  {product.stock && product.stock > 0 ? (
                    <button 
                      onClick={() => addToCart(product, 1)}
                      className="absolute bottom-3 right-3 h-7 w-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm hover:bg-emerald-100 transition-colors"
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
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100">
          <h3 className="text-sm font-black text-slate-900 tracking-tight mb-4">Billing details</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-slate-500">Subtotal</span>
              <span className={`font-black ${offerApplied ? 'text-slate-400 line-through' : 'text-slate-900'}`}>₹{totalValue}</span>
            </div>
            
            {offerApplied && (
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-emerald-600 flex items-center gap-2">
                  🎉 {cartOffer.percentage}% Off
                  <span className="bg-emerald-100 text-emerald-700 text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-black">Applied</span>
                </span>
                <span className="font-black text-emerald-600">-₹{discountAmount}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-slate-500 flex items-center gap-2">
                Delivery
                {deliveryCost === 0 && <span className="bg-indigo-100 text-indigo-700 text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-black">Free</span>}
              </span>
              <div className="flex items-center gap-2">
                {deliveryCost === 0 ? (
                  <>
                    <span className="text-slate-300 line-through font-bold text-xs">₹{billingSettings.deliveryFee}</span>
                    <span className="font-black text-indigo-600">FREE</span>
                  </>
                ) : (
                  <span className="font-black text-slate-900">₹{deliveryCost}</span>
                )}
              </div>
            </div>
            
            {amountToFreeDelivery > 0 && (
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/50">
                <p className="text-[10px] font-bold text-slate-600 leading-tight">
                  Add items worth <span className="text-indigo-600 font-black">₹{amountToFreeDelivery}</span> and enjoy <strong className="text-indigo-600">Free Delivery</strong>
                </p>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-slate-500">Packaging Fee</span>
              <div className="flex items-center gap-2">
                {billingSettings.packagingFee === 0 ? (
                  <span className="font-black text-indigo-600">FREE</span>
                ) : (
                  <span className="font-black text-slate-900">₹{billingSettings.packagingFee}</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-slate-500">Taxes</span>
              <span className="font-black text-slate-900">₹{billingSettings.tax}</span>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="font-black text-slate-900 text-base">Total</span>
              <span className="font-black text-emerald-600 text-xl">₹{grandTotal}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Sticky Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-5 py-4">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-400">Item Total</span>
            <span className="text-xl font-black text-slate-900 tracking-tight">₹{grandTotal}</span>
          </div>
          <button 
            disabled={cart.filter(item => (item.stock ?? Infinity) > 0).length === 0}
            onClick={() => router.push('/checkout')}
            className={`transition-all text-white px-12 py-4 rounded-2xl font-black text-base tracking-wide shadow-lg active:scale-95 min-w-[160px] text-center ${
              cart.filter(item => (item.stock ?? Infinity) > 0).length === 0
                ? "bg-rose-500 shadow-rose-500/25 cursor-not-allowed"
                : "bg-[#22c55e] hover:bg-[#16a34a] shadow-emerald-500/25"
            }`}
          >
            {cart.filter(item => (item.stock ?? Infinity) > 0).length === 0 ? "Out of Stock" : "Select"}
          </button>
        </div>
      </div>
    </main>
  );
}
