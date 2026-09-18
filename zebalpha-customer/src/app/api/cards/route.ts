import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// GET /api/cards?email=...&userId=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const userId = searchParams.get("userId");

    if (!email && !userId) {
      return NextResponse.json({ success: false, error: "Email or userId parameter is required" }, { status: 400 });
    }

    const cleanEmail = (email || "").trim().toLowerCase();

    let query = supabaseServer.from("card_applications").select("*");

    if (userId && cleanEmail) {
      query = query.or(`user_id.eq.${userId},user_email.ilike.${cleanEmail},email.ilike.${cleanEmail}`);
    } else if (cleanEmail) {
      query = query.or(`user_email.ilike.${cleanEmail},email.ilike.${cleanEmail}`);
    } else if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query.order("applied_at", { ascending: false });

    if (error) {
      console.error("Fetch cards API error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, applications: data || [] });
  } catch (err: any) {
    console.error("Cards GET API exception:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}

// POST /api/cards
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, user_email, email, name, phone, card_type, auto_approve = true } = body;

    const applicantEmail = (user_email || email || "").trim().toLowerCase();

    if (!applicantEmail) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }
    if (!name || !phone) {
      return NextResponse.json({ success: false, error: "Name and phone are required" }, { status: 400 });
    }

    // Check if an application already exists for this email or user_id
    let findQuery = supabaseServer.from("card_applications").select("*");
    if (user_id && applicantEmail) {
      findQuery = findQuery.or(`user_id.eq.${user_id},user_email.ilike.${applicantEmail},email.ilike.${applicantEmail}`);
    } else {
      findQuery = findQuery.or(`user_email.ilike.${applicantEmail},email.ilike.${applicantEmail}`);
    }

    const { data: existing } = await findQuery.limit(1);

    const expiresAtDate = new Date(Date.now() + 27 * 24 * 60 * 60 * 1000).toISOString();
    const cardNumber = existing?.[0]?.card_number || `ALP-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const payload: any = {
      user_id: user_id || existing?.[0]?.user_id || null,
      user_email: applicantEmail,
      email: applicantEmail,
      name: name.trim(),
      phone: phone.trim(),
      card_type: card_type || existing?.[0]?.card_type || "Silver",
      status: existing?.[0]?.status === "REJECTED" ? "APPROVED" : (existing?.[0]?.status || (auto_approve ? "APPROVED" : "PENDING")),
      card_number: cardNumber,
      coins: existing?.[0]?.coins || 250,
      expires_at: existing?.[0]?.expires_at || expiresAtDate,
      applied_at: existing?.[0]?.applied_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let result;
    if (existing && existing.length > 0) {
      // Update existing record
      const { data, error } = await supabaseServer
        .from("card_applications")
        .update(payload)
        .eq("id", existing[0].id)
        .select();

      if (error) {
        console.error("Update existing card application error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      result = data;
    } else {
      // Insert new record
      const { data, error } = await supabaseServer
        .from("card_applications")
        .insert(payload)
        .select();

      if (error) {
        console.error("Insert card application error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      result = data;
    }

    return NextResponse.json({ success: true, application: result?.[0] || payload });
  } catch (err: any) {
    console.error("Cards POST API exception:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}
