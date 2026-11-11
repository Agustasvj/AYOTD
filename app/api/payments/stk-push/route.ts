import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { stkPushInputSchema } from "@/lib/validation";
import { initiateSTKPush, getDarajaConfig } from "@/lib/daraja";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = stkPushInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payment request details.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { orderId, phone, amount } = parsed.data;
  const config = getDarajaConfig();

  // If Daraja credentials are not set on server, provide a clear sandbox/dev message
  if (!config.isConfigured) {
    return NextResponse.json({
      success: true,
      mocked: true,
      message: "Daraja credentials are not configured on this server. In sandbox/production, an STK push PIN prompt will appear on phone " + phone,
      checkoutRequestId: "ws_CO_MOCK_" + Date.now()
    });
  }

  const db = getSupabaseAdmin();
  let orderNumber = `AYOTD-${Date.now().toString().slice(-6)}`;

  if (db) {
    const { data: order } = await db
      .from("orders")
      .select("id, order_number, total_amount")
      .eq("id", orderId)
      .maybeSingle();

    if (order) {
      orderNumber = order.order_number;
    }
  }

  // 1. Initiate STK Push via Daraja
  const result = await initiateSTKPush({
    phone,
    amount,
    orderNumber,
    description: `AYOTD ${orderNumber}`
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error || "STK Push initiation failed." }, { status: 502 });
  }

  // 2. Persist transaction details in Supabase
  if (db && result.checkoutRequestId) {
    const { data: payment } = await db
      .from("payments")
      .insert({
        order_id: orderId,
        method: "MPESA",
        amount: amount,
        status: "PROCESSING"
      })
      .select("id")
      .single();

    if (payment) {
      await db.from("mpesa_transactions").insert({
        payment_id: payment.id,
        checkout_request_id: result.checkoutRequestId,
        merchant_request_id: result.merchantRequestId || null,
        phone_number: phone
      });
    }
  }

  return NextResponse.json({
    success: true,
    message: result.customerMessage || "M-Pesa STK Push prompt sent to your phone. Please enter your M-Pesa PIN.",
    checkoutRequestId: result.checkoutRequestId
  });
}
