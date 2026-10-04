import { NextResponse } from "next/server";
import { supabaseServer, createSupabaseServerClient } from "@/shared/utils/supabaseServer";

export const dynamic = "force-dynamic";

// PUT /api/categories/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    if (!id) {
      return NextResponse.json({ success: false, error: "Category ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const { name, main_category, image_url, description, sort_order, is_active } = body;

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updatePayload.name = name.trim();
    if (main_category !== undefined) updatePayload.main_category = main_category.trim().toUpperCase();
    if (image_url !== undefined) updatePayload.image_url = image_url;
    if (description !== undefined) updatePayload.description = description;
    if (sort_order !== undefined) updatePayload.sort_order = sort_order;
    if (is_active !== undefined) updatePayload.is_active = is_active;

    const { data, error } = await supabaseServer
      .from("categories")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, category: data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to update category" }, { status: 500 });
  }
}

// DELETE /api/categories/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    if (!id) {
      return NextResponse.json({ success: false, error: "Category ID is required" }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Category deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to delete category" }, { status: 500 });
  }
}
