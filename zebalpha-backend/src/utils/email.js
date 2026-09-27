import axios from 'axios';

/**
 * Send an email notification using EmailJS REST API
 * @param {string} toEmail - Recipient email
 * @param {string} subject - Email subject
 * @param {string} messageHtml - Email body in HTML format
 * @param {string|null} attachmentUrl - Optional attachment URL
 * @param {string} attachmentName - Optional attachment filename
 * @returns {Promise<boolean>} - Success status
 */
export async function sendSellerStatusEmail(toEmail, subject, messageHtml, attachmentUrl = null, attachmentName = 'receipt.pdf') {
  const serviceId = (process.env.EMAILJS_SERVICE_ID || process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || 'service_5apvm6b').trim();
  const templateId = (process.env.EMAILJS_TEMPLATE_ID || process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || 'template_hhuloji').trim();
  const publicKey = (process.env.EMAILJS_PUBLIC_KEY || process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || 'ZR5LIJWz_4EsCSc_a').trim();

  if (!serviceId || !templateId || !publicKey) {
    console.warn('[EmailJS Warning] EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, or EMAILJS_PUBLIC_KEY is not configured in environment.');
    return false;
  }

  try {
    const timeStr = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });

    const payload = {
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      template_params: {
        to_email: toEmail,
        email: toEmail,
        recipient_email: toEmail,
        subject: subject,
        message: messageHtml,
        message_html: messageHtml,
        passcode: '',
        attachment_url: attachmentUrl || '',
        attachment_name: attachmentName,
        time: `${timeStr} IST`
      }
    };

    const response = await axios.post(
      'https://api.emailjs.com/api/v1.0/email/send',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Origin': 'https://dashboard.emailjs.com'
        }
      }
    );

    return response.status === 200 || response.status === 201;
  } catch (error) {
    console.error('[EmailJS Error] Failed to send status email:', error.response?.data || error.message);
    return false;
  }
}
