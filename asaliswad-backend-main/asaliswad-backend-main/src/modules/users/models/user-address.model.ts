import mongoose, { 
	Schema, 
	Document
} from "mongoose";

export interface IUserAddress extends Document {
	userId: string;
	name: string;
	phone: string;
	label: string;
	country: string;
	state: string;
	city: string;
	postOffice: string;
	pincode: string;
	addressDetail: string;
	isDefault: boolean;
}

const userAddressSchema = new Schema<IUserAddress>(
	{
		userId: { type: String, required: true },
		name: { type: String, required: true },
		phone: { type: String, required: true },
		label: { type: String, required: true },
		country: { type: String, required: true },
		state: { type: String, required: true },
		city: { type: String, required: true },
		postOffice: { type: String, required: true },
		pincode: { type: String, required: true },
		addressDetail: { type: String, required: true },
		isDefault: { type: Boolean, default: false, required: true },
	},
	{ timestamps: true }
);

userAddressSchema.index({ userId: 1 });

export const UserAddress = mongoose.model<IUserAddress>("UserAddress", userAddressSchema);
