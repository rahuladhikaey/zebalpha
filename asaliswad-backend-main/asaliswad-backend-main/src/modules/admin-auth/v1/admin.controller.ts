import type { 
	Request, 
	Response, 
	NextFunction
} from "express";
import * as authService from "@/modules/auth/auth.service";
import { adminRefreshTokenExpirationTime } from "@/utils/token";

export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ipAddress = req.ip;
        const userAgent = req.get("User-Agent");
        const { tokens, admin } = await authService.login(req.body, { userAgent, ipAddress });

		res.cookie("refreshToken", tokens.refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
			maxAge: adminRefreshTokenExpirationTime * 24 * 60 * 60 * 1000,
			path: "/v1/admin-auth",
		});
        res.status(200).json({ 
            sucess: true,
            message: "login successful!",
            statusCode: 200,
            accessToken: tokens.accessToken,
            admin
        });
    } catch(err) {
        next(err);
    }
}
