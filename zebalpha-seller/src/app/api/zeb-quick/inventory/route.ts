import { NextResponse } from "next/server";
import { supabaseServer, createSupabaseServerClient } from "@shared/utils/supabaseServer";

export const dynamic = "force-dynamic";

async function resolveSeller(req: Request) {
  const supabase = await createSupabaseServerClient();
  let { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (token) {
      const { data } = await supabaseServer.auth.getUser(token);
      user = data.user;
    }
  }
  if (!user) return null;

  let query = supabaseServer
    .from("sellers")
    .select("id, user_id, business_name, full_name, account_status, status");
  if (user.email) {
    query = query.or(`user_id.eq.${user.id},email.eq.${user.email.toLowerCase().trim()}`);
  } else {
    query = query.eq("user_id", user.id);
  }
  const { data: seller } = await query.maybeSingle();
  return seller ? { user, seller } : null;
}

async function safeInsertStockLog(
  db: ReturnType<typeof supabaseServer.schema>,
  row: {
    zeb_quick_product_id: string;
    seller_id: string;
    product_title: string;
    previous_stock: number;
    new_stock: number;
    change_amount: number;
    reason: string;
  }
) {
  try {
    await db.from("stock_history").insert(row);
  } catch {
    // Gracefully ignore if add_zeb_quick_inventory_logs.sql hasn't been executed yet
  }
}

