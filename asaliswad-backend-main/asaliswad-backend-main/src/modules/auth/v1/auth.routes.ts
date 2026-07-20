import { Router } from "express";
import * as authController from "@/modules/auth/v1/auth.controller";
import validator from "@/middlewares/global.validator";
import { 
	signupPayloadSchema, 
    sendOtpPayloadSchema, 
    resendOtpPayloadSchema, 
	changeOtpEmailPayloadSchema,
	verifyOtpPayloadSchema,
    loginPayloadSchema, 
} from "@/types/auth";
import refreshTokenValidator from "@/middlewares/auth.refresh-token-validator";

const router = Router();

router.post("/signup", 
	validator(signupPayloadSchema),
	authController.signup
);

router.post("/otp/send",
    validator(sendOtpPayloadSchema),
    authController.sendOtp
);

router.post("/otp/resend",
	validator(resendOtpPayloadSchema),
    authController.resendOtp
);

router.post("/otp/change-email", 
    validator(changeOtpEmailPayloadSchema),
    authController.changeOtpEmail
);

router.post("/otp/verify", 
    validator(verifyOtpPayloadSchema),
	authController.verifyOtp
);

router.post("/login",
	validator(loginPayloadSchema),
    authController.login
);

router.post("/refresh",
	refreshTokenValidator,
    authController.refresh
);

export default router;
