import { z } from "zod";

export const AdminStatusEnum = z.enum(["verification_pending", "active", "banned"]);

export type AdminStatus = z.infer<typeof AdminStatusEnum>;

export const safeAdminSchema = z.object({
	id: z.string(),
	name: z.string(),
	username: z.string(),
	email: z.email(),
	status: AdminStatusEnum,
	createdBy: z.string().nullable().optional(),
	lastLoginAt: z.date().nullable().optional(),
});

export type SafeAdmin = z.infer<typeof safeAdminSchema>;

