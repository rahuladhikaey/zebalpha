import mongoose, { 
	Schema, 
	Document, 
	Types 
} from "mongoose";
import {
	OtpStatusEnum,  
	type OtpStatus, 
	OtpPurposeEnum, 
	type OtpPurpose
} from "@/types/auth";
import { otpExpirationTime } from "@/utils/otp";

export interface IAdminOtpSession extends Document {
	adminId: Types.ObjectId;
	emailId: string;
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

const adminOtpSessionSchema = new Schema<IAdminOtpSession>(
	{
		adminId: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
		emailId: { type: String, required: true },
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

adminOtpSessionSchema.index({ adminId: 1 });

export const AdminOtpSession = mongoose.model<IAdminOtpSession>(
	"AdminOtpSession",
	adminOtpSessionSchema
);
