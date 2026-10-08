import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";

// GET /api/admin/support — Fetch all seller support tickets with seller metadata
export async function GET(req: NextRequest) {
  try {
    const adminSession = req.headers.get("cookie")?.includes("admin_session");
    if (!adminSession) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch all tickets
    const { data: tickets, error: ticketError } = await supabaseServer
      .from("seller_support_tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (ticketError) {
      console.warn("Notice fetching seller_support_tickets in admin:", ticketError.message);
      return NextResponse.json({ success: true, tickets: [], stats: { total: 0, open: 0, in_progress: 0, resolved: 0 } });
    }

    // 2. Fetch all sellers to enrich tickets with merchant profile
    const { data: sellers } = await supabaseServer
      .from("sellers")
      .select("id, user_id, seller_id, business_name, owner_name, email, mobile_number, phone_number, city, state");

    const sellerMap = new Map<string, any>();
    if (sellers) {
      sellers.forEach((s) => {
        if (s.id) sellerMap.set(String(s.id), s);
        if (s.user_id) sellerMap.set(String(s.user_id), s);
      });
    }

    const enrichedTickets = (tickets || []).map((t) => {
      const seller = sellerMap.get(String(t.seller_id)) || null;
      return {
        ...t,
        seller: seller
          ? {
              id: seller.id,
              seller_code: seller.seller_id || "N/A",
              business_name: seller.business_name || "Unknown Store",
              owner_name: seller.owner_name || "Merchant",
              email: seller.email || "No email",
              phone: seller.mobile_number || seller.phone_number || "No phone",
              city: seller.city || "",
              state: seller.state || "",
            }
          : {
              id: t.seller_id,
              seller_code: "N/A",
              business_name: "Seller ID: " + String(t.seller_id).slice(0, 8),
              owner_name: "Merchant",
              email: "N/A",
              phone: "N/A",
              city: "",
              state: "",
            },
      };
    });

    const stats = {
      total: enrichedTickets.length,
      open: enrichedTickets.filter((t) => t.status?.toLowerCase() === "open").length,
      in_progress: enrichedTickets.filter((t) => t.status?.toLowerCase() === "in_progress").length,
      resolved: enrichedTickets.filter((t) => t.status?.toLowerCase() === "resolved").length,
      closed: enrichedTickets.filter((t) => t.status?.toLowerCase() === "closed").length,
      urgent: enrichedTickets.filter((t) => t.priority?.toLowerCase() === "urgent").length,
    };

    return NextResponse.json({
      success: true,
      tickets: enrichedTickets,
      stats,
    });
  } catch (error: any) {
    console.error("GET /api/admin/support error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load support tickets." },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/support — Update ticket status or add administrator reply
export async function PATCH(req: NextRequest) {
  try {
    const adminSession = req.headers.get("cookie")?.includes("admin_session");
    if (!adminSession) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { ticketId, status, response } = body;

    if (!ticketId) {
      return NextResponse.json(
        { success: false, message: "Ticket ID is required." },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (status !== undefined) {
      const validStatuses = ["open", "in_progress", "resolved", "closed"];
      const norm = String(status).toLowerCase();
      updatePayload.status = validStatuses.includes(norm) ? norm : "open";
    }

    if (response !== undefined) {
      updatePayload.response = String(response).trim();
    }

    const { data: updated, error } = await supabaseServer
      .from("seller_support_tickets")
      .update(updatePayload)
      .eq("id", ticketId)
      .select("*")
      .single();

    if (error) {
      console.error("Error updating support ticket:", error);
      return NextResponse.json(
        { success: false, message: error.message || "Failed to update ticket." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Ticket updated successfully.",
      ticket: updated,
    });
  } catch (error: any) {
    console.error("PATCH /api/admin/support error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/support — Delete ticket
export async function DELETE(req: NextRequest) {
  try {
    const adminSession = req.headers.get("cookie")?.includes("admin_session");
    if (!adminSession) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get("id");

    if (!ticketId) {
      return NextResponse.json({ success: false, message: "Missing ticket id" }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from("seller_support_tickets")
      .delete()
      .eq("id", ticketId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Ticket deleted successfully." });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Delete failed" },
      { status: 500 }
    );
  }
}
