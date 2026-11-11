import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { parseDarajaCallback } from "@/lib/daraja";

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);
  const parsed = parseDarajaCallback(payload);

  if (!parsed || !parsed.checkoutRequestId) {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Callback payload acknowledged" });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Database not configured" });
  }

  try {
    // 1. Locate matching mpesa_transactions record
    const { data: tx, error: txErr } = await db
      .from("mpesa_transactions")
      .select("id, payment_id, result_code")
      .eq("checkout_request_id", parsed.checkoutRequestId)
      .maybeSingle();

    if (txErr || !tx) {
      console.warn(`[Daraja Callback] No matching transaction for CheckoutRequestID: ${parsed.checkoutRequestId}`);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Transaction not found but acknowledged" });
    }

    // 2. Idempotency check: if already processed, do not duplicate
    if (tx.result_code !== null) {
      console.log(`[Daraja Callback] Idempotent skip: Transaction ${parsed.checkoutRequestId} already processed.`);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Already processed" });
    }

    // 3. Update mpesa_transactions
    await db
      .from("mpesa_transactions")
      .update({
        receipt_number: parsed.mpesaReceiptNumber,
        result_code: String(parsed.resultCode),
        result_description: parsed.resultDesc,
        callback_payload: payload
      })
      .eq("id", tx.id);

    // 4. Update payments table
    const paymentStatus = parsed.isSuccess ? "PAID" : "FAILED";
    const { data: updatedPayment } = await db
      .from("payments")
      .update({
        status: paymentStatus,
        transaction_reference: parsed.mpesaReceiptNumber || null,
        amount: parsed.amount ?? undefined,
        paid_at: parsed.isSuccess ? new Date().toISOString() : null
      })
      .eq("id", tx.payment_id)
      .select("order_id")
      .single();

    // 5. Update order payment_status if payment was successful (do NOT mark order as delivered)
    if (parsed.isSuccess && updatedPayment?.order_id) {
      await db
        .from("orders")
        .update({ payment_status: "PAID" })
        .eq("id", updatedPayment.order_id);

      // Log event
      await db.from("payment_events").insert({
        payment_id: tx.payment_id,
        event_type: "MPESA_CALLBACK_SUCCESS",
        payload: {
          receiptNumber: parsed.mpesaReceiptNumber,
          amount: parsed.amount,
          phone: parsed.phoneNumber
        }
      });
    } else if (tx.payment_id) {
      await db.from("payment_events").insert({
        payment_id: tx.payment_id,
        event_type: "MPESA_CALLBACK_FAILED",
        payload: {
          resultCode: parsed.resultCode,
          resultDesc: parsed.resultDesc
        }
      });
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Callback successfully processed" });
  } catch (err) {
    console.error("[Daraja Callback Processing Error]", err);
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Error handled safely" });
  }
}
