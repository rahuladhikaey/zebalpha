import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireSuperAdmin, authErrorResponse } from "@/lib/authGuard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Helper to reliably update or insert into store_settings table
async function upsertSetting(key: string, value: any) {
  const now = new Date().toISOString();

  // 1. Check if row exists for this key
  const { data: existing, error: fetchErr } = await supabaseServer
    .from("store_settings")
    .select("id")
    .eq("key", key)
    .maybeSingle();

  if (fetchErr) {
    console.warn(`[StoreSettings] Fetch existing warning for key "${key}":`, fetchErr.message);
  }

  if (existing?.id) {
    // Update existing row
    const { error: updateErr } = await supabaseServer
      .from("store_settings")
      .update({
        value,
        updated_at: now
      })
      .eq("id", existing.id);

    if (updateErr) throw updateErr;
  } else {
    // Insert new row
    const { error: insertErr } = await supabaseServer
      .from("store_settings")
      .insert({
        key,
        value,
        updated_at: now
      });

    if (insertErr) {
      // If concurrent insert occurred, try upsert with onConflict key
      const { error: retryErr } = await supabaseServer
        .from("store_settings")
        .upsert(
          { key, value, updated_at: now },
          { onConflict: "key" }
        );
      if (retryErr) throw retryErr;
    }
  }
}

// GET /api/admin/settings
// Returns all store_settings as an object { [key: string]: value } plus product list for selectors
export async function GET(req: Request) {
  try {
    await requireSuperAdmin(req);

    // 1. Fetch all store settings
    const { data: settingsRows, error: settingsError } = await supabaseServer
      .from("store_settings")
      .select("*");

    if (settingsError) {
      console.error("[Settings API GET Error]:", settingsError);
      return NextResponse.json(
        { success: false, message: settingsError.message, settings: {} },
        { status: 500 }
      );
    }

    // Transform array to key-value object
    const settingsMap: Record<string, any> = {};
    (settingsRows || []).forEach((row: any) => {
      settingsMap[row.key] = row.value;
    });

    // 2. Also fetch active products list so admin UI dropdown selectors have live product data
    const { data: products } = await supabaseServer
      .from("products")
      .select("id, name, slug, price, mrp, image_url, is_active, status, stock")
      .order("created_at", { ascending: false })
      .limit(200);

    return NextResponse.json({
      success: true,
      settings: settingsMap,
      products: products || []
    });
  } catch (err: any) {
    if (err.name === "AuthError") return authErrorResponse(err);
    console.error("[Settings API GET Exception]:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to fetch settings", settings: {} },
      { status: 500 }
    );
  }
}

// POST /api/admin/settings
// Accepts single { key, value } or multiple { settings: { key: value, ... } }
export async function POST(req: Request) {
  try {
    await requireSuperAdmin(req);

    const body = await req.json();

    const parseNum = (val: any, fallback = 0) => {
      if (val !== undefined && val !== null && val !== "" && !isNaN(Number(val))) {
        return Number(val);
      }
      return fallback;
    };

    const handleSyncSideEffects = async (key: string, value: any) => {
      if (key === "marketplace_rules" && value) {
        const billingPayload = {
          deliveryFee: parseNum(value.deliveryCharge, 0),
          freeDeliveryThreshold: parseNum(value.freeShippingThreshold, 0),
          packagingFee: parseNum(value.appCharge, 0),
          tax: 0
        };
        await upsertSetting("billing", billingPayload);
      } else if (key === "marketplace_financial_rules" && value) {
        try {
          await supabaseServer
            .from("platform_finance_configs")
            .update({
              commission_percentage: value.commission_percentage,
              fixed_fee_per_order: value.fixed_fee_per_order,
              payment_collection_fee_pct: value.payment_collection_fee_pct,
              cod_handling_fee: value.cod_handling_fee,
              standard_shipping_fee: value.standard_shipping_fee,
              reverse_shipping_fee: value.reverse_shipping_fee,
              rto_charge: value.rto_charge,
              gst_on_platform_fees_pct: value.gst_on_platform_fees_pct,
              settlement_delay_days: value.settlement_delay_days,
              shipping_paid_by: value.shipping_paid_by || (Number(value.standard_shipping_fee) === 0 ? "CUSTOMER" : "SELLER"),
              updated_at: new Date().toISOString()
            })
            .eq("status", "ACTIVE");
        } catch (_) {}
      } else if (key === "special_offers_list" && Array.isArray(value)) {
        const primaryOffer = value.find((o: any) => o.is_active !== false);
        if (primaryOffer) {
          await upsertSetting("special_offers_bogo", {
            mainProductId: primaryOffer.main_product_id,
            offerProductIds: primaryOffer.bonus_product_id ? [primaryOffer.bonus_product_id] : [],
            isActive: true,
            title: primaryOffer.title,
            discountType: primaryOffer.discount_type,
            updatedAt: new Date().toISOString()
          });
        }
      }
    };

    if (body.settings && typeof body.settings === "object") {
      // Batch save
      for (const [key, value] of Object.entries(body.settings)) {
        await upsertSetting(key, value);
        await handleSyncSideEffects(key, value);
      }
      return NextResponse.json({
        success: true,
        message: "All settings saved successfully to production database!"
      });
    }

    if (body.key !== undefined) {
      const { key, value } = body;
      await upsertSetting(key, value);
      await handleSyncSideEffects(key, value);

      return NextResponse.json({
        success: true,
        message: `Setting "${key}" saved successfully to production database!`
      });
    }

    return NextResponse.json(
      { success: false, message: "Missing required 'key' or 'settings' in request body" },
      { status: 400 }
    );
  } catch (err: any) {
    if (err.name === "AuthError") return authErrorResponse(err);
    console.error("[Settings API POST Error]:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to save settings to database" },
      { status: 500 }
    );
  }
}
