import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    let user: any = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const { data: userData, error: authError } = await supabaseServer.auth.getUser(token);
      if (!authError && userData?.user) {
        user = userData.user;
      }
    }

    const body = await request.json().catch(() => ({}));
    const sellerEmail = body.email ? String(body.email).toLowerCase().trim() : user?.email?.toLowerCase().trim();

    if (!sellerEmail) {
      return NextResponse.json(
        { success: false, error: "Seller authentication or email is required to delete account." },
        { status: 400 }
      );
    }

    // 1. Fetch seller record to verify existence
    const { data: seller, error: sellerError } = await supabaseServer
      .from("sellers")
      .select("id, auth_id, email")
      .eq("email", sellerEmail)
      .maybeSingle();

    if (!seller && !user) {
      return NextResponse.json(
        { success: false, error: "Seller account not found." },
        { status: 404 }
      );
    }

    const sellerId = seller?.id;
    const authId = seller?.auth_id || user?.id;

    // 2. Database hard delete will trigger fn_handle_seller_hard_delete() trigger automatically!
    if (sellerId) {
      await supabaseServer.from("sellers").delete().eq("id", sellerId);
    }

    // 3. Delete from auth.users via admin API to revoke all tokens & logins
    if (authId) {
      try {
        await supabaseServer.auth.admin.deleteUser(authId);
      } catch (adminErr: any) {
        console.warn("Notice deleting auth.user during seller purge:", adminErr?.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Seller account and all listed products have been permanently deleted.",
    });
  } catch (err: any) {
    console.error("Seller account deletion error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete seller account" },
      { status: 500 }
    );
  }
}
