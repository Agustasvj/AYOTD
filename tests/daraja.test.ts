import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  generateDarajaPassword,
  generateDarajaTimestamp,
  parseDarajaCallback
} from "../lib/daraja";

describe("Safaricom Daraja M-Pesa STK Push Tests", () => {
  test("generates valid 14-digit Daraja timestamp", () => {
    const timestamp = generateDarajaTimestamp();
    assert.equal(timestamp.length, 14);
    assert.match(timestamp, /^\d{14}$/);
  });

  test("computes Base64 password correctly for Daraja STK push", () => {
    const shortcode = "174379";
    const passkey = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
    const timestamp = "20261110193000";

    const password = generateDarajaPassword(shortcode, passkey, timestamp);
    const expected = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
    assert.equal(password, expected);
  });

  test("parses successful Safaricom STK Push callback payload", () => {
    const mockCallbackPayload = {
      Body: {
        stkCallback: {
          MerchantRequestID: "29115-34620561-1",
          CheckoutRequestID: "ws_CO_19122026102500",
          ResultCode: 0,
          ResultDesc: "The service request is processed successfully.",
          CallbackMetadata: {
            Item: [
              { Name: "Amount", Value: 350.0 },
              { Name: "MpesaReceiptNumber", Value: "SHB892KL90" },
              { Name: "TransactionDate", Value: 20261110193045 },
              { Name: "PhoneNumber", Value: 254712345678 }
            ]
          }
        }
      }
    };

    const parsed = parseDarajaCallback(mockCallbackPayload);
    assert.ok(parsed);
    assert.equal(parsed.isSuccess, true);
    assert.equal(parsed.checkoutRequestId, "ws_CO_19122026102500");
    assert.equal(parsed.amount, 350);
    assert.equal(parsed.mpesaReceiptNumber, "SHB892KL90");
    assert.equal(parsed.phoneNumber, "254712345678");
    assert.equal(parsed.resultCode, 0);
  });

  test("parses failed Safaricom STK Push callback payload (e.g. user cancelled prompt)", () => {
    const mockFailedPayload = {
      Body: {
        stkCallback: {
          MerchantRequestID: "29115-34620561-2",
          CheckoutRequestID: "ws_CO_19122026102501",
          ResultCode: 1032,
          ResultDesc: "Request cancelled by user."
        }
      }
    };

    const parsed = parseDarajaCallback(mockFailedPayload);
    assert.ok(parsed);
    assert.equal(parsed.isSuccess, false);
    assert.equal(parsed.resultCode, 1032);
    assert.equal(parsed.resultDesc, "Request cancelled by user.");
    assert.equal(parsed.mpesaReceiptNumber, null);
  });
});

