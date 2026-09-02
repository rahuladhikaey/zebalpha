import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { sendWhatsAppOrderConfirmation } from '@/lib/whatsapp';

async function verifyWebhookSignature(bodyText: string, signature: string, secret: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(bodyText);
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const hmac = await crypto.subtle.sign('HMAC', key, data);
  const digest = Array.from(new Uint8Array(hmac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return digest === signature;
}

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (!signature || !webhookSecret) {
      return NextResponse.json({ error: 'Missing signature or webhook secret configuration' }, { status: 400 });
    }

    const bodyText = await req.text();
    const isValid = await verifyWebhookSignature(bodyText, signature, webhookSecret);

    if (!isValid) {
      console.error('Invalid Razorpay Webhook Signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(bodyText);
    const { event: eventType, payload } = event;

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = payload.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const razorpayPaymentId = paymentEntity?.id;
      const notes = paymentEntity?.notes || {};

      if (razorpayOrderId) {
        // Check idempotency: check if order already recorded
        const { data: existingOrder } = await supabaseServer
          .from('orders')
          .select('id, payment_status')
          .eq('razorpay_order_id', razorpayOrderId)
          .maybeSingle();

        if (existingOrder) {
          if (existingOrder.payment_status !== 'COMPLETE') {
            await supabaseServer
              .from('orders')
              .update({
                payment_status: 'COMPLETE',
                razorpay_payment_id: razorpayPaymentId,
              })
              .eq('id', existingOrder.id);
          }
          return NextResponse.json({ status: 'ok', message: 'Order already exists, status updated' });
        }

        // If order missing from frontend redirect, insert from webhook notes
        if (notes.customer_name && notes.phone) {
          const { data: newOrder } = await supabaseServer
            .from('orders')
            .insert([
              {
                customer_name: notes.customer_name,
                phone: notes.phone,
                address: notes.address || '',
                product_details: notes.items || '[]',
                total_amount: (paymentEntity.amount || 0) / 100,
                payment_method: 'ONLINE',
                payment_status: 'COMPLETE',
                order_status: 'PENDING',
                razorpay_order_id: razorpayOrderId,
                razorpay_payment_id: razorpayPaymentId,
                user_id: notes.user_id || null,
              },
            ])
            .select()
            .single();

          if (newOrder && notes.phone) {
            await sendWhatsAppOrderConfirmation({
              phone: notes.phone,
              orderId: newOrder.id,
              customerName: notes.customer_name,
              totalAmount: newOrder.total_amount,
              items: notes.items ? JSON.parse(notes.items) : [],
            });
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Razorpay Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
