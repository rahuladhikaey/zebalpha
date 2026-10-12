/**
 * Razorpay Refund Client (REST API)
 * Direct, zero-dependency REST integration for automated refunds
 */

export async function initiateRazorpayRefund(params: {
  paymentId: string;
  amountInRupees: number;
  idempotencyKey?: string;
  notes?: Record<string, string>;
}): Promise<{
  success: boolean;
  refundId?: string;
  status?: string;
  error?: string;
  data?: any;
}> {
  const { paymentId, amountInRupees, idempotencyKey, notes = {} } = params;

  if (!paymentId) {
    return { success: false, error: "Payment ID (razorpay_payment_id) is required for refund" };
  }

  const keyId = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "").trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();

  if (!keyId || !keySecret) {
    console.warn("[Razorpay Refund Warning]: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET missing in environment");
    return { success: false, error: "Razorpay credentials not configured in environment" };
  }

  const amountInPaise = Math.round(Number(amountInRupees) * 100);
  if (!amountInPaise || amountInPaise <= 0) {
    return { success: false, error: "Invalid refund amount" };
  }

  const safeReceipt = idempotencyKey || `RET-REF-${paymentId.slice(0, 16)}-${Date.now()}`;
  const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;

  try {
    console.log(`[Razorpay Refund] Initiating REST refund of ₹${amountInRupees} (${amountInPaise} paise) for payment ${paymentId}...`);

    const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInPaise,
        speed: "normal",
        receipt: safeReceipt,
        notes: {
          ...notes,
          idempotency_key: safeReceipt,
          system: "ZebAlpha Refund Engine",
          timestamp: new Date().toISOString()
        }
      })
    });

    const data = await response.json();

    if (response.ok && data?.id) {
      console.log(`[Razorpay Refund Success] Refund ID: ${data.id}, Status: ${data.status}`);
      return {
        success: true,
        refundId: data.id,
        status: data.status || "processed",
        data
      };
    }

    const errorDesc = data?.error?.description || data?.message || "Failed to process Razorpay refund";
    console.warn("[Razorpay Refund Notice]:", errorDesc);

    // Idempotent reconciliation: check if already refunded
    if (errorDesc.toLowerCase().includes("already refunded") || errorDesc.toLowerCase().includes("fully refunded")) {
      try {
        const listRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refunds`, {
          method: "GET",
          headers: { "Authorization": authHeader }
        });
        const listData = await listRes.json();
        if (listData?.items && listData.items.length > 0) {
          const existingRefund = listData.items[0];
          console.log(`[Razorpay Refund Reconciled] Found existing refund ${existingRefund.id}`);
          return {
            success: true,
            refundId: existingRefund.id,
            status: existingRefund.status || "processed",
            data: existingRefund
          };
        }
      } catch (_) {}
    }

    return {
      success: false,
      error: errorDesc
    };
  } catch (err: any) {
    console.error("[Razorpay Refund Exception]:", err);
    return {
      success: false,
      error: err.message || "Network error while connecting to Razorpay"
    };
  }
}

export const executeRazorpayRefund = initiateRazorpayRefund;
