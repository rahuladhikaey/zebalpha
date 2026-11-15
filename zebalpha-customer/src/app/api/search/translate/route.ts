import { NextResponse } from "next/server";
import { parseMultilingualSearchQuery } from "@/lib/multilingualSearch";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawQuery = typeof body?.query === "string" ? body.query.trim() : "";
    const lang = typeof body?.lang === "string" ? body.lang.trim() : "";

    if (!rawQuery) {
      return NextResponse.json({
        rawQuery: "",
        translatedQuery: "",
        concepts: [],
        maxPrice: null,
        wasTranslated: false,
      });
    }

    // 1. Instant deterministic lexicon translation (zero latency, zero API dependency)
    let parsed = parseMultilingualSearchQuery(rawQuery);

    // 2. If unrecognized non-ASCII script remains and OpenAI is configured, enrich search keywords
    const openAiKey = process.env.OPENAI_API_KEY;
    if (parsed.hasUntranslatedNonAscii && openAiKey) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2500);
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openAiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            temperature: 0,
            max_tokens: 40,
            messages: [
              {
                role: "system",
                content:
                  "Convert an Indian e-commerce clothing/footwear voice search query (any language) into 1-5 concise English catalog search keywords (lowercase, no filler words, preserve numbers if budget like 'under 500'). Reply with ONLY the English keywords.",
              },
              {
                role: "user",
                content: lang ? `[lang:${lang}] ${rawQuery}` : rawQuery,
              },
            ],
          }),
        });
        clearTimeout(timer);

        if (res.ok) {
          const data = await res.json();
          const hint = String(data?.choices?.[0]?.message?.content || "").trim();
          if (hint && hint.length <= 80) {
            parsed = parseMultilingualSearchQuery(rawQuery, hint);
          }
        }
      } catch {
        // Keep instant deterministic parse when offline / timed out
      }
    }

    return NextResponse.json({
      rawQuery: parsed.rawQuery,
      translatedQuery: parsed.translatedQuery,
      concepts: parsed.concepts,
      maxPrice: parsed.maxPrice,
      wasTranslated: parsed.wasTranslated,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to parse voice query" },
      { status: 500 }
    );
  }
}
