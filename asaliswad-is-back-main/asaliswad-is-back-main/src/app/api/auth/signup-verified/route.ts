import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Create user with auto-confirmation
    const { data, error } = await supabaseServer.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true, // Auto-confirm the email
    });

    if (error) {
      // Handle different error types
      const message = error.message.toLowerCase();
      
      if (message.includes("already registered") || message.includes("duplicate")) {
        return NextResponse.json(
          { error: "An account already exists for this email. Please sign in." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: error.message || "Failed to create account" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user?.id,
        email: data.user?.email,
        confirmed_at: data.user?.confirmed_at,
      },
      message: "Account created and verified successfully!",
    });

  } catch (error) {
    console.error("Auth API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
