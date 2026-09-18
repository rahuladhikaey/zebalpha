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
	category?: string;
	offers?: string[];
	specifications?: Record<string, string>;
	brand?: string;
	stock?: number;
	low_stock_limit?: number;
	sku?: string;
	status?: string;
	is_active?: boolean;
	is_approved?: boolean;
	approval_status?: string;
	seller_id?: string;
	packages?: ProductPackage[];
	is_premium?: boolean;
	is_new_drop?: boolean;
	collection?: string;
	drop_date?: string;
	target_drop_date?: string;
	tier?: string;
};


export type CartItem = Product & {
	quantity: number;
};
