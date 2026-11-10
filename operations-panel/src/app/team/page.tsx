"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { checkOperationsAccess, OperationsAuthSession } from "@/lib/authGuard";
import { supabase } from "@/lib/supabaseClient";
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Mail, 
  Copy, 
  Check, 
  Calendar, 
  X, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  Search,
  Building,
  Key
} from "lucide-react";
import { useRouter } from "next/navigation";

interface EmployeeProfile {
  id: string;
  designation: string;
  employment_status: string;
  joining_date?: string | null;
  created_at: string;
  departments?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface EmployeeInvitation {
  id: string;
  email: string;
  full_name: string;
  department_id?: string;
  assigned_role: string;
  app_scope: string;
  token_hash?: string;
  expires_at: string;
  accepted_at?: string | null;
  is_revoked?: boolean;
  created_at: string;
}

export default function TeamPage() {
  const router = useRouter();
  const [session, setSession] = useState<OperationsAuthSession | null>(null);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [invitations, setInvitations] = useState<EmployeeInvitation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [assignedRole, setAssignedRole] = useState("Operations Manager");
  const [appScope, setAppScope] = useState<"operations" | "media" | "all">("operations");
  const [expiryDays, setExpiryDays] = useState(7);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function init() {
      const auth = await checkOperationsAccess();
      if (!auth.authorized) {
        router.push(auth.userId ? "/unauthorized" : "/login");
        return;
      }
      setSession(auth);

      // Verify HR Manager or OWNER role
      if (auth.role !== "OWNER" && auth.role !== "HR Manager") {
        router.push("/unauthorized");
        return;
      }

      const [
        { data: empData },
        { data: invData },
        { data: deptData },
      ] = await Promise.all([
        supabase.from("employee_profiles").select("*, departments(id, name, code)").order("created_at", { ascending: false }),
        supabase.from("employee_invitations").select("*").order("created_at", { ascending: false }),
        supabase.from("departments").select("id, name, code").order("name", { ascending: true }),
      ]);

      if (empData) setEmployees(empData as EmployeeProfile[]);
      if (invData) setInvitations(invData as EmployeeInvitation[]);
      if (deptData && deptData.length > 0) {
        setDepartments(deptData as Department[]);
        setDepartmentId(deptData[0].id);
      }
      setLoading(false);
    }
    init();
  }, [router]);

  // Generate SHA-256 hash in browser
  const sha256 = async (str: string) => {
    const buffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const handleIssueInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.userId) return;
    setFormError(null);
    setSubmitting(true);

    try {
      if (!fullName.trim() || !email.trim()) {
        setFormError("Full name and email address are required.");
        setSubmitting(false);
        return;
      }

      // Generate single-use secure invitation token
      const rawToken = crypto.randomUUID().replace(/-/g, "") + Math.random().toString(36).substring(2, 10);
      const tokenHash = await sha256(rawToken);

      // Expiry calculation
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);

      // Construct onboarding invite link
      const origin = typeof window !== "undefined" ? window.location.origin : "https://ops.zebalpha.shop";
      const inviteUrl = `${origin}/login?invite=${rawToken}&email=${encodeURIComponent(email.trim())}`;

      // Insert into employee_invitations table
      const { data, error } = await supabase
        .from("employee_invitations")
        .insert({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          department_id: departmentId || (departments[0]?.id || null),
          assigned_role: assignedRole,
          app_scope: appScope,
          token_hash: tokenHash,
          invited_by: session.userId,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) {
        // If PostgreSQL RLS or table ACL restricts direct client insert (service_role required),
        // we present the link directly to the HR manager/Founder
        console.warn("Notice inserting invitation to DB:", error.message);
        setFormError(`Notice: Database invitation record requires backend service sync (${error.message}). A direct onboarding link has been generated below.`);
      } else if (data) {
        setInvitations([data as EmployeeInvitation, ...invitations]);
      }

      // Display the generated link to the HR Manager
      setGeneratedLink(inviteUrl);
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred while issuing invitation.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const resetModal = () => {
    setShowModal(false);
    setFullName("");
    setEmail("");
    setAssignedRole("Operations Manager");
    setAppScope("operations");
    setGeneratedLink(null);
    setFormError(null);
  };

  const filteredEmployees = employees.filter((emp) => {
    const q = searchQuery.toLowerCase();
    const matchesDesig = emp.designation.toLowerCase().includes(q);
    const matchesDept = emp.departments?.name?.toLowerCase().includes(q);
    return matchesDesig || matchesDept;
  });

  return (
    <div className="min-h-screen bg-dark-950 pl-64">
      <Sidebar userRole={session?.role} userEmail={session?.email} />
      <Header title="Human Resources & Employee Invitations" description="Manage enterprise employee profiles, onboarding invitations, and departmental assignments" />

      <main className="p-8 space-y-8">
        {/* Top Header & Invite Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-white">Enterprise Staff Directory</h2>
            <p className="text-xs text-zinc-400">Total {employees.length} active employee profiles registered across enterprise</p>
          </div>
          <button
            onClick={() => {
              setFormError(null);
              setGeneratedLink(null);
              setShowModal(true);
            }}
            className="px-4 py-2 rounded-lg bg-ops-600 hover:bg-ops-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-ops-600/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Employee</span>
          </button>
        </div>

        {/* Search Bar for Staff Directory */}
        <div className="flex items-center justify-between gap-3 bg-dark-900 border border-dark-800 p-3 rounded-xl">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Users className="w-4 h-4 text-ops-400" />
            <span className="font-semibold text-white">Active Employee Roster</span>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by role or department..."
              className="w-full pl-8 pr-3 py-1.5 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-ops-500 transition-colors"
            />
          </div>
        </div>

        {/* Issue Invitation Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-dark-900 border border-dark-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-dark-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-ops-500/10 text-ops-400 flex items-center justify-center">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Issue Single-Use Invitation</h3>
                    <p className="text-[11px] text-zinc-400">Onboard verified staff into Operations, Media, or Executive panels</p>
                  </div>
                </div>
                <button
                  onClick={resetModal}
                  className="p-1 rounded-lg hover:bg-dark-800 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {generatedLink ? (
                /* Success Screen with Copyable Link */
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <h4 className="text-xs font-bold text-white">Single-Use Invitation Generated</h4>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Share this secure registration link with <span className="text-emerald-400 font-semibold">{fullName}</span> ({email}):
                    </p>
                  </div>

                  <div className="p-3 bg-dark-950 rounded-xl border border-dark-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                      <span>Onboarding URL</span>
                      <span className="text-amber-400">Expires in {expiryDays} days</span>
                    </div>
                    <div className="p-2.5 bg-dark-900 rounded-lg text-xs font-mono text-zinc-300 break-all border border-dark-850">
                      {generatedLink}
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(generatedLink)}
                      className="w-full py-2 px-3 rounded-lg bg-ops-600 hover:bg-ops-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-ops-600/20"
                    >
                      {copiedLink ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedLink ? "Link Copied to Clipboard!" : "Copy Onboarding Link"}</span>
                    </button>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={resetModal}
                      className="px-4 py-2 rounded-lg bg-dark-800 text-zinc-300 hover:text-white text-xs font-medium"
                    >
                      Close Window
                    </button>
                  </div>
                </div>
              ) : (
                /* Invitation Input Form */
                <form onSubmit={handleIssueInvitation} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Full Legal Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Vikramaditya Sharma"
                      className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-ops-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Official Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@zebalpha.shop"
                      className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-ops-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">Department</label>
                      <select
                        value={departmentId}
                        onChange={(e) => setDepartmentId(e.target.value)}
                        className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white focus:outline-none focus:border-ops-500"
                      >
                        {departments.length === 0 ? (
                          <option value="">Operations & Logistics</option>
                        ) : (
                          departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name} ({dept.code})
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">Assigned Enterprise Role</label>
                      <select
                        value={assignedRole}
                        onChange={(e) => setAssignedRole(e.target.value)}
                        className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white focus:outline-none focus:border-ops-500"
                      >
                        <optgroup label="Operations Panel">
                          <option value="Operations Manager">Operations Manager</option>
                          <option value="Logistics Coordinator">Logistics Coordinator</option>
                          <option value="Customer Support Agent">Customer Support Agent</option>
                          <option value="Warehouse Lead">Warehouse Lead</option>
                          <option value="HR Manager">HR Manager</option>
                        </optgroup>
                        <optgroup label="Media Panel">
                          <option value="Media Admin">Media Admin</option>
                          <option value="Graphic Designer">Graphic Designer</option>
                          <option value="Video Editor">Video Editor</option>
                          <option value="Ads Manager">Ads Manager</option>
                          <option value="Social Media Manager">Social Media Manager</option>
                          <option value="Content Writer">Content Writer</option>
                        </optgroup>
                        <optgroup label="Executive">
                          <option value="Executive Lead">Executive Lead</option>
                          <option value="Director">Director</option>
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">Panel Access Scope</label>
                      <select
                        value={appScope}
                        onChange={(e) => setAppScope(e.target.value as any)}
                        className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white focus:outline-none focus:border-ops-500"
                      >
                        <option value="operations">Operations Panel Only (ops.zebalpha.shop)</option>
                        <option value="media">Media Panel Only (media.zebalpha.shop)</option>
                        <option value="all">Enterprise Full Access (All Panels)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">Token Validity</label>
                      <select
                        value={expiryDays}
                        onChange={(e) => setExpiryDays(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white focus:outline-none focus:border-ops-500"
                      >
                        <option value={7}>7 Days (Recommended)</option>
                        <option value={14}>14 Days</option>
                        <option value={30}>30 Days</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-dark-800">
                    <button
                      type="button"
                      onClick={resetModal}
                      className="px-4 py-2 rounded-lg bg-dark-800 text-zinc-300 hover:text-white text-xs font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2 rounded-lg bg-ops-600 hover:bg-ops-500 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 transition-all shadow-md shadow-ops-600/20"
                    >
                      {submitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Generating Token...</span>
                        </>
                      ) : (
                        <>
                          <Key className="w-4 h-4" />
                          <span>Issue Invitation</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Employees Directory Table */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-dark-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Active Employee Directory</h3>
            <span className="text-[11px] text-zinc-400">Total {filteredEmployees.length} registered</span>
          </div>

          {filteredEmployees.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-xs">
              {searchQuery ? "No employees match your search query." : "No employee profiles registered yet."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-dark-950/50 text-[10px] uppercase tracking-wider text-zinc-400 border-b border-dark-800">
                  <tr>
                    <th className="py-3 px-4">Designation</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-dark-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-ops-500/10 text-ops-400 flex items-center justify-center font-bold text-xs">
                          {emp.designation[0] || "E"}
                        </div>
                        <span>{emp.designation}</span>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400">
                        {emp.departments?.name || "General Directorate"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {emp.employment_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400">
                        {emp.joining_date || new Date(emp.created_at).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Invitations Table */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-dark-800 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Pending & Issued Invitations</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">Single-use token bound invitations issued to enterprise staff</p>
            </div>
            <span className="text-[11px] text-zinc-400">Total {invitations.length} issued</span>
          </div>

          {invitations.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-xs">
              <Mail className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p>No outstanding invitations. Click "Invite Employee" above to issue a single-use onboarding token.</p>
            </div>
          ) : (
            <div className="divide-y divide-dark-800">
              {invitations.map((inv) => (
                <div key={inv.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-dark-850/40 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-dark-950 border border-dark-800 text-zinc-400 shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-white flex items-center gap-2">
                        <span>{inv.full_name}</span>
                        <span className="text-zinc-500 font-normal">({inv.email})</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Assigned: <span className="text-zinc-300 font-medium">{inv.assigned_role}</span> • App Scope: <span className="uppercase text-ops-400 font-mono text-[10px]">{inv.app_scope}</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Expires {new Date(inv.expires_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className={`px-2.5 py-1 rounded text-[10px] uppercase font-semibold border ${
                      inv.accepted_at 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                        : inv.is_revoked 
                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}>
                      {inv.accepted_at ? "Accepted" : inv.is_revoked ? "Revoked" : "Pending Activation"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
