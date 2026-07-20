import type { 
	Request, 
	Response, 
	NextFunction 
} from "express";
import { AppError } from "@/utils/app-error";
import { verifyUserRefreshToken } from "@/utils/token";
import { refreshTokenPayloadSchema } from "@/types/auth";

const refreshTokenValidator = ( req: Request, _res: Response, next: NextFunction ) => {
	try {
		const token = req.cookies?.refreshToken;
		if(!token) throw new AppError("refresh token missing", 401);

		const decoded = verifyUserRefreshToken(token); 

		const parsed = refreshTokenPayloadSchema.safeParse(decoded);
		if(!parsed.success) {
			throw new AppError("invalid refresh token payload", 401);
		}

		req.refreshTokenPayload = parsed.data;
		req.refreshToken = token; 
		next();
	} catch(err) {
		next(err);
	}
};

export default refreshTokenValidator;
