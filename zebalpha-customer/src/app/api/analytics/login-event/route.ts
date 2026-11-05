import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";

function maskEmail(email?: string): string {
  if (!email || !email.includes("@")) return "anonymous";
  const [user, domain] = email.split("@");
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user.slice(0, 2)}***${user.slice(-1)}@${domain}`;
}

function maskPhone(phone?: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.length < 6) return "******";
  return cleaned.slice(0, 3) + "******" + cleaned.slice(-3);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, email, phone, loginMethod = "email_password", platform = "website", status = "SUCCESS" } = body;

    const maskedEmail = email ? maskEmail(email) : null;
    const maskedPhone = phone ? maskPhone(phone) : null;

    const logEntry = {
      ...(userId ? { user_id: userId } : {}),
      email_masked: maskedEmail,
      phone_masked: maskedPhone,
      login_method: loginMethod,
      platform: platform === "android" ? "android" : "website",
      status: status === "FAILED" ? "FAILED" : "SUCCESS",
      user_agent: req.headers.get("user-agent") || null,
      ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    };

    const { error } = await supabaseServer.from("customer_login_logs").insert(logEntry);

    if (error) {
      return NextResponse.json({ success: true, warning: error.message }, { status: 200 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || "Internal error" }, { status: 500 });
  }
}

