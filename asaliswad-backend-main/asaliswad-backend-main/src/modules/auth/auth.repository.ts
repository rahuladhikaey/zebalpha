import { 
	OtpSession, 
	type IOtpSession 
} from "@/modules/auth/models/otp-session.model";
import { OtpSessionLog } from "@/modules/auth/models/otp-session-log.model";
import { 
	RefreshToken,
    type IRefreshToken, 
} from "@/modules/auth/models/refresh-token.model";
import type { 
    CreateOtpSessionLogPayload,
	CreateOtpSessionPayload, 
    CreateRefreshTokenSessionPayload
} from "@/types/auth";

export const createOtpSession = async (otpSession: CreateOtpSessionPayload) => {
    return await OtpSession.create({
        userId: otpSession.userId,
        email: otpSession.email,
        purpose: otpSession.purpose,
        otpHash: otpSession.otpHash,
        ipAddress: otpSession.ipAddress,
        userAgent: otpSession.userAgent
	});
}

export const getOtpSessionById = async (id: string) => {
    return await OtpSession.findById(id);
}

export const getOtpSessionByUserId = async (userId: string) => {
    return await OtpSession.findOne({ userId });
}

export const getOtpSessionByEmailId = async (emailId: string) => {
    return await OtpSession.findOne({ emailId });
}

export const updateOtpSession = async (id: string, update: Partial<IOtpSession>) => {
	return await OtpSession.findByIdAndUpdate(id, update, { returnDocument: "after" });
}

export const createOtpSessionLog = async (otpSessionLog: CreateOtpSessionLogPayload) => {
    return await OtpSessionLog.create({
		otpSessionId: otpSessionLog.otpSessionId,
		action: otpSessionLog.action,
		meta: otpSessionLog.meta,
		ipAddress: otpSessionLog.ipAddress,
		userAgent: otpSessionLog.userAgent,
	});
}

export const getRefreshTokenSessionById = async (id: string) => {
    return await RefreshToken.findById(id);
}

export const createRefreshTokenSession = async (refreshTokenSession: CreateRefreshTokenSessionPayload) => {
    return await RefreshToken.create({ 
		userId: refreshTokenSession.userId,
		tokenHash: refreshTokenSession.tokenHash,
		previousTokenId: refreshTokenSession.previousTokenId,
		ipAddress: refreshTokenSession.ipAddress,
		userAgent: refreshTokenSession.userAgent
	});
}

export const updateRefreshTokenSession = async (id: string, update: Partial<IRefreshToken>) => {
    return await RefreshToken.findByIdAndUpdate(id, update, { returnDocument: "after" });
}

export const revokeAllRefreshTokensByUserId = async (userId: string) => {
    return await RefreshToken.updateMany({ userId }, {
		isRevoked: true,
        revokedAt: new Date()
	});
}
