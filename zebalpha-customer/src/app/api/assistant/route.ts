import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { Product } from "@/lib/types";

export type AssistantQuickLink = {
  label: string;
  href: string;
};

const ASSISTANT_PRODUCT_SELECT =
  "id, name, description, price, mrp, image_url, images, brand, category_id, stock, stock_count, is_active, status, is_approved, approval_status, is_new_drop, collection, tier, specifications, packages, created_at";

const INACTIVE_STATUSES = new Set([
  "BLOCKED",
  "DELETED",
  "ARCHIVED",
  "OUT_OF_STOCK",
  "COMING_SOON",
  "INACTIVE",
  "SUSPENDED",
  "DRAFT",
  "REJECTED",
]);

const STYLING_INTENT_REGEX =
  /(style|styling|outfit|wear|pair|matching|look|occasion|college|office|party|date|gym|travel|weekend|summer|winter|streetwear|casual|formal|recommend|suggest|best|trending|drop|budget|under|below|gift|hoodie|polo|tee|t-shirt|shirt|jacket|jogger|cargo|shoe|sneaker|footwear|cap|accessory)/i;

const PURE_SUPPORT_ONLY_REGEX =
  /(refund|money back|cancel|cancellation|payment failed|debited|double charged|deducted|track|where is my order|return policy|replace|exchange|contact|customer care|support number|account deletion)/i;

