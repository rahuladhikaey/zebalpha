import mongoose, { 
	Schema, 
	Document, 
	Types 
} from "mongoose";

export interface IProductPackage {
	name: string;
	price: number;
	mrp?: number;
	isBestSeller?: boolean;
	sku?: string;
	stock: number;
}

export interface IProduct extends Document {
	name: string;
	slug: string;
	description: string;
	imageUrl: string;
	images?: string[];
	categoryId: Types.ObjectId;
	brand?: string;
	specifications?: Record<string, string>;
	offers?: string[];
	packages: IProductPackage[];
	lowStockLimit?: number;
	isActive: boolean;
}

const productPackageSchema = new Schema<IProductPackage>(
	{
		name: { type: String, required: true },
		price: { type: Number, required: true },
		mrp: { type: Number },
		isBestSeller: { type: Boolean, default: false },
		sku: { type: String },
		stock: { type: Number, required: true, default: 0 },
	},
	{ _id: true } 
);

const productSchema = new Schema<IProduct>(
	{
		name: { type: String, required: true },
		slug: { type: String, required: true, unique: true },
		description: { type: String, required: true },
		imageUrl: { type: String, required: true },
		images: { type: [String] },
		categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
		brand: { type: String },
		specifications: { type: Schema.Types.Mixed },
		offers: { type: [String] },
		packages: {
			type: [productPackageSchema],
			required: true,
			validate: {
				validator: (v: IProductPackage[]) => v.length > 0,
				message: "product must have at least one package",
			},
		},
		lowStockLimit: { type: Number },
		isActive: { type: Boolean, default: true, required: true },
	},
	{ timestamps: true }
);

productSchema.index({ categoryId: 1 });
productSchema.index({ name: "text", description: "text" }); // for search

export const Product = mongoose.model<IProduct>("Product", productSchema);
