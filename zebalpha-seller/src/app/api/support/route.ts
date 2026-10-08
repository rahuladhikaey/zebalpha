import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, createSupabaseServerClient } from "@/shared/utils/supabaseServer";

// Helper to authenticate user from cookies or Authorization Bearer header
async function getAuthenticatedUser(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return user;
  } catch (_) {}

  // Fallback: check Authorization Bearer token
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const { data: tokenUser } = await supabaseServer.auth.getUser(token);
    if (tokenUser?.user) return tokenUser.user;
  }

  return null;
}

// GET /api/support — List seller's support tickets
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please log in to view your tickets." },
        { status: 401 }
      );
    }

    // Resolve seller record
    const { data: seller } = await supabaseServer
      .from("sellers")
      .select("id, user_id, email, business_name")
      .or(`user_id.eq.${user.id},id.eq.${user.id},email.eq.${user.email?.toLowerCase().trim()}`)
      .maybeSingle();

    const sellerIds = Array.from(new Set([user.id, seller?.id].filter(Boolean))) as string[];

    // Fetch tickets via server client (bypasses browser RLS issues securely)
    const { data: tickets, error } = await supabaseServer
      .from("seller_support_tickets")
      .select("*")
      .in("seller_id", sellerIds)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Notice querying seller_support_tickets:", error.message);
      return NextResponse.json({ success: true, tickets: [] });
    }

    return NextResponse.json({
      success: true,
      tickets: tickets || [],
    });
  } catch (error: any) {
    console.error("GET /api/support error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load support tickets." },
      { status: 500 }
    );
  }
}

// POST /api/support — Create a new seller support ticket
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please log in to submit a ticket." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { subject, category = "general", description, priority = "medium" } = body;

    if (!subject || !String(subject).trim()) {
      return NextResponse.json(
        { success: false, message: "Ticket subject is required." },
        { status: 400 }
      );
    }

    if (!description || !String(description).trim()) {
      return NextResponse.json(
        { success: false, message: "Detailed description is required." },
        { status: 400 }
      );
    }

    // Resolve or heal seller record to satisfy foreign key constraints
    let { data: seller } = await supabaseServer
      .from("sellers")
      .select("id, user_id, email")
      .or(`user_id.eq.${user.id},id.eq.${user.id},email.eq.${user.email?.toLowerCase().trim()}`)
      .maybeSingle();

    let resolvedSellerId = seller?.id || user.id;

    if (!seller) {
      // Auto-provision basic seller record so foreign key public.sellers(id) is satisfied
      const generatedCode = `SEL-${Math.floor(100000 + Math.random() * 900000)}`;
      const { data: newSeller } = await supabaseServer
        .from("sellers")
        .insert([{
          id: user.id,
          user_id: user.id,
          email: user.email || "",
          business_name: user.user_metadata?.store_name || user.email?.split("@")[0] || "Seller Store",
          owner_name: user.user_metadata?.full_name || "Merchant",
          seller_id: generatedCode,
          status: "approved",
          account_status: "Active",
          created_at: new Date().toISOString()
        }])
        .select("id")
        .maybeSingle();

      if (newSeller?.id) {
        resolvedSellerId = newSeller.id;
      }
    } else if (!seller.user_id) {
      // Ensure user_id is linked to the seller record
      await supabaseServer
        .from("sellers")
        .update({ user_id: user.id })
        .eq("id", seller.id);
    }

    const validPriorities = ["low", "medium", "high", "urgent"];
    const normalizedPriority = validPriorities.includes(String(priority).toLowerCase())
      ? String(priority).toLowerCase()
      : "medium";

    const ticketPayload = {
      seller_id: resolvedSellerId,
      subject: String(subject).trim().slice(0, 255),
      category: String(category || "general").trim().slice(0, 100),
      description: String(description).trim(),
      priority: normalizedPriority,
      status: "open",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: insertedTicket, error: insertError } = await supabaseServer
      .from("seller_support_tickets")
      .insert([ticketPayload])
      .select("*")
      .single();

    if (insertError) {
      console.error("Error inserting seller support ticket:", insertError);
      return NextResponse.json(
        { success: false, message: insertError.message || "Failed to create support ticket." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Support ticket created successfully.",
      ticket: insertedTicket,
    });
  } catch (error: any) {
    console.error("POST /api/support error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}
