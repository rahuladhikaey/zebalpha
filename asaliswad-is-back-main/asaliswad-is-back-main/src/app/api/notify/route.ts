import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const { productId, productName, customerName, phone, email } = await req.json();

    if (!productId || !productName || !customerName || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('notify_requests')
      .insert([
        {
          product_id: productId,
          product_name: productName,
          customer_name: customerName,
          phone,
          email,
          status: 'PENDING'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating notify request:', error);
      return NextResponse.json({ error: 'Failed to save request' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Request saved successfully', data });
  } catch (error) {
    console.error('Notify API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
