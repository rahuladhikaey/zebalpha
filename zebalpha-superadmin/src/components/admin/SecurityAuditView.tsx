"use client";

import { useState } from "react";
import { ShieldCheck, ShieldAlert, Key, UserX, Clock, Lock } from "lucide-react";

export default function SecurityAuditView() {
  const [activeTab, setActiveTab] = useState<"audit" | "failed">("audit");
  const [auditLogs] = useState<any[]>([]);
  const [failedAttempts] = useState<any[]>([]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Platform Security</span>
          <h1 className="text-2xl font-black tracking-tight text-white">Security, Audit Logs & Login History</h1>
          <p className="text-xs font-bold text-zinc-400 mt-0.5">
            Inspect security events, audit administrative actions, track merchant login history, and monitor failed login attempts.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-1.5 rounded-2xl self-start">
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "audit" ? "bg-white text-black shadow-xl" : "text-zinc-400 hover:text-white"
            }`}
          >
            Audit Logs
          </button>
          <button
            onClick={() => setActiveTab("failed")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "failed" ? "bg-white text-black shadow-xl" : "text-zinc-400 hover:text-white"
            }`}
          >
            Failed Attempts ({failedAttempts.length})
          </button>
        </div>
      </div>

      <div className="bg-zinc-950 rounded-3xl border border-zinc-800 shadow-xl p-6 space-y-4">
        {activeTab === "audit" ? (
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-white" />
              Administrative Audit Logs
            </h2>
            {auditLogs.length > 0 ? (
              <div className="divide-y divide-zinc-800">
                {auditLogs.map(log => (
                  <div key={log.id} className="py-3 flex items-center justify-between text-xs font-bold">
                    <div>
                      <span className="font-black text-white">{log.actor}: </span>
                      <span className="text-zinc-300">{log.action}</span>
                    </div>
                    <div className="flex items-center gap-3 text-zinc-400 font-mono text-[11px]">
                      <span>IP: {log.ip}</span>
                      <span>{log.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-500 font-bold text-xs">
                No administrative audit actions recorded yet.
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2 mb-4">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              Failed Login Attempt Log
            </h2>
            {failedAttempts.length > 0 ? (
              <div className="divide-y divide-zinc-800">
                {failedAttempts.map(log => (
                  <div key={log.id} className="py-3 flex items-center justify-between text-xs font-bold">
                    <div>
                      <span className="font-black text-rose-400">{log.email}: </span>
                      <span className="text-zinc-300">{log.reason}</span>
                    </div>
                    <div className="flex items-center gap-3 text-zinc-400 font-mono text-[11px]">
                      <span>IP: {log.ip}</span>
                      <span>{log.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-500 font-bold text-xs">
                Zero security threats or failed login attempts detected.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
