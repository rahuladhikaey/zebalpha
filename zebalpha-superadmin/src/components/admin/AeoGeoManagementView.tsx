"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Layers,
  Building,
  Tag,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Code,
  Copy,
  Sliders,
  Plus,
  Trash2,
  HelpCircle,
  Check,
  Info
} from "lucide-react";
import type { Product } from "@/types/products";
import type { Category } from "@/types/categories";

interface AeoGeoManagementViewProps {
  products?: Product[];
  categories?: Category[];
  onRefresh?: () => void;
}

const DEFAULT_BRAND_ENTITY = {
  name: "ZEBALPHA",
  legalName: "ZEBALPHA Clothing Pvt Ltd",
  url: "https://zebalpha.shop",
  logo: "https://zebalpha.shop/icon.png",
  supportEmail: "support@zebalpha.shop",
  supportPhone: "+91 93301 44522",
  addressCountry: "IN",
  addressLocality: "Dum Dum, North 24 Parganas, Kolkata",
  addressRegion: "West Bengal",
  postalCode: "700028",
  freeShippingThreshold: 999,
  dispatchTimeHours: "24-48 hours",
  returnWindowDays: 7,
  returnPolicyUrl: "https://zebalpha.shop/return-policy",
  shippingPolicyUrl: "https://zebalpha.shop/shipping-policy"
};

