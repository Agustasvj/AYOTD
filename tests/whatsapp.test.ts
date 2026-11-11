import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "crypto";
import {
  verifyWhatsAppSignature,
  extractWhatsAppMessages,
  parseDraftOrderFromText
} from "../lib/whatsapp";

describe("Meta WhatsApp Cloud API Integration Tests", () => {
  test("verifies valid HMAC-SHA256 signature against payload", () => {
    const secret = "test_meta_app_secret_9988";
    process.env.WHATSAPP_APP_SECRET = secret;

    const payload = JSON.stringify({ entry: [{ id: "12345" }] });
    const signature = "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");

    const isValid = verifyWhatsAppSignature(payload, signature);
    assert.equal(isValid, true);

    const isInvalid = verifyWhatsAppSignature(payload, "sha256=tampered_signature_string_here");
    assert.equal(isInvalid, false);

    delete process.env.WHATSAPP_APP_SECRET;
  });

  test("extracts incoming WhatsApp message from Meta webhook payload structure", () => {
    const metaPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "10982348572",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: { display_phone_number: "254700000000", phone_number_id: "1098234" },
                contacts: [{ profile: { name: "Samuel Kamau" }, wa_id: "254711223344" }],
                messages: [
                  {
                    from: "254711223344",
                    id: "wamid.HBgLMjU0NzExMjIzMzQ0FQIAEhgg",
                    timestamp: "1731258600",
                    text: { body: "Deliver 2 chicken pilau to Hall 4 Room 218 please" },
                    type: "text"
                  }
                ]
              },
              field: "messages"
            }
          ]
        }
      ]
    };

    const messages = extractWhatsAppMessages(metaPayload);
    assert.equal(messages.length, 1);
    assert.equal(messages[0].senderPhone, "254711223344");
    assert.equal(messages[0].senderName, "Samuel Kamau");
    assert.equal(messages[0].text, "Deliver 2 chicken pilau to Hall 4 Room 218 please");
    assert.equal(messages[0].messageId, "wamid.HBgLMjU0NzExMjIzMzQ0FQIAEhgg");
  });

  test("parses order location hint from WhatsApp message text", () => {
    const message = "Hi AYOTD, deliver to Hall 4 Room 218, thanks!";
    const parsed = parseDraftOrderFromText(message);
    assert.ok(parsed.locationHint);
    assert.match(parsed.locationHint, /Hall 4/i);
  });
});

