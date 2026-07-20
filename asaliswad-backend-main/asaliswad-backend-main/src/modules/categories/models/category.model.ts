import mongoose, {
	Schema, 
	Document 
} from "mongoose";

export interface ICategory extends Document {
	name: string;
	slug: string;
	description?: string;
	imageUrl?: string;
	isActive: boolean;
	sortOrder: number;
}

const categorySchema = new Schema<ICategory>(
	{
		name: { type: String, required: true, unique: true },
		slug: { type: String, required: true, unique: true },
		description: { type: String },
		imageUrl: { type: String },
		isActive: { type: Boolean, default: true, required: true },
		sortOrder: { type: Number, default: 0, required: true },
	},
	{ timestamps: true }
);


export const Category = mongoose.model<ICategory>("Category", categorySchema);
