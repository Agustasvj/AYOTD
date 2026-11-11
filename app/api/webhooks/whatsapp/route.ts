import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  getWhatsAppConfig,
  verifyWhatsAppSignature,
  extractWhatsAppMessages
} from "@/lib/whatsapp";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const config = getWhatsAppConfig();

  if (mode === "subscribe" && token && token === config.verifyToken) {
    return new Response(challenge || "", { status: 200 });
  }

  return new Response("Forbidden: Invalid verification token", { status: 403 });
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  // 1. Signature verification
  if (process.env.WHATSAPP_APP_SECRET && !verifyWhatsAppSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: any = null;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages = extractWhatsAppMessages(payload);
  const db = getSupabaseAdmin();

  if (db && messages.length > 0) {
    for (const msg of messages) {
      try {
        // Upsert contact
        await db
          .from("whatsapp_contacts")
          .upsert(
            {
              phone: msg.senderPhone,
              contact_name: msg.senderName || null
            },
            { onConflict: "phone" }
          );

        // Store message idempotently (ignore duplicates based on external_message_id)
        await db.from("whatsapp_messages").upsert(
          {
            external_message_id: msg.messageId,
            sender_phone: msg.senderPhone,
            message_body: msg.text,
            message_type: msg.type,
            processing_status: "REVIEW_REQUIRED",
            received_at: msg.timestamp
          },
          {
            onConflict: "external_message_id",
            ignoreDuplicates: true
          }
        );
      } catch (err) {
        console.error("[WhatsApp Ingestion Error]", err);
      }
    }
  }

  return NextResponse.json({
    received: true,
    count: messages.length
  });
}
