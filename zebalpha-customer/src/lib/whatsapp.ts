export interface OrderConfirmationPayload {
  phone: string;
  orderId: string | number;
  customerName: string;
  totalAmount: number;
  items: Array<{ name: string; quantity: number; price: number }>;
}

/**
 * Sends order confirmation via WhatsApp Cloud API or Meta WhatsApp Business Gateway.
 */
export async function sendWhatsAppOrderConfirmation(payload: OrderConfirmationPayload): Promise<boolean> {
  const whatsappToken = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!whatsappToken || !phoneNumberId) {
    console.warn('WhatsApp API credentials missing (WHATSAPP_API_TOKEN / WHATSAPP_PHONE_NUMBER_ID). Skipping notification.');
    return false;
  }

  // Format recipient phone number (remove spaces/dashes, ensure 91 prefix for India if 10 digits)
  let formattedPhone = payload.phone.replace(/\D/g, '');
  if (formattedPhone.length === 10) {
    formattedPhone = `91${formattedPhone}`;
  }

  const itemSummary = payload.items
    .map((item) => `${item.name} (x${item.quantity})`)
    .join(', ');

  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: 'order_confirmation',
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: payload.customerName },
                { type: 'text', text: String(payload.orderId) },
                { type: 'text', text: itemSummary },
                { type: 'text', text: `₹${payload.totalAmount}` },
              ],
            },
          ],
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('WhatsApp API Error:', data);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send WhatsApp notification:', error);
    return false;
  }
}
