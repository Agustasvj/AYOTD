import { describe, it } from "node:test";
import assert from "node:assert";
import {
  verifyStaffPasscode,
  generateStaffSessionToken,
  verifyStaffSessionToken,
  isStaffAuthorized,
  STAFF_COOKIE_NAME,
  getAdminPasscode
} from "../lib/admin-auth";

describe("Admin Passcode Gate & Staff Security Tests", () => {
  it("verifies staff passcode correctly", () => {
    const currentPasscode = getAdminPasscode();
    assert.strictEqual(verifyStaffPasscode(currentPasscode), true);
    assert.strictEqual(verifyStaffPasscode(currentPasscode + " "), true); // trimmed
    assert.strictEqual(verifyStaffPasscode("wrong-code"), false);
    assert.strictEqual(verifyStaffPasscode(""), false);
    assert.strictEqual(verifyStaffPasscode(null as any), false);
  });

  it("generates deterministic HMAC session token and verifies it", () => {
    const token = generateStaffSessionToken();
    assert.ok(typeof token === "string" && token.length === 64);
    assert.strictEqual(verifyStaffSessionToken(token), true);
    assert.strictEqual(verifyStaffSessionToken("tampered-token-12345"), false);
    assert.strictEqual(verifyStaffSessionToken(""), false);
    assert.strictEqual(verifyStaffSessionToken(null), false);
  });

  it("authorizes request via x-staff-passcode header", () => {
    const currentPasscode = getAdminPasscode();
    const reqWithValidHeader = new Request("http://localhost:3000/api/admin/orders", {
      headers: { "x-staff-passcode": currentPasscode }
    });
    assert.strictEqual(isStaffAuthorized(reqWithValidHeader), true);

    const reqWithInvalidHeader = new Request("http://localhost:3000/api/admin/orders", {
      headers: { "x-staff-passcode": "invalid" }
    });
    assert.strictEqual(isStaffAuthorized(reqWithInvalidHeader), false);
  });

  it("authorizes request via staff session cookie", () => {
    const token = generateStaffSessionToken();
    const reqWithCookie = new Request("http://localhost:3000/api/admin/orders", {
      headers: { cookie: `${STAFF_COOKIE_NAME}=${token}; other=value` }
    });
    assert.strictEqual(isStaffAuthorized(reqWithCookie), true);

    const reqWithBadCookie = new Request("http://localhost:3000/api/admin/orders", {
      headers: { cookie: `${STAFF_COOKIE_NAME}=forged-token` }
    });
    assert.strictEqual(isStaffAuthorized(reqWithBadCookie), false);

    const reqWithoutCookie = new Request("http://localhost:3000/api/admin/orders");
    assert.strictEqual(isStaffAuthorized(reqWithoutCookie), false);
  });
});

