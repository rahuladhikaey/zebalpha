import { z } from "zod";

export const createCategoryPayloadSchema = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	imageUrl: z.url().optional(),
	sortOrder: z.number().int().optional(),
	isActive: z.boolean().optional()
});

export type CreateCategoryPayload = z.infer<typeof createCategoryPayloadSchema>;