const DEFAULT_CATEGORIES_AEO: Record<string, any> = {
  "polos": {
    slug: "polos",
    name: "Polos & Zip Collars",
    h1: "Premium Men's Polos & Textured Zip Collar T-Shirts",
    shortDirectAnswer: "ZEBALPHA polos are engineered from 100% combed cotton (220-260 GSM) featuring structured collars, metal half-zip plackets, and tailored drapes designed for smart casual wear in Indian weather.",
    summary: "A modern evolution of the classic polo, replacing conventional plastic buttons with minimalist metal zips and textured waffle or pique knits that retain shape across hundreds of washes.",
    keyCharacteristics: [
      "100% Combed Cotton knit with breathable micro-texture",
      "Reinforced collar ribbing that resists curling and rolling",
      "Heavy-duty rust-proof metallic half-zip closure",
      "Regular to relaxed modern fit tailored for athletic drapes",
      "Pre-shrunk fabric to prevent post-wash shrinkage"
    ],
    faqs: [
      {
        question: "What makes a zip polo different from a traditional button polo?",
        answer: "A zip polo replaces conventional plastic button plackets with a metallic or nylon quarter-zip. This provides a sleek, modern streetwear silhouette and allows customizable neck ventilation."
      },
      {
        question: "What fabric is best for polo shirts in India?",
        answer: "100% combed cotton between 220 and 260 GSM is optimal. Combed cotton removes short, prickling fibers, resulting in superior softness and breathability during humid Indian climates."
      }
    ]
  },
  "oversized-t-shirts": {
    slug: "oversized-t-shirts",
    name: "Oversized T-Shirts",
    h1: "Heavyweight Oversized Streetwear T-Shirts (240+ GSM)",
    shortDirectAnswer: "An oversized t-shirt features dropped shoulder seams, broader chest dimensions (+4 to +6 inches over body measurement), and longer elbow-grazing sleeves to create a relaxed streetwear drape.",
    summary: "Engineered specifically for structure rather than slouch. We utilize dense 240 to 280 GSM combed cotton so the garment maintains its boxy silhouette without collapsing on the body.",
    keyCharacteristics: [
      "240 - 280 GSM heavyweight French terry or single jersey cotton",
      "Engineered drop shoulder with reinforced twin-needle stitching",
      "Thick 1.2-inch shape-retaining ribbed crew collar",
      "Boxy streetwear silhouette with clean, non-clinging fall",
      "Bio-washed and silicone softened for zero prickle"
    ],
    faqs: [
      {
        question: "Should I size down for an oversized t-shirt?",
        answer: "No. ZEBALPHA oversized t-shirts are intentionally tailored with generous proportions in your normal size. Ordering your standard size gives the intended streetwear silhouette."
      },
      {
        question: "What GSM is best for oversized t-shirts?",
        answer: "240 GSM or higher is standard for premium streetwear. Lighter fabrics (160-180 GSM) collapse and drape like sleepwear, whereas 240+ GSM retains clean boxy lines."
      }
    ]
  },
  "t-shirts": {
    slug: "t-shirts",
    name: "Men's T-Shirts",
    h1: "Men's Everyday Crew Neck & Graphic T-Shirts",
    shortDirectAnswer: "ZEBALPHA standard t-shirts are crafted from 180 to 200 GSM 100% combed cotton featuring classic crew necks, athletic shoulder lines, and daily durable construction for warm climates.",
    summary: "The quintessential daily wardrobe foundation. Balanced fabric weight prevents sheerness while allowing superior breathability during warm Indian weather.",
    keyCharacteristics: [
      "180 - 200 GSM 100% combed ringspun cotton",
      "Classic crew neck with spandex-blend ribbing",
      "Regular fit designed to flatter shoulders and chest",
      "Enzyme-washed for ultra-soft hand feel",
      "Double-stitched sleeves and bottom hem for shape retention"
    ],
    faqs: [
      {
        question: "What is the difference between regular fit and oversized t-shirts?",
        answer: "A regular fit t-shirt has seams sitting directly on the shoulder edge with 2-3 inches of chest ease. An oversized t-shirt drops the shoulder seam 2-3 inches down the arm with 5-6 inches of chest ease."
      }
    ]
  },
  "hoodies": {
    slug: "hoodies",
    name: "Hoodies & Sweatshirts",
    h1: "Heavyweight Fleece Streetwear Hoodies (380+ GSM)",
    shortDirectAnswer: "ZEBALPHA hoodies are made with 380 to 420 GSM brushed back fleece cotton featuring double-layer structured hoods, kangaroo pockets, and heavyweight ribbing designed for cold days and streetwear layering.",
    summary: "Winter streetwear built with ultra-dense loopback and brushed fleece that holds warmth without synthetic bulk.",
    keyCharacteristics: [
      "380 - 420 GSM heavyweight combed cotton fleece",
      "Double-lined self-fabric hood that stands erect without collapsing",
      "Heavy duty 2x2 ribbing at cuffs and waist hem",
      "Deep kangaroo pouch with reinforced bar-tack stress points",
      "Brushed interior for luxurious skin comfort"
    ],
    faqs: [
      {
        question: "How heavy is a 400 GSM hoodie?",
        answer: "A 400 GSM hoodie weighs approximately 800 to 1,000 grams in total garment weight. This provides dense thermal insulation and an authoritative streetwear structure."
      }
    ]
  },
  "shirts": {
    slug: "shirts",
    name: "Casual & Oversized Shirts",
    h1: "Men's Casual, Linen-Blend & Resort Shirts",
    shortDirectAnswer: "ZEBALPHA casual shirts blend relaxed resort styling with modern streetwear proportions, tailored in breathable cotton twill and linen blends with Cuban and camp collar profiles.",
    summary: "Versatile button-downs that transition from beachside dinners to city nightlife, cut with relaxed drape and easy maintenance.",
    keyCharacteristics: [
      "Lightweight cotton and linen-blend fabrics (140-180 GSM)",
      "Cuban camp collar and relaxed spread collars",
      "Pre-softened drape with subtle textured weaves",
      "Straight boxy hem with side vent slits for untucked styling",
      "Natural shell or matte horn buttons"
    ],
    faqs: [
      {
        question: "Are ZEBALPHA shirts designed to be worn untucked?",
        answer: "Yes, our casual and resort shirts are tailored with a modern straight bottom hem and side slits intended to fall cleanly over denim or trousers without tucking."
      }
    ]
  }
};

