"use client";

import { useEffect, useState } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import { 
  Building2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Search, 
  ShieldCheck,
  UserCheck,
  Mail,
  Phone,
  MapPin,
  X,
  FileText,
  Clock,
  RotateCcw,
  Eye,
  Filter
} from "lucide-react";

export default function SuperAdminSellersPage() {
  const [loading, setLoading] = useState(true);
  const [sellers, setSellers] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedSeller, setSelectedSeller] = useState<any | null>(null);
  const [sellerLogs, setSellerLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectType, setRejectType] = useState<"account" | "fssai">("account");
  const [actioningId, setActioningId] = useState<string | null>(null);

  const loadSellers = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("sellers")
        .select("*")
        .order("created_at", { ascending: false });

      setSellers(data || []);
    } catch (e) {
      console.error("Error fetching sellers:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSellers();
  }, []);

  const loadLogsForSeller = async (sId: string) => {
    setLoadingLogs(true);
    try {
      const { data } = await supabase
        .from("merchant_verification_logs")
        .select("*")
        .eq("seller_id", sId)
        .order("created_at", { ascending: false });
      setSellerLogs(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const openSellerModal = (seller: any) => {
    setSelectedSeller(seller);
    loadLogsForSeller(seller.id);
  };

  const handleUpdateStatus = async (sellerId: string, newStatus: string, reason?: string) => {
    setActioningId(sellerId);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const payload: any = { 
        status: newStatus,
        account_status: newStatus === 'approved' ? 'Active' : newStatus === 'suspended' ? 'Suspended' : 'Rejected',
        updated_at: new Date().toISOString()
      };
      if (reason) payload.rejection_reason = reason;

      const { error } = await supabase
        .from("sellers")
        .update(payload)
        .eq("id", sellerId);

      if (error) throw error;

      // Log action
      await supabase.from("merchant_verification_logs").insert({
        seller_id: sellerId,
        action: `ACCOUNT_${newStatus.toUpperCase()}`,
        performed_by: user?.id || null,
        performer_role: 'admin',
        notes: reason ? `Reason: ${reason}` : `Account status updated to ${newStatus}.`,
        metadata: { new_status: newStatus }
      });

      setSellers(sellers.map(s => s.id === sellerId ? { ...s, ...payload } : s));
      if (selectedSeller && selectedSeller.id === sellerId) {
        setSelectedSeller({ ...selectedSeller, ...payload });
        loadLogsForSeller(sellerId);
      }
      setShowRejectModal(false);
      setRejectionReason("");
    } catch (err: any) {
      alert(err.message || "Failed to update seller status.");
    } finally {
      setActioningId(null);
    }
  };

  const handleFssaiAction = async (sellerId: string, fssaiStatus: string, reason?: string) => {
    setActioningId(sellerId);
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

      // Log FSSAI Action
      await supabase.from("merchant_verification_logs").insert({
        seller_id: sellerId,
        action: `FSSAI_${fssaiStatus.toUpperCase().replace(/\s+/g, '_')}`,
        performed_by: user?.id || null,
        performer_role: 'admin',
        notes: reason ? `FSSAI Reason: ${reason}` : `FSSAI status set to ${fssaiStatus}.`,
        metadata: { fssai_status: fssaiStatus }
      });

      setSellers(sellers.map(s => s.id === sellerId ? { ...s, ...payload } : s));
      if (selectedSeller && selectedSeller.id === sellerId) {
        setSelectedSeller({ ...selectedSeller, ...payload });
        loadLogsForSeller(sellerId);
      }
      setShowRejectModal(false);
      setRejectionReason("");
      alert(`FSSAI Status updated to ${fssaiStatus}`);
    } catch (err: any) {
      alert(err.message || "Failed to update FSSAI status.");
    } finally {
      setActioningId(null);
    }
  };

  const filteredSellers = sellers.filter(s => {
    const matchesStatus = filterStatus === "all" || s.status === filterStatus || s.account_status === filterStatus;
    const matchesCategory = filterCategory === "all" || s.business_category === filterCategory || s.category === filterCategory;
    const matchesSearch = 
      s.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.owner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.fssai_license_number?.includes(searchQuery);
    return matchesStatus && matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Brand Store & Merchant Management</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your 1st-Party ZEBALPHA Direct Brand Merchant profile, apparel fulfillment hubs, and GSTIN compliance.
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          {["all", "pending", "approved", "rejected", "suspended"].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                filterStatus === st
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {st} ({sellers.filter(s => st === "all" || s.status === st || s.account_status === st).length})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-medium outline-none"
          >
            <option value="all">All Apparel Categories</option>
            <option value="Polos & Shirts">Polos & Shirts</option>
            <option value="Oversized Tees">Oversized Tees</option>
            <option value="Hoodies & Sweatshirts">Hoodies & Sweatshirts</option>
            <option value="Streetwear & Bottoms">Streetwear & Bottoms</option>
            <option value="New Drops & Exclusives">New Drops & Exclusives</option>
          </select>

          <div className="relative flex-1 lg:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search merchant, GSTIN, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Sellers List Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-600"></div>
        </div>
      ) : filteredSellers.length === 0 ? (
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500">
          <Building2 size={40} className="mx-auto text-slate-400 mb-3 opacity-50" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No Sellers Found</h3>
          <p className="text-xs mt-1">No merchant registrations match your filter criteria.</p>
        </div>
      ) : (
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                  <th className="pb-3">Business & Owner</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Location</th>
                  <th className="pb-3">FSSAI Status</th>
                  <th className="pb-3">Account Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSellers.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        {s.business_logo_url || s.profile_photo ? (
                          <img src={s.business_logo_url || s.profile_photo} alt="" className="h-8 w-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700" />
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                            {s.business_name?.[0] || 'M'}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">{s.business_name}</div>
                          <div className="text-[11px] text-slate-500">{s.owner_name} • {s.mobile_number}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 font-medium text-slate-600 dark:text-slate-300">
                      {s.business_category || s.category || 'Grocery'}
                    </td>
                    <td className="py-3 text-slate-500">
                      {s.city}, {s.state}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        s.fssai_status === 'Verified' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                        s.fssai_status === 'Pending Verification' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                        s.fssai_status === 'Rejected' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {s.fssai_status || 'Not Submitted'}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        s.status === 'approved' || s.account_status === 'Active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                        s.status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                        s.status === 'suspended' || s.account_status === 'Suspended' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' :
                        'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}>
                        {s.status || s.account_status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => openSellerModal(s)}
                        className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                      >
                        <Eye size={14} /> View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Comprehensive Merchant Detail Modal */}
      {selectedSeller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-3xl rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-6 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                {selectedSeller.business_logo_url || selectedSeller.profile_photo ? (
                  <img src={selectedSeller.business_logo_url || selectedSeller.profile_photo} alt="" className="h-10 w-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700" />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
                    {selectedSeller.business_name?.[0]}
                  </div>
                )}
                <div>
                  <h2 className="text-base font-bold">{selectedSeller.business_name}</h2>
                  <p className="text-xs text-slate-500">ID: {selectedSeller.id} • Category: {selectedSeller.business_category || selectedSeller.category}</p>
                </div>
              </div>
              <button onClick={() => setSelectedSeller(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {/* Profile Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1">Contact & Info</h3>
                <p><strong>Owner:</strong> {selectedSeller.owner_name}</p>
                <p><strong>Email:</strong> {selectedSeller.email} {selectedSeller.email_verified ? '✅ Verified' : '⚠️ Unverified'}</p>
                <p><strong>Mobile:</strong> {selectedSeller.mobile_number}</p>
                <p><strong>PhonePe UPI:</strong> {selectedSeller.phonepay_number || selectedSeller.phonepay_no || 'N/A'}</p>
                <p><strong>GSTIN:</strong> {selectedSeller.gstin || 'N/A'}</p>
              </div>

              <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1">FSSAI License Details</h3>
                <p><strong>License Status:</strong> <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedSeller.fssai_certificate_url ? 'Auto Verified' : (selectedSeller.fssai_status || 'Not Uploaded')}</span></p>
                <p><strong>Expiry Date:</strong> {selectedSeller.fssai_expiry_date || 'N/A'}</p>
                {selectedSeller.fssai_certificate_url && (
                  <a href={selectedSeller.fssai_certificate_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-600 font-bold hover:underline mt-1">
                    <FileText size={14} /> View Certificate Doc 📄
                  </a>
                )}
              </div>

              <div className="md:col-span-2 space-y-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1">Addresses</h3>
                <p><strong>Pickup Address:</strong> {selectedSeller.pickup_address || 'N/A'}</p>
                <p><strong>Warehouse Address:</strong> {selectedSeller.warehouse_address || 'N/A'}</p>
                <p><strong>City / State / PIN:</strong> {selectedSeller.city}, {selectedSeller.state} - {selectedSeller.pincode}</p>
              </div>
            </div>

            {/* Account Status Action Toolbar */}
            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">Merchant Account Status Controls</h3>
              <div className="flex flex-wrap gap-2">
                {selectedSeller.status !== 'approved' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedSeller.id, 'approved')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                  >
                    Approve Merchant Account
                  </button>
                )}
                {selectedSeller.status !== 'rejected' && (
                  <button
                    onClick={() => {
                      setRejectType("account");
                      setShowRejectModal(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors"
                  >
                    Reject Merchant Account
                  </button>
                )}
                {selectedSeller.status === 'approved' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedSeller.id, 'suspended')}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors"
                  >
                    Suspend Merchant
                  </button>
                )}
                {selectedSeller.status === 'suspended' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedSeller.id, 'approved')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                  >
                    Reactivate Merchant
                  </button>
                )}
              </div>
            </div>

            {/* Verification Audit Logs */}
            <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-4 text-xs">
              <h3 className="font-bold text-slate-800 dark:text-slate-200">Verification Audit Log History</h3>
              {loadingLogs ? (
                <p className="text-slate-400">Loading audit history...</p>
              ) : sellerLogs.length === 0 ? (
                <p className="text-slate-400">No audit log records recorded yet.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {sellerLogs.map(log => (
                    <div key={log.id} className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-start">
                      <div>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[10px] block">{log.action}</span>
                        <p className="text-slate-600 dark:text-slate-300 mt-0.5">{log.notes}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {showRejectModal && selectedSeller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4 text-slate-900 dark:text-slate-100">
            <h2 className="text-base font-bold">
              Reject {rejectType === "fssai" ? "FSSAI Verification" : "Merchant Account"}
            </h2>
            <p className="text-xs text-slate-500">
              Provide mandatory reason for <span className="font-bold text-slate-800 dark:text-slate-200">{selectedSeller.business_name}</span>.
            </p>
            <textarea
              required
              rows={3}
              placeholder={rejectType === "fssai" ? "e.g. Invalid 14-digit FSSAI license number or unreadable certificate document." : "e.g. Incomplete business address or invalid identity info."}
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
                onClick={() => {
                  if (rejectType === "fssai") {
                    handleFssaiAction(selectedSeller.id, 'Rejected', rejectionReason);
                  } else {
                    handleUpdateStatus(selectedSeller.id, 'rejected', rejectionReason);
                  }
                }}
                className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
