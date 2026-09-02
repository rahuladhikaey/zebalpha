import axios from 'axios';

/**
 * Send an email notification using the Brevo SMTP API
 * @param {string} toEmail - Recipient email
 * @param {string} subject - Email subject
 * @param {string} messageHtml - Email body in HTML format
 * @returns {Promise<boolean>} - Success status
 */
export async function sendSellerStatusEmail(toEmail, subject, messageHtml, attachmentUrl = null, attachmentName = 'receipt.pdf') {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@asaliswad.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'Asali Swad';

  if (!apiKey) {
    console.warn('[Brevo Warning] BREVO_API_KEY is not configured in environment.');
    return false;
  }

  try {
    const payload = {
      sender: {
        name: senderName,
        email: senderEmail
      },
      to: [
        {
          email: toEmail
        }
      ],
      subject: subject,
      htmlContent: messageHtml
    };

    if (attachmentUrl) {
      payload.attachment = [
        {
          url: attachmentUrl,
          name: attachmentName
        }
      ];
    }

    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      payload,
      {
        headers: {
          'accept': 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json'
        }
      }
    );

    return response.status === 201 || response.status === 200;
  } catch (error) {
    console.error('[Brevo Error] Failed to send status email:', error.response?.data || error.message);
    return false;
  }
}
