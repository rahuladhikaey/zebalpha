"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, ShieldAlert, RefreshCw, Clock, AlertTriangle } from "lucide-react";

export default function SecurityAuditView() {
  const [activeTab, setActiveTab] = useState<"audit" | "failed">("audit");
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [failedAttempts, setFailedAttempts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/audit-logs?limit=50");
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        const allLogs = result.data;
        const failed = allLogs.filter((l: any) => 
          l.action === "LOGIN_FAILED" || 
          l.action === "LOGIN_LOCKED_OUT" || 
          l.action?.includes("FAILED")
        );
        const audits = allLogs.filter((l: any) => 
          l.action !== "LOGIN_FAILED" && 
          l.action !== "LOGIN_LOCKED_OUT"
        );
        setAuditLogs(audits);
        setFailedAttempts(failed);
      }
    } catch (e) {
      console.error("Failed to load audit logs:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Platform Security</span>
          <h1 className="text-2xl font-black tracking-tight text-white">Security, Audit Logs & Login History</h1>
          <p className="text-xs font-bold text-zinc-400 mt-0.5">
            Inspect security events, audit administrative actions, track login history, and monitor failed login attempts.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-1.5 rounded-2xl self-start">
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "audit" ? "bg-white text-black shadow-xl" : "text-zinc-400 hover:text-white"
            }`}
          >
            Audit Logs ({auditLogs.length})
          </button>
          <button
            onClick={() => setActiveTab("failed")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "failed" ? "bg-white text-black shadow-xl" : "text-zinc-400 hover:text-white"
            }`}
          >
            Failed Attempts ({failedAttempts.length})
          </button>
          <button
            onClick={fetchLogs}
            title="Refresh logs"
            className="p-2 text-zinc-400 hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="bg-zinc-950 rounded-3xl border border-zinc-800 shadow-xl p-6 space-y-4">
        {activeTab === "audit" ? (
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Administrative Audit Logs
            </h2>
            {auditLogs.length > 0 ? (
              <div className="divide-y divide-zinc-800">
                {auditLogs.map((log) => (
                  <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1 font-bold">
                    <div>
                      <span className="font-black text-white">{log.username || "SUPER_ADMIN"}: </span>
                      <span className="text-zinc-300">{log.action} </span>
                      {log.details ? <span className="text-zinc-500 font-normal">({log.details})</span> : null}
                    </div>
                    <div className="flex items-center gap-3 text-zinc-400 font-mono text-[11px]">
                      <span>IP: {log.ip_address || "127.0.0.1"}</span>
                      <span>{log.created_at ? new Date(log.created_at).toLocaleString() : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-500 font-bold text-xs">
                {isLoading ? "Loading audit events..." : "No administrative audit actions recorded yet."}
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
                {failedAttempts.map((log) => (
                  <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1 font-bold">
                    <div>
                      <span className="font-black text-rose-400">{log.username || "SUPER_ADMIN"}: </span>
                      <span className="text-zinc-300">{log.action} </span>
                      {log.details ? <span className="text-zinc-500 font-normal">({log.details})</span> : null}
                    </div>
                    <div className="flex items-center gap-3 text-zinc-400 font-mono text-[11px]">
                      <span>IP: {log.ip_address || "127.0.0.1"}</span>
                      <span>{log.created_at ? new Date(log.created_at).toLocaleString() : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-500 font-bold text-xs">
                {isLoading ? "Loading failed attempts..." : "Zero security threats or failed login attempts detected."}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
