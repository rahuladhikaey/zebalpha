"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { Header } from "@/components/Header";

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  product_details: string; // JSON string
  address?: string;
  phone?: string;
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setLoading(false);
        return;
      }

      setUser(sessionData.session.user);

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", sessionData.session.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching orders:", error);
      } else {
        setOrders(data || []);
      }
      setLoading(false);
    }

    fetchOrders();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
        <div className="max-w-md w-full rounded-[2.5rem] bg-white p-10 premium-shadow">
          <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-slate-100 text-3xl mb-6">🔒</div>
          <h1 className="text-2xl font-black text-slate-900">Please Sign In</h1>
          <p className="mt-3 text-slate-500 font-medium">You need to be logged in to view your order history.</p>
          <Link href="/login" className="mt-10 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-8 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-600/20 transition hover:bg-emerald-700">
            Login Now
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#cefad0] text-slate-900">
      <Header title="My Orders" subtitle="Track your premium spices" />


      <section className="mx-auto max-w-4xl px-4 py-12 md:px-8">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Purchase History</span>
            <h1 className="mt-2 text-4xl font-black text-slate-900">Your Orders</h1>
          </div>
          <Link href="/products" className="text-xs font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors">
            + Order More Spices
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-[2.5rem] bg-white p-16 text-center premium-shadow border border-slate-100">
            <div className="mx-auto h-24 w-24 flex items-center justify-center rounded-full bg-slate-50 text-4xl mb-6">📦</div>
            <h2 className="text-xl font-black text-slate-900">No orders yet</h2>
            <p className="mt-2 text-slate-500 font-medium max-w-xs mx-auto">Your premium spice journey starts here. Place your first order today!</p>
            <Link href="/products" className="mt-10 inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-10 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-95">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {orders.map((order) => {
              let items = [];
              try {
                items = typeof order.product_details === "string"
                  ? JSON.parse(order.product_details)
                  : (order.product_details || []);
              } catch (e) {
                console.error("Failed to parse items:", e);
              }
              return (
                <div key={order.id} className="group relative overflow-hidden rounded-[2.5rem] bg-white p-6 md:p-8 premium-shadow border border-slate-100 transition-all hover:border-emerald-200">
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="space-y-4 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-slate-100 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600">
                          Order #{String(order.id).slice(0, 8).toUpperCase()}
                        </span>
                        <span className={`rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest ${order.order_status === "PENDING" ? "bg-amber-50 text-amber-600" :
                            order.order_status === "SHIPPED" ? "bg-blue-50 text-blue-600" :
                              "bg-emerald-50 text-emerald-600"
                          }`}>
                          {order.order_status}
                        </span>
                      </div>

                      <div className="space-y-4">
                        {items.map((item: any, idx: number) => (
                          <div key={idx} className="flex flex-col gap-2 p-3 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                            <div className="flex items-center gap-3 text-sm">
                              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                              <p className="font-bold text-slate-800">
                                {item.name} <span className="text-slate-400 font-medium">x{item.quantity}</span>
                              </p>
                            </div>

                            {/* Star Rating Widget for Bought Products */}
                            <ProductRatingWidget
                              productId={item.id}
                              productName={item.name}
                              user={user}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col justify-between items-end border-l border-slate-50 pl-8 text-right min-w-[150px]">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Paid</p>
                        <p className="text-2xl font-black text-slate-900">₹{order.total_amount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Placed On</p>
                        <p className="text-sm font-bold text-slate-600">{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex items-center justify-between border-t border-slate-50 pt-6">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status:</span>
                      <span className="text-xs font-black text-slate-900">{order.payment_status} ({order.payment_method})</span>
                    </div>
                    <button
                      onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                      className="text-[10px] font-black uppercase tracking-widest text-[#388e3c] bg-green-50/50 hover:bg-green-50 px-3.5 py-2 rounded-xl transition hover:underline flex items-center gap-1.5"
                    >
                      {expandedOrderId === order.id ? "Hide Details ↑" : "View Details →"}
                    </button>
                  </div>

                  {expandedOrderId === order.id && (
                    <div className="mt-6 pt-6 border-t border-slate-100 space-y-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#388e3c]">Real-Time Process Manifest</span>
                        <h4 className="text-xs font-black text-slate-800">Shipment Delivery Progress</h4>
                      </div>

                      {/* Timeline Graphic */}
                      <div className="relative py-4 px-2">
                        {/* Horizontal Connector Line for Desktop */}
                        <div className="hidden md:block absolute top-[28px] left-[12%] right-[12%] h-[3px] bg-slate-100 rounded">
                          <div
                            className="h-full bg-[#388e3c] rounded transition-all duration-1000"
                            style={{
                              width: order.order_status === "DELIVERED" ? "100%" :
                                order.order_status === "SHIPPED" ? "66%" : "0%"
                            }}
                          />
                        </div>

                        {/* Nodes Container */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-4 relative z-10">

                          {/* Node 1: Confirmed */}
                          <div className="flex md:flex-col items-center md:text-center gap-4 md:gap-2">
                            <div className="h-8 w-8 rounded-full bg-[#388e3c] text-white flex items-center justify-center font-black text-xs shadow-lg shadow-green-200 border-2 border-white shrink-0 z-20">
                              ✓
                            </div>
                            <div className="flex flex-col md:items-center">
                              <span className="text-xs font-black text-slate-800">Order Confirmed</span>
                              <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                                {new Date(order.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          {/* Node 2: Dispatched */}
                          {(() => {
                            const isActive = order.order_status === "SHIPPED" || order.order_status === "DELIVERED";
                            return (
                              <div className="flex md:flex-col items-center md:text-center gap-4 md:gap-2">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center font-black text-xs border-2 border-white shrink-0 z-20 transition-all ${isActive ? "bg-[#388e3c] text-white shadow-lg shadow-green-200" : "bg-slate-100 text-slate-400"
                                  }`}>
                                  {isActive ? "✓" : "2"}
                                </div>
                                <div className="flex flex-col md:items-center">
                                  <span className={`text-xs font-black ${isActive ? "text-slate-800" : "text-slate-400"}`}>Dispatched</span>
                                  <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                                    {isActive ? "Ready for transport" : "Awaiting dispatch"}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Node 3: Shipped with Delivery */}
                          {(() => {
                            const isActive = order.order_status === "SHIPPED" || order.order_status === "DELIVERED";
                            return (
                              <div className="flex md:flex-col items-center md:text-center gap-4 md:gap-2">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center font-black text-xs border-2 border-white shrink-0 z-20 transition-all ${isActive ? "bg-[#388e3c] text-white shadow-lg shadow-green-200" : "bg-slate-100 text-slate-400"
                                  }`}>
                                  {isActive ? "✓" : "3"}
                                </div>
                                <div className="flex flex-col md:items-center">
                                  <span className={`text-xs font-black ${isActive ? "text-slate-800" : "text-slate-400"}`}>Shipped with Delivery</span>
                                  <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                                    {isActive ? "In transit to hub" : "Preparing transport"}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Node 4: Delivered */}
                          {(() => {
                            const isActive = order.order_status === "DELIVERED";
                            return (
                              <div className="flex md:flex-col items-center md:text-center gap-4 md:gap-2">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center font-black text-xs border-2 border-white shrink-0 z-20 transition-all ${isActive ? "bg-[#388e3c] text-white shadow-lg shadow-green-200" : "bg-slate-100 text-slate-400"
                                  }`}>
                                  {isActive ? "✓" : "4"}
                                </div>
                                <div className="flex flex-col md:items-center">
                                  <span className={`text-xs font-black ${isActive ? "text-slate-800 animate-pulse" : "text-slate-400"}`}>Delivered</span>
                                  <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                                    {isActive ? "Package received!" : "Arrival pending"}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}

                        </div>
                      </div>

                      {/* Additional Delivery Details */}
                      <div className="grid md:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                        <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Recipient Address</p>
                          <p className="text-xs font-bold text-slate-600 leading-relaxed">{order.address || "N/A"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Contact Number</p>
                          <p className="text-xs font-black text-slate-800">{order.phone || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function ProductRatingWidget({ productId, productName, user }: { productId: number; productName: string; user: any }) {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [savedReview, setSavedReview] = useState<any>(null);

  // Load existing rating if any
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("asali_swad_reviews");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const existing = parsed.find(
            (r: any) => Number(r.product_id) === Number(productId) && r.user_email === user.email
          );
          if (existing) {
            setSavedReview(existing);
            setRating(existing.rating);
            setComment(existing.comment);
            setSubmitted(true);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [productId, user.email]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    const newReview = {
      id: Math.random().toString(36).substr(2, 9),
      product_id: Number(productId),
      user_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Customer",
      user_email: user.email,
      rating,
      comment: comment || "Excellent product!",
      created_at: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("asali_swad_reviews");
      let list = [];
      if (stored) {
        try {
          list = JSON.parse(stored);
        } catch (e) {
          console.error(e);
        }
      }
      // remove duplicate review by this user for this product
      list = list.filter((r: any) => !(Number(r.product_id) === Number(productId) && r.user_email === user.email));
      list.push(newReview);
      localStorage.setItem("asali_swad_reviews", JSON.stringify(list));
    }

    setSavedReview(newReview);
    setSubmitted(true);
  };

  if (submitted && savedReview) {
    return (
      <div className="mt-2 text-xs bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-emerald-800">
          <span>You rated:</span>
          <div className="flex items-center gap-0.5 text-amber-400">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="text-sm">{i < savedReview.rating ? "★" : "☆"}</span>
            ))}
          </div>
        </div>
        {savedReview.comment && (
          <p className="text-slate-600 italic">"{savedReview.comment}"</p>
        )}
        <button
          onClick={() => setSubmitted(false)}
          className="text-[9px] font-black uppercase tracking-wider text-emerald-600 hover:underline pt-1"
        >
          Edit Review
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2 bg-white/80 p-3 rounded-xl border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Rate Product:</span>
        <div className="flex items-center gap-1 text-base text-amber-400">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              type="button"
              key={star}
              onClick={() => setRating(star)}
              className="hover:scale-125 transition-transform text-lg"
            >
              {star <= rating ? "★" : "☆"}
            </button>
          ))}
        </div>
      </div>

      {rating > 0 && (
        <div className="space-y-2">
          <input
            type="text"
            required
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Write a quick review..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold placeholder:text-slate-300 outline-none focus:border-emerald-500/20 focus:bg-white"
          />
          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[9px] py-1.5 rounded-lg transition-colors"
          >
            Submit Review
          </button>
        </div>
      )}
    </form>
  );
}
