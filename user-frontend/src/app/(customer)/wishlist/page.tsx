"use client";

import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import { Header } from "@/components/Header";
import Link from "next/link";
import { Trash2, ShoppingCart } from "lucide-react";

export default function WishlistPage() {
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  return (
    <main className="min-h-screen bg-[#cefad0] text-slate-900">
      <Header title="My Wishlist" subtitle="Saved for later" />


      <section className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar */}
          <aside className="w-full lg:w-1/3 space-y-6">
            <div className="rounded-[2rem] bg-white overflow-hidden premium-shadow border border-slate-100">
              <div className="p-2">
                <Link href="/cart" className="flex items-center gap-4 px-6 py-4 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-2xl transition-all">
                  <span className="text-slate-400">📦</span> My Orders
                </Link>
                <Link href="/wishlist" className="flex items-center gap-4 px-6 py-4 text-sm font-black text-emerald-600 bg-emerald-50 rounded-2xl transition-all">
                  <span>❤️</span> My Wishlist
                </Link>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 space-y-4">
            <div className="rounded-[2rem] bg-white p-6 premium-shadow border border-slate-100 mb-6">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                My Wishlist <span className="bg-slate-100 text-slate-500 text-[10px] px-2.5 py-1 rounded-full">{wishlist.length} Items</span>
              </h2>
            </div>

            {wishlist.length === 0 ? (
              <div className="rounded-[2rem] bg-white p-20 premium-shadow border border-slate-100 text-center">
                <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-3xl mb-6">❤️</div>
                <h3 className="text-xl font-black text-slate-900">Your wishlist is empty</h3>
                <p className="mt-2 text-slate-500 font-medium max-w-xs mx-auto">Save items that you like in your wishlist. Review them anytime and easily move them to cart.</p>
                <Link href="/products" className="mt-8 inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-8 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-95">
                  Continue Shopping
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {wishlist.map((item) => (
                  <article key={item.id} className="group relative rounded-[2rem] bg-white p-4 md:p-6 premium-shadow border border-slate-100 transition-all hover:shadow-xl flex gap-6 items-center">
                    {/* Item Image */}
                    <Link href={`/products/${item.id}`} className="h-24 w-24 md:h-32 md:w-32 shrink-0 overflow-hidden rounded-2xl bg-slate-50 p-2">
                      <img
                        src={item.images?.[0] || item.image_url}
                        alt={item.name}
                        className="h-full w-full object-contain transition duration-500 group-hover:scale-110"
                      />
                    </Link>

                    {/* Item Info */}
                    <div className="flex-1 min-w-0">
                      <Link href={`/products/${item.id}`}>
                        <h3 className="text-base font-black text-slate-900 line-clamp-1 hover:text-emerald-600 transition-colors">{item.name}</h3>
                      </Link>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 mb-2">Asali Swad Premium</p>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black text-slate-900">₹{item.price}</span>
                        {item.mrp && (
                          <span className="text-xs text-slate-400 line-through font-bold">₹{item.mrp}</span>
                        )}
                        {item.mrp && (
                          <span className="text-[10px] font-black text-emerald-600">
                            {Math.round(((item.mrp - item.price) / item.mrp) * 100)}% OFF
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col md:flex-row items-center gap-2">
                      <button
                        onClick={() => {
                          addToCart(item, 1);
                          removeFromWishlist(item.id);
                        }}
                        className="flex h-12 items-center gap-2 rounded-2xl bg-slate-900 px-6 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-emerald-600 active:scale-95"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        <span className="hidden md:inline">Move to Cart</span>
                      </button>
                      <button
                        onClick={() => removeFromWishlist(item.id)}
                        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-500 active:scale-90"
                        aria-label="Remove from wishlist"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
