const WHATSAPP_NUMBER = "919883637054";

export const encodeWhatsAppMessage = (message: string) => {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
};

export const buildProductOrderMessage = (name: string, price: number, quantity: number) => {
  return `Hello, I want to order ${name} \nPrice: ₹${price} \nQuantity: ${quantity} \nPlease let me know the next steps for Cash on Delivery.`;
};

export const buildCheckoutMessage = (order: {
  customer_name: string;
  phone: string;
  address: string;
  items: Array<{ name: string; quantity: number; price: number; subtotal: number }>;
  total: number;
}) => {
  const lines = [
    `Hello, I would like to place an order.`,
    `Name: ${order.customer_name}`,
    `Phone: ${order.phone}`,
    `Address: ${order.address}`,
    `Payment: Cash on Delivery`,
    ``,
    `Order Summary:`,
    ...order.items.map(
      (item) => `• ${item.name} x ${item.quantity} = ₹${item.subtotal}`
    ),
    ``,
    `Total: ₹${order.total}`,
    ``,
    `Please confirm my order and send the payment link.`,
  ];
  return encodeWhatsAppMessage(lines.join("\n"));
};
