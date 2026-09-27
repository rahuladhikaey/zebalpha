import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { toEmail, sellerName, amount, paymentMethod, upiId, utrNumber, paymentDate, notes } = body;

    if (!toEmail || !utrNumber) {
      return NextResponse.json(
        { success: false, error: "Seller account email and UTR number are required." },
        { status: 400 }
      );
    }

    const serviceId = (process.env.EMAILJS_SERVICE_ID || process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "service_5apvm6b").trim();
    const templateId = (process.env.EMAILJS_TEMPLATE_ID || process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "template_hhuloji").trim();
    const publicKey = (process.env.EMAILJS_PUBLIC_KEY || process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "ZR5LIJWz_4EsCSc_a").trim();

    if (!serviceId || !templateId || !publicKey) {
      console.warn("[Payout Email Warning] EMAILJS credentials are not set in environment variables.");
      return NextResponse.json({
        success: true,
        emailSent: false,
        message: "Settlement recorded in database. (Email sending skipped: EmailJS not configured)."
      });
    }

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #059669; font-size: 26px; font-weight: 800; margin: 0;">Asali Swad Marketplace</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Official Merchant Payout Transaction Receipt</p>
        </div>
        <div style="background-color: #ffffff; padding: 28px; border-radius: 16px; border: 1px solid #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="display: inline-block; background-color: #dcfce7; color: #166534; font-size: 12px; font-weight: 800; padding: 6px 16px; border-radius: 20px; text-transform: uppercase;">
              ✔ PhonePe / UPI Transfer Complete
            </span>
            <h2 style="font-size: 34px; font-weight: 900; color: #0f172a; margin: 12px 0 4px 0;">
              ₹${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </h2>
            <p style="color: #64748b; font-size: 13px; margin: 0;">Paid to <strong>${sellerName}</strong></p>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 12px 0; color: #64748b; font-weight: 600;">Transaction UTR / Ref Number:</td>
              <td style="padding: 12px 0; color: #0f172a; font-weight: 800; font-family: monospace; text-align: right; font-size: 15px;">${utrNumber}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 12px 0; color: #64748b; font-weight: 600;">Transfer Method:</td>
              <td style="padding: 12px 0; color: #0f172a; font-weight: 800; text-align: right;">${paymentMethod || "PhonePe"}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 12px 0; color: #64748b; font-weight: 600;">Target PhonePe / VPA:</td>
              <td style="padding: 12px 0; color: #059669; font-weight: 800; font-family: monospace; text-align: right;">${upiId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 12px 0; color: #64748b; font-weight: 600;">Account Opening Email:</td>
              <td style="padding: 12px 0; color: #0f172a; font-weight: 800; text-align: right;">${toEmail}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 12px 0; color: #64748b; font-weight: 600;">Payment Date:</td>
              <td style="padding: 12px 0; color: #0f172a; font-weight: 800; text-align: right;">${paymentDate}</td>
            </tr>
          </table>

          <div style="margin-top: 24px; padding: 16px; background-color: #f1f5f9; border-radius: 12px; font-size: 12px; color: #475569;">
            <strong>Settlement Note:</strong> ${notes || 'This settlement transfer was completed manually by Asali Swad Administration using PhonePe / UPI app.'}
          </div>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #94a3b8;">
          <p>This payment confirmation receipt has been delivered to your account email (${toEmail}).</p>
          <p>© ZEB-ALPHA Marketplace | Support Email: support@zebalpha.com</p>
        </div>
      </div>
    `;

    const timeStr = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });

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
          to_email: toEmail,
          email: toEmail,
          recipient_email: toEmail,
          seller_name: sellerName,
          amount: amount,
          utr_number: utrNumber,
          subject: `Payment Receipt: ₹${amount} Settlement Transferred (UTR: ${utrNumber})`,
          message: htmlContent,
          message_html: htmlContent,
          time: `${timeStr} IST`,
        },
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("[Payout Receipt EmailJS Error]:", emailRes.status, errText);
      return NextResponse.json({
        success: true,
        emailSent: false,
        message: "Settlement recorded, but receipt email sending failed. Please check EmailJS configuration."
      });
    }

    return NextResponse.json({
      success: true,
      emailSent: true,
      message: `🎉 Settlement transfer recorded & transaction receipt email sent to ${toEmail}!`
    });

  } catch (err: any) {
    console.error("Payout send-receipt error:", err);
    return NextResponse.json({
      success: false,
      error: err?.message || "Failed to process receipt email."
    }, { status: 400 });
  }
}
