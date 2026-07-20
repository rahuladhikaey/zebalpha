import mongoose, { 
	Schema, 
	Document, 
	Types 
} from "mongoose";
import { 
	OtpStatusEnum,
    OtpPurposeEnum,
	type OtpStatus, 
	type OtpPurpose 
} from "@/types/auth";
import { otpExpirationTime } from "@/utils/otp";

export interface IOtpSession extends Document {
	userId: Types.ObjectId;
	email: string;
	purpose: OtpPurpose;
	otpHash: string;
	status: OtpStatus;
	otpAttempts: number;
	maxOtpAttempts: number;
	resendCount: number;
	maxResend: number;
	changeEmailCount: number;
	maxEmailChange: number;
	expiresAt: Date;
	ipAddress?: string;
	userAgent?: string;
}

const otpSessionSchema = new Schema<IOtpSession>(
	{
		userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
		email: { type: String, required: true },
		purpose: {
			type: String,
			enum: OtpPurposeEnum.options,
			required: true,
		},
		otpHash: { type: String, required: true },
		status: {
			type: String,
			enum: OtpStatusEnum.options,
			default: "pending",
		},
		otpAttempts: { type: Number, default: 0 },
		maxOtpAttempts: { type: Number, default: 5 },
		resendCount: { type: Number, default: 0 },
		maxResend: { type: Number, default: 3 },
		changeEmailCount: { type: Number, default: 0 },
		maxEmailChange: { type: Number, default: 3 },
		expiresAt: {
			type: Date,
			default: () => new Date(Date.now() + otpExpirationTime * 60 * 1000),
		},
		ipAddress: { type: String },
		userAgent: { type: String },
	},
	{ timestamps: true }
);

otpSessionSchema.index({ userId: 1 });

export const OtpSession = mongoose.model<IOtpSession>("OtpSession", otpSessionSchema);
