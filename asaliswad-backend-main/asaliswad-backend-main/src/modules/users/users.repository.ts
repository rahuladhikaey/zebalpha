import { User, type IUser } from "@/modules/users/models/user.model";
import type { CreateUserPayload } from "@/types/auth";

export const getUserById = async (id: string) => {
    return await User.findById(id);
}

export const getUserByPhoneNo = async (phoneNo: string) => {
    return await User.findOne({ phoneNo });
}

export const getUserByEmail = async (email: string) => {
    return await User.findOne({ email });
}

export const createUser = async (user: CreateUserPayload) => {
    return await User.create({
		fullName: user.fullName,
        email: user.email,
        passwordHash: user.passwordHash,
        phoneNo: user.phoneNo,
        gender: user.gender
	});
}

export const updateUser = async (id: string, user: Partial<IUser>) => {
    return await User.findByIdAndUpdate(id, user, { returnDocument: "after" });
}
