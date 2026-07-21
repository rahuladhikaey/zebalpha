"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { supabase, supabaseStorage } from "@/lib/supabaseClient";
import type { Product } from "@/types/products";
import type { Category } from "@/types/categories";
import type { Order } from "@/types/orders";
import DashboardOverview from "@/components/DashboardOverview";
import {
  exportOrdersExcel,
  exportCustomersExcel,
  exportProductsExcel,
  exportCategoriesExcel,
} from "@/utils/excelExport";
const PRODUCT_IMAGES_BUCKET = "product-images";
const PRODUCT_IMAGES_FOLDER = "product-images";
const MAX_PRODUCT_IMAGES = 2;
const MAX_IMAGE_SIZE_MB = 5;

type CardApplication = {
	id: string;
	user_email?: string;
	name: string;
	email: string;
	phone: string;
	cardType: string;
	status: string;
	appliedAt: string;
	updatedAt?: string;
	cardNumber?: string;
	expiresAt?: string;
	coins?: number;
};

const normalizeCardApplication = (app: any): CardApplication => {
  if (!app) return {} as CardApplication;
  return {
    id: app.id,
    user_email: app.user_email || app.email,
    name: app.name || "",
    email: app.user_email || app.email || "",
    phone: app.phone || "",
    cardType: app.card_type || app.cardType || "Silver",
    status: app.status || "PENDING",
    appliedAt: app.applied_at || app.appliedAt || new Date().toISOString(),
    updatedAt: app.updated_at || app.updatedAt,
    cardNumber: app.card_number || app.cardNumber,
    expiresAt: app.expires_at || app.expiresAt,
    coins: app.coins,
  };
};

