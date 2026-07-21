import { NextResponse } from "next/server";
import { SignJWT } from "jose";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const key1 = body.username ?? body.key1;
    const key2 = body.password ?? body.key2;

    const ADMIN_ACCESS_KEY_1 = process.env.ADMIN_ACCESS_KEY_1;
    const ADMIN_ACCESS_KEY_2 = process.env.ADMIN_ACCESS_KEY_2;
    const JWT_SECRET = process.env.ADMIN_JWT_SECRET;

    if (!ADMIN_ACCESS_KEY_1 || !ADMIN_ACCESS_KEY_2) {
      console.error("Admin keys are not set in environment variables!");
      return NextResponse.json({ success: false, message: "Server misconfiguration." }, { status: 500 });
    }

    if (!JWT_SECRET) {
      console.error("ADMIN_JWT_SECRET is not set in environment variables!");
      return NextResponse.json({ success: false, message: "Server misconfiguration." }, { status: 500 });
    }

    const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

    if (key1 === ADMIN_ACCESS_KEY_1 && key2 === ADMIN_ACCESS_KEY_2) {
      // Create a secure JWT token
      const token = await new SignJWT({ role: "admin", user: key1 })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(SECRET_KEY);

      const response = NextResponse.json({ success: true, message: "Authorized" });

      // Set HTTP-only secure cookie
      response.cookies.set("admin_session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24, // 24 hours
      });

      return response;
    }

    return NextResponse.json(
      { success: false, message: "Invalid credentials" },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
