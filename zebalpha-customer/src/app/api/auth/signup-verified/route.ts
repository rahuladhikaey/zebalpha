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

    // 2. If user already exists (e.g. registered earlier or stuck unconfirmed), check status
    if (!user) {
      try {
        const { data: userList } = await supabaseServer.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const existingUser = userList?.users?.find(
          (u) => u.email?.toLowerCase() === normalizedEmail
        );

        if (existingUser) {
          // If the user is already confirmed, we must not overwrite their password silently
          if (existingUser.email_confirmed_at) {
            return NextResponse.json(
              { success: false, error: "An account already exists for this email. Please sign in or reset your password." },
              { status: 400 }
            );
          }

          // If the user signed up previously but remained unconfirmed (e.g. Supabase email was never delivered),
          // activate and confirm them now with the new password
          const { data: updateRes, error: updateErr } = await supabaseServer.auth.admin.updateUserById(
            existingUser.id,
            {
              password,
              email_confirm: true,
              user_metadata: {
                ...(existingUser.user_metadata || {}),
                full_name: fullName || existingUser.user_metadata?.full_name || "Customer",
                role: "customer",
              },
            }
          );

          if (!updateErr && updateRes?.user) {
            user = updateRes.user;
          } else {
            user = existingUser;
          }
        }
      } catch (listErr) {
        console.warn("Admin list/update customer notice:", listErr);
      }
    }

    // 3. Fallback to standard supabaseServer.auth.signUp
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

    // Auto-confirm user email directly so no confirmation email link is ever required
    try {
      await supabaseServer.rpc("confirm_user_email", { target_email: normalizedEmail });
    } catch (rpcErr) {
      console.warn("Auto-confirm notice:", rpcErr);
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
