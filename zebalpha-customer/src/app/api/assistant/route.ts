import { NextResponse } from "next/server";
import {
  analyzeShoppingQuery,
  buildMultilingualAssistantReply,
  generateOptionalGroundedAiReply,
  getMultilingualQuickLinks,
  searchRankedAssistantProducts,
  type AssistantQuickLink,
} from "@/lib/alphaAssistantEngine";

export type { AssistantQuickLink };

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    let prompt = "";
    let messageHistory: Array<{ role: string; content: string }> = [];

    if (Array.isArray(body.messages) && body.messages.length > 0) {
      messageHistory = body.messages
        .filter(
          (m: unknown): m is { role: string; content: string } =>
            Boolean(m) &&
            typeof m === "object" &&
            typeof (m as { content?: unknown }).content === "string"
        )
        .slice(-6);
      const lastMsg = messageHistory[messageHistory.length - 1];
      if (lastMsg && lastMsg.role === "user") {
        prompt = lastMsg.content.trim();
      }
    }

    if (!prompt && typeof body.prompt === "string") {
      prompt = body.prompt.trim();
    }

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const voiceHint =
      typeof body.voiceHint === "string" && body.voiceHint.trim().length > 0
        ? body.voiceHint.trim()
        : null;

    // 1. Deterministic Multilingual Analysis (Bengali, Banglish, Hindi, Hinglish, English — ₹0 cost)
    const analysis = analyzeShoppingQuery(prompt, voiceHint);

    // 2. Strict Precision Catalog Match + Real Rating & High-Order Ranking
    const [{ products: recommendedProducts, matchMode, nearestPrice }, quickLinks] =
      await Promise.all([
        searchRankedAssistantProducts(analysis),
        Promise.resolve(getMultilingualQuickLinks(analysis)),
      ]);

    // 3. Optional Grounded AI API Mode (Gemini / OpenAI if configured) — falls back cleanly to ₹0 engine
    const aiEnhanced = await generateOptionalGroundedAiReply({
      prompt,
      history: messageHistory,
      analysis,
      products: recommendedProducts,
      matchMode,
    });

    const reply =
      aiEnhanced?.reply ||
      buildMultilingualAssistantReply(
        prompt,
        analysis,
        recommendedProducts,
        matchMode,
        nearestPrice
      );

    return NextResponse.json({
      reply,
      recommendedProducts,
      quickLinks,
      detectedLanguage: analysis.language,
      voiceLang: analysis.voiceLang,
      matchMode,
      aiMode: aiEnhanced ? aiEnhanced.provider : "smart-free",
    });
  } catch (err) {
    console.error("[API /assistant POST] Unexpected error:", err);
    return NextResponse.json({
      reply:
        "I’m **Alpha AI**, your 24/7 ZEBALPHA shopping assistant! Ask me in **English, বাংলা, or हिन्दी** — for example: *“৫০০ টাকার মধ্যে ভালো টি-শার্ট দেখাও”* or *“500 ke andar black hoodie dikhao”*.",
      recommendedProducts: [],
      quickLinks: [
        { label: "All Categories", href: "/categories" },
        { label: "New Drops", href: "/new-drops" },
        { label: "My Orders", href: "/profile/orders" },
      ],
      detectedLanguage: "en",
      voiceLang: "en-IN",
      matchMode: "none",
      aiMode: "smart-free",
    });
  }
}
