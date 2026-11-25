import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id") || "";
    if (!userId) {
      return NextResponse.json({ orders: [] });
    }

    const supabase = getSupabaseServer();
    const db = supabase.schema("go_alpha");

    const { data: orders, error } = await db
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !orders || orders.length === 0) {
      return NextResponse.json({ orders: [] });
    }

    const orderIds = orders.map((o: any) => o.id);
    const { data: items } = await db
      .from("order_items")
      .select("*")
      .in("order_id", orderIds);

    const itemsByOrder = new Map<string, any[]>();
    (items || []).forEach((it: any) => {
      const arr = itemsByOrder.get(it.order_id) || [];
      arr.push(it);
      itemsByOrder.set(it.order_id, arr);
    });

    return NextResponse.json({
      orders: orders.map((o: any) => ({
        ...o,
        items: itemsByOrder.get(o.id) || [],
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ orders: [], error: err?.message || "Failed to load orders" }, { status: 500 });
  }
}
