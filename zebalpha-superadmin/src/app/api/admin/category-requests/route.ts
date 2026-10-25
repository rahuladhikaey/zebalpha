import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";
import { resolveCategoryIcon } from "@/lib/categoryIcons";

export const dynamic = "force-dynamic";

// GET /api/admin/category-requests (Fetch all seller subcategory proposals)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let query = supabaseServer
      .from("category_requests")
      .select("*, parent_category:parent_category_id(id, name, slug)")
      .order("created_at", { ascending: false });

    if (status && ["PENDING", "APPROVED", "REJECTED", "CANCELLED"].includes(status.toUpperCase())) {
      query = query.eq("status", status.toUpperCase());
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error("[Admin Category Requests GET Error]:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}

// POST /api/admin/category-requests (Approve or Reject request)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, action, rejection_reason } = body;

    if (!id || !action || !["APPROVE", "REJECT"].includes(action.toUpperCase())) {
      return NextResponse.json({ success: false, message: "Missing id or valid action (APPROVE/REJECT)" }, { status: 400 });
    }

    // Fetch the request
    const { data: request, error: reqErr } = await supabaseServer
      .from("category_requests")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (reqErr || !request) {
      return NextResponse.json({ success: false, message: "Category request not found" }, { status: 404 });
    }

    if (action.toUpperCase() === "APPROVE") {
      if (request.status === "APPROVED") {
        return NextResponse.json({ success: true, message: "Request is already approved" });
      }

      // 1. Auto-assign icon for the approved subcategory
      const iconRes = resolveCategoryIcon(request.proposed_name);

      // 2. Insert into categories table as a child subcategory
      const subcatPayload = {
        name: request.proposed_name,
        slug: request.proposed_slug,
        description: request.description || null,
        parent_id: request.parent_category_id,
        icon_key: iconRes.icon_key,
        icon_source: iconRes.icon_source,
        display_order: 10,
        show_in_navigation: true,
        is_active: true,
        created_by: request.seller_id,
      };

      const { data: newCat, error: insertErr } = await supabaseServer
        .from("categories")
        .insert([subcatPayload])
        .select();

      if (insertErr) throw insertErr;

      const createdId = newCat?.[0]?.id;

      // 3. Mark request APPROVED
      const { error: updateErr } = await supabaseServer
        .from("category_requests")
        .update({
          status: "APPROVED",
          reviewed_at: new Date().toISOString(),
          approved_category_id: createdId,
        })
        .eq("id", id);

      if (updateErr) throw updateErr;

      return NextResponse.json({
        success: true,
        message: `Subcategory "${request.proposed_name}" approved and published across marketplace.`,
        category: newCat?.[0],
      });
    }

    // REJECT action
    const { error: rejectErr } = await supabaseServer
      .from("category_requests")
      .update({
        status: "REJECTED",
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejection_reason?.trim() || "Declined by Administrator.",
      })
      .eq("id", id);

    if (rejectErr) throw rejectErr;

    return NextResponse.json({
      success: true,
      message: `Subcategory proposal "${request.proposed_name}" rejected.`,
    });
  } catch (error: any) {
    console.error("[Admin Category Requests POST Error]:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
