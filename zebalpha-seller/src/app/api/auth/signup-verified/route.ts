import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/utils/supabaseServer";
import {
  verifySignupProofToken,
  consumeSignupProofToken,
  checkRateLimit,
} from "@/shared/services/securityTokenService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { 
      email, 
      password, 
      fullName, 
      phone,
      shopName,
      upiId,
      pickupAddress,
      city,
      state,
      pincode,
      category,
      signupToken,
    } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";

    // Rate limiting: max 5 registration attempts per 15 minutes per IP
    if (!checkRateLimit(`signup_${clientIp}`, 5, 15 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: "Too many registration attempts. Please try again later." },
        { status: 429 }
      );
    }

    // MANDATORY OTP PROOF VERIFICATION:
    // Reject any registration request lacking a cryptographically signed signup token
    if (!signupToken || typeof signupToken !== "string") {
      return NextResponse.json(
        { success: false, error: "Email verification required: Please verify your email with an OTP first before completing registration." },
        { status: 401 }
      );
    }

    // Verify token cryptographic signature, expiry, purpose, email binding, and single-use status
    const tokenVerification = verifySignupProofToken(normalizedEmail, signupToken);
    if (!tokenVerification.valid) {
      return NextResponse.json(
        { success: false, error: `Invalid or expired email verification token: ${tokenVerification.reason || "Verification failed"}` },
        { status: 403 }
      );
    }

    // Single-use: Consume token immediately to prevent replay
    consumeSignupProofToken(signupToken);

    // 1. STRICT DUPLICATE CHECK: Verify if email already exists in auth.users
    const { data: userList } = await supabaseServer.auth.admin.listUsers();
    const existingAuthUser = userList?.users?.find(
      (u: any) => u.email?.toLowerCase() === normalizedEmail
    );

    if (existingAuthUser) {
      // SECURITY FIX: NEVER overwrite an existing account's credentials!
      return NextResponse.json(
        {
          success: false,
          error: "An account with this email address already exists. Please log in or use the password reset feature.",
        },
        { status: 409 }
      );
    }

    // Also check if public.sellers already has an active account with this email
    const { data: existingSeller } = await supabaseServer
      .from("sellers")
      .select("id, email, user_id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingSeller && existingSeller.user_id) {
      return NextResponse.json(
        {
          success: false,
          error: "A seller store with this email address already exists. Please log in.",
        },
        { status: 409 }
      );
    }

    const sellerName = (fullName || "").trim() || "Seller";
    const sellerPhone = (phone || "").trim();
    const sellerShopName = (shopName || "").trim() || `${sellerName}'s Store`;
    const finalUpi = (upiId || "").trim();

    // 2. Create user in Supabase Auth via Admin API
    const { data: authData, error: createError } = await supabaseServer.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: sellerName,
        role: "seller",
        phone: sellerPhone,
      },
    });

    if (createError || !authData?.user) {
      const errMsg = createError?.message?.toLowerCase() || "";
      if (errMsg.includes("already") || errMsg.includes("registered") || errMsg.includes("exists")) {
        return NextResponse.json(
          { success: false, error: "An account with this email address already exists. Please sign in." },
          { status: 409 }
        );
      }
      console.error("[Seller Signup] Error creating user:", createError);
      return NextResponse.json(
        { success: false, error: createError?.message || "Registration failed. Please try again." },
        { status: 400 }
      );
    }

    const newUser = authData.user;

    // 3. Create or update profile record in public.profiles table
    try {
      await supabaseServer.from("profiles").upsert({
        id: newUser.id,
        email: normalizedEmail,
        full_name: sellerName,
        role: "seller",
        status: "active",
        updated_at: new Date().toISOString(),
      });
    } catch (profErr) {
      console.warn("Profiles upsert notice:", profErr);
    }

    // 4. Create public.sellers record linked to the verified user.id
    try {
      const generatedCode = `SEL-${Math.floor(100000 + Math.random() * 900000)}`;
      await supabaseServer
        .from("sellers")
        .insert([{
          id: newUser.id,
          user_id: newUser.id,
          seller_id: generatedCode,
          full_name: sellerName,
          owner_name: sellerName,
          business_name: sellerShopName,
          mobile_number: sellerPhone,
          phone_number: sellerPhone,
          email: normalizedEmail,
          phonepay_no: finalUpi,
          phonepay_number: finalUpi,
          pickup_address: pickupAddress || "",
          warehouse_address: pickupAddress || "",
          pickup_location: city || "Warehouse",
          city: city || "",
          state: state || "",
          pincode: pincode || "",
          category: category || "Clothing & Apparel",
          business_category: category || "Clothing & Apparel",
          status: "pending", // New sellers start in pending approval status
          account_status: "Active",
          email_verified: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);
    } catch (selErr) {
      console.warn("Sellers insert notice:", selErr);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: "seller",
        confirmed_at: newUser.confirmed_at || new Date().toISOString(),
      },
      message: "Seller account successfully created!",
    }, { status: 201 });

  } catch (error: any) {
    console.error("Seller Auth Signup API Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Registration failed. Please try again." },
      { status: 400 }
    );
  }
}
