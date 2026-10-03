"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  RotateCcw, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  ExternalLink, 
  IndianRupee, 
  Truck, 
  Video, 
  Camera, 
  AlertCircle, 
  Eye, 
  FileCheck,
  Download,
  Clock,
  Check,
  X
} from "lucide-react";

export default function ReturnsClaimsView() {
  const [activeTab, setActiveTab] = useState<"claims" | "returns">("claims");
  const [claims, setClaims] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [claimStatusFilter, setClaimStatusFilter] = useState("ALL");

  // Arbitration Modal State
  const [selectedClaim, setSelectedClaim] = useState<any | null>(null);
  const [approvedAmount, setApprovedAmount] = useState("");
  const [adminRemarks, setAdminRemarks] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch SPF claims
      const { data: claimsData } = await supabase
        .from("seller_claims")
        .select("*")
        .order("created_at", { ascending: false });

      setClaims(claimsData || []);

      // Fetch Returns
      const { data: returnsData } = await supabase
        .from("order_returns")
        .select("*")
        .order("created_at", { ascending: false });

      setReturns(returnsData || []);
    } catch (err) {
      console.error("Error loading returns and claims:", err);
      setClaims([]);
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle SPF Claim Arbitration (Approve or Reject)
  const handleResolveClaim = async (status: "APPROVED" | "REJECTED") => {
    if (!selectedClaim) return;
    setIsProcessing(true);

    try {
      const updatePayload = {
        status: status,
        approved_amount: status === "APPROVED" ? parseFloat(approvedAmount || String(selectedClaim.claim_amount)) : 0,
        admin_remarks: adminRemarks || (status === "APPROVED" ? "Evidence verified by SuperAdmin. Compensation approved." : "Evidence insufficient under SPF guidelines."),
        resolved_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("seller_claims")
        .update(updatePayload)
        .eq("id", selectedClaim.id);

      // Local State Update
      setClaims((prev) =>
        prev.map((c) => (c.id === selectedClaim.id ? { ...c, ...updatePayload } : c))
      );

      alert(`✅ Claim ${status === "APPROVED" ? "APPROVED with ₹" + updatePayload.approved_amount : "REJECTED"} successfully!`);
      setSelectedClaim(null);
      setApprovedAmount("");
      setAdminRemarks("");
    } catch (err) {
      console.error("Error updating claim:", err);
      alert("Failed to update claim.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredClaims = claims.filter((claim) => {
    const matchesSearch = 
      !searchQuery ||
      claim.claim_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.suborder_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.seller_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.product_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = claimStatusFilter === "ALL" || claim.status === claimStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-indigo-400" />
            <h2 className="text-lg font-black tracking-tight text-white uppercase">
              Returns &amp; SPF Claims Arbitration Desk
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-medium">
            Review Meesho-grade return logistics, customer refunds, and resolve Seller Protection Fund disputes.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-black/50 p-1 rounded-xl border border-zinc-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("claims")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "claims"
                ? "bg-white text-black shadow"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>SPF Claims Desk</span>
            {claims.filter(c => c.status === "OPEN").length > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center font-bold">
                {claims.filter(c => c.status === "OPEN").length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("returns")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "returns"
                ? "bg-white text-black shadow"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>All Return/RTO Shipments</span>
          </button>
        </div>
      </div>

      {/* SEARCH & FILTERS */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/80">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Claim ID, Suborder, Seller ID, SKU..."
            className="w-full pl-9 pr-4 py-2 bg-black border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {activeTab === "claims" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-bold uppercase">Status:</span>
            {["ALL", "OPEN", "APPROVED", "REJECTED"].map((st) => (
              <button
                key={st}
                onClick={() => setClaimStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                  claimStatusFilter === st
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TAB 1: SPF CLAIMS TABLE */}
      {activeTab === "claims" && (
        <div className="bg-zinc-950 rounded-2xl border border-zinc-800/80 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/70 text-zinc-400 font-bold uppercase tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Claim ID</th>
                  <th className="py-3 px-4">Suborder ID</th>
                  <th className="py-3 px-4">Seller ID</th>
                  <th className="py-3 px-4">Dispute Type</th>
                  <th className="py-3 px-4 text-center">Claim ₹</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Approved ₹</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {filteredClaims.map((claim) => (
                  <tr key={claim.id || claim.claim_id} className="hover:bg-zinc-900/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">{claim.claim_id}</td>
                    <td className="py-3.5 px-4 font-mono text-zinc-400">{claim.suborder_id}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-zinc-400">{claim.seller_id}</td>
                    <td className="py-3.5 px-4 font-bold text-white">
                      {claim.claim_type?.replace(/_/g, " ")}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-white">
                      ₹{claim.claim_amount}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        claim.status === "APPROVED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : claim.status === "REJECTED"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        {claim.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-black text-emerald-400">
                      {claim.approved_amount ? `₹${claim.approved_amount}` : "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedClaim(claim);
                          setApprovedAmount(String(claim.claim_amount || 0));
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition shadow flex items-center gap-1 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Arbitrate</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ALL RETURNS TABLE */}
      {activeTab === "returns" && (
        <div className="bg-zinc-950 rounded-2xl border border-zinc-800/80 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/70 text-zinc-400 font-bold uppercase tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-4">Suborder ID</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">AWB &amp; Courier</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Refund Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {returns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-zinc-900/40 transition">
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-bold text-white line-clamp-1">{ret.product_name}</p>
                      <p className="text-[10px] text-zinc-500">SKU: {ret.sku}</p>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-zinc-400">{ret.suborder_id}</td>
                    <td className="py-3.5 px-4 font-semibold text-zinc-300">{ret.return_type}</td>
                    <td className="py-3.5 px-4 font-medium text-zinc-400">{ret.reason || "N/A"}</td>
                    <td className="py-3.5 px-4 font-mono text-indigo-400">
                      <div>{ret.awb_number}</div>
                      <span className="text-[10px] text-zinc-500">{ret.courier_partner}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 text-[10px] font-bold uppercase">
                        {ret.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase">
                        {ret.refund_status || "COMPLETED"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ARBITRATION MODAL */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 text-white">
            
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-base font-black uppercase text-white">Arbitrate SPF Claim #{selectedClaim.claim_id}</h3>
                <p className="text-xs text-zinc-400 font-mono">Suborder: {selectedClaim.suborder_id}</p>
              </div>
              <button onClick={() => setSelectedClaim(null)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product & Claim Summary */}
            <div className="bg-black/50 p-4 rounded-xl border border-zinc-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Product:</span>
                <span className="font-bold text-white text-right">{selectedClaim.product_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Dispute Type:</span>
                <span className="font-bold text-rose-400">{selectedClaim.claim_type?.replace(/_/g, " ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Claim Amount:</span>
                <span className="font-bold text-emerald-400">₹{selectedClaim.claim_amount}</span>
              </div>
              <div className="pt-2 border-t border-zinc-800">
                <span className="text-zinc-400 block mb-1">Seller Comments:</span>
                <p className="text-zinc-300 italic bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/80">
                  &quot;{selectedClaim.seller_comments}&quot;
                </p>
              </div>
            </div>

            {/* Evidence Links / Media */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase">Uploaded Evidence:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedClaim.unboxing_video_url && (
                  <a
                    href={selectedClaim.unboxing_video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between text-xs text-indigo-400 hover:border-indigo-500 transition font-bold"
                  >
                    <span className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-rose-400" />
                      <span>Watch Unboxing Video</span>
                    </span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {selectedClaim.outer_box_image_url && (
                  <a
                    href={selectedClaim.outer_box_image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between text-xs text-indigo-400 hover:border-indigo-500 transition font-bold"
                  >
                    <span className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-emerald-400" />
                      <span>View Box &amp; Label Photo</span>
                    </span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Approved Amount & Remarks */}
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400 uppercase">Approved Compensation (₹):</label>
                <input
                  type="number"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(e.target.value)}
                  className="w-full px-3.5 py-2 bg-black border border-zinc-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400 uppercase">SuperAdmin Remarks:</label>
                <textarea
                  rows={2}
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  placeholder="Enter resolution notes for the seller..."
                  className="w-full px-3.5 py-2 bg-black border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Arbitration Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => handleResolveClaim("REJECTED")}
                disabled={isProcessing}
                className="px-4 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 font-bold text-xs rounded-xl transition"
              >
                Reject Claim
              </button>
              <button
                type="button"
                onClick={() => handleResolveClaim("APPROVED")}
                disabled={isProcessing}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
              >
                Approve &amp; Disburse ₹{approvedAmount}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}


