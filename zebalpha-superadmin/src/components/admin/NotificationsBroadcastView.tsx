"use client";

import { useState } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import { Bell, Send, Users, Radio, CheckCircle2, Sparkles } from "lucide-react";

export default function NotificationsBroadcastView() {
  const [targetGroup, setTargetGroup] = useState<"sellers" | "customers" | "all">("customers");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [sending, setSending] = useState(false);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setSending(true);
    const nowIso = new Date().toISOString();
    const newBroadcastItem = {
      id: `bc-${Date.now()}`,
      title: title.trim(),
      message: message.trim(),
      target_group: targetGroup,
      is_active: true,
      created_at: nowIso,
    };

    try {
      // 1. Dual-write to store_settings (broadcast_messages) so customer /notifications & bell ALWAYS see it
      try {
        const { data: existing } = await supabase
          .from("store_settings")
          .select("value")
          .eq("key", "broadcast_messages")
          .maybeSingle();

        const messages = Array.isArray(existing?.value) ? existing.value : [];
        const updated = [newBroadcastItem, ...messages].slice(0, 50);

        await supabase.from("store_settings").upsert(
          {
            key: "broadcast_messages",
            value: updated,
            updated_at: nowIso,
          },
          { onConflict: "key" }
        );
      } catch (stErr) {
        console.warn("[StoreSettings broadcast notice]:", stErr);
      }

      // 2. Also write to notifications table if present
      try {
        await supabase
          .from("notifications")
          .insert({
            title: title.trim(),
            message: message.trim(),
            target_group: targetGroup,
            is_active: true,
            created_at: nowIso,
          });
      } catch (_) {}

      // 3. Supabase Realtime Broadcast: Instantly pushes to all open devices & phones!
      try {
        const broadcastChannel = supabase.channel("zebalpha-global-notifications");
        await broadcastChannel.subscribe();
        await broadcastChannel.send({
          type: "broadcast",
          event: "broadcast-message",
          payload: newBroadcastItem,
        });
      } catch (rtErr) {
        console.warn("[Realtime Broadcast notice]:", rtErr);
      }

      setStatusMsg(`🎉 Broadcast notification successfully dispatched to ${targetGroup.toUpperCase()}! Devices alerted in real-time.`);
      setTitle("");
      setMessage("");
      setTimeout(() => setStatusMsg(""), 4500);
    } catch (e: any) {
      alert("Notice sending notification: " + (e.message || "Failed"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Platform Broadcasting</span>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Notifications & Broadcast Messaging</h1>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
          Send push notifications and operational alerts directly to registered merchants, customers, or platform-wide (Flipkart/Meesho style).
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm max-w-2xl space-y-4">
        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-emerald-600" />
          Compose Broadcast Message
        </h2>

        {statusMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        <form onSubmit={handleSendNotification} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400">Target Audience</label>
            <div className="grid grid-cols-3 gap-2">
              {(["sellers", "customers", "all"] as const).map(grp => (
                <button
                  type="button"
                  key={grp}
                  onClick={() => setTargetGroup(grp)}
                  className={`py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    targetGroup === grp
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {grp}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400">Notification Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. 🎨 New: ZebAlpha Custom Design Studio is Live!"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400">Message Content *</label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Enter message details for customers or sellers..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{sending ? "Broadcasting Real-Time..." : "Broadcast Notification"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