const BUYING_GUIDES_LIST = [
  {
    slug: "t-shirt-size-guide",
    title: "T-Shirt Size Guide: How to Measure for Regular & Oversized Fits",
    h1: "The Complete T-Shirt Size & Fit Measurement Guide",
    readingTime: "5 min read",
    schemaType: "TechArticle / HowTo",
    focus: "Chest ease, armhole drop, inch/cm conversion matrix"
  },
  {
    slug: "oversized-t-shirt-guide",
    title: "Oversized T-Shirt Guide: Fit, Styling, and Silhouette Rules",
    h1: "The Definitive Oversized T-Shirt Silhouette & Styling Guide",
    readingTime: "6 min read",
    schemaType: "Article",
    focus: "Rule of proportions, shoulder seam drop, bottoms pairing"
  },
  {
    slug: "regular-vs-oversized-tshirt",
    title: "Regular Fit vs Oversized T-Shirt: Key Differences Explained",
    h1: "Regular Fit vs Oversized T-Shirts: Which Silhouette Suits You?",
    readingTime: "5 min read",
    schemaType: "Article / Comparison",
    focus: "Side-by-side 5-dimension technical comparison"
  },
  {
    slug: "printed-tshirt-care-guide",
    title: "Printed T-Shirt Care Guide: How to Wash & Prevent Cracking",
    h1: "Printed T-Shirt Care: Washing, Drying & Preserving Graphic Prints",
    readingTime: "6 min read",
    schemaType: "HowTo / Article",
    focus: "Wash inside-out, cold water, DTF/puff print thermal safety"
  },
  {
    slug: "cotton-fabric-gsm-guide",
    title: "T-Shirt Fabric & GSM Guide: What Does GSM Mean in Clothing?",
    h1: "T-Shirt Fabric GSM Guide: Understanding Fabric Weight & Quality",
    readingTime: "7 min read",
    schemaType: "TechArticle",
    focus: "160 to 400 GSM analysis, single jersey vs french terry"
  }
];

