import mongoose, { 
	Schema, 
	Document, 
	Types 
} from "mongoose";
import { 
	otpSessionLogActionEnum, 
	type OtpSessionLogAction 
} from "@/types/auth";

export interface IOtpSessionLog extends Document {
	otpSessionId: Types.ObjectId;
	action: OtpSessionLogAction;
	meta?: Record<string, unknown>;
	ipAddress?: string;
	userAgent?: string;
}

const otpSessionLogSchema = new Schema<IOtpSessionLog>(
	{
		otpSessionId: { type: Schema.Types.ObjectId, ref: "OtpSession", required: true },
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

otpSessionLogSchema.index({ otpSessionId: 1 });

export const OtpSessionLog = mongoose.model<IOtpSessionLog>("OtpSessionLog", otpSessionLogSchema);
