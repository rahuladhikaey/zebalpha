import {
	brevo,
	otpEmail,
	otpExpiryTime,
	year,
} from "@/config/brevo";
import type { OtpPurpose } from "@/types/auth";
import { capitalizeWords } from "@/utils/string";

const otpEmailPurposeMap: Record<OtpPurpose, string> = {
	email_verification: "Confirm your email address",
	password_reset: "Reset your password",
	email_change: "Verify your new email address",
	login: "Your Asali Swad login code",
};

export const sendOtpEmail = async (
	name: string,
	email: string,
	otp: string,
	purpose: OtpPurpose
) => {
	const transacEmail = {
		sender: {
			name: "Asali Swad",
			email: otpEmail,
		},
		to: [
			{
				name: capitalizeWords(name),
				email: email,
			},
		],
		subject: otpEmailPurposeMap[purpose],
		htmlContent: `
		<!DOCTYPE html>
		<html>
			<head>
				<meta charset="UTF-8" />
				<title>${otpEmailPurposeMap[purpose]}</title>
			</head>
			<body style="margin:0; padding:0; background-color:#f4f6f5; font-family:'Segoe UI', Arial, sans-serif;">
				<table width="100%" cellpadding="0" cellspacing="0" border="0">
					<tr>
						<td align="center" style="padding:40px 16px;">
							<table width="480" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.06);">
								<!-- Top accent bar -->
								<tr>
									<td style="background:#065f46; height:6px;"></td>
								</tr>
								<tr><td height="32"></td></tr>
								<!-- Brand -->
								<tr>
									<td align="center" style="font-size:22px; font-weight:700; color:#065f46; letter-spacing:0.5px;">
										Asali Swad
									</td>
								</tr>
								<tr><td height="24"></td></tr>
								<!-- Title -->
								<tr>
									<td align="center" style="padding:0 32px; font-size:18px; font-weight:600; color:#0f172a;">
										${otpEmailPurposeMap[purpose]}
									</td>
								</tr>
								<tr><td height="12"></td></tr>
								<!-- Greeting -->
								<tr>
									<td style="padding:0 32px; font-size:14px; color:#475569; line-height:1.7;">
										Hi ${capitalizeWords(name)}, use the code below to continue. It's valid for a short time only.
									</td>
								</tr>
								<tr><td height="28"></td></tr>
								<!-- OTP -->
								<tr>
									<td align="center">
										<div style="
											display:inline-block;
											padding:16px 36px;
											font-size:28px;
											letter-spacing:8px;
											font-weight:700;
											color:#065f46;
											background:#ecfdf5;
											border:1px solid #10b981;
											border-radius:10px;
										">
											${otp}
										</div>
									</td>
								</tr>
								<tr><td height="20"></td></tr>
								<!-- Expiry -->
								<tr>
									<td align="center" style="font-size:13px; color:#64748b;">
										Expires in <strong>${otpExpiryTime} minutes</strong>
									</td>
								</tr>
								<tr><td height="28"></td></tr>
								<!-- Divider -->
								<tr>
									<td style="padding:0 32px;">
										<div style="border-top:1px solid #e2e8f0;"></div>
									</td>
								</tr>
								<tr><td height="20"></td></tr>
								<!-- Warning -->
								<tr>
									<td style="padding:0 32px 32px; font-size:12px; color:#94a3b8; line-height:1.6; text-align:center;">
										Never share this code with anyone.<br>
										Didn't request this? You can safely ignore this email.
									</td>
								</tr>
							</table>
							<!-- Footer -->
							<table width="480" cellpadding="0" cellspacing="0" border="0">
								<tr>
									<td align="center" style="font-size:11px; color:#94a3b8; padding-top:16px;">
										© ${year} Asali Swad. All rights reserved.
									</td>
								</tr>
							</table>
						</td>
					</tr>
				</table>
			</body>
		</html>
		`,
	};

	try {
		await brevo.transactionalEmails.sendTransacEmail(transacEmail);
	} catch (error) {
		console.error("Error sending email:", error);
	}
};
