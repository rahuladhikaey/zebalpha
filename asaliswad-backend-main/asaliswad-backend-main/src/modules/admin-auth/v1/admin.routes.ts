import { Router } from "express";
import * as authController from "@/modules/auth/v1/auth.controller";
import validator from "@/middlewares/global.validator";
import { 
    loginPayloadSchema, 
} from "@/types/admin-auth";

const router = Router();

router.post("/login",
	validator(loginPayloadSchema),
    authController.login
);

export default router;
