import crypto from "crypto";

export const otpExpirationTime = Number(process.env.OTP_EXPIRATION_TIME) || 5;
if(!otpExpirationTime) throw new Error("OTP_EXPIRATION_TIME is not set");

export const generateOtp = (length?: number): string => {
    length = length || 6;
    const digits = "0123456789";
    let OTP = "";
    for (let i = 0; i < length; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
    }
    return OTP;
};

export const hashOtp = (otp: string): string => {
    const hash = crypto.createHash("sha512");
    hash.update(otp);
    return hash.digest("hex");
};

export const setOtpExpiry = (minutes?: number): Date => {
    return new Date(Date.now() + (minutes ?? otpExpirationTime) * 60 * 1000);
};

export const verifyOTP = (otp: string, otpHash: string) => {
    const newHash = hashOtp(otp);
    return newHash === otpHash;
};

export const isOtpExpired = (expiresAt: Date) => {
    return new Date() > expiresAt;
};
