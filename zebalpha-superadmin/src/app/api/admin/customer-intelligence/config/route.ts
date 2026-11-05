import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";
import { requireSuperAdmin, authErrorResponse } from "@/lib/authGuard";

export async function POST(req: Request) {
  try {
    await requireSuperAdmin(req);
    const body = await req.json();

    const {
      new_max_delivered = 1,
      repeat_min_delivered = 2,
      repeat_max_delivered = 4,
      loyal_min_delivered = 5,
      inactivity_timeout_seconds = 120,
    } = body;

    const payload = {
      id: 1,
      new_max_delivered: Math.max(0, Number(new_max_delivered)),
      repeat_min_delivered: Math.max(1, Number(repeat_min_delivered)),
      repeat_max_delivered: Math.max(Number(repeat_min_delivered), Number(repeat_max_delivered)),
      loyal_min_delivered: Math.max(Number(repeat_max_delivered) + 1, Number(loyal_min_delivered)),
      inactivity_timeout_seconds: Math.max(30, Number(inactivity_timeout_seconds)),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseServer
      .from("customer_segment_configs")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, config: data });
  } catch (error: any) {
    if (error.name === "AuthError") return authErrorResponse(error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
