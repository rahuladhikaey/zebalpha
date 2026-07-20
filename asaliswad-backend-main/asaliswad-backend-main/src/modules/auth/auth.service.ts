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
import { hashUserPassword, verifyUserPassword } from "@/utils/password";
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

export const signUp = async (payload: SignupPayload, meta: UserDeviceMeta) => {
	const doesEmailExist = await getUserByEmail(payload.email);
	if(doesEmailExist) throw new AppError("email already exists", 409);

	const doesPhoneNoExist = payload.phoneNo 
		? await getUserByPhoneNo(payload.phoneNo) 
		: null;
    if(doesPhoneNoExist) throw new AppError("phone no already exists", 409);

	const passwordHash = await hashUserPassword(payload.password);

	const user = await createUser({
        fullName: payload.fullName,
        email: payload.email,
        phoneNo: payload.phoneNo,
        gender: payload.gender,
        passwordHash: passwordHash
	});
	if(!user) throw new AppError("failed to create user", 500);

	const otp = generateOtp();
    const otpHash = hashOtp(otp);

	const otpSession = await createOtpSession({
		userId: user._id,
        email: payload.email,
        purpose: "email_verification",
        otpHash: otpHash,
		ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
	});
    if(!otpSession) throw new AppError("failed to create OTP session", 500);

	await createOtpSessionLog({ 
		otpSessionId: otpSession._id, 
		action: "created", 
		ipAddress: meta.ipAddress, 
		userAgent: meta.userAgent 
	});

	await sendOtpEmail(
		payload.fullName, 
		payload.email, 
		otp, 
		"email_verification"
	);

	return otpSession._id.toString();
}

export const sendOtp = async (payload: SendOtpPayload, meta: UserDeviceMeta) => {
	const user = await getUserByEmail(payload.email);
	if(!user) throw new AppError("user not found", 404);

	if(payload.purpose === "email_verification") {
		if(user.status !== "verification_pending") throw new AppError("user is already verified", 400);
	} else {
		if(user.status === "banned") throw new AppError("user is banned", 403);
		if(user.status !== "active") throw new AppError("user is not active", 400);
	}
	const otp = generateOtp();
    const otpHash = hashOtp(otp);

	const otpSession = await createOtpSession({
		userId: user._id,
        email: payload.email,
        purpose: payload.purpose,
        otpHash: otpHash,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
	});
    if(!otpSession) throw new AppError("failed to create OTP session", 500);

	await createOtpSessionLog({ 
		otpSessionId: otpSession._id, 
		action: "created", 
		ipAddress: meta.ipAddress, 
		userAgent: meta.userAgent 
	});

	await sendOtpEmail(
		user.fullName, 
		payload.email, 
		otp, 
		payload.purpose
	);

	return otpSession._id.toString();
}

export const resendOtp = async (payload: ResendOtpPayload, meta: UserDeviceMeta) => {
	const otpSession = await getOtpSessionById(payload.otpSessionId);
	if(!otpSession) throw new AppError("OTP session not found", 404);
	if(otpSession.expiresAt < new Date()) throw new AppError("OTP session has expired", 410);
	if(otpSession.status !== "pending") throw new AppError("OTP session is no longer valid", 409);

	if(otpSession.resendCount >= otpSession.maxResend) {
		await updateOtpSession(otpSession._id.toString(), { status: "locked" });
		await createOtpSessionLog({
			otpSessionId: otpSession._id,
			action: "max_resend_reached",
			ipAddress: meta.ipAddress,
			userAgent: meta.userAgent,
		});
		throw new AppError("max resend attempts reached", 429);
	}
	if(otpSession.otpAttempts >= otpSession.maxOtpAttempts) {
		await updateOtpSession(otpSession._id.toString(), { status: "locked" });
		await createOtpSessionLog({
			otpSessionId: otpSession._id,
			action: "max_attempts_reached",
			ipAddress: meta.ipAddress,
			userAgent: meta.userAgent,
		});
		throw new AppError("max OTP attempts reached", 429);
	}
	const otp = generateOtp();
	const otpHash = hashOtp(otp);

	const updatedOtpSession = await updateOtpSession(payload.otpSessionId, {
        otpHash: otpHash,
		expiresAt: setOtpExpiry(),
		resendCount: otpSession.resendCount + 1,
	});
    if(!updatedOtpSession) throw new AppError("failed to update OTP session", 500);

	await createOtpSessionLog({ 
		otpSessionId: otpSession._id, 
		action: "resent", 
		meta: { 
			resends: updatedOtpSession.resendCount
		},
		ipAddress: meta.ipAddress, 
		userAgent: meta.userAgent 
	});

	const user = await getUserById(otpSession.userId.toString());
	if(!user) throw new AppError("could not find user", 500);

	await sendOtpEmail(
		user.fullName, 
		updatedOtpSession.email, 
		otp, 
		updatedOtpSession.purpose
	);
}

