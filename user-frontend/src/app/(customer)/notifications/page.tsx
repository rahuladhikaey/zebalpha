"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { supabase } from "@/lib/supabaseClient";
import { Product } from "@/lib/types";
import Link from "next/link";
import { Bell, ArrowRight, PackageOpen, X } from "lucide-react";

export default function NotificationsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);

  useEffect(() => {
    // Load dismissed notifications from localStorage
    const savedDeleted = localStorage.getItem("deleted_notifications");
    if (savedDeleted) {
      try {
        setDeletedIds(JSON.parse(savedDeleted));
      } catch (e) {
        console.error("Error parsing deleted notifications", e);
      }
    }

    async function fetchLatestProducts() {
      const { data } = await supabase
        .from("products")
        .select("*")
        .order("id", { ascending: false })
        .limit(10);
        
      if (data) {
        setProducts(data as Product[]);
        if (data.length > 0) {
          localStorage.setItem("last_seen_product_id", data[0].id.toString());
        }
      }
      setLoading(false);
    }
    fetchLatestProducts();
  }, []);

  const handleDelete = (e: React.MouseEvent, productId: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newDeletedIds = [...deletedIds, productId];
    setDeletedIds(newDeletedIds);
    localStorage.setItem("deleted_notifications", JSON.stringify(newDeletedIds));
  };

  const visibleProducts = products.filter((p) => !deletedIds.includes(p.id));

  return (
    <div className="min-h-screen bg-page">
      <Header title="Notifications" subtitle="Stay Updated" />
      
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 shadow-sm border border-emerald-200/50">
            <Bell className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Notifications</h1>
            <p className="text-sm font-semibold text-slate-500">Latest updates from Asali Swad</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 w-full animate-pulse rounded-2xl bg-white/60 shadow-sm" />
            ))}
          </div>
        ) : visibleProducts.length > 0 ? (
          <div className="space-y-4">
            {visibleProducts.map(product => (
              <div key={product.id} className="relative group">
                <Link 
                  href={`/products?search=${encodeURIComponent(product.name)}`}
                  className="flex flex-col sm:flex-row gap-4 rounded-2xl bg-white p-4 shadow-sm border border-slate-100 hover:border-emerald-200 hover:shadow-[0_8px_30px_rgb(34,197,94,0.12)] transition-all pr-14"
                >
                  <div className="flex flex-1 flex-col justify-center">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-600 border border-emerald-100">New Arrival</span>
                    </div>
                    <h3 className="mt-1.5 text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-tight">{product.name}</h3>
                    <p className="mt-1 line-clamp-1 text-xs font-medium text-slate-500">{product.description}</p>
                  </div>
                  <div className="flex items-center justify-end sm:justify-center mt-2 sm:mt-0">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
                {/* Delete button */}
                <button
                  onClick={(e) => handleDelete(e, product.id)}
                  className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors z-10"
                  aria-label="Delete Notification"
                >
                  <X className="h-4 w-4" strokeWidth={3} />
                </button>
              </div>
            ))}
            
            <div className="mt-8 flex items-center justify-center">
              <div className="h-1 w-12 rounded-full bg-slate-200"></div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl bg-white p-12 text-center border border-slate-100 premium-shadow">
            <PackageOpen className="mx-auto h-16 w-16 text-slate-200 mb-4" strokeWidth={1.5} />
            <h3 className="text-xl font-black text-slate-900 tracking-tight">No Updates Yet</h3>
            <p className="mt-2 text-sm font-medium text-slate-500 max-w-sm mx-auto">We'll notify you right here as soon as our admin adds fresh organic products to the store!</p>
          </div>
        )}
      </main>
    </div>
  );
}
