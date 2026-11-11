import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const db = getSupabaseAdmin();

  if (!db) {
    // Provide sample WhatsApp queue data in demo mode
    return NextResponse.json({
      messages: [
        {
          id: "wa-demo-1",
          external_message_id: "wamid.HBgLMjU0NzExMjIzMzQ0FQIAEhgg",
          sender_phone: "254712345678",
          sender_name: "Brian Ochieng",
          message_body: "Hi AYOTD, kindly send 2 plates of Chicken Pilau and 1 Fresh Juice to Hall 7 Room 104. Will pay with M-Pesa.",
          message_type: "text",
          processing_status: "REVIEW_REQUIRED",
          received_at: new Date(Date.now() - 25 * 60 * 1000).toISOString()
        },
        {
          id: "wa-demo-2",
          external_message_id: "wamid.HBgLMjU0NzI4ODc3NjY1FQIAEhgg",
          sender_phone: "254728877665",
          sender_name: "Amina Hassan",
          message_body: "Please prepare 1 Beef Stew & Rice for collection at 1:30 PM. Paying cash.",
          message_type: "text",
          processing_status: "REVIEW_REQUIRED",
          received_at: new Date(Date.now() - 40 * 60 * 1000).toISOString()
        },
        {
          id: "wa-demo-3",
          external_message_id: "wamid.HBgLMjU0NzIyMzMzNDQ1FQIAEhgg",
          sender_phone: "254722333445",
          sender_name: "Dennis Mwangi",
          message_body: "Chips Masala please, Hostel 2 Block C.",
          message_type: "text",
          processing_status: "PROCESSED",
          received_at: new Date(Date.now() - 90 * 60 * 1000).toISOString()
        }
      ]
    });
  }

  try {
    let query = db
      .from("whatsapp_messages")
      .select(`
        id,
        external_message_id,
        sender_phone,
        message_body,
        message_type,
        processing_status,
        linked_order_id,
        received_at,
        processed_at
      `)
      .order("received_at", { ascending: false })
      .limit(100);

    if (status && status !== "ALL") {
      query = query.eq("processing_status", status);
    }

    const { data: messages, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ messages: messages || [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load WhatsApp messages." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  const { id, status, linkedOrderId } = body || {};

  if (!id || !["REVIEW_REQUIRED", "PROCESSED", "IGNORED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status update payload" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ success: true, message: "Status updated (demo mode)" });
  }

  try {
    const updateData: any = {
      processing_status: status,
      processed_at: new Date().toISOString()
    };
    if (linkedOrderId) {
      updateData.linked_order_id = linkedOrderId;
    }

    const { error } = await db
      .from("whatsapp_messages")
      .update(updateData)
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true, id, status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update WhatsApp message status." },
      { status: 500 }
    );
  }
}

