import { formatKenyanPhone } from "./money";

interface DarajaTokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: DarajaTokenCache | null = null;

export function getDarajaConfig() {
  const consumerKey = process.env.DARAJA_CONSUMER_KEY;
  const consumerSecret = process.env.DARAJA_CONSUMER_SECRET;
  const shortcode = process.env.DARAJA_SHORTCODE;
  const passkey = process.env.DARAJA_PASSKEY;
  const callbackUrl = process.env.DARAJA_CALLBACK_URL;
  const environment = process.env.DARAJA_ENVIRONMENT || "sandbox";

  const isConfigured = Boolean(consumerKey && consumerSecret && shortcode && passkey && callbackUrl);

  const baseUrl = environment === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

  return {
    consumerKey,
    consumerSecret,
    shortcode,
    passkey,
    callbackUrl,
    environment,
    baseUrl,
    isConfigured
  };
}

export function generateDarajaTimestamp(): string {
  const date = new Date();
  const YYYY = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, "0");
  const DD = String(date.getDate()).padStart(2, "0");
  const HH = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${YYYY}${MM}${DD}${HH}${mm}${ss}`;
}

export function generateDarajaPassword(shortcode: string, passkey: string, timestamp: string): string {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
}

export async function getDarajaAccessToken(): Promise<string> {
  const config = getDarajaConfig();
  if (!config.isConfigured) {
    throw new Error("Daraja is not configured. Missing credentials in server environment.");
  }

  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60000) {
    return tokenCache.token;
  }

  const auth = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString("base64");
  const res = await fetch(`${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
    cache: "no-store"
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Daraja OAuth authentication failed: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  const expiresIn = Number(data.expires_in) || 3599;
  tokenCache = {
    token: data.access_token,
    expiresAt: now + expiresIn * 1000
  };

  return data.access_token;
}

export interface InitiateSTKPushParams {
  phone: string;
  amount: number;
  orderNumber: string;
  description?: string;
}

export interface STKPushResult {
  success: boolean;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  responseDescription?: string;
  customerMessage?: string;
  error?: string;
}

export async function initiateSTKPush(params: InitiateSTKPushParams): Promise<STKPushResult> {
  const config = getDarajaConfig();
  if (!config.isConfigured) {
    return {
      success: false,
      error: "Daraja credentials are not configured on the server."
    };
  }

  try {
    const accessToken = await getDarajaAccessToken();
    const timestamp = generateDarajaTimestamp();
    const password = generateDarajaPassword(config.shortcode!, config.passkey!, timestamp);
    const formattedPhone = formatKenyanPhone(params.phone);

    const payload = {
      BusinessShortCode: config.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(params.amount),
      PartyA: formattedPhone,
      PartyB: config.shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: config.callbackUrl,
      AccountReference: params.orderNumber.slice(0, 12),
      TransactionDesc: (params.description || "AYOTD Food Order").slice(0, 32)
    };

    const res = await fetch(`${config.baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok || data.ResponseCode !== "0") {
      return {
        success: false,
        error: data.errorMessage || data.ResponseDescription || "Safaricom STK Push failed to initiate."
      };
    }

    return {
      success: true,
      checkoutRequestId: data.CheckoutRequestID,
      merchantRequestId: data.MerchantRequestID,
      responseDescription: data.ResponseDescription,
      customerMessage: data.CustomerMessage
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to initiate M-Pesa payment prompt."
    };
  }
}

export function parseDarajaCallback(payload: any) {
  const callback = payload?.Body?.stkCallback;
  if (!callback) return null;

  const checkoutRequestId = callback.CheckoutRequestID;
  const merchantRequestId = callback.MerchantRequestID;
  const resultCode = Number(callback.ResultCode);
  const resultDesc = callback.ResultDesc || "";
  const isSuccess = resultCode === 0;

  const items = callback.CallbackMetadata?.Item || [];
  const getMeta = (name: string) => items.find((x: any) => x.Name === name)?.Value;

  const amount = getMeta("Amount") ? Number(getMeta("Amount")) : null;
  const mpesaReceiptNumber = getMeta("MpesaReceiptNumber") ? String(getMeta("MpesaReceiptNumber")) : null;
  const transactionDate = getMeta("TransactionDate") ? String(getMeta("TransactionDate")) : null;
  const phoneNumber = getMeta("PhoneNumber") ? String(getMeta("PhoneNumber")) : null;

  return {
    checkoutRequestId,
    merchantRequestId,
    resultCode,
    resultDesc,
    isSuccess,
    amount,
    mpesaReceiptNumber,
    transactionDate,
    phoneNumber
  };
}

