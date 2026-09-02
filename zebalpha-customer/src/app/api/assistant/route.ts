import { NextResponse } from "next/server";

const CLOTHING_STORE_KNOWLEDGE = `
# ZEBALPHA Clothing Store - Alpha AI Knowledge & Guidelines

## Store Identity & Support
Brand: ZEBALPHA (Premium Apparel, Zip Polos, Oversized Streetwear Tees, Heavyweight Hoodies, Casual Collared Shirts).
Standard Return Policy: 5-DAY RETURN POLICY. Customers can request a return within 5 days of delivery.
Return Conditions: Unused, unwashed, unworn, original condition, original tags attached, original packaging, free from damage/stains/perfume/makeup.

## Comprehensive Rules:
1. Welcome: Hello! I'm Alpha AI, your virtual shopping assistant for ZEBALPHA.
2. Product Info: Fabrics include 100% Combed & Supima Cotton. Items include Zip Polos, Oversized Streetwear Tees, Heavyweight Hoodies, Casual Shirts.
3. Size Guide: Refer to Size Chart on product page. Ask customer for height, weight, chest/waist measurements, and fit preference (Slim/Regular/Loose).
4. Placing Order: Select product -> Size/Color -> Add to Cart -> Checkout -> Enter Address & Payment -> Confirm.
5. Tracking Order: Ask for Order ID. Statuses: Confirmed, Processing, Shipped, Out for Delivery, Delivered.
6. Delivery: Takes 2-5 business days. Charges displayed at checkout.
7. Payment Methods: UPI (GPay, PhonePe, Paytm), Credit/Debit Cards, Net Banking, Wallets, Cash on Delivery (COD).
8. Payment Failed / Deducted: Advise not to re-pay immediately. Money reflects back in 3-5 days or status updates automatically. Collect Transaction ID for support review.
9. 5-Day Return Window: Standard return window is strictly 5 days from delivery via My Account -> My Orders -> Request Return.
10. Expired Return Window: If delivered > 5 days ago, standard return is unavailable. Escalate to support if damaged/wrong item.
11. Damaged / Wrong / Defective Product: Request Order ID and photos of damaged area, full product, tag, and package label.
12. Exchange: Available for size/color within 5 days if stock permits.
13. Refund Policy: Processed after inspection (3-5 business days) to original payment method or UPI/Bank for COD.
14. Cancellation: Cancel before shipping under My Account -> My Orders.
15. Coupons: Apply at checkout under Promo Code.
16. Safety Warning: ZEBALPHA will NEVER ask for OTP, ATM PIN, UPI PIN, CVV, or passwords.
17. Human Support Escalation: Provide Live Chat, Call, or Email Support options with Order ID when requested or unresolvable.
`;

