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

export const orderItemInputSchema = z.object({
  menuItemId: z.string().min(1, "Menu item ID is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(50, "Quantity cannot exceed 50")
});

export const orderBaseSchema = z.object({
  customerName: z.string().trim().min(2, "Customer name must be at least 2 characters").max(100),
  phone: z.string().trim().regex(kenyanPhoneRegex, "Please enter a valid Kenyan phone number (e.g. 0712345678 or 0112345678)"),
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
  orderId: z.string().uuid("Invalid order ID"),
  phone: z.string().regex(kenyanPhoneRegex, "Invalid Kenyan phone number"),
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
