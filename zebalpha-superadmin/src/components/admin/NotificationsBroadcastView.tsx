"use client";

import { useState } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import { Bell, Send, Users, Radio, CheckCircle2 } from "lucide-react";

export default function NotificationsBroadcastView() {
  const [targetGroup, setTargetGroup] = useState<"sellers" | "customers" | "all">("sellers");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [sending, setSending] = useState(false);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setSending(true);
    try {
      // Insert notification into notifications table so customers see it
      const { error } = await supabase
        .from("notifications")
        .insert({
          title: title.trim(),
          message: message.trim(),
          target_group: targetGroup,
          is_active: true,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      setStatusMsg(`🎉 Broadcast notification successfully dispatched to ${targetGroup.toUpperCase()}!`);
      setTitle("");
      setMessage("");
      setTimeout(() => setStatusMsg(""), 3500);
    } catch (e: any) {
      // Fallback: try store_settings broadcast_messages if notifications table doesn't exist
      try {
        const { data: existing } = await supabase
          .from("store_settings")
          .select("value")
          .eq("key", "broadcast_messages")
          .single();

        const messages = existing?.value || [];
        const updated = [
          { id: Date.now(), title: title.trim(), message: message.trim(), target_group: targetGroup, is_active: true, created_at: new Date().toISOString() },
          ...messages
        ].slice(0, 50); // Keep last 50 messages

        await supabase.from("store_settings").upsert({
          key: "broadcast_messages",
          value: updated,
          updated_at: new Date().toISOString()
        });

        setStatusMsg(`🎉 Broadcast notification dispatched to ${targetGroup.toUpperCase()} via store settings!`);
        setTitle("");
        setMessage("");
        setTimeout(() => setStatusMsg(""), 3500);
      } catch (fallbackErr: any) {
        alert("Failed to send notification: " + (fallbackErr.message || e.message));
      }
    }
    setSending(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Platform Broadcasting</span>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Notifications & Broadcast Messaging</h1>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
          Send push notifications and operational alerts directly to registered merchants, customers, or platform-wide.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm max-w-2xl space-y-4">
        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-emerald-600" />
          Compose Broadcast Message
        </h2>

        {statusMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
            {statusMsg}
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
                    targetGroup === grp ? "bg-emerald-600 text-white shadow-md" : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
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
              placeholder="e.g. Important Seller Payout Schedule Update"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3.5 text-xs font-bold outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400">Message Content *</label>
            <textarea
              rows={4}
              required
              placeholder="Enter message details..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3.5 text-xs font-bold outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{sending ? "Sending Broadcast..." : "Broadcast Notification"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
