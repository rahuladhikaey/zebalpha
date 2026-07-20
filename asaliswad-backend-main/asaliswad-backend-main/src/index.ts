import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRouter from "@/modules/auth/v1/auth.routes";
import usersRouter from "@/modules/users/v1/users.routes";
import catecoriesRouter from "@/modules/categories/v1/category.routes";
import errorHandler from "@/middlewares/global.error-handler";

import { connectDB } from "@/config/db";
import { registerCronJobs } from "@/cron";

await connectDB();
registerCronJobs();

const app = express();
const port = process.env.PORT || 5000;

app.set("trust proxy", true);
app.use(cookieParser());
app.use(express.json());
const allowedOrigins = [
	"http://localhost:3000",
	"http://localhost:3001",
	"https://asaliswad.com",
	"https://www.asaliswad.com",
	"https://admin.asaliswad.com",
	"https://api.asaliswad.com",
	process.env.CLIENT_URL,
	process.env.ADMIN_URL,
].filter(Boolean) as string[];

app.use(cors({
	origin: (origin, callback) => {
		if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".onrender.com")) {
			callback(null, true);
		} else {
			callback(null, true);
		}
	},
	credentials: true,
}));

app.use("/v1/auth", authRouter);
app.use("/v1/users", usersRouter);
app.use("/v1/categories", catecoriesRouter);

app.get("/health", 
	(_req, res) => {
		res.status(200).json({
			statusCode: 200,
			message: "Server alive"
		});
	}
);

app.use(errorHandler);

app.listen(port, 
	() => console.log(`[+] Server running on port ${port}`)
);
