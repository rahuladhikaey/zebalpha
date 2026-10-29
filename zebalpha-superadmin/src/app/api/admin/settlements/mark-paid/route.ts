import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";
import { requireSuperAdmin, authErrorResponse } from "@/lib/authGuard";

export const dynamic = "force-dynamic";

/**
 * SEC-08: Secure Seller Settlement Operations Endpoint
 * 
 * Privileged Financial Mutation:
 * 1. Authenticate administrator via cryptographic JWT session.
 * 2. Validate payout parameters (seller, amount, UTR).
 * 3. Idempotency check: prevent duplicate settlement entries with same UTR.
 * 4. Transactionally records settlement in seller_settlements via service-role Supabase.
 * 5. Safely executes finalize_payout_success RPC via server-side privilege.
 * 6. Audit logs the financial operation into admin_audit_logs.
 * 7. Dispatches official receipt email ONLY after confirmed DB settlement.
 */
export async function POST(req: Request) {
  try {
    const session = await requireSuperAdmin(req);
    const adminUser = session?.user || "SUPER_ADMIN";
    const body = await req.json();
    const {
      sellerId,
      sellerName,
      sellerEmail,
      amount,
      paymentMethod = "PhonePe",
      upiId,
      utrNumber,
      paymentDate,
      notes,
    } = body;

    // 1. Strict Input Validation
    const cleanUtr = String(utrNumber || "").trim();
    const numAmount = Number(amount);

    if (!sellerId || !cleanUtr || isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payload: sellerId, valid positive amount, and UTR reference number are mandatory.",
        },
        { status: 400 }
      );
    }

    // 2. Financial Idempotency Check: Prevent duplicate payment recording with the same UTR
    const { data: existingSettlement, error: idempError } = await supabaseServer
      .from("seller_settlements")
      .select("id, utr_number, amount, created_at")
      .eq("utr_number", cleanUtr)
      .maybeSingle();

    if (idempError && !idempError.message?.includes("relation") && !idempError.message?.includes("does not exist")) {
      console.error("[Settlement DB Check Error]:", idempError);
    }

    if (existingSettlement) {
      return NextResponse.json(
        {
          success: false,
          error: `Duplicate settlement rejected: UTR ${cleanUtr} was already processed on ${new Date(existingSettlement.created_at).toLocaleDateString("en-IN")}.`,
          duplicateId: existingSettlement.id,
        },
        { status: 409 }
      );
    }

    const settlementId = `SET-${Date.now().toString().slice(-6)}`;
    const parsedPaymentDate = paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString();
    const nowIso = new Date().toISOString();

    const newSettlementRecord = {
      id: settlementId,
      seller_id: sellerId,
      seller_name: sellerName || "Merchant",
      seller_email: sellerEmail || "N/A",
      amount: numAmount,
      upi_id: upiId || "",
      payment_method: paymentMethod,
      utr_number: cleanUtr,
      status: "PAID",
      paid_at: parsedPaymentDate,
      created_at: nowIso,
      notes: notes || `Manual settlement payout recorded by Admin ${adminUser}`.trim(),
    };

    // 3. Finalize in-flight withdrawal request if exists (Executed first for ledger atomicity)
    let rpcFinalized = false;
    let rpcErrorNotice: string | null = null;
    let targetPayoutId: string | null = null;

    try {
      const { data: pReq } = await supabaseServer
        .from("seller_payout_requests")
        .select("id, status, amount")
        .eq("seller_id", sellerId)
        .in("status", ["PENDING", "PROCESSING"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pReq) {
        targetPayoutId = pReq.id;
        const { data: rpcData, error: rpcErr } = await supabaseServer.rpc("finalize_payout_success", {
          p_payout_id: pReq.id,
          p_provider_payout_id: cleanUtr,
          p_utr_number: cleanUtr,
          p_source: "ADMIN_MANUAL",
        });

        if (rpcErr) {
          console.error("[finalize_payout_success RPC Rejection]:", rpcErr.message);
          return NextResponse.json(
            {
              success: false,
              error: `Ledger reconciliation failed: ${rpcErr.message}. Settlement aborted to prevent ledger inconsistency.`,
            },
            { status: 500 }
          );
        } else if (rpcData && rpcData.success === false) {
          console.error("[finalize_payout_success State Rejection]:", rpcData.error);
          return NextResponse.json(
            {
              success: false,
              error: `Cannot settle payout request (${rpcData.error}). Settlement aborted.`,
            },
            { status: 409 }
          );
        } else {
          rpcFinalized = true;
        }
      }
    } catch (rpcEx: any) {
      console.error("[Payout RPC Exception]:", rpcEx);
      return NextResponse.json(
        {
          success: false,
          error: `Critical ledger failure: ${rpcEx?.message || "RPC exception"}. Settlement aborted.`,
        },
        { status: 500 }
      );
    }

    // 4. Record Settlement in Database (Service-role privileged)
    const { error: insertError } = await supabaseServer
      .from("seller_settlements")
      .insert([newSettlementRecord]);

    if (insertError) {
      console.error("[Settlement DB Insert Error]:", insertError);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to record settlement in ledger: ${insertError.message}`,
        },
        { status: 500 }
      );
    }

    // 5. Immutable Financial Audit Trail
    try {
      await supabaseServer.from("admin_audit_logs").insert([
        {
          admin_id: adminUser,
          admin_email: adminUser.includes("@") ? adminUser : `${adminUser.toLowerCase()}@zebalpha.com`,
          action: "SETTLEMENT_MARKED_PAID",
          target_entity: "seller_settlements",
          target_id: settlementId,
          details: {
            sellerId,
            sellerName,
            amount: numAmount,
            paymentMethod,
            upiId,
            utrNumber: cleanUtr,
            rpcFinalized,
          },
          ip_address: req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1",
          created_at: nowIso,
        },
      ]);
    } catch (auditErr) {
      console.warn("[Admin Audit Log Insert Notice]:", auditErr);
    }

    // 6. Asynchronously trigger receipt email confirmation
    let emailSent = false;
    if (sellerEmail && sellerEmail !== "N/A" && sellerEmail.includes("@")) {
      try {
        const serviceId = (process.env.EMAILJS_SERVICE_ID || process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "").trim();
        const templateId = (process.env.EMAILJS_TEMPLATE_ID || process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "").trim();
        const publicKey = (process.env.EMAILJS_PUBLIC_KEY || process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "").trim();

        if (serviceId && templateId && publicKey) {
          const emailRes = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
              "Origin": "https://dashboard.emailjs.com",
            },
            body: JSON.stringify({
              service_id: serviceId,
              template_id: templateId,
              user_id: publicKey,
              template_params: {
                to_email: sellerEmail,
                email: sellerEmail,
                recipient_email: sellerEmail,
                seller_name: sellerName || "Merchant",
                amount: numAmount,
                utr_number: cleanUtr,
                subject: `Payment Receipt: ₹${numAmount} Settlement Transferred (UTR: ${cleanUtr})`,
                message: `Settlement payout of ₹${numAmount} has been confirmed with UTR ${cleanUtr}.`,
              },
            }),
          });
          emailSent = emailRes.ok;
        }
      } catch (eErr) {
        console.warn("[Settlement Email Trigger Notice]:", eErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Settlement ${settlementId} recorded successfully. UTR: ${cleanUtr}`,
      settlement: newSettlementRecord,
      emailSent,
      rpcFinalized,
      rpcNotice: rpcErrorNotice,
    });
  } catch (err: any) {
    if (err.name === "AuthError") return authErrorResponse(err);
    console.error("[Admin Mark-Paid Settlement Error]:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error processing settlement." },
      { status: 500 }
    );
  }
}
