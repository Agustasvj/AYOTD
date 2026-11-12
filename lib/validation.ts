import { z } from "zod";

export const orderSourceEnum = z.enum([
  "WEBSITE",
  "WHATSAPP_DM",
  "WHATSAPP_GROUP",
  "PHONE_CALL",
  "WALK_IN",
  "ADMIN_MANUAL"
]);

export const fulfilmentTypeEnum = z.enum(["DELIVERY", "PICKUP"]);
export const paymentMethodEnum = z.enum(["MPESA", "CASH"]);
export const orderStatusEnum = z.enum([
  "PENDING",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
  "DELIVERY_FAILED"
]);

// Kenyan phone regex: allows 07XXXXXXXX, 01XXXXXXXX, +2547XXXXXXXX, +2541XXXXXXXX, 2547XXXXXXXX, 2541XXXXXXXX
export const kenyanPhoneRegex = /^(?:\+?254|0)[17]\d{8}$/;

export interface PhoneValidationResult {
  isValid: boolean;
  carrier?: "Safaricom" | "Airtel" | "Telkom" | "Other";
  normalized: string;
  formatted: string;
  error?: string;
}

/**
 * Validates and normalizes Kenyan mobile phone numbers.
 * Supports: 07XXXXXXXX, 01XXXXXXXX, +2547XXXXXXXX, +2541XXXXXXXX, with spaces or dashes.
 */
export function validateKenyanPhone(input: string): PhoneValidationResult {
  if (!input || !input.trim()) {
    return {
      isValid: false,
      normalized: "",
      formatted: "",
      error: "Phone number is required."
    };
  }

  // Remove whitespace, dashes, parentheses, dots
  let clean = input.replace(/[\s\-\(\)\.]/g, "");

  if (clean.startsWith("+")) {
    clean = clean.slice(1);
  }

  // If user entered 9 digits starting with 7 or 1 (omitted leading 0), add 0
  if (/^[17]\d{8}$/.test(clean)) {
    clean = "0" + clean;
  }

  // Check digits only
  if (!/^\d+$/.test(clean)) {
    return {
      isValid: false,
      normalized: clean,
      formatted: input,
      error: "Phone number should only contain digits."
    };
  }

  let normalized = clean;
  if (clean.startsWith("0")) {
    if (clean.length !== 10) {
      return {
        isValid: false,
        normalized: clean,
        formatted: input,
        error: clean.length < 10 ? "Number too short (expected 10 digits)" : "Number too long (expected 10 digits)"
      };
    }
    normalized = "254" + clean.slice(1);
  } else if (clean.startsWith("254")) {
    if (clean.length !== 12) {
      return {
        isValid: false,
        normalized: clean,
        formatted: input,
        error: clean.length < 12 ? "Number too short (expected 12 digits with 254)" : "Number too long"
      };
    }
  } else {
    return {
      isValid: false,
      normalized: clean,
      formatted: input,
      error: "Kenyan numbers must start with 07, 01, or +254."
    };
  }

  // Validate the prefix
  const prefix = normalized.slice(3, 5); // 70, 71, 72, 74, 79, 11, etc.
  const firstDigit = normalized.charAt(3);
  if (firstDigit !== "7" && firstDigit !== "1") {
    return {
      isValid: false,
      normalized,
      formatted: input,
      error: "Mobile number must start with 07 or 01 (Safaricom / Airtel)."
    };
  }

  // Carrier identification
  let carrier: "Safaricom" | "Airtel" | "Telkom" | "Other" = "Other";
  const safaricomPrefixes = ["70", "71", "72", "74", "79", "11", "768", "769"];
  const airtelPrefixes = ["73", "75", "78", "10"];
  const telkomPrefixes = ["77"];

  if (safaricomPrefixes.some((p) => normalized.slice(3).startsWith(p))) {
    carrier = "Safaricom";
  } else if (airtelPrefixes.some((p) => normalized.slice(3).startsWith(p))) {
    carrier = "Airtel";
  } else if (telkomPrefixes.some((p) => normalized.slice(3).startsWith(p))) {
    carrier = "Telkom";
  }

  const formatted = `+254 ${normalized.slice(3, 6)} ${normalized.slice(6, 9)} ${normalized.slice(9)}`;

  return {
    isValid: true,
    carrier,
    normalized,
    formatted
  };
}

export const orderItemInputSchema = z.object({
  menuItemId: z.string().min(1, "Menu item ID is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(50, "Quantity cannot exceed 50")
});

export const orderBaseSchema = z.object({
  customerName: z.string().trim().min(2, "Customer name must be at least 2 characters").max(100),
  phone: z
    .string()
    .trim()
    .transform((val) => val.replace(/[\s\-\(\)\.]/g, ""))
    .refine((val) => kenyanPhoneRegex.test(val), {
      message: "Please enter a valid Kenyan phone number (e.g. 0712345678 or 0112345678)"
    }),
  fulfilmentType: fulfilmentTypeEnum,
  address: z.string().trim().max(300).optional(),
  instructions: z.string().trim().max(500).optional(),
  paymentMethod: paymentMethodEnum,
  items: z.array(orderItemInputSchema).min(1, "Order must contain at least one meal")
});

export const createOrderSchema = orderBaseSchema.refine(
  (data) => data.fulfilmentType !== "DELIVERY" || Boolean(data.address && data.address.trim().length > 0),
  {
    message: "Delivery location is required for delivery orders",
    path: ["address"]
  }
);

export const createManualOrderSchema = orderBaseSchema.extend({
  source: orderSourceEnum
}).refine(
  (data) => data.fulfilmentType !== "DELIVERY" || Boolean(data.address && data.address.trim().length > 0),
  {
    message: "Delivery location is required for delivery orders",
    path: ["address"]
  }
);

export const stkPushInputSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  phone: z
    .string()
    .trim()
    .transform((val) => val.replace(/[\s\-\(\)\.]/g, ""))
    .refine((val) => kenyanPhoneRegex.test(val), {
      message: "Invalid Kenyan phone number"
    }),
  amount: z.number().int().positive("Amount must be a positive integer in KES")
});

export const updateOrderStatusSchema = z.object({
  status: orderStatusEnum,
  note: z.string().trim().max(500).optional(),
  cancellationReason: z.string().trim().max(500).optional()
});

export const assignRiderSchema = z.object({
  riderId: z.string().uuid("Invalid rider profile ID")
});

export const menuItemSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  price: z.number().positive("Price must be greater than 0"),
  categoryId: z.string().uuid("Valid category is required"),
  imageUrl: z.string().url().optional().or(z.literal("")),
  isAvailable: z.boolean().default(true)
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(50),
  description: z.string().trim().max(200).optional(),
  sortOrder: z.number().int().default(0)
});

export type OrderBaseInput = z.infer<typeof orderBaseSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreateManualOrderInput = z.infer<typeof createManualOrderSchema>;
