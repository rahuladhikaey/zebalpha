import { z } from "zod";
import { Types } from "mongoose";

export const otpSessionLogActionEnum = z.enum([
	"created",
	"resent",
	"email_changed",
	"verified",
	"failed_attempt",
	"expired",
	"revoked",
	"max_attempts_reached", 
	"max_resend_reached", 
	"max_email_change_reached"
]);
export const OtpPurposeEnum = z.enum([
	"email_verification", 
	"password_reset", 
	"email_change", 
	"login"
]);
export const OtpStatusEnum = z.enum([
	"pending", 
	"used", 
	"expired",
	"locked"
]);

export const userDeviceMetaSchema = z.object({
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
});

export const refreshTokenPayloadSchema = z.object({
    adminId: z.string().trim(),
	tokenId: z.string().trim(),
});

export const accessTokenPayloadSchema = z.object({
    adminId: z.string().trim(),
    email: z.email().toLowerCase().trim(),
});

export const createRefreshTokenSessionSchema = z.object({
	adminId: z.instanceof(Types.ObjectId),
	tokenHash: z.string(),
	previousTokenId: z.instanceof(Types.ObjectId).optional(),
	ipAddress: z.string().optional(),
	userAgent: z.string().optional(),
});

export const loginPayloadSchema = z.object({
    username: z.string().toLowerCase().trim(),
    password: z.string().trim().min(8),
});

export type UserDeviceMeta = z.infer<typeof userDeviceMetaSchema>;
export type RefreshTokenPayload = z.infer<typeof refreshTokenPayloadSchema>;
export type AccessTokenPayload = z.infer<typeof accessTokenPayloadSchema>;
export type CreateRefreshTokenSessionPayload = z.infer<typeof createRefreshTokenSessionSchema>;

export type OtpSessionLogAction = z.infer<typeof otpSessionLogActionEnum>;
export type OtpPurpose = z.infer<typeof OtpPurposeEnum>;
export type OtpStatus = z.infer<typeof OtpStatusEnum>;

export type LoginPayload = z.infer<typeof loginPayloadSchema>;
