import crypto from "crypto";

export const STAFF_COOKIE_NAME = "ayotd_staff_session";

export function getAdminPasscode(): string {
  return process.env.ADMIN_PASSCODE?.trim() || "2026";
}

function getSecretKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "ayotd-campus-delicacies-secret-key-2026"
  );
}

export function generateStaffSessionToken(): string {
  const passcode = getAdminPasscode();
  const secret = getSecretKey();
  return crypto.createHmac("sha256", secret).update(`ayotd-auth:${passcode}`).digest("hex");
}

export function verifyStaffPasscode(inputPasscode?: string | null): boolean {
  if (!inputPasscode) return false;
  const currentPasscode = getAdminPasscode();
  return inputPasscode.trim() === currentPasscode;
}

export function verifyStaffSessionToken(token?: string | null): boolean {
  if (!token) return false;
  const expectedToken = generateStaffSessionToken();
  return token === expectedToken;
}

export function isStaffAuthorized(request: Request): boolean {
  // 1. Check direct passcode header (useful for programmatic API calls)
  const headerPasscode = request.headers.get("x-staff-passcode");
  if (headerPasscode && verifyStaffPasscode(headerPasscode)) {
    return true;
  }

  // 2. Check HTTP session cookie
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`${STAFF_COOKIE_NAME}=([^;]+)`));
  const token = match ? decodeURIComponent(match[1]) : null;

  return verifyStaffSessionToken(token);
}