export async function GET(req: Request) {
  try {
    const ctx = await resolveSeller(req);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = supabaseServer.schema("zeb_quick");

    const [{ data: products, error: prodErr }, historyRes] = await Promise.all([
      db
        .from("products")
        .select("*")
        .eq("seller_id", ctx.seller.id)
        .order("zeb_quick_stock", { ascending: true })
        .order("title", { ascending: true }),
      db
        .from("stock_history")
        .select("*")
        .eq("seller_id", ctx.seller.id)
        .order("created_at", { ascending: false })
        .limit(40),
    ]);

    if (prodErr) {
      return NextResponse.json({ error: prodErr.message }, { status: 500 });
    }

    const list: Array<{
      id: string;
      source_product_id: string | null;
      title: string;
      image_url: string;
      category_group: string;
      subcategory_slug: string;
      zeb_quick_stock: number;
      low_stock_limit: number;
      zeb_quick_price: number;
      mrp: number | null;
      pickup_pincode: string;
      is_active: boolean;
      is_zebquick_only: boolean;
      updated_at: string;
    }> = (products || []).map((p: any) => ({
      id: String(p.id),
      source_product_id: p.source_product_id || null,
      title: String(p.title || ""),
      image_url: p.image_url || (Array.isArray(p.images) ? p.images[0] : "") || "",
      category_group: p.category_group || "",
      subcategory_slug: p.subcategory_slug || "",
      zeb_quick_stock: Number(p.zeb_quick_stock ?? 0),
      low_stock_limit: Number(p.low_stock_limit ?? 5),
      zeb_quick_price: Number(p.zeb_quick_price ?? 0),
      mrp: p.mrp != null ? Number(p.mrp) : null,
      pickup_pincode: p.pickup_pincode || "",
      is_active: Boolean(p.is_active),
      is_zebquick_only: Boolean(p.is_zebquick_only),
      updated_at: String(p.updated_at || p.activated_at || ""),
    }));

    const outOfStockCount = list.filter((p) => p.zeb_quick_stock <= 0).length;
    const lowStockCount = list.filter((p) => p.zeb_quick_stock > 0 && p.zeb_quick_stock <= p.low_stock_limit).length;
    const pausedCount = list.filter((p) => !p.is_active).length;
    const totalUnits = list.reduce((sum, p) => sum + Math.max(0, p.zeb_quick_stock), 0);

    return NextResponse.json({
      products: list,
      history: !historyRes.error && Array.isArray(historyRes.data) ? historyRes.data : [],
      summary: {
        totalProducts: list.length,
        totalUnits,
        inStockCount: list.filter((p) => p.zeb_quick_stock > p.low_stock_limit && p.is_active).length,
        lowStockCount,
        outOfStockCount,
        pausedCount,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const ctx = await resolveSeller(req);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const accStatus = String((ctx.seller as any).account_status || (ctx.seller as any).status || "Active").toLowerCase();
    if (accStatus === "suspended") {
      return NextResponse.json(
        { error: "Account Suspended: You cannot modify ZebQuick inventory while suspended." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const db = supabaseServer.schema("zeb_quick");

    // 1. Update stock, low limit, and optional express price for a single product
    if (body.action === "update_stock" && body.productId) {
      const newStock = Math.max(0, Math.round(Number(body.zeb_quick_stock)));
      const newLimit = Math.max(1, Math.round(Number(body.low_stock_limit ?? 5)));
      const newPrice = body.zeb_quick_price !== undefined ? Number(body.zeb_quick_price) : undefined;

      if (!Number.isFinite(newStock) || !Number.isFinite(newLimit)) {
        return NextResponse.json({ error: "Invalid stock or low limit value" }, { status: 400 });
      }
      if (newPrice !== undefined && (!Number.isFinite(newPrice) || newPrice <= 0)) {
        return NextResponse.json({ error: "Express price must be greater than ₹0" }, { status: 400 });
      }

      const { data: existing } = await db
        .from("products")
        .select("*")
        .eq("id", body.productId)
        .eq("seller_id", ctx.seller.id)
        .maybeSingle();

      if (!existing) {
        return NextResponse.json({ error: "ZebQuick product not found" }, { status: 404 });
      }

      const prevStock = Number(existing.zeb_quick_stock ?? 0);
      const changeAmount = newStock - prevStock;
      const patch: Record<string, any> = {
        zeb_quick_stock: newStock,
        low_stock_limit: newLimit,
        updated_at: new Date().toISOString(),
      };
      if (newPrice !== undefined) patch.zeb_quick_price = newPrice;
      if (typeof body.is_active === "boolean") {
        patch.is_active = body.is_active;
      } else if (prevStock <= 0 && newStock > 0) {
        // Auto-resume when seller restocks an out-of-stock item
        patch.is_active = true;
      }

      let { error: upErr } = await db
        .from("products")
        .update(patch)
        .eq("id", body.productId)
        .eq("seller_id", ctx.seller.id);

      // Graceful fallback if low_stock_limit column hasn't been added via migration yet
      if (upErr && /low_stock_limit/i.test(upErr.message || "")) {
        delete patch.low_stock_limit;
        const retry = await db
          .from("products")
          .update(patch)
          .eq("id", body.productId)
          .eq("seller_id", ctx.seller.id);
        upErr = retry.error;
      }

      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }

      if (changeAmount !== 0) {
        await safeInsertStockLog(db, {
          zeb_quick_product_id: existing.id,
          seller_id: ctx.seller.id,
          product_title: existing.title,
          previous_stock: prevStock,
          new_stock: newStock,
          change_amount: changeAmount,
          reason:
            String(body.reason || "").trim() ||
            (changeAmount > 0
              ? `ZebQuick Restock (+${changeAmount} → ${newStock} units)`
              : `ZebQuick Stock Adjustment (${changeAmount} → ${newStock} units)`),
        });
      }

      return NextResponse.json({ success: true, newStock, newLimit });
    }

    // 2. Quick 1-click Restock (+5 / +10 / +25 / +50)
    if (body.action === "quick_restock" && body.productId) {
      const delta = Math.round(Number(body.delta || 10));
      if (!Number.isFinite(delta) || delta <= 0 || delta > 10000) {
        return NextResponse.json({ error: "Invalid restock quantity" }, { status: 400 });
      }

      const { data: existing } = await db
        .from("products")
        .select("*")
        .eq("id", body.productId)
        .eq("seller_id", ctx.seller.id)
        .maybeSingle();

      if (!existing) {
        return NextResponse.json({ error: "ZebQuick product not found" }, { status: 404 });
      }

      const prevStock = Number(existing.zeb_quick_stock ?? 0);
      const newStock = prevStock + delta;

      const { error: upErr } = await db
        .from("products")
        .update({
          zeb_quick_stock: newStock,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.productId)
        .eq("seller_id", ctx.seller.id);

      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }

      await safeInsertStockLog(db, {
        zeb_quick_product_id: existing.id,
        seller_id: ctx.seller.id,
        product_title: existing.title,
        previous_stock: prevStock,
        new_stock: newStock,
        change_amount: delta,
        reason: `Quick Restock (+${delta} units → ${newStock})`,
      });

      return NextResponse.json({ success: true, previousStock: prevStock, newStock });
    }

    // 3. Toggle Active / Pause on ZebQuick
    if (body.action === "toggle_active" && body.productId) {
      const nextActive = Boolean(body.is_active);
      const { error } = await db
        .from("products")
        .update({ is_active: nextActive, updated_at: new Date().toISOString() })
        .eq("id", body.productId)
        .eq("seller_id", ctx.seller.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, is_active: nextActive });
    }

    // 4. Bulk Restock all Low / Out-of-Stock ZebQuick items
    if (body.action === "bulk_restock_low") {
      const addQty = Math.max(1, Math.min(500, Math.round(Number(body.delta || 10))));
      const { data: allItems } = await db
        .from("products")
        .select("*")
        .eq("seller_id", ctx.seller.id);

      const lowItems = (allItems || []).filter(
        (p: any) => Number(p.zeb_quick_stock ?? 0) <= Number(p.low_stock_limit ?? 5)
      );

      let restockedCount = 0;
      for (const item of lowItems as any[]) {
        const prevStock = Number(item.zeb_quick_stock ?? 0);
        const newStock = prevStock + addQty;
        const { error } = await db
          .from("products")
          .update({
            zeb_quick_stock: newStock,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id)
          .eq("seller_id", ctx.seller.id);
        if (!error) {
          restockedCount += 1;
          await safeInsertStockLog(db, {
            zeb_quick_product_id: item.id,
            seller_id: ctx.seller.id,
            product_title: item.title,
            previous_stock: prevStock,
            new_stock: newStock,
            change_amount: addQty,
            reason: `Bulk Low-Stock Restock (+${addQty} → ${newStock})`,
          });
        }
      }

      return NextResponse.json({ success: true, restockedCount, addQty });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
