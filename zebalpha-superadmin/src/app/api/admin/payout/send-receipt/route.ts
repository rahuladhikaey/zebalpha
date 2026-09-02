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

    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL || "payouts@asaliswad.com";
    const senderName = process.env.BREVO_SENDER_NAME || "Asali Swad Payouts";

    if (!apiKey) {
      console.warn("[Payout Email Warning] BREVO_API_KEY is not set in environment variables.");
      return NextResponse.json({
        success: true,
        emailSent: false,
        message: "Settlement recorded in database. (Email sending skipped: BREVO_API_KEY not configured)."
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
          <p>© Asali Swad Marketplace | Support Email: support@asaliswad.com</p>
        </div>
      </div>
    `;

    const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: toEmail, name: sellerName }],
        subject: `Payment Receipt: ₹${amount} Settlement Transferred (UTR: ${utrNumber})`,
        htmlContent: htmlContent,
      }),
    });

    if (!brevoRes.ok) {
      const errData = await brevoRes.json();
      console.error("[Payout Receipt Brevo Error]:", errData);
      return NextResponse.json({
        success: true,
        emailSent: false,
        message: "Settlement recorded, but receipt email sending failed. Please check Brevo API key configuration."
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
