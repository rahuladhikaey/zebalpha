"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import type { Product, Category } from "@shared/types";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Package, 
  Eye, 
  X,
  Upload,
  ShoppingBag,
  AlertTriangle
} from "lucide-react";
import { uploadToCloudinary } from "@shared/services";
import { isProductNewDrop, isDropLive, getDropDisplayStatus } from "@/lib/dropUtils";
import dynamic from "next/dynamic";
import { UploadCloud } from "lucide-react";

const CatalogUploadWizardModal = dynamic(
  () => import("@/components/catalog/CatalogUploadWizardModal"),
  { ssr: false, loading: () => null }
);

export default function SellerProducts() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [sellerId, setSellerId] = useState<string>("");
  const [isSettingsComplete, setIsSettingsComplete] = useState<boolean>(false);
  const [settingsCompletionPct, setSettingsCompletionPct] = useState<number>(0);
  const [fssaiStatus, setFssaiStatus] = useState<string>("Not Submitted");
  const [accountStatus, setAccountStatus] = useState<string>("Active");

  // Multi-step Catalog Wizard state
  const [isWizardModalOpen, setIsWizardModalOpen] = useState(false);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedMainCategory, setSelectedMainCategory] = useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("");
  
  const [form, setForm] = useState({
    name: "",
    price: "",
    mrp: "",
    description: "",
    category_id: "",
    image_url: "",
    brand: "zebalpha",
    stock: "20",
    low_stock_limit: "5",
    sku: "",
    specificationsText: "",
    packagesText: "",
    is_premium: false,
    is_new_drop: false,
    collection: "",
    target_drop_date: "",
    tier: "STANDARD",
  });

  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string>("");

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError("");
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (uploadedImages.length + files.length > 4) {
      setImageError("❌ You can upload a maximum of 4 images.");
      return;
    }

    for (const file of files) {
      if (file.size > 100 * 1024) {
        setImageError(`❌ File "${file.name}" is ${(file.size / 1024).toFixed(1)} KB. Maximum allowed size is 100 KB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const base64Str = event.target.result as string;
          setUploadedImages((prev) => {
            const nextImages = [...prev, base64Str].slice(0, 4);
            setForm((f) => ({ ...f, image_url: nextImages[0] || "" }));
            return nextImages;
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (index: number) => {
    const updated = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(updated);
    setForm((f) => ({ ...f, image_url: updated[0] || "" }));
  };

  const [activeTab, setActiveTab] = useState<"ALL" | "PREMIUM" | "NORMAL" | "DROPS">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Fetch seller settings status and real primary key ID
      const { data: seller } = await supabase
        .from("sellers")
        .select("id, user_id, settings_completion_pct, fssai_status, account_status, status")
        .or(`user_id.eq.${user.id},id.eq.${user.id},email.eq.${user.email?.toLowerCase().trim()}`)
        .maybeSingle();

      let resolvedSellerId = seller?.id || "";
      if (!resolvedSellerId && user) {
        try {
          const newSellerPayload = {
            id: user.id,
            user_id: user.id,
            email: user.email || "",
            store_name: user.user_metadata?.store_name || user.email?.split("@")[0] || "Seller Store",
            seller_id: `SEL-${Math.floor(100000 + Math.random() * 900000)}`,
            status: "approved",
            account_status: "Active",
            settings_completion_pct: 100,
            created_at: new Date().toISOString()
          };
          const { data: createdSeller } = await supabase
            .from("sellers")
            .insert([newSellerPayload])
            .select("id")
            .maybeSingle();
          if (createdSeller?.id) resolvedSellerId = createdSeller.id;
          else resolvedSellerId = user.id;
        } catch (_) {
          resolvedSellerId = user.id;
        }
      }

      if (resolvedSellerId) {
        setSellerId(resolvedSellerId);
      }

      setIsSettingsComplete(true);

      const sellerIdsToQuery = [user.id];
      if (resolvedSellerId && !sellerIdsToQuery.includes(resolvedSellerId)) {
        sellerIdsToQuery.push(resolvedSellerId);
      }

      // SLIM VIEWPORT FIELDS: core columns present in public.products
      const SLIM_SELLER_FIELDS = "id, name, price, mrp, stock, low_stock_limit, sku, image_url, status, is_active, is_approved, approval_status, specifications, seller_id, created_at, categories(name)";

      // PARALLEL EXECUTION: Fetch products and categories concurrently
      const [productsRes, categoriesRes] = await Promise.all([
        supabase
          .from("products")
          .select(SLIM_SELLER_FIELDS)
          .in("seller_id", sellerIdsToQuery)
          .order("created_at", { ascending: false }),
        supabase
          .from("categories")
          .select("id, name, main_category")
          .order("name", { ascending: true })
      ]);

      let productsData: any[] = (productsRes.data as any[]) || [];
      if (productsRes.error) {
        console.warn("Notice fetching slim fields, retrying with core fields:", productsRes.error.message);
        const { data: fallbackProducts } = await supabase
          .from("products")
          .select("id, name, price, mrp, stock, sku, image_url, status, is_active, seller_id, created_at")
          .in("seller_id", sellerIdsToQuery)
          .order("created_at", { ascending: false });
        if (fallbackProducts) productsData = fallbackProducts;
      }
      let finalCategories: any[] = (categoriesRes.data && categoriesRes.data.length > 0) ? categoriesRes.data : [];

      if (finalCategories.length === 0) {
        finalCategories = [
          { id: "", name: "Premium Polos", main_category: "Polos & Tees" },
          { id: "", name: "Oversized Streetwear Tees", main_category: "Polos & Tees" },
          { id: "", name: "Heavyweight Hoodies", main_category: "Hoodies & Jackets" },
          { id: "", name: "Casual Collared Shirts", main_category: "Shirts" },
          { id: "", name: "Streetwear Cargo & Bottoms", main_category: "Bottoms" },
          { id: "", name: "Limited Edition Drops", main_category: "Limited" },
          { id: "", name: "Accessories & Headwear", main_category: "Accessories" }
        ];
      }

      const mappedProducts: Product[] = productsData.map((p: any) => {
        const specs = p.specifications || {};
        const isPrem = p.is_premium === true || p.tier === "PREMIUM" || specs.is_premium === "true" || specs.tier === "PREMIUM" || (p.name || "").toLowerCase().includes("premium") || (p.name || "").toLowerCase().includes("supima");
        const isDrop = p.is_new_drop === true || specs.is_new_drop === "true" || p.status === "COMING_SOON";
        const coll = p.collection || specs.collection || "";
        const dropDate = p.target_drop_date || p.drop_date || specs.target_drop_date || "";
        return {
          ...p,
          is_premium: isPrem,
          is_new_drop: isDrop,
          collection: coll,
          target_drop_date: dropDate,
          tier: isPrem ? "PREMIUM" : (p.tier || specs.tier || "STANDARD"),
        };
      });

      setProducts(mappedProducts);
      setCategories(finalCategories);
    } catch (e) {
      console.error("Error loading products:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    let channel: any;
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('products-seller-changes')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'sellers', filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (payload.new) {
              const fStatus = payload.new.fssai_status || "Not Submitted";
              const pct = payload.new.settings_completion_pct || 0;
              const accStatus = payload.new.account_status || payload.new.status || "Active";
              const isSuspended = accStatus.toLowerCase() === "suspended";
              setFssaiStatus(fStatus);
              setSettingsCompletionPct(pct);
              setAccountStatus(accStatus);
              setIsSettingsComplete(!isSuspended);
            }
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isModalOpen]);

  const openAddModal = (presetDrop = false) => {
    if (accountStatus.toLowerCase() === "suspended") {
      alert("🚫 Your seller account is suspended by Admin. You cannot add or publish new products.");
      return;
    }
    const isDrop = presetDrop || activeTab === "DROPS";
    setEditingProduct(null);
    setUploadedImages([]);
    setImageError("");
    const firstMainCategory = Array.from(new Set(categories.map((c: any) => c.main_category || c.description || "Apparel")))[0] || "Apparel";
    const firstSubcategory = categories.find((c: any) => (c.main_category || c.description || "Apparel") === firstMainCategory);
    setSelectedMainCategory(firstMainCategory);
    setSelectedSubcategoryId(firstSubcategory?.id?.toString() || "");
    setForm({
      name: "",
      price: isDrop ? "0" : "",
      mrp: "",
      description: "",
      category_id: categories[0]?.id.toString() || "",
      image_url: "",
      brand: "ZEBALPHA",
      stock: "20",
      low_stock_limit: "5",
      sku: "",
      specificationsText: "",
      packagesText: isDrop ? "Standard:0:0:false" : "",
      is_premium: false,
      is_new_drop: isDrop,
      collection: "",
      target_drop_date: "",
      tier: "STANDARD",
    });
    setStatusMessage("");
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    if (accountStatus.toLowerCase() === "suspended") {
      alert("🚫 Your seller account is suspended by Admin. Product modification is disabled.");
      return;
    }
    setEditingProduct(product);
    setUploadedImages(product.image_url ? [product.image_url] : []);
    setImageError("");

    const selectedCategory = categories.find((c: any) => String(c.id) === String(product.category_id));
    const matchedMainCategory = (selectedCategory as any)?.main_category || (selectedCategory as any)?.description || (product as any).category || "Apparel";
    const matchedSubcategoryId = selectedCategory ? String(selectedCategory.id) : "";
    setSelectedMainCategory(matchedMainCategory);
    setSelectedSubcategoryId(matchedSubcategoryId);
    
    // Format text areas
    const specsArray: string[] = [];
    if (product.specifications) {
      Object.entries(product.specifications).forEach(([k, v]) => {
        if (!["tier", "is_premium", "is_new_drop", "collection", "target_drop_date"].includes(k)) {
          specsArray.push(`${k}: ${v}`);
        }
      });
    }
    const specificationsText = specsArray.join("\n");

    const pkgsArray: string[] = [];
    if (product.packages) {
      product.packages.forEach(pkg => {
        pkgsArray.push(`${pkg.name}:${pkg.price}:${pkg.mrp || pkg.price}:${pkg.isBestSeller || false}`);
      });
    }
    const packagesText = pkgsArray.join("\n");

    const specs = product.specifications || {};
    const isPrem = !!product.is_premium || product.tier === "PREMIUM" || (specs as any)?.is_premium === "true" || (specs as any)?.tier === "PREMIUM";
    const isDrop = !!product.is_new_drop || (product as any).status === "COMING_SOON" || (specs as any)?.is_new_drop === "true";
    const coll = product.collection || (specs as any)?.collection || (product as any).category_name || "";
    const dropDate = product.target_drop_date || (product as any).drop_date || (specs as any)?.target_drop_date || "";

    setForm({
      name: product.name || "",
      price: (product.price || 0).toString(),
      mrp: (product.mrp || "").toString(),
      description: product.description || "",
      category_id: (product.category_id || "").toString(),
      image_url: product.image_url || "",
      brand: product.brand || "ZEBALPHA",
      stock: (product.stock || 0).toString(),
      low_stock_limit: (product.low_stock_limit || 5).toString(),
      sku: product.sku || "",
      specificationsText,
      packagesText,
      is_premium: isPrem,
      is_new_drop: isDrop,
      collection: coll,
      target_drop_date: dropDate,
      tier: isPrem ? "PREMIUM" : (product.tier || (specs as any)?.tier || "STANDARD"),
    });
    setStatusMessage("");
    setIsModalOpen(true);
  };

  const handleDelete = async (productId: number | string) => {
    if (accountStatus.toLowerCase() === "suspended") {
      alert("🚫 Account Suspended: Deleting products is disabled.");
      return;
    }
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) throw error;
      
      setProducts(products.filter(p => p.id !== productId));
      alert("Product deleted successfully.");
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to delete product.");
    }
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (accountStatus.toLowerCase() === "suspended") {
      setStatusMessage("❌ Account Suspended: Product creation and updates are disabled.");
      alert("🚫 Your account is suspended by Admin. You cannot save products.");
      return;
    }
    setStatusMessage("Saving product...");

    const isDrop = form.is_new_drop;
    const price = Number(form.price) || 0;
    const mrp = form.mrp ? Number(form.mrp) : null;
    const stock = Number(form.stock) || 0;
    const low_stock_limit = Number(form.low_stock_limit) || 0;

    if (!form.name.trim()) {
      setStatusMessage("❌ Please enter a product name.");
      return;
    }

    if (!isDrop && (isNaN(price) || price <= 0)) {
      setStatusMessage("❌ Please enter a valid price.");
      return;
    }

    // Parse specifications (Key: Value)
    const specifications: Record<string, string> = {};
    if (form.specificationsText) {
      form.specificationsText.split("\n").forEach(line => {
        const [k, ...v] = line.split(":");
        if (k && v.length > 0) {
          specifications[k.trim()] = v.join(":").trim();
        }
      });
    }

    let packages: any[] = [];
    if (!isDrop) {
      if (!form.packagesText.trim()) {
        setStatusMessage("❌ Please add at least one package (e.g. 250g:120:150:false).");
        return;
      }

      // Parse packages (Name:Price:MRP:isBestSeller)
      packages = form.packagesText.split("\n").map((line, index) => {
        const parts = line.split(":");
        if (parts.length >= 1 && parts[0].trim() !== "") {
          const name = parts[0].trim();
          const pkgPrice = parts[1] ? Number(parts[1].trim()) : price;
          const pkgMrp = parts[2] ? Number(parts[2].trim()) : (mrp || price);
          const isBestSeller = parts[3] ? parts[3].trim().toLowerCase() === "true" : false;

          if (isNaN(pkgPrice) || pkgPrice <= 0) {
            return null;
          }

          return {
            id: `pkg-${Date.now()}-${index}`,
            name,
            price: pkgPrice,
            mrp: pkgMrp,
            isBestSeller
          };
        }
        return null;
      }).filter(Boolean);

      if (packages.length === 0) {
        setStatusMessage("❌ Please enter at least one valid package in the format: Name:Price:MRP:isBestSeller");
        return;
      }
    } else {
      packages = [{
        id: `drop-${Date.now()}`,
        name: "Standard",
        price: price > 0 ? price : 0,
        mrp: mrp || (price > 0 ? price : 0),
        isBestSeller: false
      }];
    }

    const slug = form.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
    const isValidUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    const rawCatId = String(selectedSubcategoryId || form.category_id || "");
    const selectedCat = categories.find(c => String(c.id) === rawCatId);
    let categoryId: string | null = null;
    if (selectedCat && isValidUuid(String(selectedCat.id))) {
      categoryId = String(selectedCat.id);
    } else if (isValidUuid(rawCatId)) {
      categoryId = rawCatId;
    } else if (categories.length > 0 && isValidUuid(String(categories[0].id))) {
      categoryId = String(categories[0].id);
    }
    const categoryName = selectedCat?.name || "General";
    const mainCategoryName = (selectedCat as any)?.main_category || (selectedCat as any)?.description || selectedMainCategory || "Apparel";

    // Upload product images directly to Cloudinary CDN
    let cloudinaryImages: string[] = [];
    try {
      if (uploadedImages.length > 0) {
        cloudinaryImages = await Promise.all(
          uploadedImages.map(img => uploadToCloudinary(img))
        );
      } else if (form.image_url.trim()) {
        const cloudUrl = await uploadToCloudinary(form.image_url.trim());
        cloudinaryImages = [cloudUrl];
      }
    } catch (err) {
      console.warn("Cloudinary upload notice:", err);
    }

    const finalMainImageUrl = cloudinaryImages[0] || form.image_url.trim() || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23171717'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23737373' font-family='sans-serif' font-size='16'%3ENo Image Provided%3C/text%3E%3C/svg%3E";

    // Resolve valid seller table primary key ID to satisfy products_seller_id_fkey
    let validSellerId = sellerId;
    if (!validSellerId && userId) {
      try {
        const { data: s } = await supabase
          .from("sellers")
          .select("id")
          .or(`user_id.eq.${userId},id.eq.${userId}`)
          .maybeSingle();
        if (s?.id) {
          validSellerId = s.id;
          setSellerId(s.id);
        }
      } catch (err) {
        console.warn("Seller ID resolution notice:", err);
      }
    }

    const finalSellerId = isValidUuid(validSellerId) ? validSellerId : null;

    const payload: any = {
      name: form.name.trim(),
      slug,
      price,
      mrp,
      description: form.description.trim(),
      category_id: categoryId,
      image_url: finalMainImageUrl,
      images: cloudinaryImages.length > 0 ? cloudinaryImages : [finalMainImageUrl],
      brand: form.brand.trim() || "ZEBALPHA",
      stock,
      low_stock_limit,
      sku: form.sku.trim() || null,
      offers: [],
      specifications: {
        ...specifications,
        tier: form.is_premium ? "PREMIUM" : (form.tier || "STANDARD"),
        is_premium: form.is_premium ? "true" : "false",
        is_new_drop: form.is_new_drop ? "true" : "false",
        collection: form.collection.trim() || "",
        target_drop_date: form.target_drop_date.trim() || ""
      },
      packages,
      status: form.is_new_drop ? "COMING_SOON" : (stock > 0 ? "IN_STOCK" : "OUT_OF_STOCK"),
      is_active: true,
      is_approved: true,
      approval_status: "approved",
      seller_id: finalSellerId,
      is_premium: form.is_premium,
      is_new_drop: form.is_new_drop,
      collection: form.collection.trim() || null,
      target_drop_date: form.target_drop_date.trim() || null,
      tier: form.is_premium ? "PREMIUM" : (form.tier || "STANDARD")
    };

    try {
      let savedProduct: any = null;
      // 1. Try server-side API route first (bypasses client RLS safely)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;

        const isEdit = Boolean(editingProduct);
        const res = await fetch("/api/products", {
          method: isEdit ? "PUT" : "POST",
          headers,
          body: JSON.stringify({
            id: editingProduct?.id,
            productId: editingProduct?.id,
            ...payload,
          }),
        });

        const json = await res.json();
        if (res.ok && json.success && json.product) {
          savedProduct = json.product;
          setStatusMessage(isEdit ? "✅ Product updated successfully!" : "✅ Product added successfully!");
        }
      } catch (apiErr) {
        console.warn("API route notice in simple modal, trying client fallback:", apiErr);
      }

      // 2. Client fallback if API route was unreachable
      if (!savedProduct) {
        const cleanPayload = { ...payload };
        delete cleanPayload.is_premium;
        delete cleanPayload.is_new_drop;
        delete cleanPayload.collection;
        delete cleanPayload.target_drop_date;
        delete cleanPayload.tier;

        if (editingProduct) {
          let res = await supabase.from("products").update(cleanPayload).eq("id", editingProduct.id).select();
          if (res.error) throw res.error;
          savedProduct = res.data?.[0] || { id: editingProduct.id, ...cleanPayload };
          setStatusMessage("✅ Product updated successfully!");
        } else {
          let res = await supabase.from("products").insert([cleanPayload]).select();
          if (res.error) throw res.error;
          savedProduct = res.data?.[0] || { ...cleanPayload };
          setStatusMessage("✅ Product added successfully!");
        }
      }

      setTimeout(() => {
        setIsModalOpen(false);
        loadData();
      }, 1000);

    } catch (e: any) {
      console.error(e);
      setStatusMessage(`❌ Error: ${e.message || "Failed to save product."}`);
    }
  };

  const premiumCount = products.filter(p => p.is_premium).length;
  const normalCount = products.length - premiumCount;
  const dropCount = products.filter(p => p.is_new_drop).length;

  const filteredProducts = products.filter(p => {
    if (activeTab === "PREMIUM") return p.is_premium;
    if (activeTab === "NORMAL") return !p.is_premium;
    if (activeTab === "DROPS") return p.is_new_drop;
    return true;
  });

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE) || 1;
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Products Catalog</h1>
          <p className="text-xs font-medium text-slate-500 mt-1">Manage standard streetwear and high-ticket 💎 Premium Store items.</p>
        </div>
        <button
          onClick={() => {
            setEditingProduct(null);
            setIsWizardModalOpen(true);
          }}
          disabled={accountStatus.toLowerCase() === "suspended"}
          className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-black bg-white hover:bg-zinc-200 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Plus size={16} /> Add Product Catalog
        </button>
      </div>

      {accountStatus.toLowerCase() === "suspended" && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-4 text-xs font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-3">
          <AlertTriangle size={20} className="shrink-0 text-rose-600 dark:text-rose-400" />
          <div>
            <strong>🚫 Account Fully Suspended:</strong> Your seller account has been suspended by SuperAdmin. Adding new products, editing catalog listings, and deleting items are completely disabled.
          </div>
        </div>
      )}

      {/* Quick Stream Metrics Breakdown Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div 
          onClick={() => { setActiveTab("ALL"); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === "ALL" 
              ? "bg-zinc-900 border-white/40 shadow-md shadow-white/5" 
              : "bg-zinc-950/80 border-zinc-800/80 hover:border-zinc-700"
          }`}
        >
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">All Products</span>
          <p className="text-2xl font-black text-white mt-1">{products.length}</p>
          <span className="text-[10px] font-semibold text-zinc-500">Total catalog items</span>
        </div>

        <div 
          onClick={() => { setActiveTab("PREMIUM"); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === "PREMIUM" 
              ? "bg-amber-950/40 border-amber-500/60 shadow-md shadow-amber-500/10" 
              : "bg-zinc-950/80 border-zinc-800/80 hover:border-amber-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">💎 Premium Store</span>
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
          </div>
          <p className="text-2xl font-black text-amber-400 mt-1">{premiumCount}</p>
          <span className="text-[10px] font-semibold text-amber-500/80">Luxury atelier stream</span>
        </div>

        <div 
          onClick={() => { setActiveTab("NORMAL"); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === "NORMAL" 
              ? "bg-sky-950/40 border-sky-500/60 shadow-md shadow-sky-500/10" 
              : "bg-zinc-950/80 border-zinc-800/80 hover:border-sky-500/30"
          }`}
        >
          <span className="text-[10px] font-black uppercase tracking-wider text-sky-400">🏷️ Normal Apparel</span>
          <p className="text-2xl font-black text-white mt-1">{normalCount}</p>
          <span className="text-[10px] font-semibold text-sky-500/80">Standard everyday items</span>
        </div>

        <div 
          onClick={() => { setActiveTab("DROPS"); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === "DROPS" 
              ? "bg-orange-950/40 border-orange-500/60 shadow-md shadow-orange-500/10" 
              : "bg-zinc-950/80 border-zinc-800/80 hover:border-orange-500/30"
          }`}
        >
          <span className="text-[10px] font-black uppercase tracking-wider text-orange-400">⚡ New Drops</span>
          <p className="text-2xl font-black text-white mt-1">{dropCount}</p>
          <span className="text-[10px] font-semibold text-orange-500/80">Hype release catalog</span>
        </div>
      </div>

      {/* Product Stream Filter Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 overflow-x-auto no-scrollbar">
        {[
          { key: "ALL", label: `🏷️ All Items (${products.length})` },
          { key: "PREMIUM", label: `💎 Premium Store Items (${premiumCount})`, highlight: "text-amber-400 border-amber-500/40 bg-amber-500/10" },
          { key: "NORMAL", label: `🏷️ Normal Apparel (${normalCount})`, highlight: "text-sky-400 border-sky-500/40 bg-sky-500/10" },
          { key: "DROPS", label: `⚡ New Drops (${dropCount})`, highlight: "text-orange-400 border-orange-500/40 bg-orange-500/10" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key as any);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap border ${
              activeTab === tab.key
                ? tab.highlight || "bg-white border-white text-black shadow-md shadow-white/10"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="overflow-hidden rounded-3xl border border-foreground/[0.06] bg-foreground/[0.01] shadow-sm">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-foreground/[0.03] border-b border-foreground/[0.06] font-black">
              <tr>
                <th className="px-6 py-4">Product Info & Stream</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Stock Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/[0.04]">
              {[1, 2, 3, 4, 5].map((idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-zinc-800/60 shrink-0" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-zinc-800/60 rounded w-48" />
                        <div className="h-3 bg-zinc-800/40 rounded w-24" />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4"><div className="h-4 bg-zinc-800/50 rounded w-24" /></td>
                  <td className="px-6 py-4"><div className="h-4 bg-zinc-800/50 rounded w-16" /></td>
                  <td className="px-6 py-4"><div className="h-4 bg-zinc-800/50 rounded w-20" /></td>
                  <td className="px-6 py-4 text-right"><div className="h-8 bg-zinc-800/40 rounded-xl w-16 ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-foreground/[0.08] p-12 text-center text-text-muted">
          <ShoppingBag size={48} className="mx-auto mb-4 opacity-40" />
          <h3 className="text-lg font-black text-foreground">
            {activeTab === "PREMIUM" ? "No 💎 Premium Store Products Found" : activeTab === "DROPS" ? "No ⚡ New Drops Found" : "No Products Listed"}
          </h3>
          <p className="text-xs font-bold mt-1 max-w-sm mx-auto">
            {activeTab === "PREMIUM" 
              ? "Check 'Flag as Premium Store Item' when creating/editing products to list them here." 
              : "Get started by creating your product listing for the ZEB-ALPHA storefront."}
          </p>
          <button 
            onClick={() => {
              setEditingProduct(null);
              setIsWizardModalOpen(true);
            }}
            className="mt-6 rounded-2xl border border-white/20 px-5 py-3 text-xs font-black text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            {activeTab === "DROPS" ? "Add New Drop Now" : "Add Product Now"}
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-foreground/[0.06] bg-foreground/[0.01] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-foreground/[0.03] border-b border-foreground/[0.06] font-black">
                <tr>
                  <th className="px-6 py-4">Product Info & Stream</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Stock Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/[0.04]">
                {paginatedProducts.map((product) => (
                  <tr 
                    key={product.id} 
                    className={`transition-all ${
                      product.is_premium 
                        ? "bg-amber-500/[0.02] hover:bg-amber-500/[0.05]" 
                        : "hover:bg-foreground/[0.01]"
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img 
                            src={(product as any).thumbnail_url || product.image_url} 
                            alt={product.name} 
                            loading="lazy"
                            decoding="async"
                            width={56}
                            height={56}
                            className={`h-14 w-14 rounded-2xl object-cover border ${
                              product.is_premium 
                                ? "border-amber-500/50 shadow-md shadow-amber-500/20" 
                                : "border-foreground/[0.08]"
                            }`}
                          />
                          {product.is_premium && (
                            <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-amber-400 text-black flex items-center justify-center text-[10px] shadow font-black" title="Premium Product">
                              💎
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-black text-foreground text-sm">{product.name}</p>
                            
                            {/* Prominent Stream Badge (Normal vs Premium) */}
                            {product.is_premium ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 text-amber-400 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-sm">
                                💎 PREMIUM STORE
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
                                🏷️ NORMAL APPAREL
                              </span>
                            )}

                            {isProductNewDrop(product) && (
                              isDropLive(product) ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
                                  🔥 DROP LIVE
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
                                  ⚡ UPCOMING DROP
                                </span>
                              )
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-[10px] font-bold text-text-muted">SKU: {product.sku || "N/A"}</p>
                            {isProductNewDrop(product) && (
                              <span className="text-[10px] font-semibold text-orange-400/90 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-md">
                                📅 {getDropDisplayStatus(product).dateText}
                              </span>
                            )}
                            {(product.collection || (product.specifications as any)?.collection) && (
                              <span className="text-[10px] font-semibold text-zinc-400 bg-foreground/[0.05] border border-foreground/[0.08] px-2 py-0.5 rounded-md">
                                🏷️ {product.collection || (product.specifications as any)?.collection}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-text-secondary">
                      {(product as any).categories?.name || "General"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-black text-foreground text-base">₹{product.price}</div>
                      {product.mrp && product.mrp > product.price && (
                        <div className="text-[11px] font-bold text-text-muted line-through">₹{product.mrp}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${
                          (product.stock ?? 0) === 0
                            ? "bg-rose-500" 
                            : (product.stock ?? 0) <= (product.low_stock_limit ?? 5)
                            ? "bg-amber-500" 
                            : "bg-emerald-500"
                        }`} />
                        <span className="font-bold text-text-secondary">
                          {product.stock ?? 0} in stock
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingProduct(product);
                            setIsWizardModalOpen(true);
                          }}
                          className="rounded-xl border border-foreground/[0.08] p-2 text-text-secondary hover:bg-foreground/[0.04] hover:text-text-primary transition-all cursor-pointer"
                          title="Edit Product Catalog"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="rounded-xl border border-rose-500/10 p-2 text-rose-500 hover:bg-rose-500/5 transition-all cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls Bar */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-foreground/[0.06] bg-foreground/[0.02]">
              <p className="text-xs font-bold text-zinc-400">
                Showing <span className="text-white font-extrabold">{(currentPage - 1) * PAGE_SIZE + 1}</span> to <span className="text-white font-extrabold">{Math.min(currentPage * PAGE_SIZE, filteredProducts.length)}</span> of <span className="text-white font-extrabold">{filteredProducts.length}</span> products
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                    if (p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)) {
                      return (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`h-8 w-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            currentPage === p
                              ? "bg-white text-black font-black shadow-md"
                              : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    } else if (p === currentPage - 2 || p === currentPage + 2) {
                      return <span key={p} className="text-zinc-600 px-1 text-xs">...</span>;
                    }
                    return null;
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4-Step Seller Catalog Upload Wizard Modal */}
      <CatalogUploadWizardModal
        isOpen={isWizardModalOpen}
        onClose={() => {
          setIsWizardModalOpen(false);
          setEditingProduct(null);
        }}
        sellerId={sellerId || userId}
        categories={categories}
        editingProduct={editingProduct}
        onSuccess={() => {
          setStatusMessage("✅ Product catalog published successfully!");
          loadData();
          setTimeout(() => setStatusMessage(""), 5000);
        }}
      />
    </div>
  );
}
