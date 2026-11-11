import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { kes, formatKenyanPhone, toCents, fromCents, KES_DELIVERY_FEE } from "../lib/money";

describe("Money & Phone Formatting Utility Tests", () => {
  test("formats Kenyan Shillings (KES) correctly", () => {
    const formatted250 = kes(250);
    assert.match(formatted250, /KES|Ksh/i);
    assert.match(formatted250, /250/);

    const formattedZero = kes(0);
    assert.match(formattedZero, /0/);

    const formattedNull = kes(null);
    assert.match(formattedNull, /0/);
  });

  test("handles cents conversion safely", () => {
    assert.equal(toCents(250.5), 25050);
    assert.equal(fromCents(25050), 250.5);
    assert.equal(toCents(100), 10000);
    assert.equal(fromCents(10000), 100);
  });

  test("normalizes Kenyan phone numbers correctly to 254 format", () => {
    assert.equal(formatKenyanPhone("0712345678"), "254712345678");
    assert.equal(formatKenyanPhone("+254712345678"), "254712345678");
    assert.equal(formatKenyanPhone("0112345678"), "254112345678");
    assert.equal(formatKenyanPhone("254712345678"), "254712345678");
    assert.equal(formatKenyanPhone("0722 123 456"), "254722123456");
  });

  test("calculates delivery fee accurately", () => {
    assert.equal(KES_DELIVERY_FEE, 50);
    const subtotal = 380;
    const totalWithDelivery = subtotal + KES_DELIVERY_FEE;
    assert.equal(totalWithDelivery, 430);
  });
});

