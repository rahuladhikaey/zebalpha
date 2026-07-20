import { z } from "zod";

export const GenderEnum = z.enum(["male", "female", "other", "prefer_not_to_say"]);
export const UserStatusEnum = z.enum(["verification_pending", "active", "banned"]);

export type Gender = z.infer<typeof GenderEnum>;
export type UserStatus = z.infer<typeof UserStatusEnum>;

export const safeUserSchema = z.object({
	id: z.string(),
	fullName: z.string(),
	email: z.email(),
	phoneNo: z.string().optional(),
	gender: GenderEnum,
	status: UserStatusEnum,
	lastLoginAt: z.date().nullable().optional(),
});

export type SafeUser = z.infer<typeof safeUserSchema>;
