import mongoose, { 
	Schema, 
	Document, 
	Types 
} from "mongoose";
import { adminRefreshTokenExpirationTime } from "@/utils/token";

export interface IAdminRefreshToken extends Document {
	adminId: Types.ObjectId;
	tokenHash: string;
	isRevoked: boolean;
    revokedAt?: Date;
	expiresAt: Date;
	ipAddress?: string;
	userAgent?: string;
	previousTokenId?: Types.ObjectId | null;
}

const adminRefreshTokenSchema = new Schema<IAdminRefreshToken>(
	{
		adminId: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
		tokenHash: { type: String, required: true },
		isRevoked: { type: Boolean, default: false, required: true },
		revokedAt: { type: Date, default: null },
		expiresAt: { 
			type: Date, 
			required: true,
			default: () => new Date(Date.now() + adminRefreshTokenExpirationTime * 24 * 60 * 60 * 1000)
		},
		ipAddress: { type: String },
		userAgent: { type: String },
		previousTokenId: {
			type: Schema.Types.ObjectId,
			ref: "AdminRefreshToken",
			default: null,
		},
	},
	{ timestamps: true }
);

adminRefreshTokenSchema.index({ adminId: 1 });
adminRefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AdminRefreshToken = mongoose.model<IAdminRefreshToken>(
	"AdminRefreshToken",
	adminRefreshTokenSchema
);
