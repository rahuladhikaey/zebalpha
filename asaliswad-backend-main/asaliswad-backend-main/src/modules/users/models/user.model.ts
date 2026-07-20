import mongoose, { 
	Schema, 
	Document
} from "mongoose";
import { 
	GenderEnum,
    UserStatusEnum,
	type Gender, 
	type UserStatus 
} from "@/types/user";

export interface IUser extends Document {
	fullName: string;
	email: string;
	phoneNo?: string;
	passwordHash?: string;
	gender: Gender;
	status: UserStatus;
	deletedAt?: Date | null;
	emailVerifiedAt?: Date | null;
	lastLoginAt?: Date | null;
}

const userSchema = new Schema<IUser>(
	{
		fullName: { type: String, required: true },
		email: { type: String, required: true, unique: true },
		phoneNo: { type: String, unique: true, sparse: true },
		passwordHash: { type: String },
		gender: {
			type: String,
			enum: GenderEnum.options,
			default: "prefer_not_to_say",
			required: true,
		},
		status: {
			type: String,
			enum: UserStatusEnum.options,
			default: "verification_pending",
			required: true,
		},
		deletedAt: { type: Date, default: null },
        emailVerifiedAt: { type: Date, default: null },
		lastLoginAt: { type: Date, default: null },
	},
	{ timestamps: true}
);

export const User = mongoose.model<IUser>("User", userSchema);
