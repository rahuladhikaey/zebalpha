import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";
import { requireSuperAdmin, authErrorResponse } from "@/lib/authGuard";

export async function POST(req: Request) {
  try {
    // 1. Cryptographically verify admin session & Super Admin privileges
    await requireSuperAdmin(req);

    const { userId, role } = await req.json();

    if (!userId || !role) {
      return NextResponse.json({ success: false, message: "Missing userId or role" }, { status: 400 });
    }

    // 2. Update user metadata in auth.users using service role admin client
    const { error: authError } = await supabaseServer.auth.admin.updateUserById(
      userId,
      { user_metadata: { role } }
    );

    if (authError) {
      console.error("Error updating auth metadata:", authError);
      return NextResponse.json({ success: false, message: authError.message }, { status: 500 });
    }

    // 3. Update profiles table
    const { error: profileError } = await supabaseServer
      .from("profiles")
      .update({ role })
      .eq("id", userId);

    if (profileError) {
      console.error("Error updating profiles table:", profileError);
      return NextResponse.json({ success: false, message: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `User role updated to ${role}` });
  } catch (error: any) {
    if (error.name === "AuthError") return authErrorResponse(error);
    console.error("Role update api error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
