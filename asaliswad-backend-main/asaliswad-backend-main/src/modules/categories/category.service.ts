import {
	createCategory as createCategoryRepo,
	getCategoryBySlug,
	getCategories as getCategoriesRepo
} from "@/modules/categories/category.repository";
import type { CreateCategoryPayload } from "@/types/category";
import { AppError } from "@/utils/app-error";
import { z } from "zod";

export const createCategory = async (payload: CreateCategoryPayload) => {
	const slug = z.string().slugify().parse(payload.name);

	const existingCategory = await getCategoryBySlug(slug);
	if(existingCategory) throw new AppError("category with this name already exists", 409);

	const category = await createCategoryRepo(payload);
	if(!category) throw new AppError("failed to create category", 500);

	return category;
};

export const getCategories = async () => {
	const categories = await getCategoriesRepo();

    return categories;
};
