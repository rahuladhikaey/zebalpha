import argon2 from 'argon2';

const userPepper = process.env.USER_PASSWORD_PEPPER as string;
const adminPepper = process.env.ADMIN_PASSWORD_PEPPER as string;

if(!userPepper) throw new Error("USER_PASSWORD_PEPPER is not defined");
if(!adminPepper) throw new Error("ADMIN_PASSWORD_PEPPER is not defined");

export const hashUserPassword = async (password: string): Promise<string> => {
	return await argon2.hash(password + userPepper,{
        memoryCost: 8192, 
        timeCost: 2, 
        parallelism: 1, 
    });
};

export const verifyUserPassword = async (password: string, hash: string): Promise<boolean> => {
	return await argon2.verify(hash, password + userPepper);
};

export const hashAdminPassword = async (password: string): Promise<string> => {
	return await argon2.hash(password + adminPepper,{
        memoryCost: 8192, 
        timeCost: 2, 
        parallelism: 1, 
    });
};

export const verifyAdminPassword = async (password: string, hash: string): Promise<boolean> => {
	return await argon2.verify(hash, password + adminPepper);
};
