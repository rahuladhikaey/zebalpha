export type Order = {
	id: number;
	customer_name: string;
	phone: string;
	address: string;
	product_details: string;
	order_status: string;
	payment_status: string;
	payment_method: string;
	razorpay_order_id?: string;
	razorpay_payment_id?: string;
	shipment_id?: string;
	shiprocket_order_id?: string;
	total_amount: number;
	created_at: string;
};

export type OrderPayload = {
	customer_name: string;
	phone: string;
	address: string;
	items: Array<{ name: string; quantity: number; price: number; subtotal: number }>;
	total: number;
};
