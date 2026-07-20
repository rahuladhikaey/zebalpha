import { z } from "zod";
import { Types } from "mongoose";
import { GenderEnum } from "@/types/user";

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
    userId: z.string().trim(),
	tokenId: z.string().trim(),
});

export const accessTokenPayloadSchema = z.object({
    userId: z.string().trim(),
    email: z.email().toLowerCase().trim(),
});

export const createRefreshTokenSessionSchema = z.object({
	userId: z.instanceof(Types.ObjectId),
	tokenHash: z.string(),
	previousTokenId: z.instanceof(Types.ObjectId).optional(),
	ipAddress: z.string().optional(),
	userAgent: z.string().optional(),
});

export const createOtpSessionSchema = z.object({
	userId: z.instanceof(Types.ObjectId),
	email: z.email().toLowerCase().trim(),
	purpose: OtpPurposeEnum,
	otpHash: z.string(),
	ipAddress: z.string().optional(),
	userAgent: z.string().optional(),
});

export const sendOtpPayloadSchema = z.object({
    email: z.email().toLowerCase().trim(),
    purpose: OtpPurposeEnum,
});

export const resendOtpPayloadSchema = z.object({
    otpSessionId: z.string().trim(),
});

export const changeOtpEmailPayloadSchema = z.object({
	otpSessionId: z.string(),
	newEmail: z.email(),
});

export const verifyOtpPayloadSchema = z.object({
	otpSessionId: z.string().trim(),
    otp: z.string().trim(),
});

export const createOtpSessionLogSchema = z.object({
	otpSessionId: z.instanceof(Types.ObjectId),
	action: otpSessionLogActionEnum,
	meta: z.record(z.string(), z.unknown()).optional(),
	ipAddress: z.string().optional(),
	userAgent: z.string().optional(),
});

export const signupPayloadSchema = z.object({
    fullName: z.string(),
    email: z.email().toLowerCase().trim(),
    password: z.string().trim().min(8),
    phoneNo: z.string().length(10).trim().optional(),
    gender: GenderEnum.optional().default("prefer_not_to_say"),
});

export const createUserSchema = signupPayloadSchema
	.omit({ password: true })
	.extend({
		passwordHash: z.string(),
	});

export const loginPayloadSchema = z.object({
    email: z.email().toLowerCase().trim(),
    password: z.string().trim().min(8),
});

export type UserDeviceMeta = z.infer<typeof userDeviceMetaSchema>;
export type RefreshTokenPayload = z.infer<typeof refreshTokenPayloadSchema>;
export type AccessTokenPayload = z.infer<typeof accessTokenPayloadSchema>;
export type CreateRefreshTokenSessionPayload = z.infer<typeof createRefreshTokenSessionSchema>;

export type OtpSessionLogAction = z.infer<typeof otpSessionLogActionEnum>;
export type OtpPurpose = z.infer<typeof OtpPurposeEnum>;
export type OtpStatus = z.infer<typeof OtpStatusEnum>;
export type CreateOtpSessionPayload = z.infer<typeof createOtpSessionSchema>;
export type SendOtpPayload = z.infer<typeof sendOtpPayloadSchema>;
export type ResendOtpPayload = z.infer<typeof resendOtpPayloadSchema>;
export type ChangeOtpEmailPayload = z.infer<typeof changeOtpEmailPayloadSchema>;
export type VerifyOtpPayload = z.infer<typeof verifyOtpPayloadSchema>;
export type CreateOtpSessionLogPayload = z.infer<typeof createOtpSessionLogSchema>;

export type SignupPayload = z.infer<typeof signupPayloadSchema>;
export type CreateUserPayload = z.infer<typeof createUserSchema>;
export type LoginPayload = z.infer<typeof loginPayloadSchema>;
