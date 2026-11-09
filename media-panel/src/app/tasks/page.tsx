"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { checkMediaAccess, MediaAuthSession } from "@/lib/authGuard";
import { supabase } from "@/lib/supabaseClient";
import { CheckSquare, Plus, Clock, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MediaTasksPage() {
  const router = useRouter();
  const [session, setSession] = useState<MediaAuthSession | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    async function init() {
      const auth = await checkMediaAccess();
      if (!auth.authorized) {
        router.push(auth.userId ? "/unauthorized" : "/login");
        return;
      }
      setSession(auth);

      const { data } = await supabase
        .from("media_tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) setTasks(data);
    }
    init();
  }, [router]);

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    const { error } = await supabase
      .from("media_tasks")
      .update({ status: newStatus })
      .eq("id", taskId);

    if (!error) {
      setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    } else {
      alert(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 pl-64">
      <Sidebar userRole={session?.role} userEmail={session?.email} />
      <Header title="Creative & Marketing Task Board" description="Track task assignments, revisions, approvals, and deadlines" />

      <main className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Media Production Tasks</h2>
            <p className="text-xs text-zinc-400">Total {tasks.length} active assignments</p>
          </div>
        </div>

        <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-xl">
          {tasks.length === 0 ? (
            <div className="p-12 text-center text-zinc-400 text-xs">
              No tasks currently assigned in the media queue.
            </div>
          ) : (
            <div className="divide-y divide-dark-800">
              {tasks.map((task) => (
                <div key={task.id} className="p-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">{task.title}</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">{task.description}</p>
                    <div className="text-[10px] text-zinc-500 mt-1 uppercase font-mono">
                      Priority: <span className="text-amber-400">{task.priority}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={task.status}
                      onChange={(e) => handleUpdateStatus(task.id, e.target.value)}
                      className="px-2 py-1 bg-dark-950 border border-dark-800 rounded text-xs text-white focus:outline-none"
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">Review</option>
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

