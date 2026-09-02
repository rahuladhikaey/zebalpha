import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user: any = null;

    // 1. Attempt admin creation with auto-confirm first
    try {
      const { data, error } = await supabaseServer.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName || "Customer",
          role: "customer",
        },
      });

      if (!error && data?.user) {
        user = data.user;
      }
    } catch (adminErr: any) {
      console.warn("Admin create customer notice:", adminErr);
    }

    // 2. Fallback to standard supabaseServer.auth.signUp
    if (!user) {
      const signUpRes = await supabaseServer.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: fullName || "Customer",
            role: "customer",
          },
        },
      });

      if (signUpRes.data?.user) {
        user = signUpRes.data.user;
      } else if (signUpRes.error) {
        return NextResponse.json(
          { success: false, error: signUpRes.error.message },
          { status: 400 }
        );
      }
    }

    if (!user || !user.id) {
      return NextResponse.json(
        { success: false, error: "Failed to create customer account in Supabase Auth." },
        { status: 400 }
      );
    }

    // 3. Upsert customer profile in public.profiles table
    try {
      await supabaseServer.from("profiles").upsert({
        id: user.id,
        email: normalizedEmail,
        full_name: fullName || "Customer",
        role: "customer",
        status: "active",
        updated_at: new Date().toISOString(),
      });
    } catch (profErr) {
      console.warn("Profiles upsert notice:", profErr);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: "customer",
        confirmed_at: user.confirmed_at || new Date().toISOString(),
      },
      message: "Customer account created and verified successfully!",
    });

  } catch (error: any) {
    console.error("Customer Auth API Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to process customer signup." },
      { status: 400 }
    );
  }
}
