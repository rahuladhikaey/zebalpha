"use client";

import { useEffect, useState } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import { 
  ShieldCheck, 
  Search, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Building2,
  Eye,
  X
} from "lucide-react";

export default function SuperAdminFSSAIQueuePage() {
  const [loading, setLoading] = useState(true);
  const [sellers, setSellers] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("Pending Verification");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedSeller, setSelectedSeller] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [previewMerchantName, setPreviewMerchantName] = useState<string>("");

  const loadFSSAIQueue = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("sellers")
        .select("*")
        .order("updated_at", { ascending: false });

      setSellers(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFSSAIQueue();
  }, []);

  const handleFssaiAction = async (sellerId: string, fssaiStatus: string, reason?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const payload: any = { 
        fssai_status: fssaiStatus,
        verified_at: fssaiStatus === 'Verified' ? new Date().toISOString() : null,
        verified_by: user?.id || null,
        updated_at: new Date().toISOString()
      };
      if (reason) payload.fssai_rejection_reason = reason;

      const { error } = await supabase
        .from("sellers")
        .update(payload)
        .eq("id", sellerId);

      if (error) throw error;

      // Audit log entry
      await supabase.from("merchant_verification_logs").insert({
        seller_id: sellerId,
        action: `FSSAI_${fssaiStatus.toUpperCase().replace(/\s+/g, '_')}`,
        performed_by: user?.id || null,
        performer_role: 'admin',
        notes: reason ? `FSSAI Reason: ${reason}` : `FSSAI license set to ${fssaiStatus}.`,
        metadata: { fssai_status: fssaiStatus }
      });

      setSellers(sellers.map(s => s.id === sellerId ? { ...s, ...payload } : s));
      setShowRejectModal(false);
      setSelectedSeller(null);
      setRejectionReason("");
      alert(`FSSAI Status set to ${fssaiStatus}`);
    } catch (err: any) {
      alert(err.message || "Failed to update FSSAI status.");
    }
  };

  const filtered = sellers.filter(s => {
    const matchesStatus = filterStatus === "all" || (s.fssai_status || "Not Submitted") === filterStatus;
    const matchesSearch = 
      s.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.owner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.fssai_license_number?.includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">FSSAI Verification Queue</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Dedicated queue for reviewing 14-digit FSSAI licenses, inspecting certificate documents, and managing merchant compliance.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {["Pending Verification", "Verified", "Rejected", "Not Submitted", "all"].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterStatus === st
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {st} ({sellers.filter(s => st === "all" || (s.fssai_status || "Not Submitted") === st).length})
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search license, business..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Queue Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-600"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500">
          <ShieldCheck size={40} className="mx-auto text-slate-400 mb-3 opacity-50" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No FSSAI Submissions Found</h3>
          <p className="text-xs mt-1">No merchant records match the selected FSSAI queue status.</p>
        </div>
      ) : (
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                  <th className="pb-3">Merchant Business</th>
                  <th className="pb-3">FSSAI License #</th>
                  <th className="pb-3">Expiry Date</th>
                  <th className="pb-3">Certificate File</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{s.business_name}</div>
                      <div className="text-[11px] text-slate-500">{s.owner_name} • {s.mobile_number}</div>
                    </td>
                    <td className="py-3 font-bold tracking-wider text-slate-800 dark:text-slate-200">
                      {s.fssai_license_number || 'N/A'}
                    </td>
                    <td className="py-3 text-slate-500">
                      {s.fssai_expiry_date || 'N/A'}
                    </td>
                    <td className="py-3">
                      {s.fssai_certificate_url ? (
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewDocUrl(s.fssai_certificate_url);
                            setPreviewMerchantName(s.business_name || s.owner_name || "Merchant");
                          }}
                          className="inline-flex items-center gap-1.5 font-extrabold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 cursor-pointer shadow-2xs transition-colors"
                        >
                          <Eye size={14} /> View FSSAI Pic
                        </button>
                      ) : (
                        <span className="text-slate-400 font-medium">No file</span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        (s.fssai_status === 'Verified' || s.fssai_certificate_url) ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {s.fssai_certificate_url ? 'Auto Verified' : (s.fssai_status || 'Not Uploaded')}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        {s.fssai_certificate_url ? '✓ Verified' : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && selectedSeller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4 text-slate-900 dark:text-slate-100">
            <h2 className="text-base font-bold">Reject FSSAI License</h2>
            <p className="text-xs text-slate-500">
              Enter reason for rejecting <span className="font-bold text-slate-800 dark:text-slate-200">{selectedSeller.business_name}</span>.
            </p>
            <textarea
              required
              rows={3}
              placeholder="e.g. FSSAI License number does not match submitted certificate or file is illegible."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="flex-1 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleFssaiAction(selectedSeller.id, 'Rejected', rejectionReason)}
                className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FSSAI License Document Modal Viewer for Superadmin */}
      {previewDocUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="text-emerald-600" size={20} /> FSSAI License Certificate — {previewMerchantName}
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Stored on Supabase Bucket / Storage: {previewDocUrl.slice(0, 60)}...
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDocUrl(null)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 flex items-center justify-center min-h-[400px]">
              {previewDocUrl.includes(".pdf") ? (
                <iframe
                  src={previewDocUrl}
                  className="w-full h-[550px] rounded-xl border-none"
                  title="FSSAI Document PDF"
                />
              ) : (
                <img
                  src={previewDocUrl}
                  alt="FSSAI License Certificate"
                  className="max-h-[600px] w-auto max-w-full object-contain rounded-xl shadow-md"
                />
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
              <a
                href={previewDocUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
              >
                <FileText size={14} /> Open Direct File Link
              </a>
              <button
                type="button"
                onClick={() => setPreviewDocUrl(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition-all"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
