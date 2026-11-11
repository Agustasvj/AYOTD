import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  createOrderSchema,
  createManualOrderSchema,
  stkPushInputSchema,
  updateOrderStatusSchema,
  assignRiderSchema,
  menuItemSchema,
  categorySchema
} from "../lib/validation";

describe("Input Validation & Zod Schema Tests", () => {
  test("accepts valid guest order for delivery", () => {
    const validDeliveryOrder = {
      customerName: "Amina Hassan",
      phone: "0712345678",
      fulfilmentType: "DELIVERY",
      address: "Hall 4, Room 102",
      instructions: "Call upon arrival",
      paymentMethod: "MPESA",
      items: [{ menuItemId: "meal-1", quantity: 2 }]
    };

    const result = createOrderSchema.safeParse(validDeliveryOrder);
    assert.equal(result.success, true);
  });

  test("rejects delivery order missing delivery location", () => {
    const invalidDeliveryOrder = {
      customerName: "Amina Hassan",
      phone: "0712345678",
      fulfilmentType: "DELIVERY",
      address: "", // empty
      paymentMethod: "MPESA",
      items: [{ menuItemId: "meal-1", quantity: 1 }]
    };

    const result = createOrderSchema.safeParse(invalidDeliveryOrder);
    assert.equal(result.success, false);
    if (!result.success) {
      assert.ok(result.error.issues.some((i) => i.path.includes("address")));
    }
  });

  test("accepts pickup/collection order with empty address", () => {
    const validPickupOrder = {
      customerName: "Kevin Otieno",
      phone: "0112345678",
      fulfilmentType: "PICKUP",
      paymentMethod: "CASH",
      items: [{ menuItemId: "meal-2", quantity: 1 }]
    };

    const result = createOrderSchema.safeParse(validPickupOrder);
    assert.equal(result.success, true);
  });

  test("validates Kenyan phone number regex formats", () => {
    const validPhones = ["0712345678", "0722000000", "0112345678", "+254712345678", "+254112345678"];
    for (const phone of validPhones) {
      const res = createOrderSchema.safeParse({
        customerName: "Test",
        phone,
        fulfilmentType: "PICKUP",
        paymentMethod: "CASH",
        items: [{ menuItemId: "meal-1", quantity: 1 }]
      });
      assert.equal(res.success, true, `Phone ${phone} should be valid`);
    }

    const invalidPhones = ["12345", "0612345678", "0812345678", "071234567", "071234567890"];
    for (const phone of invalidPhones) {
      const res = createOrderSchema.safeParse({
        customerName: "Test",
        phone,
        fulfilmentType: "PICKUP",
        paymentMethod: "CASH",
        items: [{ menuItemId: "meal-1", quantity: 1 }]
      });
      assert.equal(res.success, false, `Phone ${phone} should be invalid`);
    }
  });

  test("validates manual order schema with varied source channels", () => {
    const sources = ["WHATSAPP_GROUP", "WHATSAPP_DM", "PHONE_CALL", "WALK_IN", "ADMIN_MANUAL"] as const;

    for (const source of sources) {
      const res = createManualOrderSchema.safeParse({
        source,
        customerName: "Manual Customer",
        phone: "0722112233",
        fulfilmentType: "PICKUP",
        paymentMethod: "CASH",
        items: [{ menuItemId: "meal-3", quantity: 2 }]
      });
      assert.equal(res.success, true);
    }
  });

  test("validates STK Push input schema", () => {
    const valid = {
      orderId: "123e4567-e89b-12d3-a456-426614174000",
      phone: "0712345678",
      amount: 350
    };
    assert.equal(stkPushInputSchema.safeParse(valid).success, true);

    const invalidAmount = { ...valid, amount: -50 };
    assert.equal(stkPushInputSchema.safeParse(invalidAmount).success, false);
  });

  test("validates order status updates and rider assignment", () => {
    assert.equal(
      updateOrderStatusSchema.safeParse({ status: "PREPARING", note: "Chef started" }).success,
      true
    );
    assert.equal(
      updateOrderStatusSchema.safeParse({ status: "INVALID_STATUS" }).success,
      false
    );

    assert.equal(
      assignRiderSchema.safeParse({ riderId: "123e4567-e89b-12d3-a456-426614174000" }).success,
      true
    );
  });
});

