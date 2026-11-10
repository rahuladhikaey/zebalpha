"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { checkOperationsAccess, OperationsAuthSession } from "@/lib/authGuard";
import { supabase } from "@/lib/supabaseClient";
import { CheckSquare, Plus, Clock, AlertCircle, X, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface OperationsTask {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "assigned" | "in_progress" | "under_review" | "approved" | "completed";
  created_at: string;
}

export default function OperationsTasksPage() {
  const router = useRouter();
  const [session, setSession] = useState<OperationsAuthSession | null>(null);
  const [tasks, setTasks] = useState<OperationsTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<OperationsTask["priority"]>("medium");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    async function init() {
      const auth = await checkOperationsAccess();
      if (!auth.authorized) {
        router.push(auth.userId ? "/unauthorized" : "/login");
        return;
      }
      setSession(auth);

      const { data } = await supabase
        .from("operations_tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) setTasks(data as OperationsTask[]);
      setLoading(false);
    }
    init();
  }, [router]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.userId) return;
    setFormError(null);
    setSubmitting(true);

    try {
      const { data, error } = await supabase
        .from("operations_tasks")
        .insert({
          title: title.trim(),
          description: description.trim(),
          priority,
          status: "pending",
          created_by: session.userId,
        })
        .select()
        .single();

      if (error) {
        setFormError(error.message);
        return;
      }

      if (data) {
        setTasks([data as OperationsTask, ...tasks]);
        setTitle("");
        setDescription("");
        setPriority("medium");
        setShowModal(false);
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to create operations task.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    const { error } = await supabase
      .from("operations_tasks")
      .update({ status: newStatus })
      .eq("id", taskId);

    if (!error) {
      setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus as any } : t)));
    } else {
      console.error("Task status error:", error.message);
    }
  };

  const isManager = session?.role === "OWNER" || session?.role === "Operations Manager" || session?.role === "HR Manager";

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter === "all") return true;
    return t.status === statusFilter;
  });

  return (
    <div className="min-h-screen bg-dark-950 pl-64">
      <Sidebar userRole={session?.role} userEmail={session?.email} />
      <Header title="Departmental Operations Tasks" description="Logistics tracking, return triage, warehouse audit tasks, and fulfillment queues" />

      <main className="p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-white">Operations Tasks Queue</h2>
            <p className="text-xs text-zinc-400">Total {tasks.length} departmental tasks assigned across logistics & fulfillment</p>
          </div>
          {isManager && (
            <button
              onClick={() => {
                setFormError(null);
                setShowModal(true);
              }}
              className="px-4 py-2 rounded-lg bg-ops-600 hover:bg-ops-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-ops-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-dark-900 border border-dark-800 p-1.5 rounded-xl overflow-x-auto">
          {[
            { id: "all", label: "All Tasks" },
            { id: "pending", label: "Pending" },
            { id: "in_progress", label: "In Progress" },
            { id: "under_review", label: "Under Review" },
            { id: "completed", label: "Completed" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === tab.id
                  ? "bg-ops-600 text-white shadow-sm shadow-ops-600/30"
                  : "text-zinc-400 hover:text-white hover:bg-dark-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Create Task Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-dark-900 border border-dark-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-dark-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-ops-500/10 text-ops-400 flex items-center justify-center">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Create Operations Task</h3>
                    <p className="text-[11px] text-zinc-400">Assign warehouse audits, fulfillment queues, or courier triage</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded-lg hover:bg-dark-800 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Task Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Audit Blue Dart Courier Dispatches - Zone B"
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-ops-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Description & Standard Operating Procedure</label>
                  <textarea
                    rows={3}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide specific instructions, warehouse shelf location, courier AWB ranges..."
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-ops-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Priority Level</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white focus:outline-none focus:border-ops-500 capitalize"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent / SLA Sensitive</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-dark-800">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-lg bg-dark-800 text-zinc-300 hover:text-white text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-lg bg-ops-600 hover:bg-ops-500 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 transition-all shadow-md shadow-ops-600/20"
                  >
                    {submitting ? "Saving..." : "Create Task"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-xl">
          {filteredTasks.length === 0 ? (
            <div className="p-16 text-center text-zinc-500 text-xs">
              <CheckSquare className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p>{statusFilter === "all" ? "No tasks currently queued for your department." : `No tasks with status '${statusFilter}'.`}</p>
              {isManager && (
                <button
                  onClick={() => {
                    setFormError(null);
                    setShowModal(true);
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-ops-600 hover:bg-ops-500 text-white text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Task</span>
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-dark-800">
              {filteredTasks.map((task) => (
                <div key={task.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-dark-850/40 transition-colors">
                  <div>
                    <h4 className="text-xs font-bold text-white">{task.title}</h4>
                    <p className="text-xs text-zinc-400 mt-0.5 max-w-xl">{task.description}</p>
                    <div className="text-[10px] text-zinc-500 mt-1 uppercase font-mono flex items-center gap-2">
                      <span>Priority: <span className={
                        task.priority === "urgent" ? "text-red-400 font-bold" :
                        task.priority === "high" ? "text-amber-400 font-semibold" : "text-zinc-400"
                      }>{task.priority}</span></span>
                      <span>•</span>
                      <span>Created {new Date(task.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <select
                      value={task.status}
                      onChange={(e) => handleUpdateStatus(task.id, e.target.value)}
                      className="px-2.5 py-1.5 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white focus:outline-none focus:border-ops-500 capitalize"
                    >
                      <option value="pending">Pending</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="under_review">Under Review</option>
                      <option value="approved">Approved</option>
                      <option value="completed">Completed</option>
                    </select>
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
