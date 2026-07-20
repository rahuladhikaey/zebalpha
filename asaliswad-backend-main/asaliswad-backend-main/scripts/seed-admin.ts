import "dotenv/config";
import readline from "readline/promises";
import { stdin, stdout } from "node:process";
import { connectDB } from "@/config/db";
import { Admin } from "@/modules/admins/models/admin.model";
import { hashAdminPassword } from "@/utils/password";

const rl = readline.createInterface({ input: stdin, output: stdout });

async function seedAdmin() {
	await connectDB();

	const name = await rl.question("Admin full name: ");
	const username = await rl.question("Admin username: ");
	const email = await rl.question("Admin email: ");
	const password = await rl.question("Admin password: ");

	const existing = await Admin.findOne({ email });
	if (existing) {
		console.log("[!] An admin with this email already exists. Aborting.");
		rl.close();
		process.exit(1);
	}

	const passwordHash = await hashAdminPassword(password);

	const admin = await Admin.create({
		name,
		username,
		email,
		passwordHash,
		status: "active", 
		createdBy: null,   
	});

	console.log(`[+] Seed admin created: ${admin.email} (${admin._id.toString()})`);
	rl.close();
	process.exit(0);
}

seedAdmin().catch((err) => {
	console.error("[!] Failed to seed admin:", err);
	process.exit(1);
});
