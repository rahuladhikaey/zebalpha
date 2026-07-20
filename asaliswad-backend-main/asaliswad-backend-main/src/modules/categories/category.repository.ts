import { 
	Category, 
	type ICategory 
} from "@/modules/categories/models/category.model";
import type { CreateCategoryPayload } from "@/types/category";
import { z } from "zod";

export const getCategoryById = async (id: string) => {
    return await Category.findById(id);
}

export const getCategoryBySlug = async (slug: string) => {
	return await Category.findOne({ slug });
};

export const getCategories = async () => {
	return await Category.find().sort({ sortOrder: 1, name: 1 });
};

export const createCategory = async (payload: CreateCategoryPayload) => {
    return await Category.create({
        name: payload.name,
		slug: z.string().slugify().parse(payload.name),
        description: payload.description,
        imageUrl: payload.imageUrl,
        isActive: payload.isActive,
        sortOrder: payload.sortOrder
	});
};
