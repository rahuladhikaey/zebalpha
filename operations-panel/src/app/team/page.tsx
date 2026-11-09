"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { checkOperationsAccess, OperationsAuthSession } from "@/lib/authGuard";
import { supabase } from "@/lib/supabaseClient";
import { Users, UserPlus, ShieldCheck, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

export default function TeamPage() {
  const router = useRouter();
  const [session, setSession] = useState<OperationsAuthSession | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      ] = await Promise.all([
        supabase.from("employee_profiles").select("*, departments(name, code)").order("created_at", { ascending: false }),
        supabase.from("employee_invitations").select("*").order("created_at", { ascending: false }),
      ]);

      if (empData) setEmployees(empData);
      if (invData) setInvitations(invData);
      setLoading(false);
    }
    init();
  }, [router]);

  return (
    <div className="min-h-screen bg-dark-950 pl-64">
      <Sidebar userRole={session?.role} userEmail={session?.email} />
      <Header title="Human Resources & Employee Invitations" description="Manage enterprise employee profiles, onboarding invitations, and departmental assignments" />

      <main className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Active Employee Directory</h2>
            <p className="text-xs text-zinc-400">Total {employees.length} employees registered</p>
          </div>
          <button
            onClick={() => alert("Issue Invitation modal: Sends single-use email invitation via backend")}
            className="px-4 py-2 rounded-lg bg-ops-600 hover:bg-ops-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-ops-600/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Employee</span>
          </button>
        </div>

        {/* Employees Table */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-xl">
          {employees.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-xs">
              No employee profiles registered yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-dark-950/50 text-[10px] uppercase tracking-wider text-zinc-400 border-b border-dark-800">
                  <tr>
                    <th className="py-3 px-4">Designation</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-dark-800/40 transition-colors">
                      <td className="py-3 px-4 font-medium text-white">{emp.designation}</td>
                      <td className="py-3 px-4 text-zinc-400">{emp.departments?.name || "General"}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {emp.employment_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-400">{emp.joining_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Invitations Table */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-dark-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Pending Invitations</h3>
          </div>
          {invitations.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs">
              No outstanding invitations.
            </div>
          ) : (
            <div className="divide-y divide-dark-800">
              {invitations.map((inv) => (
                <div key={inv.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-white">{inv.full_name} ({inv.email})</div>
                    <div className="text-[11px] text-zinc-400">Assigned: {inv.assigned_role} • App Scope: {inv.app_scope}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                    inv.accepted_at ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                  }`}>
                    {inv.accepted_at ? "Accepted" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

