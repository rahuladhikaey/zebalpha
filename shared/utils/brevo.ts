export async function sendOtpEmail(toEmail: string, otpCode: string): Promise<boolean> {
	const apiKey = process.env.BREVO_API_KEY;
	const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL || "noreply@zebalpha.com";
	const senderName = process.env.BREVO_SENDER_NAME || "ZEBALPHA";

	if (!apiKey) {
		console.warn("[Brevo Warning] BREVO_API_KEY is not configured in .env.local.");
		return false;
	}

	try {
		const response = await fetch("https://api.brevo.com/v3/smtp/email", {
			method: "POST",
			headers: {
				"accept": "application/json",
				"api-key": apiKey,
				"content-type": "application/json",
			},
			body: JSON.stringify({
				sender: {
					name: senderName,
					email: senderEmail,
				},
				to: [
					{
						email: toEmail,
					},
				],
				subject: `${otpCode} is your ZEBALPHA verification code`,
				htmlContent: `
					<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #09090b; border-radius: 12px; border: 1px solid #27272a; color: #ffffff;">
						<div style="text-align: center; margin-bottom: 20px;">
							<h1 style="color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: 2px; margin: 0;">ZEBALPHA</h1>
							<p style="color: #a1a1aa; font-size: 12px; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">Elevated Streetwear & Apparel</p>
						</div>
						<div style="background-color: #18181b; padding: 24px; border-radius: 12px; text-align: center; border: 1px solid #27272a;">
							<p style="color: #d4d4d8; font-size: 15px; margin-bottom: 16px;">Use the verification code below to complete your registration:</p>
							<div style="display: inline-block; background-color: #27272a; border: 1px solid #3f3f46; padding: 12px 28px; border-radius: 8px; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #ffffff; margin-bottom: 16px;">
								${otpCode}
							</div>
							<p style="color: #71717a; font-size: 12px; margin-top: 12px;">This code will expire in 60 seconds. Do not share this code with anyone.</p>
						</div>
					</div>
				`,
			}),
		});

		if (!response.ok) {
			const errorData = await response.json();
			console.error("[Brevo Error] Failed to send email:", errorData);
			return false;
		}

		return true;
	} catch (error) {
		console.error("[Brevo Exception] Failed to send OTP email:", error);
		return false;
	}
}