export const changeOtpEmail = async (payload: ChangeOtpEmailPayload, meta: UserDeviceMeta) => {
	const otpSession = await getOtpSessionById(payload.otpSessionId);
	if (!otpSession) throw new AppError("OTP session not found", 404);
	if (otpSession.expiresAt < new Date()) throw new AppError("OTP session has expired", 410);
	if (otpSession.status !== "pending") throw new AppError("OTP session is no longer valid", 409);

	if (otpSession.changeEmailCount >= otpSession.maxEmailChange) {
		await updateOtpSession(otpSession._id.toString(), { status: "locked" });
		await createOtpSessionLog({
			otpSessionId: otpSession._id,
			action: "max_email_change_reached",
			ipAddress: meta.ipAddress,
			userAgent: meta.userAgent,
		});
		throw new AppError("max email change attempts reached", 429);
	}

	const otp = generateOtp();
	const otpHash = hashOtp(otp);

	const updatedOtpSession = await updateOtpSession(payload.otpSessionId, {
		email: payload.newEmail,
		otpHash,
		expiresAt: setOtpExpiry(),
		changeEmailCount: otpSession.changeEmailCount + 1,
	});
	if (!updatedOtpSession) throw new AppError("failed to update OTP session", 500);

	await createOtpSessionLog({
		otpSessionId: otpSession._id,
		action: "email_changed",
		meta: {
			oldEmail: otpSession.email,
			newEmail: updatedOtpSession.email,
			changes: updatedOtpSession.changeEmailCount,
		},
		ipAddress: meta.ipAddress,
		userAgent: meta.userAgent,
	});

	const user = await getUserById(otpSession.userId.toString());
	if (!user) throw new AppError("could not find user", 500);

	await sendOtpEmail(
		user.fullName, 
		updatedOtpSession.email, 
		otp, 
		updatedOtpSession.purpose
	);
};

export const verifyOtp = async (payload: VerifyOtpPayload, meta: UserDeviceMeta) => {
	const otpSession = await getOtpSessionById(payload.otpSessionId);
    if(!otpSession) throw new AppError("OTP session not found", 404);
	if(otpSession.expiresAt < new Date()) throw new AppError("OTP session has expired", 410);
	if(otpSession.status !== "pending") throw new AppError("OTP session is no longer valid", 409);

	if(otpSession.otpAttempts >= otpSession.maxOtpAttempts) {
		await updateOtpSession(otpSession._id.toString(), { status: "locked" });
		await createOtpSessionLog({
			otpSessionId: otpSession._id,
			action: "max_attempts_reached",
			ipAddress: meta.ipAddress,
			userAgent: meta.userAgent,
		});
		throw new AppError("max OTP attempts reached", 429);
	}

	if(verifyOTP(payload.otp, otpSession.otpHash)) {
		await updateOtpSession(otpSession._id.toString(), { 
			status: "used",
			otpAttempts: otpSession.otpAttempts + 1 
		});

		await createOtpSessionLog({ 
			otpSessionId: otpSession._id, 
			action: "verified", 
			ipAddress: meta.ipAddress,
            userAgent: meta.userAgent
		});

	} else { 
		await updateOtpSession(otpSession._id.toString(), { 
			otpAttempts: otpSession.otpAttempts + 1 
		});

		await createOtpSessionLog({ 
			otpSessionId: otpSession._id, 
			action: "failed_attempt", 
			ipAddress: meta.ipAddress,
            userAgent: meta.userAgent
		});

		throw new AppError("invalid OTP", 400);
	}

	switch (otpSession.purpose) {
		case "email_verification": {
			await updateUser(otpSession.userId.toString(), {
				status: "active",
				emailVerifiedAt: new Date(),
				lastLoginAt: new Date()
			});

			const { 
				tokens, 
				user: updatedUser 
			} = await generateTokenAndReturnUser(otpSession.userId.toString(), meta);
			return {
				purpose: otpSession.purpose,
				message: "email verified & logged in successfully",
                tokens,
				user: updatedUser
			};
		}
		case "login": {
			await updateUser(otpSession.userId.toString(), {
				lastLoginAt: new Date()
			});

			const { 
				tokens,
				user: updatedUser 
			} = await generateTokenAndReturnUser(otpSession.userId.toString(), meta);
			return {
				purpose: otpSession.purpose,
				message: "logged in successfully",
				tokens,
				user: updatedUser
			};
		}
		case "password_reset":
			return { 
				purpose: otpSession.purpose,
				message: "password reset successfully",
			};

		case "email_change": {
			await updateUser(otpSession.userId.toString(), {
				email: otpSession.email,
				emailVerifiedAt: new Date(),
			});
			return { 
				purpose: otpSession.purpose,
				message: "email changed successfully",
			};
		}
	}
};

export const login = async (payload: LoginPayload, meta: UserDeviceMeta) => {
	const userData = await getUserByEmail(payload.email);
	if(!userData || !userData.passwordHash) throw new AppError("invalid credentials", 401);

	const isValidPassword = await verifyUserPassword(payload.password, userData.passwordHash);
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
