import { NextResponse } from "next/server";


const KNOWLEDGE_BASE = `
Asali Swad Premium Business, Facility, Product Quality & Policy Information:

🏢 Infrastructure & Processing Facilities:
- Modern, ISO-grade ultra-hygienic processing units.
- Traditional, clean solar drying methods ensuring absolute pure hygiene and maximum natural flavour retention.
- Multi-tier quality control checks conducted before any product is carefully vacuum-packed.
- Ethically and locally sourced authentic ingredients directly from trusted rural farmers, ensuring fair wages and top-tier harvest.

🌟 Product Quality & Integrity:
- 100% organic, absolutely free of any chemicals, industrial preservatives, synthetic coloring, or artificial flavorings.
- Authentically handcrafted in small batches following ancient, time-tested culinary traditions.
- Uncompromised nutritional retention, rich in protein, minerals, and healthy dietary fibers.
- Main Product: Urad Dal Bori (made from premium urad dal, traditional handmade process, sun-dried, protein-rich).

📦 Return, Replacement & Cancellation Policy:
- Returns are accepted within 24 hours of package delivery for damaged, defective, or incorrect products.
- Products must be unused and in original, clean packaging.
- Opened/used food items cannot be returned due to safety and health reasons.

💰 Refund Policy:
- Full refunds or store credit are processed within 3–5 business days directly to the original payment source.
- For Cash on Delivery orders, refunds are directly transferred to the customer's provided UPI or bank account upon request.
- PAYMENT CHANNELS: We support Cash on Delivery AND Online Payment via Link. After placing an order, the customer will receive a secure Payment Link (Razorpay/UPI) directly on WhatsApp. Once paid, the order is confirmed for delivery.

🚚 Delivery & Shipping:
- Delivery time: 2–5 days (local area), 5–7 days (other major areas).
- Free shipping offered on bulk/large wholesale orders.
`;

const fallbackResponse = (prompt: string) => {
  const normalized = prompt.toLowerCase();

  if (/(hello|hi|hey|greetings)/i.test(normalized)) {
    return "Hello! I'm Asali Swad's AI Assistant. I can help you with our premium organic products, our state-of-the-art facilities, return/refund policies, or order details!";
  }

  if (/(facility|facilities|process|infra|hygiene|solar|drying|clean|where|make|manufacture)/i.test(normalized)) {
    return "All our products are crafted in modern, ISO-grade ultra-hygienic processing units. We use traditional solar drying methods to ensure absolute hygiene and maximum flavor retention. Every batch undergoes multi-tier quality checks before vacuum-packaging!";
  }

  if (/(quality|organic|chemical|preservatives|healthy|protein|natural|source|farmer)/i.test(normalized)) {
    return "Our products are 100% organic and handcrafted in small batches, completely free from chemicals, artificial colors, or preservatives. We source raw ingredients directly from trusted rural farmers to maintain uncompromised nutritional value and support local farming communities.";
  }

  if (/(bori|urad|dal|cook|dish|healthy|last|storage|moisture|handmade)/i.test(normalized)) {
    return "Our premium Urad Dal Bori is 100% natural, handmade, and sun-dried. You can fry it until golden brown for curries like aloo bori. It lasts several months in a dry airtight container.";
  }

  if (/(return|refund|damage|wrong|opened|safety|policy|replace|money)/i.test(normalized)) {
    return "We accept return requests within 24 hours of delivery for damaged or wrong items. Opened food products cannot be returned. Refunds are processed within 3-5 business days directly to your source account (including UPI for COD orders!).";
  }

  if (/(delivery|shipping|time|days|bulk|local)/i.test(normalized)) {
    return "Local delivery takes 2-5 days, while other areas take 5-7 days. We offer free delivery on bulk orders!";
  }

  if (/(bulk|retail|restaurant|order)/i.test(normalized)) {
    return "Yes! We support bulk orders for households, retailers, and restaurants. Contact us for special pricing.";
  }

  return "I can help with details about our hygienic processing facilities, organic quality standards, 24-hour return policy, delivery times, and bulk orders. Try asking 'What is your quality standard?' or 'How clean is your facility?'";
};

export async function POST(request: Request) {
  const body = await request.json();
  const prompt = String(body.prompt || "").trim();

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  const openAiKey = process.env.OPENAI_API_KEY;

  if (!openAiKey) {
    return NextResponse.json({ reply: fallbackResponse(prompt) });
  }

  try {
    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant for the Asali Swad grocery app. 
            User Knowledge Base:
            ${KNOWLEDGE_BASE}
            
            Instructions:
            - Answer user questions in a friendly, concise way using only the provided facts.
            - If you don't know the answer, ask them to email connect.asaliswad2026@gmail.com.
            - Ensure you highlight the traditional, handmade, and preservative-free nature of the products.`,
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 400,
      }),
    });

    const data = await openAiResponse.json();

    if (!openAiResponse.ok) {
      const message = data?.error?.message ?? "Unable to retrieve an assistant response.";
      return NextResponse.json({ error: message }, { status: openAiResponse.status });
    }

    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return NextResponse.json({ reply: fallbackResponse(prompt) });
    }

    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json({ reply: fallbackResponse(prompt) });
  }
}
