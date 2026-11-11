import { createHmac, timingSafeEqual } from "crypto";
import { formatKenyanPhone } from "./money";

export function getWhatsAppConfig() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  const isConfigured = Boolean(token && phoneNumberId && verifyToken);

  return {
    token,
    phoneNumberId,
    verifyToken,
    appSecret,
    isConfigured,
    apiUrl: phoneNumberId ? `https://graph.facebook.com/v21.0/${phoneNumberId}/messages` : ""
  };
}

export function verifyWhatsAppSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    // If secret not configured in local/dev, log warning
    return true;
  }

  if (!signatureHeader) {
    return false;
  }

  try {
    const expected = "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");
    const sigBuffer = Buffer.from(signatureHeader);
    const expBuffer = Buffer.from(expected);

    if (sigBuffer.length !== expBuffer.length) {
      return false;
    }

    return timingSafeEqual(sigBuffer, expBuffer);
  } catch {
    return false;
  }
}

export interface ExtractedWhatsAppMessage {
  messageId: string;
  senderPhone: string;
  senderName?: string;
  timestamp: string;
  text: string;
  type: string;
}

export function extractWhatsAppMessages(payload: any): ExtractedWhatsAppMessage[] {
  const results: ExtractedWhatsAppMessage[] = [];
  const entries = payload?.entry || [];

  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value;
      const contacts = value?.contacts || [];
      const contactMap = new Map<string, string>();
      for (const c of contacts) {
        contactMap.set(c.wa_id, c.profile?.name || "");
      }

      for (const msg of value?.messages || []) {
        let text = "";
        if (msg.type === "text") {
          text = msg.text?.body || "";
        } else if (msg.type === "interactive") {
          text = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || "";
        } else {
          text = `[${msg.type} message received]`;
        }

        results.push({
          messageId: msg.id,
          senderPhone: msg.from,
          senderName: contactMap.get(msg.from) || "",
          timestamp: new Date(Number(msg.timestamp || Date.now() / 1000) * 1000).toISOString(),
          text,
          type: msg.type || "unknown"
        });
      }
    }
  }

  return results;
}

export async function sendWhatsAppMessage(recipientPhone: string, text: string) {
  const config = getWhatsAppConfig();
  if (!config.isConfigured) {
    console.log(`[WhatsApp Mock Dispatch] To: ${recipientPhone} | Message: ${text}`);
    return { success: true, mocked: true };
  }

  try {
    const formattedPhone = formatKenyanPhone(recipientPhone);
    const res = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "text",
        text: { preview_url: false, body: text }
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[WhatsApp Send Error]", data);
      return { success: false, error: data.error?.message || "Failed to send WhatsApp message" };
    }

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (err) {
    console.error("[WhatsApp Send Exception]", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send WhatsApp message"
    };
  }
}

export function parseDraftOrderFromText(text: string): {
  customerName?: string;
  itemsHint: string;
  locationHint?: string;
} {
  const clean = text.trim();
  let locationHint = "";
  let itemsHint = clean;

  const locMatch = clean.match(/(?:deliver to|bring to|hostel|room|block|hall|near)\s+([^,\n\.]+)/i);
  if (locMatch) {
    locationHint = locMatch[0];
  }

  return {
    itemsHint,
    locationHint
  };
}

