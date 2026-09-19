import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
      category
    } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user: any = null;

    // 1. Check if seller exists in public.sellers database table
    const { data: existingSeller } = await supabaseServer
      .from("sellers")
      .select("*")
      .eq("email", normalizedEmail)
      .maybeSingle();

    const sellerName = fullName || existingSeller?.full_name || existingSeller?.owner_name || "Seller";
    const sellerPhone = phone || existingSeller?.mobile_number || existingSeller?.phone_number || "";
    const sellerShopName = shopName || existingSeller?.business_name || `${sellerName}'s Store`;
    const finalUpi = (upiId || "").trim() || (existingSeller?.phonepay_no || existingSeller?.phonepay_number || (sellerPhone ? `${sellerPhone}@phonepe` : ""));

    // 2. Attempt admin creation first
    try {
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

      if (!createError && authData?.user) {
        user = authData.user;
      }
    } catch (adminErr) {
      console.warn("Admin create user notice:", adminErr);
    }

    // 3. Fallback: Standard supabase.auth.signUp
    if (!user) {
      const { data: signUpData, error: signUpError } = await supabaseServer.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: sellerName,
            role: "seller",
            phone: sellerPhone,
          },
        },
      });

      const hasExistError = signUpError?.message?.toLowerCase().includes("already") || signUpError?.status === 422;
      const hasEmptyIdentities = signUpData?.user && (!signUpData.user.identities || signUpData.user.identities.length === 0);

      if (signUpData?.user && !hasEmptyIdentities && !signUpError) {
        user = signUpData.user;
      } else if (signUpError || hasEmptyIdentities) {
        // If user already exists in auth.users, update password and metadata
        try {
          const { data: userList } = await supabaseServer.auth.admin.listUsers();
          const existingAuthUser = userList?.users?.find(
            (u) => u.email?.toLowerCase() === normalizedEmail
          );
          if (existingAuthUser) {
            const { data: updateRes, error: updateErr } = await supabaseServer.auth.admin.updateUserById(
              existingAuthUser.id,
              {
                password,
                email_confirm: true,
                user_metadata: {
                  ...(existingAuthUser.user_metadata || {}),
                  full_name: sellerName,
                  role: "seller",
                  phone: sellerPhone,
                },
              }
            );
            if (!updateErr && updateRes?.user) {
              user = updateRes.user;
            } else {
              user = existingAuthUser;
            }
          }
        } catch (listErr) {
          console.warn("Admin list/update seller notice:", listErr);
        }
      }
    }

    if (!user || !user.id) {
      return NextResponse.json(
        { success: false, error: "Unable to establish seller account in Supabase Authentication." },
        { status: 400 }
      );
    }

    // Auto-confirm seller email directly so no confirmation email link is ever required
    try {
      await supabaseServer.rpc("confirm_user_email", { target_email: normalizedEmail });
    } catch (rpcErr) {
      console.warn("Auto-confirm notice:", rpcErr);
    }

    // 4. Update role in public.profiles table
    try {
      await supabaseServer.from("profiles").upsert({
        id: user.id,
        email: normalizedEmail,
        full_name: sellerName,
        role: "seller",
        status: "active",
        updated_at: new Date().toISOString(),
      });
    } catch (profErr) {
      console.warn("Profiles upsert notice:", profErr);
    }

    // 5. Link user_id in public.sellers database table with complete data
    try {
      if (existingSeller) {
        const updateData: any = {
          user_id: user.id,
          business_name: sellerShopName,
          status: existingSeller.status || "approved",
          account_status: existingSeller.account_status || "Active",
          email_verified: true,
          updated_at: new Date().toISOString(),
        };
        if (finalUpi) {
          updateData.phonepay_no = finalUpi;
          updateData.phonepay_number = finalUpi;
        }
        if (pickupAddress) {
          updateData.pickup_address = pickupAddress;
          updateData.warehouse_address = pickupAddress;
        }
        if (city) updateData.city = city;
        if (state) updateData.state = state;
        if (pincode) updateData.pincode = pincode;
        if (category) {
          updateData.category = category;
          updateData.business_category = category;
        } else if (!existingSeller.category || existingSeller.category.toLowerCase().includes("grocery")) {
          updateData.category = "Clothing & Apparel";
          updateData.business_category = "Clothing & Apparel";
        }

        await supabaseServer
          .from("sellers")
          .update(updateData)
          .eq("email", normalizedEmail);
      } else {
        const generatedCode = `SEL-${Math.floor(100000 + Math.random() * 900000)}`;
        await supabaseServer
          .from("sellers")
          .insert([{
            id: user.id,
            user_id: user.id,
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
            city: city || "Kolkata",
            state: state || "West Bengal",
            pincode: pincode || "700001",
            category: category || "Clothing & Apparel",
            business_category: category || "Clothing & Apparel",
            status: "approved",
            account_status: "Active",
            email_verified: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
      }
    } catch (selErr) {
      console.warn("Sellers update user_id notice:", selErr);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: "seller",
        confirmed_at: user.confirmed_at || new Date().toISOString(),
      },
      message: "Seller account successfully registered and linked in Supabase Authentication!",
    });

  } catch (error: any) {
    console.error("Seller Auth Signup API Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Registration failed. Please try again." },
      { status: 400 }
    );
  }
}
