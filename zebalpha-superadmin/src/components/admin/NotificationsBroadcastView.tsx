"use client";

import { useState } from "react";
import { Bell, Send, CheckCircle2, AlertTriangle, Link as LinkIcon, Image as ImageIcon } from "lucide-react";

interface PushTelemetry {
  configured?: boolean;
  deliveredToDevices?: number;
  totalTokens?: number;
  topicSent?: boolean;
  error?: string;
}

export default function NotificationsBroadcastView() {
  const [targetGroup, setTargetGroup] = useState<"sellers" | "customers" | "all">("customers");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [actionUrl, setActionUrl] = useState("/notifications");
  const [imageUrl, setImageUrl] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [statusTone, setStatusTone] = useState<"success" | "warning">("success");
  const [sending, setSending] = useState(false);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setSending(true);
    setStatusMsg("");

    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          targetGroup,
          actionUrl: actionUrl.trim() || "/notifications",
          imageUrl: imageUrl.trim() || "",
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to broadcast notification");
      }

      const push: PushTelemetry | undefined = json.push;
      if (targetGroup === "sellers") {
        setStatusTone("success");
        setStatusMsg("Broadcast saved & dispatched to SELLERS in-app.");
      } else if (push?.configured) {
        setStatusTone("success");
        setStatusMsg(
          `Broadcast sent! Phone Push delivered to ${push.deliveredToDevices ?? 0}/${push.totalTokens ?? 0} registered device(s)${push.topicSent ? " + FCM Topic" : ""} and saved in-app.`
        );
      } else {
        setStatusTone("warning");
        setStatusMsg(
          `Saved to in-app notifications, but background phone tray push is NOT configured yet (${push?.totalTokens ?? 0} device tokens stored). Add FIREBASE_SERVICE_ACCOUNT_JSON in Vercel Environment Variables to enable real closed-app phone push alerts.`
        );
      }

      setTitle("");
      setMessage("");
      setImageUrl("");
    } catch (e: any) {
      alert("Error sending notification: " + (e.message || "Failed"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Platform Broadcasting</span>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Notifications &amp; Phone Push Broadcast</h1>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
          Send real Android phone tray push alerts (Firebase Cloud Messaging HTTP v1) and in-app updates directly to customers or platform-wide (Flipkart / Meesho style).
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm max-w-2xl space-y-4">
        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-emerald-600" />
          Compose Push &amp; Broadcast Message
        </h2>

        {statusMsg && (
          <div
            className={`p-4 rounded-2xl font-bold text-xs border flex items-start gap-2.5 animate-in fade-in ${
              statusTone === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                : "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-700"
            }`}
          >
            {statusTone === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{statusMsg}</span>
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
                  className={`py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
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
              placeholder="e.g. Flat ₹100 OFF on Your 1st Order!"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400">Message Content *</label>
            <textarea
              required
              rows={3}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Enter notification details shown in customer's phone notification tray..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                <LinkIcon className="w-3 h-3" />
                Open Page on Tap (Optional)
              </label>
              <input
                type="text"
                value={actionUrl}
                onChange={e => setActionUrl(e.target.value)}
                placeholder="/products or /categories"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                Banner Image URL (Optional)
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="https://res.cloudinary.com/..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{sending ? "Sending to Phones..." : "Send Push & Broadcast"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
