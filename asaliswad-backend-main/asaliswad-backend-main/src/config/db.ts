import mongoose from "mongoose";

const databaseUrl = process.env.DATABASE_URL as string;
if(!databaseUrl) if(!databaseUrl) throw new Error("DATABASE_URL is not defined");

export async function connectDB() {
	try {
		await mongoose.connect(databaseUrl);
		console.log("[+] MongoDB connected!");
	} catch (err) {
		console.error("[!] MongoDB connection error:", err);
		process.exit(1);
	}
}
