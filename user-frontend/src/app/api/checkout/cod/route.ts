import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { sendWhatsAppOrderConfirmation } from "@/lib/whatsapp";


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

    // Save Order to Supabase as COD
    const { data, error } = await supabaseServer.from("orders").insert([
      {
        customer_name,
        phone,
        address,
        product_details: JSON.stringify(items),
        total_amount: total,
        payment_method: "COD",
        payment_status: "PENDING",
        order_status: "PENDING",
        user_id: user_id,
      },
    ]).select().single();

    if (error) {
      console.error("Supabase COD Order Error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Process Stock Update
    try {
      for (const item of items) {
        const { data: product } = await supabaseServer.from("products").select("stock").eq("id", item.id).single();
        if (product) {
          const newStock = Math.max(0, (product.stock || 0) - item.quantity);
          await supabaseServer.from("products").update({ 
            stock: newStock,
            status: newStock > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK'
          }).eq("id", item.id);
          
          await supabaseServer.from("stock_history").insert({
            product_id: item.id,
            change_amount: -item.quantity,
            reason: `Order Placed - COD (Order ID: ${data.id})`,
            admin_user: 'System'
          });
        }
      }
    } catch (stockError) {
      console.error("Stock update error:", stockError);
    }

    // Send WhatsApp Order Confirmation
    try {
      if (phone) {
        await sendWhatsAppOrderConfirmation({
          phone,
          orderId: data.id,
          customerName: customer_name,
          totalAmount: total,
          items: items || [],
        });
      }
    } catch (waError) {
      console.error("WhatsApp notification error:", waError);
    }

    return NextResponse.json({ success: true, orderId: data.id });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("COD Error:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
