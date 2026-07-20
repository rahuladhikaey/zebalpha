import mongoose, { 
	Schema, 
	Document, 
	Types 
} from "mongoose";
import { 
	otpSessionLogActionEnum, 
	type OtpSessionLogAction 
} from "@/types/auth";

export interface IAdminOtpSessionLog extends Document {
	adminOtpSessionId: Types.ObjectId;
	action: OtpSessionLogAction;
	meta?: Record<string, unknown>;
	ipAddress?: string;
	userAgent?: string;
}

const adminOtpSessionLogSchema = new Schema<IAdminOtpSessionLog>(
	{
		adminOtpSessionId: { type: Schema.Types.ObjectId, ref: "AdminOtpSession", required: true },
		action: {
			type: String,
			enum: otpSessionLogActionEnum.options,
			required: true,
		},
		meta: { type: Schema.Types.Mixed },
		ipAddress: { type: String },
		userAgent: { type: String },
	},
	{ timestamps: true }
);

adminOtpSessionLogSchema.index({ adminOtpSessionId: 1 });

export const AdminOtpSessionLog = mongoose.model<IAdminOtpSessionLog>("AdminOtpSessionLog", adminOtpSessionLogSchema);