function extractBudgetLimit(prompt: string): number | null {
  const match = prompt.match(/(?:under|below|less than|within|upto|up to|max)\s*(?:rs\.?|inr|₹)?\s*(\d{3,5})/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function extractKeywordTokens(prompt: string): string[] {
  const stopWords = new Set([
    "show", "me", "recommend", "suggest", "best", "good", "for", "the", "and",
    "with", "what", "should", "wear", "outfit", "style", "styling", "ideas",
    "help", "under", "below", "less", "than", "price", "rs", "inr", "please",
    "some", "any", "zebalpha", "clothing", "clothes", "find", "looking",
    "want", "need", "buy", "can", "you", "give", "items", "products",
  ]);
  return prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !stopWords.has(t));
}

function isProductEligible(row: Record<string, unknown>): boolean {
  if (row.is_active === false) return false;
  if (row.is_approved === false) return false;
  const status = String(row.status || "").toUpperCase();
  if (status && INACTIVE_STATUSES.has(status)) return false;
  const approval = String(row.approval_status || "").toLowerCase();
  if (approval === "rejected" || approval === "pending" || approval === "suspended") {
    return false;
  }
  const stock = typeof row.stock === "number" ? row.stock : typeof row.stock_count === "number" ? row.stock_count : 1;
  if (stock <= 0) return false;
  const primaryImg = String(
    row.image_url || (Array.isArray(row.images) ? row.images[0] : "") || ""
  ).trim();
  return Boolean(row.id && row.name && primaryImg);
}

async function findAssistantRecommendations(prompt: string): Promise<Product[]> {
  const normalized = prompt.trim();
  const isSupportOnly =
    PURE_SUPPORT_ONLY_REGEX.test(normalized) && !STYLING_INTENT_REGEX.test(normalized);
  if (normalized && isSupportOnly) {
    return [];
  }

  try {
    const { data, error } = await supabaseServer
      .from("products")
      .select(ASSISTANT_PRODUCT_SELECT)
      .or("is_active.is.null,is_active.eq.true")
      .order("is_new_drop", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(80);

    if (error || !Array.isArray(data)) {
      return [];
    }

    const budgetLimit = extractBudgetLimit(normalized);
    const tokens = extractKeywordTokens(normalized);
    const wantsStylingOrRecs = !normalized || STYLING_INTENT_REGEX.test(normalized);
    if (!wantsStylingOrRecs && tokens.length === 0) {
      return [];
    }

    const eligible = data.filter((row) => isProductEligible(row as Record<string, unknown>));
    const scored = eligible
      .map((row) => {
        const rec = row as Record<string, unknown>;
        const price = Number(rec.price || 0);
        if (budgetLimit !== null && price > budgetLimit) {
          return { row: rec, score: -1 };
        }
        const haystack = [
          rec.name,
          rec.description,
          rec.brand,
          rec.collection,
          rec.tier,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        let score = rec.is_new_drop ? 2 : 0;
        if (String(rec.tier || "").toUpperCase() === "PREMIUM") score += 1;

        let tokenHits = 0;
        for (const token of tokens) {
          if (haystack.includes(token)) {
            tokenHits += 1;
            score += 5;
          }
          // Expand singular/plural stem matching for tee/tees, hoodie/hoodies, polo/polos
          const stem = token.endsWith("s") ? token.slice(0, -1) : token;
          if (stem.length >= 3 && stem !== token && haystack.includes(stem)) {
            tokenHits += 1;
            score += 4;
          }
        }

        if (tokens.length > 0 && tokenHits === 0 && !STYLING_INTENT_REGEX.test(normalized)) {
          return { row: rec, score: -1 };
        }
        return { row: rec, score };
      })
      .filter((entry) => entry.score >= 0)
      .sort((a, b) => b.score - a.score);

    const picks = (scored.length > 0 ? scored : eligible.map((row) => ({ row: row as Record<string, unknown>, score: 0 })))
      .slice(0, 4)
      .map(({ row }) => {
        const images = Array.isArray(row.images) ? (row.images as string[]) : undefined;
        return {
          id: row.id as string | number,
          name: String(row.name || "ZEBALPHA Piece"),
          price: Number(row.price || 0),
          mrp: typeof row.mrp === "number" ? row.mrp : undefined,
          description: String(row.description || "Signature ZEBALPHA apparel crafted for everyday comfort."),
          image_url: String(row.image_url || images?.[0] || ""),
          images,
          brand: row.brand ? String(row.brand) : "ZEBALPHA",
          stock: typeof row.stock === "number" ? row.stock : typeof row.stock_count === "number" ? row.stock_count : 10,
          status: row.status ? String(row.status) : undefined,
          is_active: row.is_active !== false,
          is_new_drop: Boolean(row.is_new_drop),
          collection: row.collection ? String(row.collection) : undefined,
          tier: row.tier ? String(row.tier) : undefined,
          specifications:
            row.specifications && typeof row.specifications === "object"
              ? (row.specifications as Record<string, unknown>)
              : undefined,
          packages: Array.isArray(row.packages) ? (row.packages as Product["packages"]) : undefined,
        } satisfies Product;
      });

    return picks;
  } catch {
    return [];
  }
}

function getAssistantQuickLinks(prompt: string): AssistantQuickLink[] {
  const normalized = prompt.toLowerCase();
  if (/(order|track|delivery|shipping|return|refund|cancel|exchange|payment)/i.test(normalized)) {
    return [
      { label: "My Orders", href: "/profile/orders" },
      { label: "Return Policy", href: "/return-policy" },
      { label: "Help & Support", href: "/help" },
      { label: "Size Guide", href: "/size-guide" },
    ];
  }
  if (/(size|fit|chest|length|try on|try-on|vto|styling|outfit|polo|hoodie|tee)/i.test(normalized)) {
    return [
      { label: "Size Guide", href: "/size-guide" },
      { label: "Virtual Try-On (Coming Soon)", href: "/virtual-try-on" },
      { label: "New Drops", href: "/new-drops" },
      { label: "All Categories", href: "/categories" },
    ];
  }
  return [
    { label: "New Drops", href: "/new-drops" },
    { label: "Virtual Try-On (Coming Soon)", href: "/virtual-try-on" },
    { label: "Size Guide", href: "/size-guide" },
    { label: "My Orders", href: "/profile/orders" },
  ];
}

function buildFallbackWithPicks(prompt: string, products: Product[]): string {
  const base = fallbackResponse(prompt);
  if (!products.length) return base;
  const pickLines = products
    .slice(0, 3)
    .map((p) => `• **${p.name}** — ₹${Number(p.price || 0).toLocaleString("en-IN")}`)
    .join("\n");
  return `${base}\n\n✨ **Recommended From ZEBALPHA**:\n${pickLines}`;
}

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

  // 1b. Styling, Recommendations & Outfit Suggestions
  if (/(style|styling|outfit|wear|pair|matching|look|occasion|college|office|party|date|weekend|travel|winter|summer|streetwear|casual|gift|recommend|suggest|trending|bestseller|drop|under|below)/i.test(normalized)) {
    return `✨ **Alpha AI Styling Suggestions**:

• **Smart Streetwear Fit**: Pair a relaxed ZEBALPHA Heavyweight Oversized Tee with straight cargos or charcoal denims and crisp sneakers.
• **Clean Semi-Formal / Date Look**: Go for our Champagne-trim Premium Zip Polo with tailored chinos or dark trousers — breathable combed cotton keeps it sharp all day.
• **Layering Formula**: Combine a neutral Ivory/White base tee under an open overshirt or heavyweight hoodie for effortless evening contrast.
• **Virtual Try-On (Coming Soon)**: Our AI Virtual Try-On experience launches on **07/07/2027**!

Tell me the occasion, color vibe, or budget (for example, *under ₹999*) and I will match live ZEBALPHA pieces for you.`;
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
    const [recommendedProducts, quickLinks] = await Promise.all([
      findAssistantRecommendations(prompt),
      Promise.resolve(getAssistantQuickLinks(prompt)),
    ]);

    if (!openAiKey) {
      return NextResponse.json({
        reply: buildFallbackWithPicks(prompt, recommendedProducts),
        recommendedProducts,
        quickLinks,
      });
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
      return NextResponse.json({
        reply: buildFallbackWithPicks(prompt, recommendedProducts),
        recommendedProducts,
        quickLinks,
      });
    }

    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return NextResponse.json({
        reply: buildFallbackWithPicks(prompt, recommendedProducts),
        recommendedProducts,
        quickLinks,
      });
    }

    return NextResponse.json({ reply, recommendedProducts, quickLinks });
  } catch {
    return NextResponse.json({
      reply: fallbackResponse("") || "How can I help you today?",
      recommendedProducts: [],
      quickLinks: getAssistantQuickLinks(""),
    });
  }
}
