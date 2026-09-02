export type ProductPackage = {
	id: string;
	name: string;
	price: number;
	mrp?: number;
	isBestSeller?: boolean;
};

export type Product = {
	id: number;
	name: string;
	price: number;
	mrp?: number;
	description: string;
	image_url: string;
	images?: string[];
	category_id: number;
	category_name?: string;
	offers?: string[];
	specifications?: Record<string, string>;
	brand?: string;
	stock?: number;
	sku?: string;
	low_stock_limit?: number;
	status?: string;
	packages?: ProductPackage[];
};


export type CartItem = Product & {
	quantity: number;
};
