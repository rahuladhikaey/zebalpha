import { Header } from "@/components/Header";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Food Guides & Resources | Asali Swad",
  description: "Learn authentic Indian recipes, food storage tips, and how to identify pure organic ingredients with our comprehensive guides.",
  keywords: ["indian food guides", "spice purity test", "how to store sweets", "asali swad guides"],
};

export default function GuidesPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <Header title="Our Guides" subtitle="Expert Food Knowledge" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10">
        <div className="mb-10 text-center">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">The Asali Swad Library</h1>
          <p className="mt-3 text-slate-500 font-medium max-w-xl mx-auto">
            Discover the secrets of authentic Indian cooking, learn how to identify pure spices, and explore traditional recipes passed down through generations.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {/* Sattu Process */}
          <div className="group flex flex-col bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="aspect-[16/9] bg-amber-50 relative overflow-hidden flex items-center justify-center p-6 text-center">
              <span className="text-6xl group-hover:scale-110 transition-transform duration-500 mb-2">🌾</span>
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-amber-700">
                Signature Item
              </div>
            </div>
            <div className="p-6 sm:p-8 flex-1 flex flex-col">
              <h2 className="text-xl font-black text-slate-900 group-hover:text-amber-600 transition-colors">Premium Sattu Making Process</h2>
              <div className="mt-4 text-sm text-slate-600 font-medium space-y-2 mb-6">
                <p><span className="font-bold text-amber-600">Step 1:</span> Sourcing premium quality roasted gram and natural dry fruits</p>
                <p><span className="font-bold text-amber-600">Step 2:</span> Quality inspection and freshness testing</p>
                <p><span className="font-bold text-amber-600">Step 3:</span> Fine grinding and blending process</p>
                <p><span className="font-bold text-amber-600">Step 4:</span> Mixing with selected dry fruits</p>
                <p><span className="font-bold text-amber-600">Step 5:</span> Hygiene and quality check</p>
                <p><span className="font-bold text-amber-600">Step 6:</span> Ready for delivery to customers.</p>
              </div>
            </div>
          </div>

          {/* Thekua Process */}
          <div className="group flex flex-col bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="aspect-[16/9] bg-orange-50 relative overflow-hidden flex items-center justify-center p-6 text-center">
              <span className="text-6xl group-hover:scale-110 transition-transform duration-500 mb-2">🍪</span>
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-orange-700">
                Health
              </div>
            </div>
            <div className="p-6 sm:p-8 flex-1 flex flex-col">
              <h2 className="text-xl font-black text-slate-900 group-hover:text-orange-600 transition-colors">Dry Fruit Health Thekua Making Process</h2>
              <div className="mt-4 text-sm text-slate-600 font-medium space-y-2 mb-6">
                <p><span className="font-bold text-orange-600">Step 1:</span> Selection of premium wheat flour</p>
                <p><span className="font-bold text-orange-600">Step 2:</span> Adding pure jaggery and natural sweeteners</p>
                <p><span className="font-bold text-orange-600">Step 3:</span> Mixing almonds, cashews, raisins, and dry fruits</p>
                <p><span className="font-bold text-orange-600">Step 4:</span> Traditional Thekua preparation process</p>
                <p><span className="font-bold text-orange-600">Step 5:</span> Slow cooking for authentic flavor</p>
                <p><span className="font-bold text-orange-600">Step 6:</span> Freshness and quality inspection</p>
                <p><span className="font-bold text-orange-600">Step 7:</span> Hygienic packaging in pouches</p>
                <p><span className="font-bold text-orange-600">Step 8:</span> Sealed and delivered fresh.</p>
              </div>
            </div>
          </div>

          {/* Bori Process */}
          <div className="group flex flex-col bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="aspect-[16/9] bg-red-50 relative overflow-hidden flex items-center justify-center p-6 text-center">
              <span className="text-6xl group-hover:scale-110 transition-transform duration-500 mb-2">🧆</span>
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-red-700">
                Traditional
              </div>
            </div>
            <div className="p-6 sm:p-8 flex-1 flex flex-col">
              <h2 className="text-xl font-black text-slate-900 group-hover:text-red-600 transition-colors">Masala Fried Bori Making Process</h2>
              <div className="mt-4 text-sm text-slate-600 font-medium space-y-2 mb-6">
                <p><span className="font-bold text-red-600">Step 1:</span> Selection of premium urad dal</p>
                <p><span className="font-bold text-red-600">Step 2:</span> Traditional Bori preparation process</p>
                <p><span className="font-bold text-red-600">Step 3:</span> Sun-drying for natural texture</p>
                <p><span className="font-bold text-red-600">Step 4:</span> Frying to crispy perfection</p>
                <p><span className="font-bold text-red-600">Step 5:</span> Special spice seasoning blend</p>
                <p><span className="font-bold text-red-600">Step 6:</span> Quality and crunchiness check</p>
                <p><span className="font-bold text-red-600">Step 7:</span> Premium AsaliSwad packaging</p>
                <p><span className="font-bold text-red-600">Step 8:</span> Freshly sealed for customers</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
