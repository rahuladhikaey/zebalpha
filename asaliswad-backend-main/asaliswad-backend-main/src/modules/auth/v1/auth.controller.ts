import type { 
	Request, 
	Response, 
	NextFunction
} from "express";
import * as authService from "@/modules/auth/auth.service";
import { userRefreshTokenExpirationTime } from "@/utils/token";

export const signup = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const ipAddress = req.ip;
		const userAgent = req.get("User-Agent");
		const otpSessionId = await authService.signUp(req.body, { userAgent, ipAddress });

        res.status(200).json({ 
			sucess: true,
            message: "OTP for email verification has been sent!",
            statusCode: 200,
            otpSessionId
        });
	} catch(err) {
        next(err);
	}
}

export const sendOtp = async (req: Request, res: Response, next: NextFunction) => {
    try {
		const ipAddress = req.ip;
		const userAgent = req.get("User-Agent");
        const otpSessionId = await authService.sendOtp(req.body, { userAgent, ipAddress });

        res.status(200).json({ 
			sucess: true,
            message: "OTP has been sent!",
            statusCode: 200,
            otpSessionId
        });
    } catch(err) {
        next(err);
    }
}

export const resendOtp = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ipAddress = req.ip;
        const userAgent = req.get("User-Agent");
        await authService.resendOtp(req.body, { userAgent, ipAddress });

        res.status(200).json({ 
            sucess: true,
            message: "OTP has been resent!",
            statusCode: 200
        });
    } catch(err) {
        next(err);
    }
}

export const changeOtpEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ipAddress = req.ip;
        const userAgent = req.get("User-Agent");
        await authService.changeOtpEmail(req.body, { userAgent, ipAddress });

        res.status(200).json({ 
            sucess: true,
            message: "OTP has been resent!",
            statusCode: 200
        });
    } catch(err) {
        next(err);
    }
}

export const verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
    try {
		const ipAddress = req.ip;
		const userAgent = req.get("User-Agent");
        const {purpose, message, tokens, user } = await authService.verifyOtp(req.body, { userAgent, ipAddress });

		if(purpose === "email_verification" || purpose === "login") {	
			res.cookie("refreshToken", tokens.refreshToken, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "strict",
				maxAge: userRefreshTokenExpirationTime * 24 * 60 * 60 * 1000,
				path: "/v1/auth",
			});
		}
		res.status(200).json({ 
			sucess: true,
			message: message,
			statusCode: 200,
            tokens,
            user
		});
	} catch(err) {
        next(err);
    }
}

export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ipAddress = req.ip;
        const userAgent = req.get("User-Agent");
        const {tokens, user} = await authService.login(req.body, { userAgent, ipAddress });

		res.cookie("refreshToken", tokens.refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
			maxAge: userRefreshTokenExpirationTime * 24 * 60 * 60 * 1000,
			path: "/v1/auth",
		});
        res.status(200).json({ 
            sucess: true,
            message: "login successful!",
            statusCode: 200,
            accessToken: tokens.accessToken,
            user
        });
    } catch(err) {
        next(err);
    }
}

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ipAddress = req.ip;
        const userAgent = req.get("User-Agent");
        const {tokens, user} = await authService.refresh(req.refreshTokenPayload, { userAgent, ipAddress });

        res.cookie("refreshToken", tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: userRefreshTokenExpirationTime * 24 * 60 * 60 * 1000,
            path: "/v1/auth",
        });
        res.status(200).json({ 
            sucess: true,
            message: "refresh successful!",
            statusCode: 200,
            accessToken: tokens.accessToken,
            user
        });
    } catch(err) {
        next(err);
    }
}
