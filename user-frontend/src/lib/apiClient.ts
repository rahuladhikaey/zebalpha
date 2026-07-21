import { createClient } from "@/utils/supabase/client";

export async function fetchProducts(params?: { categoryId?: string; search?: string }) {
	const supabase = createClient();
	let query = supabase.from("products").select("*, categories(*)").eq("is_active", true);

	if (params?.categoryId) {
		query = query.eq("category_id", params.categoryId);
	}

	if (params?.search) {
		query = query.ilike("name", `%${params.search}%`);
	}

	const { data, error } = await query.order("created_at", { ascending: false });
	if (error) throw error;
	return data;
}

export async function fetchProductById(id: string) {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("products")
		.select("*, categories(*)")
		.eq("id", id)
		.single();

	if (error) throw error;
	return data;
}

export async function fetchCategories() {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("categories")
		.select("*")
		.eq("is_active", true)
		.order("sort_order", { ascending: true });

	if (error) throw error;
	return data;
}
