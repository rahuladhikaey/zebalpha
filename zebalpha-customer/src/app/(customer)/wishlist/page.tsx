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
    <main className="min-h-screen bg-black text-white">
      <Header title="My Wishlist" subtitle="Saved for later" />

      <section className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar */}
          <aside className="w-full lg:w-1/3 space-y-6">
            <div className="rounded-[2rem] bg-zinc-950 overflow-hidden shadow-2xl border border-zinc-800">
              <div className="p-2">
                <Link href="/profile/orders" className="flex items-center gap-4 px-6 py-4 text-sm font-bold text-zinc-400 hover:bg-zinc-900 hover:text-white rounded-2xl transition-all">
                  <span className="text-zinc-500">📦</span> My Orders
                </Link>
                <Link href="/wishlist" className="flex items-center gap-4 px-6 py-4 text-sm font-black text-white bg-zinc-900 border border-zinc-700 rounded-2xl transition-all">
                  <span>❤️</span> My Wishlist
                </Link>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 space-y-4">
            <div className="rounded-[2rem] bg-zinc-950 p-6 shadow-2xl border border-zinc-800 mb-6">
              <h2 className="text-xl font-black text-white flex items-center gap-3">
                My Wishlist <span className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] px-2.5 py-1 rounded-full">{wishlist.length} Items</span>
              </h2>
            </div>

            {wishlist.length === 0 ? (
              <div className="rounded-[2rem] bg-zinc-950 p-20 shadow-2xl border border-zinc-800 text-center">
                <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-zinc-900 text-3xl mb-6 border border-zinc-800">❤️</div>
                <h3 className="text-xl font-black text-white">Your wishlist is empty</h3>
                <p className="mt-2 text-zinc-400 font-medium max-w-xs mx-auto">Save items that you like in your wishlist. Review them anytime and easily move them to cart.</p>
                <Link href="/products" className="mt-8 inline-flex items-center justify-center rounded-2xl bg-white px-8 py-4 text-sm font-black uppercase tracking-widest text-black shadow-xl shadow-white/10 transition-all hover:bg-zinc-200 active:scale-95 cursor-pointer">
                  Continue Shopping
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {wishlist.map((item) => (
                  <article key={item.id} className="group relative rounded-[2rem] bg-zinc-950 p-4 md:p-6 shadow-2xl border border-zinc-800 transition-all hover:border-zinc-700 flex gap-6 items-center">
                    {/* Item Image */}
                    <Link href={`/products/${item.id}`} className="h-24 w-24 md:h-32 md:w-32 shrink-0 overflow-hidden rounded-2xl bg-zinc-900 p-2 border border-zinc-800 flex items-center justify-center">
                      <img
                        src={item.images?.[0] || item.image_url}
                        alt={item.name}
                        className="h-full w-full object-contain transition duration-500 group-hover:scale-110"
                      />
                    </Link>

                    {/* Item Info */}
                    <div className="flex-1 min-w-0">
                      <Link href={`/products/${item.id}`}>
                        <h3 className="text-base font-black text-white line-clamp-1 hover:text-zinc-300 transition-colors">{item.name}</h3>
                      </Link>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1 mb-2">Asali Swad Premium</p>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black text-white">₹{item.price}</span>
                        {item.mrp && (
                          <span className="text-xs text-zinc-500 line-through font-bold">₹{item.mrp}</span>
                        )}
                        {item.mrp && (
                          <span className="text-[10px] font-black text-white bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
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
                        className="flex h-12 items-center gap-2 rounded-2xl bg-white px-6 text-[10px] font-black uppercase tracking-widest text-black transition-all hover:bg-zinc-200 active:scale-95 shadow-lg shadow-white/10 cursor-pointer"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        <span className="hidden md:inline">Move to Cart</span>
                      </button>
                      <button
                        onClick={() => removeFromWishlist(item.id)}
                        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-400 border border-zinc-800 transition-all hover:bg-rose-950/60 hover:text-rose-400 hover:border-rose-800/80 active:scale-90 cursor-pointer"
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