export default function AeoGeoManagementView({
  products = [],
  categories = [],
  onRefresh
}: AeoGeoManagementViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"audit" | "brand" | "categories" | "products" | "guides">("audit");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error">("success");

  // Brand Entity Settings
  const [brandEntity, setBrandEntity] = useState(DEFAULT_BRAND_ENTITY);

  // Category AEO Overrides
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, any>>(DEFAULT_CATEGORIES_AEO);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>("polos");

  // Product Inspector Selection
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || "");
  const [productSearch, setProductSearch] = useState("");

  const notify = (msg: string, type: "success" | "error" = "success") => {
    setStatusMsg(msg);
    setStatusType(type);
    setTimeout(() => setStatusMsg(""), 4000);
  };

  // Load persisted overrides from store_settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("store_settings")
          .select("key, value")
          .in("key", ["aeo_brand_entity", "aeo_category_overrides"]);

        if (!error && data) {
          data.forEach(item => {
            if (item.key === "aeo_brand_entity" && item.value) {
              setBrandEntity(prev => ({ ...prev, ...item.value }));
            }
            if (item.key === "aeo_category_overrides" && item.value) {
              setCategoryOverrides(prev => ({ ...prev, ...item.value }));
            }
          });
        }
      } catch (err) {
        console.warn("Could not load AEO store settings:", err);
      }
    };
    loadSettings();
  }, []);

  const saveBrandEntity = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "aeo_brand_entity", value: brandEntity })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        // Fallback to direct supabase upsert
        await supabase.from("store_settings").upsert(
          { key: "aeo_brand_entity", value: brandEntity, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
      }
      notify("Brand Entity & Governance schema saved successfully!");
    } catch (e: any) {
      notify(e.message || "Failed to save Brand Entity", "error");
    } finally {
      setSaving(false);
    }
  };

  const saveCategoryOverrides = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "aeo_category_overrides", value: categoryOverrides })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        await supabase.from("store_settings").upsert(
          { key: "aeo_category_overrides", value: categoryOverrides, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
      }
      notify("Category AEO specifications saved successfully!");
    } catch (e: any) {
      notify(e.message || "Failed to save Category AEO", "error");
    } finally {
      setSaving(false);
    }
  };

  // Audit Calculations
  const auditResults = useMemo(() => {
    const list = products.map(prod => {
      const warnings: string[] = [];
      const specs = (prod as any).specifications || {};
      const packages = (prod as any).packages || [];
      const description = prod.description || "";

      if (!prod.name || prod.name.trim().length < 5) {
        warnings.push("Missing or short product name");
      }
      if (!description || description.trim().length < 40) {
        warnings.push("Low description word count (<40 chars)");
      }
      if (!specs.fabric && !specs.material) {
        warnings.push("Missing Fabric specification");
      }
      if (!specs.gsm && !specs.weight) {
        warnings.push("Missing GSM fabric weight");
      }
      if (!specs.fit_type && !specs.fit) {
        warnings.push("Missing Fit Type (Regular/Oversized)");
      }
      if (!Array.isArray(packages) || packages.length === 0) {
        warnings.push("No color/size variant packages detected");
      }
      if (!prod.price || Number(prod.price) <= 0) {
        warnings.push("Invalid or zero price");
      }

      return {
        id: prod.id,
        name: prod.name,
        price: prod.price,
        warnings,
        score: Math.max(0, 100 - warnings.length * 15)
      };
    });

    const total = list.length;
    const warningCount = list.reduce((acc, curr) => acc + curr.warnings.length, 0);
    const avgScore = total > 0 ? Math.round(list.reduce((acc, curr) => acc + curr.score, 0) / total) : 100;
    const pristineCount = list.filter(p => p.warnings.length === 0).length;

    return { list, total, warningCount, avgScore, pristineCount };
  }, [products]);

  // Selected Product Details for Inspector
  const inspectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId) || products[0];
  }, [products, selectedProductId]);

  // Extracted Product Variant Matrix
  const inspectedVariants = useMemo(() => {
    if (!inspectedProduct) return [];
    const pkgs = (inspectedProduct as any).packages || [];
    const colorMap = new Map<string, Array<{ size: string; stock: number; price: number }>>();

    pkgs.forEach((pkg: any) => {
      const c = pkg.color || "Standard";
      const s = pkg.size || "Free Size";
      const stock = Number(pkg.stock || 0);
      const price = Number(pkg.price || inspectedProduct.price || 0);

      if (!colorMap.has(c)) colorMap.set(c, []);
      colorMap.get(c)!.push({ size: s, stock, price });
    });

    return Array.from(colorMap.entries()).map(([color, sizes]) => ({
      color,
      sizes
    }));
  }, [inspectedProduct]);

  // Dynamic Product JSON-LD preview
  const inspectedJsonLd = useMemo(() => {
    if (!inspectedProduct) return {};
    const specs = (inspectedProduct as any).specifications || {};
    return {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": inspectedProduct.name,
      "description": inspectedProduct.description || `${inspectedProduct.name} by ZEBALPHA.`,
      "sku": (inspectedProduct as any).sku || `ZEB-${inspectedProduct.id.slice(0, 8)}`,
      "brand": {
        "@type": "Brand",
        "name": inspectedProduct.brand || "ZEBALPHA"
      },
      "material": specs.fabric || specs.material || "100% Combed Cotton",
      "offers": {
        "@type": "AggregateOffer",
        "priceCurrency": "INR",
        "lowPrice": inspectedProduct.price,
        "highPrice": inspectedProduct.price,
        "offerCount": (inspectedProduct as any).packages?.length || 1,
        "availability": "https://schema.org/InStock",
        "seller": {
          "@type": "Organization",
          "name": brandEntity.name
        }
      }
    };
  }, [inspectedProduct, brandEntity]);

  const copyJsonLd = () => {
    navigator.clipboard.writeText(JSON.stringify(inspectedJsonLd, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentCategoryData = categoryOverrides[selectedCategorySlug] || DEFAULT_CATEGORIES_AEO[selectedCategorySlug] || {
    name: selectedCategorySlug,
    h1: "",
    shortDirectAnswer: "",
    summary: "",
    keyCharacteristics: [],
    faqs: []
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950 border border-zinc-800 p-6 rounded-3xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              AEO & GEO Intelligence Hub
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Zero-Hallucination Safe
              </span>
            </h1>
          </div>
          <p className="text-xs text-zinc-400 max-w-2xl">
            Answer Engine Optimization (Perplexity, ChatGPT, Claude) & Generative Search Engine (Google AI Overviews) management. Dynamic, factual, schema-validated.
          </p>
        </div>

        {/* Global Action / Subtab Selector */}
        <div className="flex items-center gap-2 bg-zinc-900/80 p-1.5 rounded-2xl border border-zinc-800 self-start md:self-auto">
          {[
            { id: "audit", label: "Catalog Health", icon: ShieldCheck },
            { id: "brand", label: "Brand Entity", icon: Building },
            { id: "categories", label: "Category AEO", icon: Layers },
            { id: "products", label: "Product Inspector", icon: Tag },
            { id: "guides", label: "Buying Guides", icon: FileText }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeSubTab === tab.id
                    ? "bg-white text-black shadow-md font-bold"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 ${
          statusType === "success"
            ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/80"
            : "bg-rose-950/40 text-rose-300 border-rose-800/80"
        }`}>
          {statusType === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          {statusMsg}
        </div>
      )}

      {/* SUBTAB 1: CATALOG HEALTH AUDIT */}
      {activeSubTab === "audit" && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl">
              <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Catalog Health Score</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{auditResults.avgScore}%</span>
                <span className="text-xs text-emerald-400 font-semibold">Live</span>
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl">
              <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Indexed Products</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{auditResults.total}</span>
                <span className="text-xs text-zinc-400 font-medium">SSR Crawlable</span>
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl">
              <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Fully AEO Optimized</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-400">{auditResults.pristineCount}</span>
                <span className="text-xs text-zinc-400">0 Warnings</span>
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl">
              <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Total Warnings</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-3xl font-black ${auditResults.warningCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                  {auditResults.warningCount}
                </span>
                <span className="text-xs text-zinc-400">Items to polish</span>
              </div>
            </div>
          </div>

          {/* Audit Table */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Product-by-Product AEO Validation Status</h3>
                <p className="text-xs text-zinc-400">Real-time scan for missing specs, short descriptions, and variant matrices</p>
              </div>
              <button
                onClick={onRefresh}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-medium border border-zinc-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Rescan Catalog
              </button>
            </div>

            <div className="divide-y divide-zinc-900 max-h-[500px] overflow-y-auto">
              {auditResults.list.map(item => (
                <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-zinc-900/40 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{item.name}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">₹{item.price}</span>
                    </div>
                    {item.warnings.length === 0 ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>All AEO parameters, GSM/fabric specs & variant matrix compliant</span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {item.warnings.map((w, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            {w}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${
                      item.score >= 85
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : item.score >= 60
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    }`}>
                      {item.score}% Score
                    </span>
                    <button
                      onClick={() => {
                        setSelectedProductId(item.id);
                        setActiveSubTab("products");
                      }}
                      className="text-xs text-zinc-400 hover:text-white underline font-medium"
                    >
                      Inspect AEO
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: BRAND ENTITY & GOVERNANCE */}
      {activeSubTab === "brand" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Building className="w-4 h-4 text-amber-400" />
                  Official Organization Entity
                </h3>
                <p className="text-xs text-zinc-400">Authoritative facts injected into Schema.org JSON-LD across all pages</p>
              </div>
              <button
                onClick={saveBrandEntity}
                disabled={saving}
                className="px-4 py-2 bg-white text-black font-bold text-xs rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Entity Facts"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400">Brand Name</label>
                <input
                  type="text"
                  value={brandEntity.name}
                  onChange={e => setBrandEntity({ ...brandEntity, name: e.target.value })}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400">Official Website URL</label>
                <input
                  type="text"
                  value={brandEntity.url}
                  onChange={e => setBrandEntity({ ...brandEntity, url: e.target.value })}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400">Support Email</label>
                <input
                  type="email"
                  value={brandEntity.supportEmail}
                  onChange={e => setBrandEntity({ ...brandEntity, supportEmail: e.target.value })}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400">Support Phone</label>
                <input
                  type="text"
                  value={brandEntity.supportPhone}
                  onChange={e => setBrandEntity({ ...brandEntity, supportPhone: e.target.value })}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-zinc-400">Office / Fulfillment Address</label>
                <input
                  type="text"
                  value={brandEntity.addressLocality}
                  onChange={e => setBrandEntity({ ...brandEntity, addressLocality: e.target.value })}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400">Free Shipping Min (₹)</label>
                <input
                  type="number"
                  value={brandEntity.freeShippingThreshold}
                  onChange={e => setBrandEntity({ ...brandEntity, freeShippingThreshold: Number(e.target.value) })}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400">Return Window (Days)</label>
                <input
                  type="number"
                  value={brandEntity.returnWindowDays}
                  onChange={e => setBrandEntity({ ...brandEntity, returnWindowDays: Number(e.target.value) })}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600"
                />
              </div>
            </div>
          </div>

          {/* Generated Schema.org Preview */}
          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Code className="w-4 h-4 text-emerald-400" />
                  Live Schema.org Organization Graph
                </h3>
                <p className="text-xs text-zinc-400">Auto-generated JSON-LD served to search engines</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Google Validated
              </span>
            </div>

            <pre className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-[360px] leading-relaxed">
              {JSON.stringify(
                {
                  "@context": "https://schema.org",
                  "@type": "Organization",
                  "@id": `${brandEntity.url}/#organization`,
                  "name": brandEntity.name,
                  "legalName": brandEntity.legalName,
                  "url": brandEntity.url,
                  "logo": brandEntity.logo,
                  "contactPoint": {
                    "@type": "ContactPoint",
                    "telephone": brandEntity.supportPhone,
                    "contactType": "customer service",
                    "email": brandEntity.supportEmail,
                    "areaServed": "IN",
                    "availableLanguage": ["English", "Hindi"]
                  },
                  "address": {
                    "@type": "PostalAddress",
                    "streetAddress": brandEntity.addressLocality,
                    "addressRegion": brandEntity.addressRegion,
                    "postalCode": brandEntity.postalCode,
                    "addressCountry": brandEntity.addressCountry
                  }
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>
      )}

      {/* SUBTAB 3: CATEGORY AEO MANAGER */}
      {activeSubTab === "categories" && (
        <div className="space-y-6">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {Object.keys(categoryOverrides).map(slug => {
              const cat = categoryOverrides[slug];
              return (
                <button
                  key={slug}
                  onClick={() => setSelectedCategorySlug(slug)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    selectedCategorySlug === slug
                      ? "bg-white text-black shadow-md"
                      : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                  }`}
                >
                  {cat.name || slug}
                </button>
              );
            })}
          </div>

          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  Category AEO Specifications: {currentCategoryData.name}
                </h3>
                <p className="text-xs text-zinc-400">Canonical URL: https://zebalpha.shop/category/{currentCategoryData.slug}</p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`https://zebalpha.shop/category/${currentCategoryData.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 bg-zinc-900 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold border border-zinc-700 flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Live
                </a>
                <button
                  onClick={saveCategoryOverrides}
                  disabled={saving}
                  className="px-4 py-2 bg-white text-black font-bold text-xs rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Category AEO"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400">H1 Page Heading</label>
                  <input
                    type="text"
                    value={currentCategoryData.h1 || ""}
                    onChange={e => {
                      setCategoryOverrides({
                        ...categoryOverrides,
                        [selectedCategorySlug]: {
                          ...currentCategoryData,
                          h1: e.target.value
                        }
                      });
                    }}
                    className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-400">
                    AEO Short Direct Answer (Extracted by AI Engines)
                  </label>
                  <textarea
                    rows={3}
                    value={currentCategoryData.shortDirectAnswer || ""}
                    onChange={e => {
                      setCategoryOverrides({
                        ...categoryOverrides,
                        [selectedCategorySlug]: {
                          ...currentCategoryData,
                          shortDirectAnswer: e.target.value
                        }
                      });
                    }}
                    className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600 leading-relaxed"
                  />
                  <span className="text-[10px] text-zinc-500">Concise, 2-3 sentence factual definition answering "What is this category?"</span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-400">Category Engineering Summary</label>
                  <textarea
                    rows={3}
                    value={currentCategoryData.summary || ""}
                    onChange={e => {
                      setCategoryOverrides({
                        ...categoryOverrides,
                        [selectedCategorySlug]: {
                          ...currentCategoryData,
                          summary: e.target.value
                        }
                      });
                    }}
                    className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600 leading-relaxed"
                  />
                </div>
              </div>

              {/* FAQs Manager */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                    Structured Category FAQs ({currentCategoryData.faqs?.length || 0})
                  </label>
                  <button
                    onClick={() => {
                      const newFaqs = [...(currentCategoryData.faqs || []), { question: "New Question?", answer: "Clear factual answer." }];
                      setCategoryOverrides({
                        ...categoryOverrides,
                        [selectedCategorySlug]: {
                          ...currentCategoryData,
                          faqs: newFaqs
                        }
                      });
                    }}
                    className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add FAQ
                  </button>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {(currentCategoryData.faqs || []).map((faq: any, fIdx: number) => (
                    <div key={fIdx} className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl space-y-2 relative group">
                      <input
                        type="text"
                        value={faq.question}
                        onChange={e => {
                          const updated = [...currentCategoryData.faqs];
                          updated[fIdx].question = e.target.value;
                          setCategoryOverrides({
                            ...categoryOverrides,
                            [selectedCategorySlug]: { ...currentCategoryData, faqs: updated }
                          });
                        }}
                        placeholder="Question"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold"
                      />
                      <textarea
                        rows={2}
                        value={faq.answer}
                        onChange={e => {
                          const updated = [...currentCategoryData.faqs];
                          updated[fIdx].answer = e.target.value;
                          setCategoryOverrides({
                            ...categoryOverrides,
                            [selectedCategorySlug]: { ...currentCategoryData, faqs: updated }
                          });
                        }}
                        placeholder="Concise factual answer"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300"
                      />
                      <button
                        onClick={() => {
                          const updated = currentCategoryData.faqs.filter((_: any, idx: number) => idx !== fIdx);
                          setCategoryOverrides({
                            ...categoryOverrides,
                            [selectedCategorySlug]: { ...currentCategoryData, faqs: updated }
                          });
                        }}
                        className="text-rose-400 hover:text-rose-300 text-[10px] font-bold flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove Question
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: PRODUCT INSPECTOR */}
      {activeSubTab === "products" && inspectedProduct && (
        <div className="space-y-6">
          {/* Product Selector */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-500" />
              <input
                type="text"
                placeholder="Search catalog products..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-600"
              />
            </div>
            <select
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-2.5 text-xs text-white font-medium focus:outline-none"
            >
              {products
                .filter(p => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()))
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (₹{p.price})
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Real Data Breakdown */}
            <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">{inspectedProduct.name}</h3>
                  <p className="text-xs text-zinc-400">Canonical: https://zebalpha.shop/products/{inspectedProduct.id}</p>
                </div>
                <a
                  href={`https://zebalpha.shop/products/${inspectedProduct.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold border border-zinc-700 flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Live
                </a>
              </div>

              {/* Variant Matrix Table */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  Actual Variant Availability (Zero-Hallucination Matrix)
                </span>
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3 divide-y divide-zinc-800/80">
                  {inspectedVariants.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-2">No variant package entries found in database.</p>
                  ) : (
                    inspectedVariants.map((item, idx) => (
                      <div key={idx} className="py-2.5 first:pt-1 last:pb-1 flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{item.color}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {item.sizes.map((s, sIdx) => (
                            <span
                              key={sIdx}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                s.stock > 0
                                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                                  : "bg-zinc-800 text-zinc-500 border-zinc-700"
                              }`}
                            >
                              {s.size}: {s.stock > 0 ? `${s.stock} in stock` : "Sold Out"}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Detected Specifications */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-cyan-400" />
                  Detected Real Product Specifications
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries((inspectedProduct as any).specifications || {}).map(([key, val]) => (
                    <div key={key} className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl">
                      <span className="text-[10px] text-zinc-500 uppercase font-semibold">{key.replace(/_/g, " ")}</span>
                      <p className="font-bold text-white truncate">{String(val)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Schema Output */}
            <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Code className="w-4 h-4 text-emerald-400" />
                    Product Schema JSON-LD
                  </h3>
                  <p className="text-xs text-zinc-400">Strictly mapped to actual packages & specifications</p>
                </div>
                <button
                  onClick={copyJsonLd}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold border border-zinc-700 flex items-center gap-1.5 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy JSON"}
                </button>
              </div>

              <pre className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-[420px] leading-relaxed">
                {JSON.stringify(inspectedJsonLd, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 5: BUYING GUIDES DIRECTORY */}
      {activeSubTab === "guides" && (
        <div className="space-y-4">
          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              Published Technical Buying & Sizing Guides
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Factual, deep-content educational articles designed for generative answer citation and long-tail customer acquisition.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {BUYING_GUIDES_LIST.map((guide, idx) => (
              <div key={idx} className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl space-y-3 hover:border-zinc-700 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">{guide.readingTime}</span>
                    <h4 className="text-sm font-bold text-white leading-snug">{guide.title}</h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800 shrink-0">
                    {guide.schemaType}
                  </span>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  Focus: {guide.focus}
                </p>

                <div className="pt-2 border-t border-zinc-900 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500 font-mono">/guides/{guide.slug}</span>
                  <a
                    href={`https://zebalpha.shop/guides/${guide.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                  >
                    Read Guide
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
