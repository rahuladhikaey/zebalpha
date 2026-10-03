import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const { targetType, targetId, newEddDate, reason, adminEmail } = await req.json();

    if (!targetType || !targetId || !newEddDate || !reason) {
      return NextResponse.json(
        { error: "Target type, target ID, new EDD date, and reason are required for override." },
        { status: 400 }
      );
    }

    const validTypes = ["order", "seller_order", "shipment"];
    if (!validTypes.includes(targetType)) {
      return NextResponse.json({ error: "Invalid target type" }, { status: 400 });
    }

    const tableMap: Record<string, string> = {
      order: "orders",
      seller_order: "seller_orders",
      shipment: "shipments",
    };

    const tableName = tableMap[targetType];

    // Fetch existing record for audit log
    const { data: existingRecord, error: fetchErr } = await supabaseServer
      .from(tableName)
      .select("expected_delivery_date, edd_source")
      .eq("id", targetId)
      .maybeSingle();

    if (fetchErr || !existingRecord) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const oldEddDate = existingRecord.expected_delivery_date;
    const oldSource = existingRecord.edd_source || "SERVER_ESTIMATE";
    const nowIso = new Date().toISOString();
    const parsedNewDate = new Date(newEddDate).toISOString();

    // Update target table
    const { error: updateErr } = await supabaseServer
      .from(tableName)
      .update({
        expected_delivery_date: parsedNewDate,
        expected_delivery_to: parsedNewDate,
        edd_source: "MANUAL_ADMIN_OVERRIDE",
        edd_updated_at: nowIso,
      })
      .eq("id", targetId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Insert Audit Trail
    try {
      await supabaseServer.from("edd_audit_logs").insert([
        {
          target_type: targetType,
          target_id: targetId,
          old_edd_date: oldEddDate,
          new_edd_date: parsedNewDate,
          old_source: oldSource,
          new_source: "MANUAL_ADMIN_OVERRIDE",
          reason: String(reason).trim(),
          admin_email: adminEmail || "superadmin@zebalpha.com",
          created_at: nowIso,
        },
      ]);
    } catch (auditErr) {
      console.warn("Notice: Failed to insert EDD audit log:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `EDD override applied successfully for ${targetType} #${targetId}. Audit trail recorded.`,
      new_edd_date: parsedNewDate,
    });
  } catch (err: any) {
    console.error("EDD Override error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
