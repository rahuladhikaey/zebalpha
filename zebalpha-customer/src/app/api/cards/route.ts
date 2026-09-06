import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// GET /api/cards?email=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ success: false, error: "Email parameter is required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await supabaseServer
      .from("card_applications")
      .select("*")
      .or(`user_email.ilike.${cleanEmail},email.ilike.${cleanEmail}`)
      .order("applied_at", { ascending: false });

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
    const { user_id, user_email, email, name, phone, card_type } = body;

    const applicantEmail = (user_email || email || "").trim().toLowerCase();

    if (!applicantEmail) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }
    if (!name || !phone) {
      return NextResponse.json({ success: false, error: "Name and phone are required" }, { status: 400 });
    }

    // Check if an application already exists for this email
    const { data: existing } = await supabaseServer
      .from("card_applications")
      .select("id, status")
      .or(`user_email.ilike.${applicantEmail},email.ilike.${applicantEmail}`)
      .limit(1);

    const payload: any = {
      user_id: user_id || null,
      user_email: applicantEmail,
      email: applicantEmail,
      name: name.trim(),
      phone: phone.trim(),
      card_type: card_type || "Silver",
      status: "PENDING",
      applied_at: new Date().toISOString(),
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
