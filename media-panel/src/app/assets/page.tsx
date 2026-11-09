"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { checkMediaAccess, MediaAuthSession } from "@/lib/authGuard";
import { supabase } from "@/lib/supabaseClient";
import { Image as ImageIcon, Plus, Video, FileText, Layers } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AssetsPage() {
  const router = useRouter();
  const [session, setSession] = useState<MediaAuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<any[]>([]);

  useEffect(() => {
    async function init() {
      const auth = await checkMediaAccess();
      if (!auth.authorized) {
        router.push(auth.userId ? "/unauthorized" : "/login");
        return;
      }
      setSession(auth);

      const { data } = await supabase
        .from("creative_assets")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) setAssets(data);
      setLoading(false);
    }
    init();
  }, [router]);

  return (
    <div className="min-h-screen bg-dark-950 pl-64">
      <Sidebar userRole={session?.role} userEmail={session?.email} />
      <Header title="Creative Asset Library" description="Banners, product lookbooks, video campaigns, and brand graphics" />

      <main className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Media Assets</h2>
            <p className="text-xs text-zinc-400">Total {assets.length} production assets cataloged</p>
          </div>
          <button
            onClick={() => alert("Upload asset modal: Cloudinary/Supabase Storage bucket")}
            className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-brand-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Asset</span>
          </button>
        </div>

        {assets.length === 0 ? (
          <div className="p-16 text-center bg-dark-900 border border-dark-800 rounded-xl">
            <ImageIcon className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <h3 className="text-xs font-bold text-white">No Creative Assets Uploaded</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              Store brand graphics, promotional banners, and campaign lookbooks in this centralized library.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {assets.map((asset) => (
              <div key={asset.id} className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden p-3 hover:border-dark-700 transition-all">
                <div className="h-32 bg-dark-950 rounded-lg flex items-center justify-center text-zinc-600 mb-2">
                  {asset.asset_type === "video" ? <Video className="w-6 h-6" /> : <ImageIcon className="w-6 h-6" />}
                </div>
                <div className="text-xs font-semibold text-white truncate">{asset.asset_name}</div>
                <div className="text-[10px] text-zinc-500 uppercase mt-0.5">{asset.asset_type} • v{asset.version}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

