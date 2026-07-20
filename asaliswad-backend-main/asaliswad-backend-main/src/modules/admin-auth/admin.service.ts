import type { 
	UserDeviceMeta,
    SendOtpPayload,
	SignupPayload,
    ResendOtpPayload, 
    VerifyOtpPayload,
    ChangeOtpEmailPayload,
    LoginPayload,
    RefreshTokenPayload
} from "@/types/auth";
import { 
	createOtpSession, 
	createOtpSessionLog, 
	createRefreshTokenSession, 
	getOtpSessionById, 
	getRefreshTokenSessionById, 
	revokeAllRefreshTokensByUserId, 
	updateOtpSession, 
    updateRefreshTokenSession
} from "@/modules/auth/auth.repository";
import { 
	createUser, 
	getUserByEmail, 
	getUserById, 
	getUserByPhoneNo, 
    updateUser
} from "@/modules/users/users.repository";
import { AppError } from "@/utils/app-error";
import { hashUserPassword, verifyAdminPassword } from "@/utils/password";
import { sendOtpEmail } from "@/utils/email";
import { 
	generateOtp, 
	hashOtp, 
	setOtpExpiry, 
	verifyOTP 
} from "@/utils/otp";
import { 
	generateUserAccessToken, 
	generateUserRefreshToken, 
	hashToken, 
    userRefreshTokenExpirationTime
} from "@/utils/token";
import { toSafeUser } from "@/mappers/user.mapper";
import { Types } from "mongoose";

const generateTokenAndReturnUser = async (userId: string, meta: UserDeviceMeta, previousTokenId?: string) => {
    const user = await getUserById(userId);
    if(!user) throw new AppError("no user exists with this id", 500);

	const newRefreshTokenSession = await createRefreshTokenSession({
        userId: user._id,
        tokenHash: "pending",
		previousTokenId: previousTokenId ? new Types.ObjectId(previousTokenId) : undefined,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
	});
	if(!newRefreshTokenSession) throw new AppError("failed to create refresh token session", 500);

	const accessToken = generateUserAccessToken({
		userId: user._id.toString(),
		email: user.email,
	});
	const refreshToken = generateUserRefreshToken({
		userId: user._id.toString(),
		tokenId: newRefreshTokenSession._id.toString()
	});

	await updateRefreshTokenSession(newRefreshTokenSession._id.toString(), {
		tokenHash: hashToken(refreshToken),
		expiresAt: new Date(Date.now() + userRefreshTokenExpirationTime * 24 * 60 * 60 * 1000)
	});

	await updateUser(user._id.toString(), {
        lastLoginAt: new Date()
	});

	return { 
		tokens: {
            accessToken,
            refreshToken
		},
		user: toSafeUser(user) 
	};
}

export const login = async (payload: LoginPayload, meta: UserDeviceMeta) => {
	const userData = await getUserByEmail(payload.email);
	if(!userData || !userData.passwordHash) throw new AppError("invalid credentials", 401);

	const isValidPassword = await verifyAdminPassword(payload.password, userData.passwordHash);
	if(!isValidPassword) throw new AppError("invalid credentials", 401);

	if(userData.status === "banned") throw new AppError("user is banned", 403);
	if(userData.status !== "active") throw new AppError("user is not active", 400);

    const { user, tokens } = await generateTokenAndReturnUser(userData._id.toString(), meta);
    return { user, tokens };
};

export const refresh = async (payload: RefreshTokenPayload, meta: UserDeviceMeta) => {
	const refreshTokenSession = await getRefreshTokenSessionById(payload.tokenId);
    if(!refreshTokenSession) throw new AppError("invalid refresh token", 401);
    if(refreshTokenSession.isRevoked) { 
		await revokeAllRefreshTokensByUserId(payload.userId);
		throw new AppError("refresh token reuse detected", 401);
	}
	
	await updateRefreshTokenSession(payload.tokenId, {
		isRevoked: true,
		revokedAt: new Date()
	});

    const { user, tokens } = await generateTokenAndReturnUser(payload.userId, meta, payload.tokenId);
    return { user, tokens };
};

