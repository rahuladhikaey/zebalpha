import mongoose, { 
	Schema, 
	Document, 
	Types 
} from "mongoose";
import { 
	productLogActionEnum, 
	type ProductLogAction 
} from "@/types/product";

export interface IProductLog extends Document {
	productId: Types.ObjectId;
	action: ProductLogAction;
	meta?: Record<string, unknown>;
	performedBy?: Types.ObjectId; 
}

const productLogSchema = new Schema<IProductLog>(
	{
		productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
		action: {
			type: String,
			enum: productLogActionEnum.options,
			required: true,
		},
		meta: { type: Schema.Types.Mixed },
		performedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
	},
	{ timestamps: true }
);

productLogSchema.index({ productId: 1 });

export const ProductLog = mongoose.model<IProductLog>("ProductLog", productLogSchema);
