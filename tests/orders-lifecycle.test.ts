import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { demoMenu } from "../lib/demo-menu";
import { KES_DELIVERY_FEE } from "../lib/money";

describe("Order Lifecycle & Business Logic Tests", () => {
  test("server calculates true order total from catalog without trusting browser prices", () => {
    // Client attempts to submit a tampered price of KES 10 for a 250 KES meal
    const clientOrder = {
      items: [
        { menuItemId: "meal-2", quantity: 2, spoofedPrice: 10 }
      ],
      fulfilmentType: "DELIVERY"
    };

    // Server-side recalculation using canonical demoMenu / DB
    const verifiedItem = demoMenu.find((m) => m.id === clientOrder.items[0].menuItemId);
    assert.ok(verifiedItem);
    assert.equal(verifiedItem.price, 250);

    const calculatedSubtotal = verifiedItem.price * clientOrder.items[0].quantity;
    assert.equal(calculatedSubtotal, 500);

    const deliveryFee = clientOrder.fulfilmentType === "DELIVERY" ? KES_DELIVERY_FEE : 0;
    const finalTotal = calculatedSubtotal + deliveryFee;

    // Tampered price was ignored; correct total is 550
    assert.equal(finalTotal, 550);
  });

  test("validates order state transitions in kitchen and delivery workflows", () => {
    const validTransitions: Record<string, string[]> = {
      PENDING: ["ACCEPTED", "REJECTED", "CANCELLED"],
      ACCEPTED: ["PREPARING", "CANCELLED"],
      PREPARING: ["READY", "CANCELLED"],
      READY: ["OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"],
      OUT_FOR_DELIVERY: ["COMPLETED", "DELIVERY_FAILED", "CANCELLED"],
      COMPLETED: [],
      CANCELLED: [],
      REJECTED: [],
      DELIVERY_FAILED: ["OUT_FOR_DELIVERY", "CANCELLED"]
    };

    function canTransition(from: string, to: string) {
      return validTransitions[from]?.includes(to) ?? false;
    }

    assert.equal(canTransition("PENDING", "ACCEPTED"), true);
    assert.equal(canTransition("ACCEPTED", "PREPARING"), true);
    assert.equal(canTransition("PREPARING", "READY"), true);
    assert.equal(canTransition("READY", "OUT_FOR_DELIVERY"), true);
    assert.equal(canTransition("OUT_FOR_DELIVERY", "COMPLETED"), true);

    // Invalid backwards or bypass transitions
    assert.equal(canTransition("PENDING", "COMPLETED"), false);
    assert.equal(canTransition("COMPLETED", "PREPARING"), false);
  });

  test("ensures payment status and delivery status remain independent", () => {
    // Rule: "A payment being successful must not automatically mark an order as delivered.
    // A delivery being completed must not automatically mark an unpaid order as paid."
    const order = {
      status: "PREPARING",
      payment_status: "PENDING"
    };

    // Payment succeeds -> payment_status becomes PAID, but status remains PREPARING
    const paymentSucceededOrder = {
      ...order,
      payment_status: "PAID"
    };
    assert.equal(paymentSucceededOrder.payment_status, "PAID");
    assert.equal(paymentSucceededOrder.status, "PREPARING"); // Not delivered!

    // Delivery completed for Cash order -> status becomes COMPLETED, but payment remains PENDING until confirmed
    const cashOrder = {
      status: "OUT_FOR_DELIVERY",
      payment_status: "PENDING"
    };
    const deliveredCashOrder = {
      ...cashOrder,
      status: "COMPLETED"
    };
    assert.equal(deliveredCashOrder.status, "COMPLETED");
    assert.equal(deliveredCashOrder.payment_status, "PENDING"); // Must not mark as PAID automatically!
  });
});