export default function AdminPage() {
  const router = useRouter();
  // Admin session is handled securely by middleware
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark") || localStorage.getItem("theme") === "dark";
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);
  const [exporting, setExporting] = useState(false);

  const handleExport = async (type: "orders" | "pre-orders" | "customers" | "products" | "categories") => {
    setExporting(true);
    await new Promise((resolve) => setTimeout(resolve, 800)); // Smooth loading feedback
    try {
      if (type === "orders") {
        const dispatchOrders = orders.filter(o => o.order_status !== 'PRE_ORDER');
        exportOrdersExcel(dispatchOrders, false);
      } else if (type === "pre-orders") {
        const preOrders = orders.filter(o => o.order_status === 'PRE_ORDER');
        exportOrdersExcel(preOrders, true);
      } else if (type === "customers") {
        exportCustomersExcel(customers, orders);
      } else if (type === "products") {
        exportProductsExcel(products, orders);
      } else if (type === "categories") {
        exportCategoriesExcel(categories, products);
      }
    } catch (e) {
      console.error("Excel Export Error:", e);
    }
    setExporting(false);
  };

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [productForm, setProductForm] = useState({
    name: "",
    price: "",
    mrp: "",
    offers: "",
    specifications: "",
    description: "",
    category_id: "",
    brand: "asaliswad",
    imageFiles: null as File[] | null,
    stock: "0",
    sku: "",
    low_stock_limit: "5",
    packages: "",
  });


  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);

  const [categoryName, setCategoryName] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [adminUser, setAdminUser] = useState("Admin");
  const [applications, setApplications] = useState<CardApplication[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  // Inventory States
  const [notifyRequests, setNotifyRequests] = useState<any[]>([]);
  const [stockHistory, setStockHistory] = useState<any[]>([]);

  // Special Offer States
  const [activeOffer, setActiveOffer] = useState<{
    mainProductId: number;
    offerProductIds: number[];
    isActive: boolean;
  } | null>(null);
  const [selectedMainProduct, setSelectedMainProduct] = useState<string>("");
  const [selectedOfferProducts, setSelectedOfferProducts] = useState<number[]>([]);

  // Billing & Global Settings States
  const [billingSettings, setBillingSettings] = useState({
    deliveryFee: 29,
    freeDeliveryThreshold: 100,
    packagingFee: 9,
    tax: 3
  });
  const [globalCartOffer, setGlobalCartOffer] = useState({
    threshold: 139,
    percentage: 50,
    isActive: true
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedCustomers = window.localStorage.getItem("asali-swad-all-saved-addresses");
    if (storedCustomers) {
      setCustomers(JSON.parse(storedCustomers));
    }
    const storedOffer = window.localStorage.getItem("asali-swad-card-active-offer");
    if (storedOffer) {
      try {
        const parsed = JSON.parse(storedOffer);
        setActiveOffer(parsed);
        if (parsed) {
          setSelectedMainProduct(parsed.mainProductId?.toString() || "");
          setSelectedOfferProducts(parsed.offerProductIds || []);
        }
      } catch (e) {
        console.error("Error loading active offer", e);
      }
    }
  }, [tab]);

  const handleUpdateRenewDate = (appId: string, dateStr: string) => {
    const updated = applications.map(a => {
      if (a.id === appId) {
        return {
          ...a,
          expiresAt: new Date(dateStr).toISOString()
        };
      }
      return a;
    });
    setApplications(updated);
    window.localStorage.setItem("asali-swad-card-applications", JSON.stringify(updated));
    setStatusMessage("📅 Updated card renew/expiry date.");
  };

  const handleUpdateCoins = (appId: string, coinsVal: number) => {
    const updated = applications.map(a => {
      if (a.id === appId) {
        return {
          ...a,
          coins: coinsVal
        };
      }
      return a;
    });
    setApplications(updated);
    window.localStorage.setItem("asali-swad-card-applications", JSON.stringify(updated));
    setStatusMessage("🪙 Updated user coins balance.");
  };

  const handleSaveActiveOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMainProduct) {
      setStatusMessage("⚠️ Please choose a main product for the offer.");
      return;
    }
    if (selectedOfferProducts.length === 0) {
      setStatusMessage("⚠️ Please select at least one additional product to offer.");
      return;
    }

    const newOffer = {
      mainProductId: parseInt(selectedMainProduct),
      offerProductIds: selectedOfferProducts,
      isActive: true
    };

    setActiveOffer(newOffer);
    window.localStorage.setItem("asali-swad-card-active-offer", JSON.stringify(newOffer));
    setStatusMessage("🎉 Exclusive VIP offer activated successfully!");
  };

  const handleDeactivateOffer = () => {
    const newOffer = activeOffer ? { ...activeOffer, isActive: false } : null;
    setActiveOffer(newOffer);
    if (newOffer) {
      window.localStorage.setItem("asali-swad-card-active-offer", JSON.stringify(newOffer));
    } else {
      window.localStorage.removeItem("asali-swad-card-active-offer");
    }
    setStatusMessage("❌ Exclusive VIP offer deactivated.");
  };

  const handleToggleOfferProduct = (productId: number) => {
    if (selectedOfferProducts.includes(productId)) {
      setSelectedOfferProducts(selectedOfferProducts.filter(id => id !== productId));
    } else {
      setSelectedOfferProducts([...selectedOfferProducts, productId]);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm("Are you sure you want to delete this customer's address record?")) return;

    const { error } = await supabase.from('user_addresses').delete().eq('id', customerId);

    if (error) {
      console.error('Delete customer address error:', error);
      setStatusMessage('❌ Could not delete address. Please try again.');
      return;
    }

    const updated = customers.filter(c => c.id !== customerId);
    setCustomers(updated);
    window.localStorage.setItem("asali-swad-all-saved-addresses", JSON.stringify(updated));
    setStatusMessage("🗑️ Customer address record removed.");
  };

  const handleApproveApp = async (appId: string) => {
    const suffix = Math.floor(100000 + Math.random() * 900000);
    const app = applications.find(a => a.id === appId);
    if (!app) return;

    const prefixMap: Record<string, string> = {
      Silver: "ASW-SLV",
      Gold: "ASW-GLD",
      Bronze: "ASW-BRZ",
      VIP: "ASW-VIP"
    };
    const prefix = prefixMap[app.cardType] || "ASW-VIP";
    const generatedNumber = `${prefix}-${suffix}`;

    const approvalDate = new Date();
    const expiryDate = new Date(approvalDate.getTime() + 27 * 24 * 60 * 60 * 1000);

    const { error } = await supabase
      .from('card_applications')
      .update({
        status: 'APPROVED',
        card_number: generatedNumber,
        updated_at: approvalDate.toISOString(),
        expires_at: expiryDate.toISOString(),
      })
      .eq('id', appId);

    if (error) {
      console.error('Approve application error:', error);
      setStatusMessage('❌ Could not approve application. Please try again.');
      return;
    }

    const updated = applications.map(a => {
      if (a.id === appId) {
        return {
          ...a,
          status: "APPROVED",
          cardNumber: generatedNumber,
          updatedAt: approvalDate.toISOString(),
          expiresAt: expiryDate.toISOString()
        };
      }
      return a;
    });

    setApplications(updated);
    setStatusMessage(`✅ Activated card for ${app.name} (${app.cardType} Card) with Number: ${generatedNumber}`);
  };

  const handleRejectApp = async (appId: string) => {
    const app = applications.find(a => a.id === appId);
    if (!app) return;

    const rejectDate = new Date().toISOString();
    const { error } = await supabase
      .from('card_applications')
      .update({ status: 'REJECTED', updated_at: rejectDate })
      .eq('id', appId);

    if (error) {
      console.error('Reject application error:', error);
      setStatusMessage('❌ Could not reject application. Please try again.');
      return;
    }

    const updated = applications.map(a => {
      if (a.id === appId) {
        return {
          ...a,
          status: "REJECTED",
          updatedAt: rejectDate
        };
      }
      return a;
    });

    setApplications(updated);
    setStatusMessage(`❌ Rejected membership card application for ${app.name}`);
  };

  const handleDeleteApp = async (appId: string) => {
    if (!confirm("Are you sure you want to permanently delete this application record?")) return;

    const { error } = await supabase.from('card_applications').delete().eq('id', appId);
    if (error) {
      console.error('Delete application error:', error);
      setStatusMessage('❌ Could not delete application. Please try again.');
      return;
    }

    const updated = applications.filter(a => a.id !== appId);
    setApplications(updated);
    setStatusMessage("🗑️ Application record removed.");
  };

  const fetchData = async () => {
    setLoading(true);
    const [
      { data: productData },
      { data: categoryData },
      { data: orderData },
      { data: applicationData, error: applicationError },
      { data: addressData, error: addressError },
      { data: settingsData },
      { data: notifyData },
      { data: historyData }
    ] = await Promise.all([
      supabase.from("products").select("*").order("id", { ascending: false }),
      supabase.from("categories").select("*").order("name", { ascending: true }),
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("card_applications").select("*").order("applied_at", { ascending: false }),
      supabase.from("user_addresses").select("*").order("saved_at", { ascending: false }),
      supabase.from("store_settings").select("*"),
      supabase.from("notify_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("stock_history").select("*, products(name)").order("created_at", { ascending: false })
    ]);

    setProducts((productData ?? []) as Product[]);
    setCategories((categoryData ?? []) as Category[]);
    setOrders((orderData ?? []) as Order[]);
    setNotifyRequests(notifyData ?? []);
    setStockHistory(historyData ?? []);

    if (applicationError) {
      console.error("Error loading card applications:", applicationError);
    } else if (applicationData) {
      setApplications(applicationData.map(normalizeCardApplication));
    }

    if (addressError) {
      console.error("Error loading user addresses:", addressError);
    } else if (addressData) {
      const mappedAddresses = addressData.map((a: any) => ({
        id: a.id,
        email: a.user_email,
        name: a.name,
        phone: a.phone,
        village: a.village,
        postOffice: a.post_office,
        pincode: a.pincode,
        addressDetail: a.address_detail,
      }));
      setCustomers(mappedAddresses);
    }

    if (settingsData) {
      const billingRow = settingsData.find((s: any) => s.key === "billing");
      if (billingRow && billingRow.value) setBillingSettings(billingRow.value);

      const globalOfferRow = settingsData.find((s: any) => s.key === "global_cart_offer");
      if (globalOfferRow && globalOfferRow.value) setGlobalCartOffer(globalOfferRow.value);
    }

    setLoading(false);
  };

  useEffect(() => {
    // If the component renders, middleware has already validated the admin session.
    fetchData();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/";
  };

  const handleCategorySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!categoryName.trim()) return;

    if (editingCategoryId) {
      const { error } = await supabase.from("categories").update({ name: categoryName.trim() }).eq("id", editingCategoryId);
      if (error) {
        setStatusMessage(error.message);
        return;
      }
      setStatusMessage("Category updated successfully.");
      setEditingCategoryId(null);
    } else {
      const { error } = await supabase.from("categories").insert([{ name: categoryName.trim() }]);
      if (error) {
        setStatusMessage(error.message);
        return;
      }
      setStatusMessage("Category added successfully.");
    }
    setCategoryName("");
    fetchData();
  };

  const handleProductSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = productForm.name.trim();
    const price = Number(productForm.price);
    const mrp = productForm.mrp ? Number(productForm.mrp) : null;
    const description = productForm.description.trim();
    const categoryId = productForm.category_id ? Number(productForm.category_id) : null;

    // Split offers by new line and filter out empty strings
    const offers = productForm.offers
      ? productForm.offers.split('\n').map(o => o.trim()).filter(o => o !== "")
      : [];

    const packages = productForm.packages
      ? productForm.packages.split('\n').map((line, index) => {
        const parts = line.split(':');
        if (parts.length >= 1 && parts[0].trim() !== '') {
          if (index === 0) {
            return {
              id: `pkg-${Date.now()}-${index}`,
              name: parts[0].trim(),
              price: price,
              mrp: mrp !== null ? mrp : (parts.length >= 3 ? Number(parts[2].trim()) : price),
              isBestSeller: parts.length >= 4 ? parts[3].trim().toLowerCase() === 'true' : (parts.length === 2 && parts[1].trim().toLowerCase() === 'true' ? true : false)
            };
          } else if (parts.length >= 3) {
            return {
              id: `pkg-${Date.now()}-${index}`,
              name: parts[0].trim(),
              price: Number(parts[1].trim()),
              mrp: Number(parts[2].trim()),
              isBestSeller: parts.length >= 4 ? parts[3].trim().toLowerCase() === 'true' : false
            };
          }
        }
        return null;
      }).filter(Boolean)
      : [];

    if (!name || Number.isNaN(price) || price <= 0 || !description || (!categoryId && categories.length > 0)) {
      setStatusMessage("Please complete all required product fields.");
      return;
    }

    const imageFiles = productForm.imageFiles;
    let image_url = "";
    let images: string[] = [];
    let storageFallback = false;

    if (imageFiles && imageFiles.length > 0) {
      // Enforce maximum images limit at submission
      if (imageFiles.length > MAX_PRODUCT_IMAGES) {
        setStatusMessage(`Cannot upload more than ${MAX_PRODUCT_IMAGES} images. You selected ${imageFiles.length}.`);
        return;
      }

      const uploads = Array.from(imageFiles).map(async (file) => {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "p1ish280";
        const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "asaliswad_products";

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", preset);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error?.message || "Failed to upload image to Cloudinary");
        }

        return data.secure_url;
      });

      try {
        images = await Promise.all(uploads);
        image_url = images[0] ?? "";
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : (error as any)?.message || 'Unknown error';
        if (errorMsg?.includes("Bucket not found")) {
          storageFallback = true;
          image_url = "";
          images = [];
        } else {
          setStatusMessage(errorMsg ?? "Image upload failed.");
          return;
        }
      }
    }

    // Parse specifications from "Key: Value" lines
    const specifications: Record<string, string> = {};
    if (productForm.specifications) {
      productForm.specifications.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          specifications[key.trim()] = valueParts.join(':').trim();
        }
      });
    }

    const brand = productForm.brand.trim() || "others";
    const productPayload: Record<string, unknown> = {
      name,
      price,
      description,
      image_url,
      images,
      brand,
      stock: productForm.stock ? Number(productForm.stock) : 0,
      sku: productForm.sku?.trim() || null,
      low_stock_limit: productForm.low_stock_limit ? Number(productForm.low_stock_limit) : 5,
      status: productForm.stock && Number(productForm.stock) > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK'
    };

    if (mrp !== null) productPayload.mrp = mrp;
    if (offers.length > 0) productPayload.offers = offers;
    if (packages.length > 0) productPayload.packages = packages;
    if (Object.keys(specifications).length > 0) productPayload.specifications = specifications;
    if (categoryId) productPayload.category_id = categoryId;


    let updateError: unknown = null;
    if (editingProductId) {
      const updatePayload: Record<string, unknown> = { ...productPayload };
      if (!image_url) {
        // If no new image uploaded, keep existing one (already handled by not overwriting unless provided)
        delete updatePayload.image_url;
        delete updatePayload.images;
      }
      const response = await supabase.from("products").update(updatePayload).eq("id", editingProductId);
      updateError = response.error;
    } else {
      const response = await supabase.from("products").insert([productPayload]);
      updateError = response.error;
    }

    if (updateError) {
      const errMsg = updateError instanceof Error ? updateError.message : (updateError as any)?.message || 'Unknown error';
      setStatusMessage(errMsg);
      return;
    }

    setProductForm({ name: "", price: "", mrp: "", offers: "", specifications: "", description: "", category_id: "", brand: "asaliswad", imageFiles: null, stock: "0", sku: "", low_stock_limit: "5", packages: "" });

    setEditingProductId(null);
    setStatusMessage(storageFallback
      ? "Product saved successfully, but image upload is unavailable because the storage bucket was not found."
      : editingProductId
        ? "Product updated successfully."
        : "Product added successfully.");
    fetchData();
  };


  const handleDeleteProduct = async (productId: number) => {
    await supabase.from("products").delete().eq("id", productId);
    fetchData();
  };

  const handleDeleteCategory = async (categoryId: number) => {
    await supabase.from("categories").delete().eq("id", categoryId);
    fetchData();
  };

  const handleOrderStatusUpdate = async (orderId: number, order_status: string) => {
    await supabase.from("orders").update({ order_status }).eq("id", orderId);
    fetchData();
  };

  const handleDeleteOrder = async (orderId: number) => {
    if (!confirm("Are you sure you want to permanently delete this order record? This action cannot be undone.")) return;

    const { error } = await supabase.from("orders").delete().eq("id", orderId);
    if (error) {
      setStatusMessage("Error deleting order: " + error.message);
    } else {
      setStatusMessage("Order #" + orderId + " has been deleted.");
      fetchData();
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-slate-600">Verifying admin access...</p>
      </main>
    );
  }



  const completedOrders = orders.filter((order) => order.order_status === "DELIVERED").length;

  const MENU_ITEMS = [
    { id: 'dashboard', label: 'Overview', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
    { id: 'products', label: 'Inventory', icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4' },
    { id: 'categories', label: 'Shelves', icon: 'M7 7h.01M7 11h.01M7 15h.01M13 7h.01M13 11h.01M13 15h.01M17 7h.01M17 11h.01M17 15h.01' },
    { id: 'orders', label: 'Dispatches', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { id: 'pre-orders', label: 'Pre-Orders', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'as-card', label: 'AS-Cards', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { id: 'customers', label: 'Customers', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'alerts', label: 'Stock Alerts', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    { id: 'audit', label: 'Audit Log', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' }
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Mobile Drawer Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-100 flex flex-col transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-3 h-20 px-6 border-b border-slate-100 shrink-0">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20">
            <span className="text-white font-black text-xs">AS</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-black tracking-tight text-slate-900 uppercase truncate">Admin</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{adminUser || 'Internal'}</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="ml-auto lg:hidden text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 no-scrollbar">
          {MENU_ITEMS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold transition-all ${
                tab === t.id
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <svg className={`h-5 w-5 ${tab === t.id ? 'text-emerald-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
              </svg>
              {t.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-200 relative">
        {/* Top Header */}
        <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-4 sm:px-8 shrink-0 z-30 transition-colors duration-200">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-850 rounded-full px-4 py-2 w-64 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
              <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" placeholder="Search everywhere..." className="bg-transparent border-none outline-none w-full text-xs font-medium pl-3 text-slate-900 dark:text-white placeholder:text-slate-400" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Theme Toggle Switch */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none bg-slate-200 dark:bg-slate-800"
              aria-label="Toggle theme"
            >
              <span className="sr-only">Toggle dark mode</span>
              <span
                className={`pointer-events-none relative inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                  isDarkMode ? "translate-x-6" : "translate-x-0"
                }`}
              >
                {isDarkMode ? (
                  <svg className="h-4 w-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.46 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 text-slate-700" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </span>
            </button>
            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center border border-emerald-200 cursor-pointer">
              <span className="text-emerald-700 font-bold text-xs">AD</span>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-[1400px] mx-auto w-full">
            {statusMessage && (
              <div className="mb-8 flex items-center gap-4 rounded-2xl bg-amber-50 p-4 border border-amber-100 shadow-sm animate-in fade-in">
                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xs font-bold text-amber-900">{statusMessage}</p>
              </div>
            )}

        {tab === "dashboard" ? (
          <DashboardOverview
            orders={orders}
            products={products}
            customers={customers}
            categories={categories}
            loading={loading}
            onRefresh={fetchData}
          />
        ) : null}


        {tab === "products" ? (
          <div className="space-y-12">
            <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-slate-100 premium-shadow">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Inventory Management</span>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{editingProductId ? "Modify Essential Spice" : "Add New Essential Spice"}</h2>
                </div>
                {editingProductId && (
                  <button
                    type="button"
                    onClick={() => { setEditingProductId(null); setProductForm({ name: "", price: "", mrp: "", offers: "", specifications: "", description: "", category_id: "", brand: "asaliswad", imageFiles: null, stock: "0", sku: "", low_stock_limit: "5", packages: "" }); }}
                    className="px-6 py-3 rounded-xl bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-colors"
                  >
                    Discard Changes
                  </button>
                )}
              </div>

              <form className="grid gap-6 md:grid-cols-2" onSubmit={handleProductSubmit}>
                <div className="space-y-4">
                  <div className="group relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-slate-300 group-focus-within:text-emerald-500 transition-colors">Name</span>
                    <input
                      value={productForm.name}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="..."
                      className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 pl-20 pr-6 py-4 text-sm font-bold outline-none transition-all focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="group relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-slate-300 group-focus-within:text-emerald-500 transition-colors">Price</span>
                      <input
                        value={productForm.price}
                        onChange={(event) => setProductForm((prev) => ({ ...prev, price: event.target.value }))}
                        placeholder="0.00"
                        type="number"
                        className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 pl-20 pr-6 py-4 text-sm font-bold outline-none transition-all focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
                      />
                    </div>
                    <div className="group relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-slate-300 group-focus-within:text-emerald-500 transition-colors">MRP</span>
                      <input
                        value={productForm.mrp}
                        onChange={(event) => setProductForm((prev) => ({ ...prev, mrp: event.target.value }))}
                        placeholder="0.00"
                        type="number"
                        className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 pl-20 pr-6 py-4 text-sm font-bold outline-none transition-all focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="group relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-slate-300 group-focus-within:text-emerald-500 transition-colors">Shelf</span>
                      <select
                        value={productForm.category_id}
                        onChange={(event) => setProductForm((prev) => ({ ...prev, category_id: event.target.value }))}
                        className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 pl-20 pr-6 py-4 text-sm font-bold outline-none transition-all focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 appearance-none"
                      >
                        <option value="">Select Shelf</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="group relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-slate-300 group-focus-within:text-emerald-500 transition-colors">Brand</span>
                      <select
                        value={productForm.brand}
                        onChange={(event) => setProductForm((prev) => ({ ...prev, brand: event.target.value }))}
                        className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 pl-20 pr-6 py-4 text-sm font-bold outline-none transition-all focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 appearance-none"
                      >
                        <option value="asaliswad">Asaliswad</option>
                        <option value="others">Others</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="group relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-slate-300 group-focus-within:text-emerald-500 transition-colors">Stock</span>
                      <input
                        value={productForm.stock}
                        onChange={(event) => setProductForm((prev) => ({ ...prev, stock: event.target.value }))}
                        placeholder="0"
                        type="number"
                        className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 pl-20 pr-6 py-4 text-sm font-bold outline-none transition-all focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
                      />
                    </div>
                    <div className="group relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-slate-300 group-focus-within:text-emerald-500 transition-colors">SKU</span>
                      <input
                        value={productForm.sku}
                        onChange={(event) => setProductForm((prev) => ({ ...prev, sku: event.target.value }))}
                        placeholder="e.g. SPICE-01"
                        className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 pl-16 pr-6 py-4 text-sm font-bold outline-none transition-all focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
                      />
                    </div>
                    <div className="group relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-slate-300 group-focus-within:text-emerald-500 transition-colors">Low Alert Limit</span>
                      <input
                        value={productForm.low_stock_limit}
                        onChange={(event) => setProductForm((prev) => ({ ...prev, low_stock_limit: event.target.value }))}
                        placeholder="5"
                        type="number"
                        className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 pl-[7.5rem] pr-6 py-4 text-sm font-bold outline-none transition-all focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
                      />
                    </div>
                  </div>
                </div>



                <div className="space-y-4 text-slate-950">
                  <textarea
                    value={productForm.packages}
                    onChange={(event) => setProductForm((prev) => ({ ...prev, packages: event.target.value }))}
                    placeholder="Packages (Name : Price : MRP : IsBestSeller) e.g. 3 Pack (750g) : 799 : 1799 : true"
                    className="w-full h-[6.5rem] rounded-2xl border-2 border-slate-50 bg-slate-50 px-6 py-5 text-sm font-bold outline-none transition-all focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 resize-none"
                  />
                  <textarea
                    value={productForm.description}
                    onChange={(event) => setProductForm((prev) => ({ ...prev, description: event.target.value }))}
                    placeholder="Tell the story of this spice..."
                    className="w-full h-[10.5rem] rounded-2xl border-2 border-slate-50 bg-slate-50 px-6 py-5 text-sm font-bold outline-none transition-all focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 resize-none"
                  />
                  <div className="grid grid-cols-1 gap-4">
                    <div className="relative group">
                      <input
                        type="file"
                        id="product-images"
                        multiple
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) => {
                          const files = event.target.files;
                          if (!files) return;

                          // Validate and Append files
                          const selectedFiles = Array.from(files);
                          const currentFiles = productForm.imageFiles || [];

                          if (currentFiles.length + selectedFiles.length > MAX_PRODUCT_IMAGES) {
                            setStatusMessage(`Maximum ${MAX_PRODUCT_IMAGES} images allowed. You already have ${currentFiles.length}.`);
                            event.target.value = "";
                            return;
                          }

                          // Validate file sizes
                          let oversizedFiles: string[] = [];
                          selectedFiles.forEach((file) => {
                            const fileSizeMB = file.size / (1024 * 1024);
                            if (fileSizeMB > MAX_IMAGE_SIZE_MB) {
                              oversizedFiles.push(file.name);
                            }
                          });

                          if (oversizedFiles.length > 0) {
                            setStatusMessage(`File(s) ${oversizedFiles.join(", ")} exceed ${MAX_IMAGE_SIZE_MB}MB limit.`);
                            event.target.value = "";
                            return;
                          }

                          setProductForm((prev) => ({
                            ...prev,
                            imageFiles: [...(prev.imageFiles || []), ...selectedFiles]
                          }));
                          setStatusMessage("");
                          // Reset input value so the same file can be selected again if removed
                          event.target.value = "";
                        }}
                        className="hidden"
                      />
                      <label
                        htmlFor="product-images"
                        className="flex items-center gap-4 w-full rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-4 cursor-pointer transition-all group-hover:border-emerald-500 group-hover:bg-emerald-50/30"
                      >
                        <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-white transition-colors text-slate-950">
                          <svg className="h-5 w-5 text-slate-400 group-hover:text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 leading-tight">
                            {productForm.imageFiles && productForm.imageFiles.length > 0
                              ? `${productForm.imageFiles.length} of ${MAX_PRODUCT_IMAGES} images selected`
                              : `Upload Product Images (Max ${MAX_PRODUCT_IMAGES})`}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 mt-0.5">JPG, PNG, WebP up to {MAX_IMAGE_SIZE_MB}MB each</p>
                        </div>
                      </label>
                    </div>

                    {productForm.imageFiles && productForm.imageFiles.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Selected Photos:</p>
                          <button
                            type="button"
                            onClick={() => setProductForm(prev => ({ ...prev, imageFiles: [] }))}
                            className="text-[8px] font-black uppercase text-rose-500 hover:underline"
                          >
                            Clear All
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {productForm.imageFiles.map((file, idx) => (
                            <div key={idx} className="relative group/preview rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-square flex items-center justify-center">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`Preview ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setProductForm(prev => ({
                                    ...prev,
                                    imageFiles: prev.imageFiles?.filter((_, i) => i !== idx) || []
                                  }));
                                }}
                                className="absolute top-2 right-2 h-6 w-6 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-lg opacity-0 group-hover/preview:opacity-100 transition-opacity"
                              >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                              <span className="absolute bottom-2 left-2 bg-black/50 text-white text-[8px] font-black px-2 py-1 rounded-lg backdrop-blur-sm">{idx + 1}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 pt-4">
                  <button className="flex h-16 w-full items-center justify-center rounded-2xl bg-slate-900 text-xs font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-slate-900/20 transition-all hover:bg-emerald-600 hover:shadow-emerald-600/30 active:scale-95">
                    {editingProductId ? "Seal Updates ✨" : "Launch Product 🚀"}
                  </button>
                </div>
              </form>

            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 premium-shadow overflow-hidden">
              <div className="p-8 md:p-10 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Vault Inventory</span>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">Total Selection ({products.length})</h2>
                </div>
                <button
                  type="button"
                  onClick={() => handleExport("products")}
                  disabled={exporting}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {exporting ? "Exporting..." : "Export Inventory"}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="px-8 py-5 font-black whitespace-nowrap">Product</th>
                      <th className="px-8 py-5 font-black whitespace-nowrap">Price</th>
                      <th className="px-8 py-5 font-black whitespace-nowrap">Stock / SKU</th>
                      <th className="px-8 py-5 font-black whitespace-nowrap text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((product) => (
                      <tr key={product.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-4">
                            {product.images && product.images.length > 0 ? (
                              <div className="h-12 w-12 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 flex-shrink-0 relative">
                                <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                              </div>
                            ) : (
                              <div className="h-12 w-12 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 flex-shrink-0 flex items-center justify-center text-slate-300">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-black text-slate-900 group-hover:text-emerald-600 transition-colors max-w-[200px] sm:max-w-[300px] truncate" title={product.name}>{product.name}</p>
                              <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest">
                                {categories.find(c => c.id === product.category_id)?.name || 'Uncategorized'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                           <p className="text-sm font-black text-slate-900">₹{product.price}</p>
                           {product.mrp && <p className="text-[10px] font-bold text-slate-400 line-through">₹{product.mrp}</p>}
                        </td>
                        <td className="px-8 py-4">
                          <div className="flex flex-col gap-1.5 items-start">
                            <span className={`inline-flex px-2 py-1 rounded-md text-[9px] font-black tracking-widest uppercase ${product.stock && product.stock > 0 ? (product.stock <= (product.low_stock_limit || 5) ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700') : 'bg-rose-100 text-rose-700'}`}>
                              Stock: {product.stock || 0}
                            </span>
                            {product.sku && <span className="text-[10px] font-bold text-slate-500">SKU: {product.sku}</span>}
                          </div>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                             <button
                               onClick={() => {
                                 setEditingProductId(product.id);
                                 setProductForm({
                                   name: product.name,
                                   price: String(product.price),
                                   mrp: product.mrp ? String(product.mrp) : "",
                                   offers: product.offers ? product.offers.join('\n') : "",
                                   specifications: product.specifications
                                     ? Object.entries(product.specifications).map(([k, v]) => `${k}: ${v}`).join('\n')
                                     : "",
                                   description: product.description,
                                   category_id: String(product.category_id),
                                   brand: product.brand || "others",
                                   imageFiles: null,
                                   stock: product.stock !== undefined && product.stock !== null ? String(product.stock) : "0",
                                   sku: product.sku || "",
                                   low_stock_limit: product.low_stock_limit !== undefined && product.low_stock_limit !== null ? String(product.low_stock_limit) : "5",
                                   packages: product.packages
                                     ? product.packages.map((pkg: any) => `${pkg.name} : ${pkg.price} : ${pkg.mrp || ''} : ${pkg.isBestSeller || false}`).join('\n')
                                     : "",
                                 });
                                 window.scrollTo({ top: 0, behavior: 'smooth' });
                               }}
                               className="h-8 px-4 rounded-lg bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-emerald-600 hover:text-white transition-colors"
                             >
                               Edit
                             </button>
                             <button
                               onClick={() => handleDeleteProduct(product.id)}
                               className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-colors"
                               title="Delete"
                             >
                               <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                               </svg>
                             </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {products.length === 0 && (
                  <div className="p-12 text-center text-sm font-bold text-slate-400">No products found.</div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {tab === "categories" ? (
          <div className="space-y-12">
            <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-slate-100 premium-shadow">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Shelving & Organization</span>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{editingCategoryId ? "Rename Spice Category" : "Establish New Category"}</h2>
                </div>
                {editingCategoryId && (
                  <button
                    type="button"
                    onClick={() => { setEditingCategoryId(null); setCategoryName(""); }}
                    className="px-6 py-3 rounded-xl bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-colors"
                  >
                    Discard Changes
                  </button>
                )}
              </div>

              <form className="grid gap-6 md:grid-cols-[1fr_auto]" onSubmit={handleCategorySubmit}>
                <div className="group relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-slate-300 group-focus-within:text-emerald-500 transition-colors">Namespace</span>
                  <input
                    value={categoryName}
                    onChange={(event) => setCategoryName(event.target.value)}
                    placeholder="e.g. Rare Blends"
                    required
                    className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 pl-24 pr-6 py-4 text-sm font-bold outline-none transition-all focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
                  />
                </div>
                <button className="flex h-14 md:h-auto items-center justify-center rounded-2xl bg-slate-900 px-10 text-[10px] font-black uppercase tracking-[0.3em] text-white shadow-xl shadow-slate-900/10 transition-all hover:bg-emerald-600 active:scale-95">
                  {editingCategoryId ? "Update Shelf ✨" : "Create Shelf 🛠️"}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 premium-shadow overflow-hidden">
              <div className="p-8 md:p-10 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Spice Taxonomy</span>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">Current Shelves ({categories.length})</h2>
                </div>
                <button
                  type="button"
                  onClick={() => handleExport("categories")}
                  disabled={exporting}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {exporting ? "Exporting..." : "Export Shelves"}
                </button>
              </div>

              <div className="p-8 md:p-10 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {categories.map((category) => {
                  const icon = getCategoryIcon(category.name);
                  return (
                  <div key={category.id} className="group relative bg-white p-6 rounded-[2rem] border border-slate-100 premium-shadow hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100 shrink-0 group-hover:scale-110 transition-transform duration-300 overflow-hidden">
                        {icon.type === 'image' ? (
                          <Image src={icon.value} alt={category.name} width={48} height={48} className="object-contain w-full h-full p-2" />
                        ) : (
                          <span className="text-2xl">{icon.value !== '📦' ? icon.value : (
                            <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          )}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg font-black tracking-tight text-slate-900 truncate">{category.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{products.filter(p => p.category_id === category.id).length} Products Assigned</p>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full mt-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategoryId(category.id);
                          setCategoryName(category.name);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="flex-1 h-10 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-emerald-600 hover:text-white hover:border-emerald-600"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(category.id)}
                        className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center transition-all hover:bg-rose-600 group/del shrink-0"
                      >
                        <svg className="h-4 w-4 text-rose-600 group-hover/del:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  );
                })}
                {categories.length === 0 && (
                  <div className="col-span-full text-center py-20 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                    <p className="text-sm font-bold text-slate-400">Vault is empty. Create your first shelf.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}


        {tab === "orders" ? (
          <div className="space-y-12">
            <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-slate-100 premium-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Dispatch Center</span>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Recent Customer Orders ({orders.filter(o => o.order_status !== 'PRE_ORDER').length})</h2>
                </div>
                <button
                  type="button"
                  onClick={() => handleExport("orders")}
                  disabled={exporting}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {exporting ? "Exporting..." : "Export Orders"}
                </button>
              </div>

              <div className="grid gap-8">
                {orders.filter(o => o.order_status !== 'PRE_ORDER').map((order) => (
                  <div key={order.id} className="group relative flex flex-col p-4 sm:p-10 rounded-[2rem] sm:rounded-[3.5rem] border border-slate-100 bg-white transition-all hover:bg-slate-50/50 hover:shadow-2xl hover:shadow-slate-900/5">
                    <div className="flex flex-col lg:flex-row justify-between items-start gap-4 lg:gap-6 mb-6 pb-6 border-b border-slate-100">
                      <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="h-8 w-8 sm:h-12 sm:w-12 rounded-full bg-slate-900 flex items-center justify-center text-white text-[10px] sm:text-sm font-black shrink-0">
                            {order.customer_name.charAt(0).toUpperCase()}
                          </div>
                          <h3 className="text-base sm:text-2xl font-black tracking-tight text-slate-900 break-words">{order.customer_name}</h3>
                        </div>
                        <div className="flex flex-wrap gap-x-4 sm:gap-x-6 gap-y-1 sm:gap-y-2 text-[10px] sm:text-xs font-bold text-slate-400">
                          <span className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                            <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                            {order.phone}
                          </span>
                          <span className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                            <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {new Date(order.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-start lg:items-end gap-2 sm:gap-3 w-full lg:w-auto">
                        <div className="flex flex-wrap justify-start lg:justify-end gap-2">
                          <span className={`px-3 py-1 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${order.payment_method === 'COD'
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                            }`}>
                            {order.payment_method || 'N/A'}
                          </span>
                          <span className={`px-3 py-1 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${order.payment_status === 'COMPLETE'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : 'bg-rose-50 text-rose-600 border border-rose-100'
                            }`}>
                            {order.payment_status || 'PENDING'}
                          </span>
                        </div>
                        <p className="text-[8px] sm:text-[10px] font-black text-slate-300 uppercase tracking-widest break-all">ID: #{order.id} {order.razorpay_order_id ? `| RP: ${order.razorpay_order_id.slice(-8)}` : ''}</p>
                      </div>
                    </div>

                    <div className="grid lg:grid-cols-[1fr_auto] gap-6 sm:gap-8">
                      <div className="grid md:grid-cols-2 gap-6 sm:gap-8 flex-1">
                        <div>
                          <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 sm:mb-2">Delivery Address</p>
                          <p className="text-[11px] sm:text-base font-bold text-slate-600 leading-relaxed bg-slate-50/50 p-3 sm:p-6 rounded-xl sm:rounded-[2rem] border border-slate-100 h-full">
                            {order.address}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 sm:mb-2">Manifest Details</p>
                          <div className="bg-slate-900 rounded-xl sm:rounded-[2.5rem] p-4 sm:p-8 text-slate-300 shadow-xl shadow-slate-900/10 text-[10px] sm:text-sm leading-relaxed font-mono h-full">
                            {(() => {
                              try {
                                const items = JSON.parse(order.product_details);
                                if (Array.isArray(items)) {
                                  return (
                                    <ul className="space-y-2">
                                      {items.map((item: any, i: number) => (
                                        <li key={i} className="flex justify-between border-b border-slate-800 pb-1.5 last:border-0">
                                          <span className="font-bold text-emerald-400">{item.name || item.product_name} <span className="text-slate-500">x{item.quantity}</span></span>
                                          <span className="text-slate-100">₹{item.price}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  );
                                }
                              } catch (e) { }
                              return <div className="whitespace-pre-wrap">{order.product_details}</div>;
                            })()}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 justify-center min-w-[180px]">
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm("Create Shiprocket shipment?")) return;
                            setStatusMessage("Initiating...");
                            const res = await fetch("/api/admin/shiprocket/create-shipment", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ orderId: order.id }),
                            });
                            const data = await res.json();
                            if (data.success) {
                              setStatusMessage("Shipped!");
                              fetchData();
                            } else {
                              setStatusMessage("Error: " + data.error);
                            }
                          }}
                          disabled={order.order_status === 'SHIPPED' || order.order_status === 'DELIVERED'}
                          className={`min-h-[2.5rem] sm:min-h-[3.5rem] px-4 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-30 disabled:grayscale flex items-center justify-center text-center`}
                        >
                          Create Shipment 🚚
                        </button>

                        {order.payment_method === 'COD' && order.payment_status === 'PENDING' && (
                          <button
                            type="button"
                            onClick={async () => {
                              await supabase.from("orders").update({ payment_status: "COMPLETE" }).eq("id", order.id);
                              fetchData();
                              setStatusMessage("Payment marked as RECEIVED for Order #" + order.id);
                            }}
                            className="min-h-[2.5rem] sm:min-h-[3.5rem] px-4 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all bg-amber-500 text-white shadow-lg shadow-amber-600/20 hover:bg-amber-600 flex items-center justify-center text-center"
                          >
                            Confirm Cash 💸
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOrderStatusUpdate(order.id, "DELIVERED")}
                          disabled={order.order_status === 'DELIVERED'}
                          className={`min-h-[2.5rem] sm:min-h-[3.5rem] px-4 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center text-center ${order.order_status === 'DELIVERED'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-600 hover:text-white'
                            }`}
                        >
                          {order.order_status === 'DELIVERED' ? 'Delivered ✅' : 'Mark Delivered ✅'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteOrder(order.id)}
                          className="group flex h-8 sm:h-10 items-center justify-center gap-2 rounded-lg sm:rounded-xl bg-rose-50 px-3 sm:px-4 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-rose-600 transition-all hover:bg-rose-600 hover:text-white"
                        >
                          <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Clear Record
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {orders.filter(o => o.order_status !== 'PRE_ORDER').length === 0 && (
                  <div className="text-center py-40 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                    <p className="text-sm font-bold text-slate-400">No active dispatches. Operations are idle.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {tab === "pre-orders" ? (
          <div className="space-y-12">
            <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-slate-100 premium-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Future Fulfillments</span>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Pre-Order Bookings ({orders.filter(o => o.order_status === 'PRE_ORDER').length})</h2>
                </div>
                <button
                  type="button"
                  onClick={() => handleExport("pre-orders")}
                  disabled={exporting}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {exporting ? "Exporting..." : "Export Bookings"}
                </button>
              </div>

              <div className="grid gap-8">
                {orders.filter(o => o.order_status === 'PRE_ORDER').map((order) => (
                  <div key={order.id} className="group relative flex flex-col p-4 sm:p-10 rounded-[2rem] sm:rounded-[3.5rem] border border-emerald-100 bg-emerald-50/20 transition-all hover:bg-emerald-50/50 hover:shadow-2xl hover:shadow-emerald-900/5">
                    <div className="flex flex-col lg:flex-row justify-between items-start gap-4 lg:gap-6 mb-6 pb-6 border-b border-emerald-100">
                      <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="h-8 w-8 sm:h-12 sm:w-12 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[10px] sm:text-sm font-black shrink-0">
                            {order.customer_name.charAt(0).toUpperCase()}
                          </div>
                          <h3 className="text-base sm:text-2xl font-black tracking-tight text-slate-900 break-words">{order.customer_name}</h3>
                        </div>
                        <div className="flex flex-wrap gap-x-4 sm:gap-x-6 gap-y-1 sm:gap-y-2 text-[10px] sm:text-xs font-bold text-emerald-600/70">
                          <span className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                            <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                            {order.phone}
                          </span>
                          <span className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                            <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {new Date(order.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-start lg:items-end gap-2 sm:gap-3 w-full lg:w-auto">
                        <div className="flex flex-wrap justify-start lg:justify-end gap-2">
                          <span className="px-3 py-1 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] shadow-sm bg-purple-100 text-purple-700 border border-purple-200">
                            PRE-ORDER
                          </span>
                          <span className={`px-3 py-1 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${order.payment_status === 'BOOKED'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : 'bg-amber-50 text-amber-600 border border-amber-100'
                            }`}>
                            {order.payment_status}
                          </span>
                        </div>
                        <p className="text-[8px] sm:text-[10px] font-black text-emerald-600/40 uppercase tracking-widest break-all">ID: #{order.id} {order.razorpay_order_id ? `| RP: ${order.razorpay_order_id.slice(-8)}` : ''}</p>
                      </div>
                    </div>

                    <div className="grid lg:grid-cols-[1fr_auto] gap-6 sm:gap-8">
                      <div className="grid md:grid-cols-2 gap-6 sm:gap-8 flex-1">
                        <div>
                          <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-700/50 mb-1 sm:mb-2">Delivery Address</p>
                          <p className="text-[11px] sm:text-base font-bold text-slate-600 leading-relaxed bg-white p-3 sm:p-6 rounded-xl sm:rounded-[2rem] border border-emerald-100/50 h-full shadow-inner">
                            {order.address}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-700/50 mb-1 sm:mb-2">Booking Details</p>
                          <div className="bg-emerald-900 rounded-xl sm:rounded-[2.5rem] p-4 sm:p-8 text-emerald-50 shadow-xl shadow-emerald-900/10 text-[10px] sm:text-sm leading-relaxed font-mono h-full">
                            {(() => {
                              try {
                                const items = JSON.parse(order.product_details);
                                if (Array.isArray(items)) {
                                  return (
                                    <ul className="space-y-2">
                                      {items.map((item: any, i: number) => (
                                        <li key={i} className="flex justify-between border-b border-emerald-800 pb-1.5 last:border-0">
                                          <span className="font-bold text-emerald-300">{item.name || item.product_name} <span className="text-emerald-100">x{item.quantity}</span></span>
                                          <span className="text-white">₹{item.price}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  );
                                }
                              } catch (e) { }
                              return <div className="whitespace-pre-wrap">{order.product_details}</div>;
                            })()}
                            <div className="mt-4 pt-4 border-t border-emerald-800/50">
                              <div className="flex justify-between font-black">
                                <span className="text-emerald-300">Amount Paid (Booking)</span>
                                <span className="text-white">₹2</span>
                              </div>
                              <div className="flex justify-between font-bold text-emerald-200 mt-1">
                                <span>Remaining to Pay</span>
                                <span>₹{order.total_amount - 2}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 justify-center min-w-[180px]">
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm("Are you sure you want to convert this Pre-Order into a full regular order? This will move it to the Dispatches tab.")) return;
                            await supabase.from("orders").update({ order_status: "PENDING", payment_method: "COD", payment_status: "PENDING" }).eq("id", order.id);
                            setStatusMessage("Pre-Order converted to regular PENDING order successfully!");
                            fetchData();
                          }}
                          className={`min-h-[2.5rem] sm:min-h-[3.5rem] px-4 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 flex items-center justify-center text-center`}
                        >
                          Convert to Full Order ✨
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteOrder(order.id)}
                          className="group flex h-8 sm:h-10 items-center justify-center gap-2 rounded-lg sm:rounded-xl bg-white px-3 sm:px-4 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-rose-600 transition-all hover:bg-rose-600 hover:text-white border border-rose-100"
                        >
                          <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Cancel Booking
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {orders.filter(o => o.order_status === 'PRE_ORDER').length === 0 && (
                  <div className="text-center py-40 bg-emerald-50/50 rounded-[3rem] border border-dashed border-emerald-200">
                    <p className="text-sm font-bold text-emerald-600/50">No Pre-Orders received yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}


        {tab === "as-card" ? (
          <div className="space-y-12">
            <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-slate-100 premium-shadow">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Premium Membership</span>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">AS-Card Applications ({applications.length})</h2>
                </div>
              </div>

              <div className="grid gap-8">
                {applications.map((app) => (
                  <div key={app.id} className="group relative flex flex-col p-6 sm:p-10 rounded-[2rem] sm:rounded-[3.5rem] border border-slate-100 bg-white transition-all hover:bg-slate-50/50 hover:shadow-2xl hover:shadow-slate-900/5">
                    <div className="flex flex-col lg:flex-row justify-between items-start gap-4 lg:gap-6 mb-6 pb-6 border-b border-slate-100">
                      <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className={`h-8 w-8 sm:h-12 sm:w-12 rounded-full flex items-center justify-center text-white text-[10px] sm:text-sm font-black shrink-0 ${app.cardType === 'Gold' ? 'bg-gradient-to-br from-yellow-400 to-amber-600' : 'bg-gradient-to-br from-slate-300 to-slate-500'}`}>
                            {app.cardType === 'Gold' ? '👑' : '💎'}
                          </div>
                          <div>
                            <h3 className="text-base sm:text-2xl font-black tracking-tight text-slate-900 break-words">{app.name}</h3>
                            <span className={`inline-flex px-2 py-0.5 mt-1 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${app.cardType === 'Gold' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'}`}>
                              {app.cardType} Card
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-x-4 sm:gap-x-6 gap-y-1 sm:gap-y-2 text-[10px] sm:text-xs font-bold text-slate-400 pt-2">
                          <span className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                            <strong>Email:</strong> {app.email}
                          </span>
                          <span className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                            <strong>Phone:</strong> {app.phone}
                          </span>
                          <span className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                            <strong>Applied:</strong> {app.appliedAt && !isNaN(new Date(app.appliedAt).getTime()) ? new Date(app.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : "N/A"}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-start lg:items-end gap-2 sm:gap-3 w-full lg:w-auto">
                        <span className={`px-3 py-1 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${app.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          : app.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-600 border border-rose-100'
                            : 'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse'
                          }`}>
                          {app.status}
                        </span>
                        {app.cardNumber && (
                          <p className="text-[10px] sm:text-xs font-black text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg font-mono">
                            CARD NO: {app.cardNumber}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 mt-2 w-full">
                      {app.status === 'PENDING' && (
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => handleApproveApp(app.id)}
                            className="w-full sm:w-auto min-h-[2.75rem] py-3 px-5 rounded-xl bg-emerald-600 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider leading-tight shadow-md shadow-emerald-600/10 hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center text-center"
                          >
                            Approve & Generate Card
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectApp(app.id)}
                            className="w-full sm:w-auto min-h-[2.75rem] py-3 px-5 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-[10px] sm:text-xs font-black uppercase tracking-wider leading-tight hover:bg-rose-100 transition-all flex items-center justify-center text-center"
                          >
                            Reject Application
                          </button>
                        </div>
                      )}

                      {app.status === 'APPROVED' && (
                        <button
                          type="button"
                          disabled
                          className="w-full sm:w-auto min-h-[2.75rem] py-3 px-6 rounded-xl bg-emerald-50 text-emerald-600 text-[10px] sm:text-xs font-black uppercase tracking-wider leading-tight border border-emerald-100 cursor-not-allowed flex items-center justify-center text-center"
                        >
                          Card Active ✓
                        </button>
                      )}

                      {app.status === 'REJECTED' && (
                        <button
                          type="button"
                          disabled
                          className="w-full sm:w-auto min-h-[2.75rem] py-3 px-6 rounded-xl bg-rose-50 text-rose-600 text-[10px] sm:text-xs font-black uppercase tracking-wider leading-tight border border-rose-100 cursor-not-allowed flex items-center justify-center text-center"
                        >
                          Application Rejected ✗
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteApp(app.id)}
                        className="w-full sm:w-auto h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all flex items-center justify-center sm:ml-auto"
                        title="Delete application record"
                      >
                        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="sm:hidden ml-2 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-rose-600">Delete Record</span>
                      </button>
                    </div>

                    {app.status === 'APPROVED' && (
                      <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left animate-in fade-in duration-300">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block">Apply Date & Time</label>
                          <p className="text-xs font-black text-slate-600 font-mono bg-slate-50/80 px-4 py-3 rounded-2xl border border-slate-100/50 min-h-[2.8rem] flex items-center">
                            {app.appliedAt && !isNaN(new Date(app.appliedAt).getTime()) ? new Date(app.appliedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "N/A"}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block">Card Renew / Expiry Date</label>
                          <p className="text-xs font-black text-slate-600 font-mono bg-slate-50/80 px-4 py-3 rounded-2xl border border-slate-100/50 min-h-[2.8rem] flex items-center">
                            {app.expiresAt && !isNaN(new Date(app.expiresAt).getTime()) ? new Date(app.expiresAt).toISOString().split('T')[0] : "N/A"}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block">Current Coins Balance</label>
                          <p className="text-xs font-black text-slate-600 font-mono bg-slate-50/80 px-4 py-3 rounded-2xl border border-slate-100/50 min-h-[2.8rem] flex items-center">
                            {app.coins !== undefined ? app.coins : 100}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {applications.length === 0 && (
                  <div className="text-center py-40 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                    <p className="text-sm font-bold text-slate-400">No card applications received yet.</p>
                  </div>
                )}
              </div>
            </div>

            {/* SPECIAL OFFERS / GIVE OFFER SECTION */}
            <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-slate-100 premium-shadow">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">BOGO Promotional Bundles</span>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">🎁 Give Offer (AS-Card Exclusive)</h2>
                </div>
              </div>

              <form onSubmit={handleSaveActiveOffer} className="space-y-8 text-left">
                <div className="grid gap-8 md:grid-cols-2">
                  {/* MAIN PRODUCT SELECTION */}
                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-700 block">
                      1. Select Main Product
                    </label>
                    <p className="text-[11px] font-bold text-slate-400 leading-relaxed">
                      Select the primary product that the customer must purchase to qualify for the bundle.
                    </p>
                    <select
                      value={selectedMainProduct}
                      onChange={(e) => setSelectedMainProduct(e.target.value)}
                      className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-6 py-4 text-sm font-bold outline-none transition-all focus:border-emerald-500/20 focus:bg-white"
                    >
                      <option value="">-- Choose a Product --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (₹{p.price})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ADDITIONAL PRODUCTS SELECTION */}
                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-700 block">
                      2. Choose Additional Products (GIVEN FREE)
                    </label>
                    <p className="text-[11px] font-bold text-slate-400 leading-relaxed">
                      Select the items that will be automatically added to the order as free gifts when a member's card is verified.
                    </p>
                    <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 max-h-48 overflow-y-auto space-y-2">
                      {products.length === 0 ? (
                        <p className="text-xs font-bold text-slate-400">No products available in inventory.</p>
                      ) : (
                        products.map((p) => {
                          const isSelected = selectedOfferProducts.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${isSelected
                                  ? "border-emerald-500 bg-emerald-50/30 text-emerald-950"
                                  : "border-transparent hover:bg-slate-50"
                                }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleOfferProduct(p.id)}
                                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                              <span className="text-xs font-bold truncate">{p.name} (₹{p.price})</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* OFFER PREVIEW / ACTIVE STATUS */}
                {activeOffer && activeOffer.isActive && (
                  <div className="rounded-[2.2rem] bg-emerald-500/[0.04] border border-emerald-500/10 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 block">
                          🔥 Currently Active VIP Offer
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-700 leading-relaxed">
                        When a verified member purchases{" "}
                        <strong className="text-slate-900">
                          {products.find((p) => p.id === activeOffer.mainProductId)?.name || "Main Product"}
                        </strong>
                        , they will receive:
                      </p>
                      <ul className="list-disc pl-5 text-[11px] font-bold text-slate-500 space-y-1">
                        {activeOffer.offerProductIds.map((id) => (
                          <li key={id}>
                            🎁{" "}
                            <span className="text-emerald-700">
                              {products.find((p) => p.id === id)?.name || "Offer Product"}
                            </span>{" "}
                            (Free Gift)
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={handleDeactivateOffer}
                      className="w-full md:w-auto rounded-xl bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 px-6 py-3 text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center shrink-0"
                    >
                      Deactivate Offer
                    </button>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <p className="text-[10px] font-bold text-slate-400 max-w-sm">
                    Only one active VIP Bundle Offer is supported at a time. Activating a new offer will replace the previous one.
                  </p>
                  <button
                    type="submit"
                    className="w-full sm:w-auto min-h-[3rem] px-8 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest transition-all hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-600/10 active:scale-95 flex items-center justify-center"
                  >
                    🚀 Activate Offer
                  </button>
                </div>
              </form>
            </div>

            {/* GLOBAL CART OFFER SECTION */}
            <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-slate-100 premium-shadow">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Global Store Promotions</span>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">🛒 Cart Target Offer</h2>
                </div>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const { error } = await supabase.from('store_settings').upsert(
                    { key: 'global_cart_offer', value: globalCartOffer },
                    { onConflict: 'key' }
                  );
                  if (error) {
                    setStatusMessage('❌ Error saving global cart offer: ' + error.message);
                  } else {
                    setStatusMessage('✅ Global Cart Offer Updated Successfully!');
                  }
                }}
                className="space-y-8 text-left"
              >
                <div className="grid gap-8 md:grid-cols-2">
                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-700 block">
                      Offer Threshold (₹)
                    </label>
                    <p className="text-[11px] font-bold text-slate-400 leading-relaxed">
                      Target cart amount required to unlock the discount.
                    </p>
                    <input
                      type="number"
                      name="threshold"
                      value={globalCartOffer.threshold}
                      onChange={e => setGlobalCartOffer(prev => ({ ...prev, threshold: Number(e.target.value) }))}
                      className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-6 py-4 text-sm font-bold outline-none transition-all focus:border-emerald-500/20 focus:bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-700 block">
                      Discount Percentage (%)
                    </label>
                    <p className="text-[11px] font-bold text-slate-400 leading-relaxed">
                      Percentage off applied when threshold is reached.
                    </p>
                    <input
                      type="number"
                      name="percentage"
                      value={globalCartOffer.percentage}
                      onChange={e => setGlobalCartOffer(prev => ({ ...prev, percentage: Number(e.target.value) }))}
                      className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-6 py-4 text-sm font-bold outline-none transition-all focus:border-emerald-500/20 focus:bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer group">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={globalCartOffer.isActive}
                      onChange={e => setGlobalCartOffer(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 group-hover:bg-slate-300 peer-checked:group-hover:bg-emerald-700"></div>
                    <span className="ml-3 text-sm font-bold text-slate-700">
                      Enable this offer globally
                    </span>
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-50 flex justify-end items-center">
                  <button
                    type="submit"
                    className="w-full sm:w-auto min-h-[3rem] px-8 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest transition-all hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-600/10 active:scale-95 flex items-center justify-center"
                  >
                    💾 Save Cart Offer
                  </button>
                </div>
              </form>
            </div>

            {/* ORDER BILLING SETTINGS SECTION */}
            <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-slate-100 premium-shadow">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Checkout Configuration</span>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">💳 Order Billing Settings</h2>
                </div>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const { error } = await supabase.from('store_settings').upsert(
                    { key: 'billing', value: billingSettings },
                    { onConflict: 'key' }
                  );
                  if (error) {
                    setStatusMessage('❌ Error saving billing settings: ' + error.message);
                  } else {
                    setStatusMessage('✅ Billing Settings Updated Successfully!');
                  }
                }}
                className="space-y-8 text-left"
              >
                <div className="grid gap-8 md:grid-cols-2">
                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-700 block">
                      Delivery Fee (₹)
                    </label>
                    <input
                      type="number"
                      value={billingSettings.deliveryFee}
                      onChange={e => setBillingSettings(prev => ({ ...prev, deliveryFee: Number(e.target.value) }))}
                      className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-6 py-4 text-sm font-bold outline-none transition-all focus:border-emerald-500/20 focus:bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-700 block">
                      Free Delivery Threshold (₹)
                    </label>
                    <input
                      type="number"
                      value={billingSettings.freeDeliveryThreshold}
                      onChange={e => setBillingSettings(prev => ({ ...prev, freeDeliveryThreshold: Number(e.target.value) }))}
                      className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-6 py-4 text-sm font-bold outline-none transition-all focus:border-emerald-500/20 focus:bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-700 block">
                      Packaging Fee (₹)
                    </label>
                    <input
                      type="number"
                      value={billingSettings.packagingFee}
                      onChange={e => setBillingSettings(prev => ({ ...prev, packagingFee: Number(e.target.value) }))}
                      className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-6 py-4 text-sm font-bold outline-none transition-all focus:border-emerald-500/20 focus:bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-700 block">
                      Tax (₹)
                    </label>
                    <input
                      type="number"
                      value={billingSettings.tax}
                      onChange={e => setBillingSettings(prev => ({ ...prev, tax: Number(e.target.value) }))}
                      className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-6 py-4 text-sm font-bold outline-none transition-all focus:border-emerald-500/20 focus:bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-50 flex justify-end items-center">
                  <button
                    type="submit"
                    className="w-full sm:w-auto min-h-[3rem] px-8 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest transition-all hover:emerald-600 hover:shadow-lg hover:shadow-emerald-600/10 active:scale-95 flex items-center justify-center"
                  >
                    💾 Save Billing Settings
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {tab === "customers" ? (
          <div className="space-y-12">
            <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-slate-100 premium-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Customer Analysis</span>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Saved Delivery Addresses ({customers.length})</h2>
                </div>
                <button
                  type="button"
                  onClick={() => handleExport("customers")}
                  disabled={exporting}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {exporting ? "Exporting..." : "Export Customers"}
                </button>
              </div>

              <div className="grid gap-8">
                {customers.map((c) => (
                  <div key={c.id} className="group relative flex flex-col p-6 sm:p-10 rounded-[2rem] sm:rounded-[3.5rem] border border-slate-100 bg-white transition-all hover:bg-slate-50/50 hover:shadow-2xl hover:shadow-slate-900/5">
                    <div className="flex flex-col lg:flex-row justify-between items-start gap-4 lg:gap-6 mb-6 pb-6 border-b border-slate-100">

                      <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="h-8 w-8 sm:h-12 sm:w-12 rounded-full flex items-center justify-center text-white text-[10px] sm:text-sm font-black shrink-0 bg-gradient-to-br from-emerald-400 to-emerald-600">
                            {c.name?.[0]?.toUpperCase() || 'C'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm sm:text-lg font-black text-slate-900 truncate">
                              {c.name}
                            </h3>
                            <p className="text-[9px] sm:text-[11px] font-bold text-slate-400 flex items-center gap-1.5 truncate mt-0.5 sm:mt-1">
                              <svg className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {c.email}
                            </p>
                            <p className="text-[9px] sm:text-[11px] font-bold text-slate-400 flex items-center gap-1.5 truncate mt-0.5 sm:mt-1">
                              <svg className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {c.phone}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-50">
                          <p className="text-[10px] sm:text-xs font-bold text-slate-700 leading-relaxed">
                            <span className="text-slate-400 uppercase tracking-widest text-[8px] sm:text-[9px] block mb-1">Shipping Details</span>
                            Vill/Town: <span className="text-slate-900">{c.village}</span>, P.O: <span className="text-slate-900">{c.postOffice}</span>, Pincode: <span className="text-slate-900">{c.pincode}</span>
                            <br />
                            <span className="text-emerald-700 italic mt-1 block">"{c.addressDetail}"</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 justify-center min-w-[120px] shrink-0 self-start lg:self-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomer(c.id)}
                          className="group flex h-9 sm:h-11 items-center justify-center gap-2 rounded-lg sm:rounded-xl bg-rose-50 px-3 sm:px-4 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-rose-600 transition-all hover:bg-rose-600 hover:text-white"
                        >
                          <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete Record
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {customers.length === 0 && (
                  <div className="text-center py-40 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                    <p className="text-sm font-bold text-slate-400">No customer addresses saved yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {tab === "alerts" ? (
          <div className="space-y-12">
            <div className="bg-white rounded-[2rem] border border-slate-100 premium-shadow overflow-hidden">
              <div className="p-8 md:p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Inventory Watch</span>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">Low Stock Alerts</h2>
                </div>
              </div>
              <div className="p-8 md:p-12 relative">
                <div className="absolute top-16 bottom-12 left-[3.25rem] md:left-[4.25rem] w-px bg-slate-100"></div>
                <div className="space-y-8">
                  {products.filter(p => p.stock !== undefined && p.stock !== null && p.stock <= (p.low_stock_limit || 5)).length > 0 ? (
                    products.filter(p => p.stock !== undefined && p.stock !== null && p.stock <= (p.low_stock_limit || 5)).map(p => {
                      const isCritical = p.stock === 0;
                      return (
                        <div key={p.id} className="relative flex items-start gap-6 md:gap-8 group">
                          <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white transition-colors shadow-sm ${isCritical ? 'bg-rose-100 group-hover:bg-rose-200' : 'bg-amber-100 group-hover:bg-amber-200'}`}>
                            <svg className={`h-4 w-4 transition-colors ${isCritical ? 'text-rose-600 group-hover:text-rose-700' : 'text-amber-600 group-hover:text-amber-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={isCritical ? "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" : "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"} />
                            </svg>
                          </div>
                          <div className={`flex-1 rounded-[1.5rem] border p-6 shadow-sm group-hover:shadow-md transition-all relative top-[-0.25rem] hover:-translate-y-1 ${isCritical ? 'bg-rose-50/30 border-rose-100' : 'bg-amber-50/30 border-amber-100'}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div>
                                <h3 className={`text-lg font-black ${isCritical ? 'text-rose-950' : 'text-amber-950'}`}>{p.name}</h3>
                                <p className={`text-[10px] font-bold mt-1 uppercase tracking-widest ${isCritical ? 'text-rose-500' : 'text-amber-600'}`}>
                                  {isCritical ? 'Critical: Out of Stock' : 'Warning: Low Stock'}
                                </p>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className={`text-2xl font-black ${isCritical ? 'text-rose-600' : 'text-amber-600'}`}>{p.stock || 0}</p>
                                  <p className={`text-[9px] font-bold uppercase tracking-widest ${isCritical ? 'text-rose-400' : 'text-amber-500'}`}>Threshold: {p.low_stock_limit || 5}</p>
                                </div>
                                <button onClick={() => { setTab("products"); setEditingProductId(p.id); setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100); }} className={`px-4 py-2 rounded-xl text-white font-black text-[10px] uppercase tracking-widest transition-colors ${isCritical ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
                                  Restock
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                      <p className="text-sm font-bold text-slate-400">All products have sufficient stock levels.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 premium-shadow overflow-hidden">
              <div className="p-8 md:p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Customer Requests</span>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">Back In Stock Requests</h2>
                </div>
              </div>
              <div className="p-8 md:p-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {notifyRequests.map(req => (
                  <div key={req.id} className="flex flex-col p-6 rounded-[2rem] border border-slate-100 bg-white shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 premium-shadow">
                    <h3 className="text-sm font-black text-slate-900 mb-2 truncate" title={req.product_name}>{req.product_name}</h3>
                    <div className="space-y-1.5 mb-4">
                      <p className="text-xs font-bold text-slate-600 flex items-center gap-2">👤 {req.customer_name}</p>
                      <p className="text-xs font-bold text-slate-600 flex items-center gap-2">📞 {req.phone}</p>
                      {req.email && <p className="text-xs font-bold text-slate-600 flex items-center gap-2">✉️ {req.email}</p>}
                    </div>
                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                      <p className="text-[10px] font-bold text-slate-400">{new Date(req.created_at).toLocaleDateString()}</p>
                      <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${req.status === 'NOTIFIED' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>{req.status}</span>
                    </div>
                  </div>
                ))}
                {notifyRequests.length === 0 && (
                  <div className="col-span-full text-center py-20 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                    <p className="text-sm font-bold text-slate-400">No active customer notify requests.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {tab === "audit" ? (
          <div className="space-y-12">
            <div className="bg-white rounded-[2rem] border border-slate-100 premium-shadow overflow-hidden">
              <div className="p-8 md:p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">History</span>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">Inventory Audit Log</h2>
                </div>
              </div>
              <div className="p-8 md:p-12 relative">
                <div className="absolute top-16 bottom-12 left-[3.25rem] md:left-[4.25rem] w-px bg-slate-100"></div>
                <div className="space-y-8">
                  {stockHistory.map((log) => (
                    <div key={log.id} className="relative flex items-start gap-6 md:gap-8 group">
                      <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white bg-slate-50 group-hover:bg-emerald-50 transition-colors shadow-sm">
                        <svg className="h-4 w-4 text-slate-400 group-hover:text-emerald-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm group-hover:shadow-md transition-all relative top-[-0.25rem] hover:-translate-y-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                           <div>
                             <h3 className="text-sm font-black text-slate-900">{log.products?.name || `Product ID: ${log.product_id}`}</h3>
                             <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{new Date(log.created_at).toLocaleString()}</p>
                           </div>
                           <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 w-fit ${log.change_amount > 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                             <span className="text-[10px] font-black uppercase tracking-widest">
                               {log.change_amount > 0 ? 'Added' : 'Removed'}
                             </span>
                             <span className="text-sm font-black">
                               {log.change_amount > 0 ? `+${log.change_amount}` : log.change_amount}
                             </span>
                           </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2">
                           <div className="h-6 w-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[8px] font-black shrink-0">{log.admin_user?.charAt(0).toUpperCase() || 'A'}</div>
                           <p className="text-xs font-bold text-slate-600"><span className="text-slate-400 font-medium">Changed by</span> {log.admin_user}</p>
                           <span className="mx-2 text-slate-300">•</span>
                           <p className="text-xs font-bold text-slate-500 italic">"{log.reason}"</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {stockHistory.length === 0 && (
                    <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                      <p className="text-sm font-bold text-slate-400">No inventory changes recorded yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}

          </div>
        </div>
      </main>
    </div>
  );
}

