import { 
	AdminRefreshToken,
    type IAdminRefreshToken, 
} from "@/modules/admin-auth/models/admin-refresh-token.model";
import type { 
    CreateRefreshTokenSessionPayload
} from "@/types/admin-auth";

export const getRefreshTokenSessionById = async (id: string) => {
    return await AdminRefreshToken.findById(id);
}

export const createRefreshTokenSession = async (refreshTokenSession: CreateRefreshTokenSessionPayload) => {
    return await AdminRefreshToken.create({ 
		adminId: refreshTokenSession.adminId,
		tokenHash: refreshTokenSession.tokenHash,
		previousTokenId: refreshTokenSession.previousTokenId,
		ipAddress: refreshTokenSession.ipAddress,
		userAgent: refreshTokenSession.userAgent
	});
}

export const updateRefreshTokenSession = async (id: string, update: Partial<IAdminRefreshToken>) => {
    return await AdminRefreshToken.findByIdAndUpdate(id, update, { returnDocument: "after" });
}

export const revokeAllRefreshTokensByUserId = async (userId: string) => {
    return await AdminRefreshToken.updateMany({ userId }, {
		isRevoked: true,
        revokedAt: new Date()
	});
}

