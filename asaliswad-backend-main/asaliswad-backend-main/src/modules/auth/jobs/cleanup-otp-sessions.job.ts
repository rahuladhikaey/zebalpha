import { OtpSession } from "@/modules/auth/models/otp-session.model";
import { OtpSessionLog } from "@/modules/auth/models/otp-session-log.model";

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

const cleanupOtpSessions = async () => {
	const now = new Date();

	// DESC: find OTP sessions that are still "pending" or "locked" but have passed their expiry time
	// RESP: mark those sessions as "expired" and log the change for each
	const expiringSessions = await OtpSession.find(
		{ status: { $in: ["pending", "locked"] }, expiresAt: { $lt: now } },
		{ _id: 1 }
	);

	if (expiringSessions.length > 0) {
		const expiringSessionIds = expiringSessions.map((s) => s._id);

		await OtpSession.updateMany(
			{ _id: { $in: expiringSessionIds } },
			{ $set: { status: "expired" } }
		);

		await OtpSessionLog.insertMany(
			expiringSessionIds.map((otpSessionId) => ({
				otpSessionId,
				action: "expired",
			}))
		);
	}

	// DESC: find OTP sessions that expired more than a month ago
	// RESP: permanently delete those sessions along with their associated logs
	const oneMonthAgo = new Date(now.getTime() - ONE_MONTH_MS);
	const staleSessions = await OtpSession.find(
		{ expiresAt: { $lt: oneMonthAgo } },
		{ _id: 1 }
	);
	if (staleSessions.length === 0) return;

	const staleSessionIds = staleSessions.map((s) => s._id);

	await OtpSessionLog.deleteMany({ otpSessionId: { $in: staleSessionIds } });
	await OtpSession.deleteMany({ _id: { $in: staleSessionIds } });
};

export default cleanupOtpSessions;