const fallbackResponse = (prompt: string): string => {
  const normalized = prompt.toLowerCase();

  // 1. Greetings & Hello
  if (/(hello|hi|hey|greetings|start|who are you)/i.test(normalized)) {
    return `👋 Hi! Welcome to **ZEBALPHA**.

I’m **Alpha AI**, your virtual shopping assistant. I can help you with:

🛍️ Products & Sizes
📦 Order Tracking
🚚 Shipping & Delivery
🔄 5-Day Returns & Exchanges
💰 Refunds
💳 Payments & COD
🎁 Offers & Discounts
👨‍💼 Customer Support

How can I help you today?`;
  }

  // 2. Product Info
  if (/(product|fabric|cotton|material|supima|polos|tees|hoodie|shirt|collection|clothing)/i.test(normalized)) {
    return `🛍️ **ZEBALPHA Product Information**:

• **Fabrics**: 100% Premium Combed & Supima Cotton for maximum comfort and durability.
• **Collections**: Premium Zip Polos, Oversized Streetwear Tees, Heavyweight Hoodies, and Casual Collared Shirts.
• **Details**: All items are crafted for relaxed modern fits with 100% color fastness.

Tell me the item or category you're looking for, and I can help check size and availability!`;
  }

  // 3. Size Guide
  if (/(size|fit|chart|measurement|large|medium|small|xl|xxl|chest|waist|weight|height)/i.test(normalized)) {
    return `📏 **Size Guide**:

Choosing the right size is important! Please check the **Size Chart** on the product page before ordering.

If you need help choosing, please tell me:
1. Your height
2. Your weight
3. Chest / Waist measurement
4. Preferred fit (Slim / Regular / Loose)

⚠️ *Note: Size recommendations are suggestions; fit may vary by product design.*`;
  }

  // 4. Track My Order & Order Status
  if (/(track|where is my order|status|shipped|delivery status|order id|order status)/i.test(normalized)) {
    return `📦 **Track Your Order**:

Please provide your **Order ID** (e.g. #ORD-12345).

You can also check your live order tracking from:
**My Account → My Orders → Track Order**

Statuses include:
• ✅ **Confirmed**: Prepared for dispatch
• 📦 **Processing**: Item packing
• 🚚 **Shipped**: In transit with tracking link
• 🏠 **Out for Delivery**: Arriving today
• 🎉 **Delivered**: Successfully delivered!`;
  }

  // 5. 5-Day Return Policy & Return Request
  if (/(return|5-day|5 day|back|exchange|policy|how to return)/i.test(normalized)) {
    return `⭐ **5-DAY RETURN POLICY**:

You can request a return or size exchange within **5 days of delivery**!

**Return Conditions**:
✅ Unused, unwashed & unworn
✅ Original tags attached & original packaging
✅ Free from stains, damage, perfume, or makeup

**How to Request**:
1. Go to **My Account → My Orders**
2. Select your order & click **Request Return / Exchange**
3. Choose reason and submit!`;
  }

  // 6. Return Window Expired
  if (/(expired|7 days|10 days|late return|after 5 days)/i.test(normalized)) {
    return `😔 Our standard return window is **5 days from delivery**.

If your order was delivered more than 5 days ago, a standard return is unavailable.

If you received a **damaged, wrong, or defective item**, please contact our support team with your Order ID and photos so we can review your case separately!`;
  }

  // 7. Wrong / Damaged / Defective Product
  if (/(damaged|defective|wrong item|broken|stain|bad quality|wrong product|tear)/i.test(normalized)) {
    return `🙏 We are so sorry about that!

Please submit a return/replacement request from **My Account → My Orders**, or send customer support:
1. Order ID
2. Photos of the damaged/wrong area
3. Photo of full product & original tags
4. Shipping label photo

Our team will inspect and arrange a free replacement or full refund!`;
  }

  // 8. Delivery Information & Shipping Charges
  if (/(delivery|shipping|charge|free shipping|how long|dispatch|days)/i.test(normalized)) {
    return `🚚 **Delivery & Shipping Info**:

• **Delivery Time**: Usually 2–5 business days depending on your pincode.
• **Shipping Fee**: Applicable shipping charges (or FREE Shipping on eligible orders) are displayed clearly at checkout.
• Tracking updates are sent via SMS and Email as soon as your package is dispatched!`;
  }

  // 9. COD & Online Payment Methods
  if (/(payment|cod|cash on delivery|upi|gpay|phonepe|card|netbanking|wallet)/i.test(normalized)) {
    return `💳 **Payment Methods**:

We accept:
• 📱 **UPI** (Google Pay, PhonePe, Paytm, BHIM)
• 💳 **Credit & Debit Cards** (Visa, MasterCard, RuPay)
• 🏦 **Net Banking & Wallets**
• 💵 **Cash on Delivery (COD)** (Available for eligible pincodes at checkout)

Select your preferred option on the checkout page!`;
  }

  // 10. Payment Failed / Payment Deducted
  if (/(failed|deducted|money gone|double charged|payment error|debited)/i.test(normalized)) {
    return `⚠️ **Payment Issue Guidance**:

If your payment failed or money was deducted without order confirmation:
1. Please do not make an immediate duplicate payment.
2. The payment status often updates automatically within 2 hours.
3. If money was debited, your bank will refund it automatically within 3–5 business days.

If it doesn't reflect, contact support with your **Transaction/Reference ID**, date, and amount!`;
  }

  // 11. Refund Policy & Refund Status
  if (/(refund|money back|reimburse|refund status|cod refund)/i.test(normalized)) {
    return `💰 **Refund Policy**:

• **Timeline**: Refunds are processed within 3–5 business days after returned item inspection.
• **Online Payments**: Refunded directly to your original payment method.
• **COD Orders**: Refunded via UPI or Bank Account details provided during return request.

Check status under **My Account → My Orders → Return/Refund Status**.`;
  }

  // 12. Cancel Order
  if (/(cancel|cancellation|stop order)/i.test(normalized)) {
    return `❌ **Order Cancellation**:

You can cancel your order before it gets shipped from:
**My Account → My Orders → Cancel Order**

If already shipped, cancellation may not be available. Please contact support for assistance.`;
  }

  // 13. Coupon / Discount
  if (/(coupon|discount|promo|offer|code|voucher)/i.test(normalized)) {
    return `🎁 **Coupons & Offers**:

To apply a promo code:
1. Add items to your cart
2. Go to checkout
3. Enter your coupon code under **Promo Code** & click Apply!

If a coupon isn't working, verify the minimum cart value, expiry date, or eligible items.`;
  }

  // 14. Wishlist / Out of Stock
  if (/(stock|out of stock|wishlist|save item|notify me)/i.test(normalized)) {
    return `❤️ **Wishlist & Out of Stock**:

If a size/color is out of stock, click **Notify Me** on the product page or save it to your **♡ Wishlist** (**My Account → Wishlist**). We'll notify you as soon as it's restocked!`;
  }

  // 15. Change Address / Account Help
  if (/(address|wrong address|change location|login|password|account)/i.test(normalized)) {
    return `📍 **Address & Account Help**:

• **Change Address**: If your order hasn't shipped, update it under **Order Details** or contact support immediately with your Order ID.
• **Account Access**: Use Forgot Password on the login page or verify via OTP.`;
  }

  // 16. Invoice
  if (/(invoice|bill|receipt|tax invoice)/i.test(normalized)) {
    return `🧾 **Download Invoice**:

You can download your official tax invoice anytime from:
**My Account → My Orders → Select Order → Download Invoice**`;
  }

  // 17. Contact Support / Human Escalation
  if (/(support|human|agent|talk|call|customer care|help line|live chat)/i.test(normalized)) {
    return `👨‍💼 **Customer Support Escalation**:

I can connect you with our human support team!

• 💬 **Live Support**: Available 9 AM - 8 PM
• 📧 **Email**: support@zebalpha.com
• 📞 **Helpline**: +91-800-ZEBALPHA

Please have your **Order ID** ready so we can assist you quickly!`;
  }

  // 18. Safety Warning
  if (/(safety|otp|pin|cvv|secure|password)/i.test(normalized)) {
    return `🔐 **Security Reminder**:
ZEBALPHA support will NEVER ask for your OTP, ATM PIN, UPI PIN, CVV, or banking passwords. Never share confidential details with anyone!`;
  }

  // 19. Disappointed / Angry
  if (/(disappointed|angry|worst|terrible|scam|waste|upset|complaint)/i.test(normalized)) {
    return `🙏 I am deeply sorry for your experience! We take complaints very seriously.

Please share your **Order ID** and a brief description of the problem. I will escalate your issue immediately to our priority management team!`;
  }

  // 20. Thank You / Goodbye
  if (/(thank|thanks|bye|goodbye|awesome|great)/i.test(normalized)) {
    return `You're very welcome! 😊❤️ Thank you for choosing **ZEBALPHA**. Have a wonderful day and happy shopping! 🛍️✨`;
  }

  // Fallback
  return `I'm **Alpha AI**, your ZEBALPHA shopping assistant! 🤖

I can help you with:
• 📦 **Order Tracking** (Send your Order ID)
• 🔄 **5-Day Returns & Size Exchanges**
• 💰 **Refund Status & COD Refunds**
• 🚚 **Delivery & Shipping Times**
• 💳 **Payments & Checkout**
• 📏 **Size Recommendations**
• 👨‍💼 **Talk to Customer Support**

Please choose an option or type your question again!`;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let prompt = "";
    let messageHistory: { role: string; content: string }[] = [];

    if (Array.isArray(body.messages) && body.messages.length > 0) {
      messageHistory = body.messages;
      const lastMsg = body.messages[body.messages.length - 1];
      if (lastMsg && lastMsg.role === "user") {
        prompt = String(lastMsg.content || "").trim();
      }
    }

    if (!prompt && body.prompt) {
      prompt = String(body.prompt || "").trim();
    }

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const openAiKey = process.env.OPENAI_API_KEY;

    if (!openAiKey) {
      return NextResponse.json({ reply: fallbackResponse(prompt) });
    }

    const formattedMessages = [
      {
        role: "system",
        content: `You are Alpha AI, the official virtual shopping assistant and stylist for ZEBALPHA online clothing store. ${CLOTHING_STORE_KNOWLEDGE}`,
      },
      ...messageHistory.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
    ];

    if (messageHistory.length === 0) {
      formattedMessages.push({ role: "user", content: prompt });
    }

    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: formattedMessages,
        max_tokens: 500,
      }),
    });

    const data = await openAiResponse.json();

    if (!openAiResponse.ok) {
      return NextResponse.json({ reply: fallbackResponse(prompt) });
    }

    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return NextResponse.json({ reply: fallbackResponse(prompt) });
    }

    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json({ reply: fallbackResponse("") || "How can I help you today?" });
  }
}
