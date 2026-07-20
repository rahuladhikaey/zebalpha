import cron from "node-cron";
import cleanupOtpSessions from "@/modules/auth/jobs/cleanup-otp-sessions.job";

export const registerCronJobs = () => {
	cron.schedule("* * * * *", cleanupOtpSessions); 
	console.log("[+] Cron jobs registered");
};
