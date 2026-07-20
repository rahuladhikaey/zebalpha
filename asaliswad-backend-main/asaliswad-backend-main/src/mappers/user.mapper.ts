import type { IUser } from "@/modules/users/models/user.model";
import { safeUserSchema, type SafeUser } from "@/types/user";

export const toSafeUser = (user: IUser): SafeUser => {
	return safeUserSchema.parse({
		id: user._id.toString(),
		fullName: user.fullName,
		email: user.email,
		phoneNo: user.phoneNo,
		gender: user.gender,
		status: user.status,
		lastLoginAt: user.lastLoginAt,
	});
};
