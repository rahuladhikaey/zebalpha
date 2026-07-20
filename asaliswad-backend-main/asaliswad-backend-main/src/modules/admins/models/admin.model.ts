import mongoose, { 
	Schema, 
	Document, 
	Types 
} from "mongoose";
import { 
	AdminStatusEnum, 
	type AdminStatus 
} from "@/types/admin";

export interface IAdmin extends Document {
	name: string;
	username: string;
	email: string;
	passwordHash: string;
	createdBy?: Types.ObjectId | null;
	status: AdminStatus;
	emailVerifiedAt?: Date | null;
    lastLoginAt?: Date | null;
}

const adminSchema = new Schema<IAdmin>(
	{
		name: { type: String, required: true },
		username: { type: String, required: true, unique: true },
		email: { type: String, required: true, unique: true },
		passwordHash: { type: String, required: true },
		createdBy: {
			type: Schema.Types.ObjectId,
			ref: "Admin",
			default: null,
		},
		status: {
			type: String,
			enum: AdminStatusEnum.options,
			default: "verification_pending",
			required: true,
		},
        emailVerifiedAt: { type: Date, default: null },
        lastLoginAt: { type: Date, default: null },
	},
	{ timestamps: true }
);

export const Admin = mongoose.model<IAdmin>("Admin", adminSchema);
