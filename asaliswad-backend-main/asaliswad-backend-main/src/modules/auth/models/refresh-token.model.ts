import mongoose, { 
	Schema, 
	Document, 
	Types 
} from "mongoose";
import { userRefreshTokenExpirationTime } from "@/utils/token";

export interface IRefreshToken extends Document {
	userId: Types.ObjectId;
	tokenHash: string;
	isRevoked: boolean;
    revokedAt?: Date;
	expiresAt: Date;
	ipAddress?: string;
	userAgent?: string;
	previousTokenId?: Types.ObjectId | null;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
	{
		userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
		tokenHash: { type: String, required: true },
		isRevoked: { type: Boolean, default: false, required: true },
		revokedAt: { type: Date, default: null },
		expiresAt: { 
			type: Date, 
			required: true,
			default: () => new Date(Date.now() + userRefreshTokenExpirationTime * 24 * 60 * 60 * 1000)
		},
		ipAddress: { type: String },
		userAgent: { type: String },
		previousTokenId: {
			type: Schema.Types.ObjectId,
			ref: "RefreshToken",
			default: null,
		},
	},
	{ timestamps: true }
);

refreshTokenSchema.index({ userId: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model<IRefreshToken>("RefreshToken", refreshTokenSchema);
