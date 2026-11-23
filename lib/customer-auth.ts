import crypto from "crypto";

export const CUSTOMER_COOKIE_NAME = "ayotd_customer_session";

function getSecretKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "ayotd-customer-auth-session-key-2026"
  );
}

export interface CustomerSessionPayload {
  customerId: string;
  name: string;
  phone: string;
  address?: string;
  isGuest?: boolean;
  guestOrderId?: string;
  expiresAt: number; // unix timestamp in ms
}

/**
 * Creates a signed tamper-proof token for customer & guest sessions.
 */
export function signCustomerSession(payload: CustomerSessionPayload): string {
  const dataStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const hmac = crypto.createHmac("sha256", getSecretKey()).update(dataStr).digest("base64url");
  return `${dataStr}.${hmac}`;
}

/**
 * Verifies and decodes a customer/guest session token.
 */
export function verifyCustomerSession(token?: string | null): CustomerSessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [dataStr, signature] = parts;

  const expectedHmac = crypto.createHmac("sha256", getSecretKey()).update(dataStr).digest("base64url");
  if (signature !== expectedHmac) return null;

  try {
    const payload: CustomerSessionPayload = JSON.parse(Buffer.from(dataStr, "base64url").toString("utf8"));
    if (Date.now() > payload.expiresAt) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Hash password securely with salt using standard Node crypto.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, combinedHash: string): boolean {
  try {
    const [salt, originalHash] = combinedHash.split(":");
    if (!salt || !originalHash) return false;
    const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
    return testHash === originalHash;
  } catch {
    return false;
  }
}

/**
 * Generate a unique traceable guest ID e.g. "AYO-GST-8F3A19"
 */
export function generateGuestId(): string {
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `AYO-GST-${rand}`;
}

