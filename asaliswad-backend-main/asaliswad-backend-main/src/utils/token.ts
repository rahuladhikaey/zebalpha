import type { 
	AccessTokenPayload, 
	RefreshTokenPayload 
} from "@/types/auth";
import jwt from "jsonwebtoken";
const { JsonWebTokenError, TokenExpiredError } = jwt;
import { createHash } from "crypto";
import { AppError } from "@/utils/app-error";

const userAccessTokenSecret				= process.env.USER_ACCESS_TOKEN_SECRET as string;
const userRefreshTokenSecret			= process.env.USER_REFRESH_TOKEN_SECRET as string;
const userAccessTokenExpirationTime		= Number(process.env.USER_ACCESS_TOKEN_EXPIRATION_TIME) || 10;
export const userRefreshTokenExpirationTime	= Number(process.env.USER_REFRESH_TOKEN_EXPIRATION_TIME) || 15;

const adminAccessTokenSecret			= process.env.ADMIN_ACCESS_TOKEN_SECRET as string;
const adminRefreshTokenSecret			= process.env.ADMIN_REFRESH_TOKEN_SECRET as string;
const adminAccessTokenExpirationTime	= Number(process.env.ADMIN_ACCESS_TOKEN_EXPIRATION_TIME) || 5;
export const adminRefreshTokenExpirationTime = Number(process.env.ADMIN_REFRESH_TOKEN_EXPIRATION_TIME) || 7;

if(!userAccessTokenSecret || !userRefreshTokenSecret)
    throw new Error("Missing user JWT credentials");

if(!adminAccessTokenSecret || !adminRefreshTokenSecret)
    throw new Error("Missing admin JWT credentials");

export const hashToken = (token: string): string => {
    return createHash("sha256").update(token).digest("hex");
};

export const generateUserAccessToken = (payload: AccessTokenPayload) => {
    return jwt.sign(payload, userAccessTokenSecret, { 
        expiresIn: `${userAccessTokenExpirationTime}m` 
	});
}

export const generateUserRefreshToken = (payload: RefreshTokenPayload) => {
    return jwt.sign(payload, userRefreshTokenSecret, { 
		expiresIn: `${userRefreshTokenExpirationTime}d` 
	});
}

export const generateAdminAccessToken = (payload: AccessTokenPayload) => {
    return jwt.sign(payload, adminAccessTokenSecret, { 
        expiresIn: `${adminAccessTokenExpirationTime}m` 
    });
}

export const generateAdminRefreshToken = (payload: RefreshTokenPayload) => {
    return jwt.sign(payload, adminRefreshTokenSecret, { 
        expiresIn: `${adminRefreshTokenExpirationTime}d` 
    });
}

export const verifyTokenHash = (token: string, hash: string): boolean => {
    return hashToken(token) === hash;
};

const verifyToken = <T>(token: string, secret: string) => {
	try {
		return jwt.verify(token, secret, {
			algorithms: ["HS256"]
		}) as T;
	} catch (error) {
		if(error instanceof TokenExpiredError){
            throw new AppError("Token expired", 401);
		}
		if(error instanceof JsonWebTokenError){
            throw new AppError("Invalid token", 401);
        }
		throw new AppError("Unknown error", 500);
	}
}

export const verifyUserAccessToken = (token: string) => {
    return verifyToken<AccessTokenPayload>(token, userAccessTokenSecret);
}

export const verifyUserRefreshToken = (token: string) => {
    return verifyToken<RefreshTokenPayload>(token, userRefreshTokenSecret);
}

export const verifyAdminAccessToken = (token: string) => {
    return verifyToken<AccessTokenPayload>(token, adminAccessTokenSecret);
}

export const verifyAdminRefreshToken = (token: string) => {
    return verifyToken<RefreshTokenPayload>(token, adminRefreshTokenSecret);
}
