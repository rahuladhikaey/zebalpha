import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, createSupabaseServerClient } from "@shared/utils/supabaseServer";

export async function POST(request: NextRequest) {
  try {
    // 1. STRICT AUTHENTICATION: Derive identity from verified server session
    const supabase = await createSupabaseServerClient();
    let { data: { user } } = await supabase.auth.getUser();

    // Support Bearer token fallback for API clients
    if (!user) {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const { data: userData, error: authError } = await supabaseServer.auth.getUser(token);
        if (!authError && userData?.user) {
          user = userData.user;
        }
      }
    }

    // Reject unauthenticated requests immediately
    if (!user || !user.id || !user.email) {
      return NextResponse.json(
        { success: false, error: "Authentication required to perform account deletion." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { password, confirmDeletion } = body;

    if (!confirmDeletion) {
      return NextResponse.json(
        { success: false, error: "Explicit confirmation ('confirmDeletion: true') is required to delete account." },
        { status: 400 }
      );
    }

    const sellerEmail = user.email.toLowerCase().trim();

    // 2. RE-AUTHENTICATION CHECK: If password is provided, verify it before destructive action
    if (password) {
      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email: sellerEmail,
        password,
      });

      if (verifyErr) {
        return NextResponse.json(
          { success: false, error: "Password verification failed. Account deletion rejected." },
          { status: 403 }
        );
      }
    }

    // 3. Locate seller account belonging STRICTLY to authenticated user.
    // NEVER accept body.email or body.user_id as proof of ownership!
    const { data: seller, error: sellerError } = await supabaseServer
      .from("sellers")
      .select("id, user_id, email, status, account_status")
      .or(`user_id.eq.${user.id},email.eq.${sellerEmail}`)
      .maybeSingle();

    if (!seller) {
      return NextResponse.json(
        { success: false, error: "No seller profile associated with this authenticated account." },
        { status: 404 }
      );
    }

    const sellerId = seller.id;

    // 4. FINANCIAL & LEGAL RETENTION CHECK:
    // Check if seller has pending or unfulfilled customer orders
    const { data: activeOrders } = await supabaseServer
      .from("orders")
      .select("id, status")
      .eq("seller_id", sellerId)
      .in("status", ["pending", "confirmed", "processing", "shipped"])
      .limit(5);

    if (activeOrders && activeOrders.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete account: You have active or unfulfilled orders. Please complete or resolve all outstanding customer orders first.",
        },
        { status: 409 }
      );
    }

    // 5. TRANSACTIONAL DEACTIVATION & PURGE:
    // Unpublish all catalog products so customers cannot purchase from a deleted store
    await supabaseServer
      .from("products")
      .update({ status: "archived", is_active: false })
      .eq("seller_id", sellerId);

    // Soft-deactivate seller record to preserve order/financial audit history
    await supabaseServer
      .from("sellers")
      .update({
        status: "deactivated",
        account_status: "Deactivated",
        is_suspended: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sellerId);

    // Invalidate all active sessions across devices
    try {
      await supabaseServer.auth.admin.signOut(user.id, "global");
    } catch (signOutErr) {
      console.warn("Global sign-out notice:", signOutErr);
    }

    // Ban/disable login in auth.users
    try {
      await supabaseServer.auth.admin.updateUserById(user.id, {
        ban_duration: "876000h", // Disable login permanently
        user_metadata: { ...(user.user_metadata || {}), account_status: "deleted" },
      });
    } catch (banErr) {
      console.warn("User ban notice:", banErr);
    }

    return NextResponse.json({
      success: true,
      message: "Seller store and account have been successfully deactivated and closed.",
    });

  } catch (err: any) {
    console.error("Seller account deletion error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete seller account" },
      { status: 500 }
    );
  }
}
