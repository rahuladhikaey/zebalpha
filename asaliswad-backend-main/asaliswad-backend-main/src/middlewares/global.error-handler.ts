import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "@/utils/app-error";

const errorHandler = (
	err: unknown,
	_req: Request,
	res: Response,
	_next: NextFunction
) => {
	if(err instanceof ZodError) {
		return res.status(400).json({
			success: false,
            statusCode: 400,
			message: "Validation failed",
			errors: err.issues.map((issue) => ({
				path: issue.path.join("."),
				message: issue.message,
			})),
		});
	}

	if(err instanceof AppError) {
		return res.status(err.statusCode).json({
			success: false,
			statusCode: err.statusCode,
			message: err.message,
		});
	}

	console.error("[Unhandled Error]", err);

	return res.status(500).json({
		success: false,
        statusCode: 500,
		message: "Internal server error",
	});
}

export default errorHandler;
