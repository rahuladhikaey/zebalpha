import { BrevoClient }  from "@getbrevo/brevo";

const brevoApiKey = process.env.BREVO_API_KEY as string;
const email  = process.env.EMAIL as string;
const otpExpiry = process.env.OTP_EXPIRATION_TIME as string;
const currentYear = new Date().getFullYear();

if (!brevoApiKey) throw new Error("BREVO_API_KEY is not defined");
if (!email)  throw new Error("BREVO_API_KEY is not defined");

export const brevo = new BrevoClient({
    apiKey: brevoApiKey
});

export const otpEmail = email;
export const otpExpiryTime = Number(otpExpiry);
export const year = currentYear;
