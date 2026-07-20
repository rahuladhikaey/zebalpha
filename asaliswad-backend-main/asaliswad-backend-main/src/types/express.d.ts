import type { 
	RefreshTokenPayload, 
	AccessTokenPayload 
} from "@/modules/auth/types/auth";

declare global {
	namespace Express {
		interface Request {
			refreshTokenPayload?: RefreshTokenPayload;
			refreshToken?: string;
			accessTokenPayload?: AccessTokenPayload; 
		}
	}
}

export {};
