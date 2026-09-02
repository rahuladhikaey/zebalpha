import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { sendWhatsAppOrderConfirmation } from "@/lib/whatsapp";
import { createMasterOrder } from "@/lib/orderRouter";


export async function POST(req: Request) {
  try {
    const {
      customer_name,
      phone,
      address,
      items,
      total,
      user_id,
    } = await req.json();

    // Delegate to master order creation which handles splitting, reservation and notifications
    const parentOrder = await createMasterOrder({ user_id, customer_name, phone, address, items, total, payment_method: 'COD' });

    // Send WhatsApp Order Confirmation (keep for backward compatibility)
    try {
      if (phone) {
        await sendWhatsAppOrderConfirmation({
          phone,
          orderId: parentOrder.id,
          customerName: customer_name,
          totalAmount: total,
          items: items || [],
        });
      }
    } catch (waError) {
      console.error("WhatsApp notification error:", waError);
    }

    return NextResponse.json({ success: true, orderId: parentOrder.id });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("COD Error:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
