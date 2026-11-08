import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // 1. Extract Form Fields
    const customerName = (formData.get("customerName") as string || "").trim();
    const whatsappPhone = (formData.get("whatsappPhone") as string || "").trim();
    const customerEmail = (formData.get("customerEmail") as string || "").trim();
    const garmentType = (formData.get("garmentType") as string || "oversized_tee").trim();
    const garmentName = (formData.get("garmentName") as string || "").trim();
    const garmentGsm = (formData.get("garmentGsm") as string || "").trim();
    const unitPrice = (formData.get("unitPrice") as string || "").trim();
    const totalEstimatedPrice = (formData.get("totalEstimatedPrice") as string || "").trim();
    const garmentColor = (formData.get("garmentColor") as string || "Jet Black").trim();
    const garmentSize = (formData.get("garmentSize") as string || "L").trim();
    const quantity = parseInt((formData.get("quantity") as string) || "1", 10) || 1;
    const placement = (formData.get("placement") as string || "front_chest").trim();
    const designMode = (formData.get("designMode") as string || "custom_upload").trim();
    const presetTitle = (formData.get("presetTitle") as string || "").trim();
    const presetImageUrl = (formData.get("presetImageUrl") as string || "").trim();
    const notes = (formData.get("notes") as string || "").trim();
    const artworkFile = formData.get("artworkFile") as File | null;

    // Basic Validation
    if (!customerName || !whatsappPhone) {
      return NextResponse.json(
        { success: false, message: "Customer Name and WhatsApp Phone number are required." },
        { status: 400 }
      );
    }

    if (designMode === "custom_upload" && (!artworkFile || artworkFile.size === 0)) {
      return NextResponse.json(
        { success: false, message: "Please upload an artwork image for custom design." },
        { status: 400 }
      );
    }

    // Generate Human-Readable Order Token
    const orderToken = `ZD-${Date.now().toString().slice(-6)}`;
    const cleanPhone = whatsappPhone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
    const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    // 2. Format Beautiful Telegram Caption
    const captionLines = [
      `🎨 <b>ZEBALPHA — NEW CUSTOM DESIGN ORDER</b>`,
      `<b>Order Token:</b> <code>#${orderToken}</code>`,
      `─────────────────────────`,
      `👤 <b>Customer:</b> ${customerName}`,
      `📞 <b>WhatsApp / Phone:</b> <code>+${formattedPhone}</code>`,
      customerEmail ? `📧 <b>Email:</b> ${customerEmail}` : null,
      `─────────────────────────`,
      `👕 <b>Garment Base:</b> ${garmentName || garmentType.replace(/_/g, " ").toUpperCase()}${garmentGsm ? ` (${garmentGsm})` : ""}`,
      unitPrice ? `💰 <b>Base Price:</b> ₹${unitPrice} per item` : null,
      totalEstimatedPrice ? `💵 <b>Estimated Total:</b> ₹${totalEstimatedPrice} (${quantity} Pc${quantity > 1 ? "s" : ""})` : null,
      `🎨 <b>Garment Color:</b> ${garmentColor}`,
      `📏 <b>Target Size:</b> ${garmentSize}`,
      `📦 <b>Quantity:</b> ${quantity} Pc(s)`,
      `🎯 <b>Print Placement:</b> ${placement.replace(/_/g, " ").toUpperCase()}`,
      `🖼️ <b>Design Source:</b> ${designMode === "preset_vault" ? `ZebAlpha Vault: <i>${presetTitle}</i>` : "Custom User Upload"}`,
      notes ? `📝 <b>Customer Notes:</b> <i>"${notes}"</i>` : null,
      `─────────────────────────`,
      `🕒 <b>Submitted At:</b> ${timestamp}`,
    ].filter(Boolean);

    const caption = captionLines.join("\n");

    // Interactive WhatsApp action button (Telegram strictly requires http/https URLs for inline keyboards)
    const whatsappGreeting = encodeURIComponent(
      `Hi ${customerName}, we received your custom design request (#${orderToken}) for ${quantity}x ${garmentName || garmentType} (${garmentColor}, ${garmentSize}) on ZebAlpha! Let's finalize your print proof.`
    );
    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: "💬 Chat on WhatsApp", url: `https://wa.me/${formattedPhone}?text=${whatsappGreeting}` },
        ],
      ],
    };

    // 3. Read Telegram Credentials with Production Fail-Safe Fallbacks
    const DEFAULT_TELEGRAM_BOT_TOKEN = "9121248586:AAFURzRsuwkYzdnEeQBu6BaWAuavwV3rfMM";
    // Zebalpha production🤝 Telegram Supergroup Chat ID
    const DEFAULT_TELEGRAM_CHAT_ID = "-1004487850740";

    const botToken =
      process.env.TELEGRAM_BOT_TOKEN ||
      process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN ||
      DEFAULT_TELEGRAM_BOT_TOKEN;
    const chatId =
      process.env.TELEGRAM_CHAT_ID ||
      process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID ||
      DEFAULT_TELEGRAM_CHAT_ID;

    // 4. Zero-Database Streaming: Stream directly to Telegram
    if (botToken && chatId) {
      try {
        if (designMode === "custom_upload" && artworkFile) {
          // Stream raw uncompressed file buffer to Telegram via sendDocument
          const tgFormData = new FormData();
          tgFormData.append("chat_id", chatId);
          tgFormData.append("caption", caption);
          tgFormData.append("parse_mode", "HTML");
          tgFormData.append("reply_markup", JSON.stringify(inlineKeyboard));
          tgFormData.append("document", artworkFile, artworkFile.name || `design_${orderToken}.png`);

          const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
            method: "POST",
            body: tgFormData,
          });

          if (!tgRes.ok) {
            const errBody = await tgRes.text();
            console.warn("Telegram sendDocument notice, trying sendPhoto:", errBody);
            // Fallback to sendPhoto
            const photoFormData = new FormData();
            photoFormData.append("chat_id", chatId);
            photoFormData.append("caption", caption);
            photoFormData.append("parse_mode", "HTML");
            photoFormData.append("reply_markup", JSON.stringify(inlineKeyboard));
            photoFormData.append("photo", artworkFile, artworkFile.name || `design_${orderToken}.png`);

            const photoRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
              method: "POST",
              body: photoFormData,
            });

            if (!photoRes.ok) {
              // Final fallback: text dispatch
              await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: caption,
                  parse_mode: "HTML",
                  reply_markup: inlineKeyboard,
                }),
              });
            }
          }
        } else if (designMode === "preset_vault" && presetImageUrl) {
          // Handle Base64 Data URL or HTTP URL
          let sent = false;

          if (presetImageUrl.startsWith("data:")) {
            try {
              const base64Data = presetImageUrl.replace(/^data:image\/\w+;base64,/, "");
              const buffer = Buffer.from(base64Data, "base64");
              const blob = new Blob([buffer], { type: "image/webp" });

              const photoFormData = new FormData();
              photoFormData.append("chat_id", chatId);
              photoFormData.append("caption", caption);
              photoFormData.append("parse_mode", "HTML");
              photoFormData.append("reply_markup", JSON.stringify(inlineKeyboard));
              photoFormData.append("photo", blob, `preset_${orderToken}.webp`);

              const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
                method: "POST",
                body: photoFormData,
              });
              if (res.ok) sent = true;
            } catch (b64Err) {
              console.warn("Base64 WebP sendPhoto notice:", b64Err);
            }
          } else if (presetImageUrl.startsWith("http")) {
            // Direct Public URL
            const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                photo: presetImageUrl,
                caption,
                parse_mode: "HTML",
                reply_markup: inlineKeyboard,
              }),
            });
            if (res.ok) sent = true;
          }

          if (!sent) {
            // Text dispatch fallback (never send raw 20kb base64 in text body)
            const cleanUrl = presetImageUrl.startsWith("http") ? `\n\n🔗 <b>Preset Link:</b> ${presetImageUrl}` : "";
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                text: `${caption}${cleanUrl}`,
                parse_mode: "HTML",
                reply_markup: inlineKeyboard,
              }),
            });
          }
        } else {
          // No file/preset attached, send clean text message
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: caption,
              parse_mode: "HTML",
              reply_markup: inlineKeyboard,
            }),
          });
        }
      } catch (tgError) {
        console.error("Telegram API dispatch notice:", tgError);
      }
    }

    // 5. Success Response back to customer (ZERO Database writes)
    return NextResponse.json({
      success: true,
      orderToken,
      message: "Custom design submitted successfully! Our design team will contact you via WhatsApp.",
    });
  } catch (err: any) {
    console.error("Custom design submission error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to process custom design request." },
      { status: 500 }
    );
  }
}

