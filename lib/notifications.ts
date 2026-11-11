import { sendWhatsAppMessage } from "./whatsapp";
import { kes } from "./money";

export interface OrderNotificationPayload {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  status: string;
  totalAmount: number;
  fulfilmentType: "DELIVERY" | "PICKUP";
  deliveryAddress?: string | null;
  riderName?: string;
  riderPhone?: string;
  appUrl?: string;
}

export async function dispatchOrderStatusNotification(payload: OrderNotificationPayload) {
  const { orderNumber, customerPhone, status, fulfilmentType, appUrl } = payload;
  const trackUrl = `${appUrl || "http://localhost:3000"}/track?order=${encodeURIComponent(orderNumber)}`;

  let message = "";

  switch (status) {
    case "ACCEPTED":
      message = `*A Year or Two Delicacies (AYOTD)*\n\nHello ${payload.customerName}! Your order *${orderNumber}* has been ACCEPTED by our kitchen team.\n\nTotal: ${kes(payload.totalAmount)}\nFulfilment: ${fulfilmentType}\n\nTrack your order in real-time:\n${trackUrl}\n\nThank you for choosing AYOTD!`;
      break;

    case "PREPARING":
      message = `*AYOTD Kitchen Update*\n\nGreat news! The chef is now PREPARING your meal for order *${orderNumber}*. We use fresh ingredients made just for you.\n\nLive tracking: ${trackUrl}`;
      break;

    case "READY":
      if (fulfilmentType === "PICKUP") {
        message = `*AYOTD Collection Ready!*\n\nYour order *${orderNumber}* is HOT & READY for collection at our kitchen counter. Please come pick it up whenever you are ready!\n\nReference: ${orderNumber}`;
      } else {
        message = `*AYOTD Order Ready!*\n\nOrder *${orderNumber}* has been freshly packed and is awaiting rider dispatch. Tracking: ${trackUrl}`;
      }
      break;

    case "OUT_FOR_DELIVERY":
      const riderInfo = payload.riderName ? `\nAssigned Rider: ${payload.riderName} (${payload.riderPhone || "Contact via app"})` : "";
      message = `*AYOTD Order Out for Delivery!*\n\nYour meal *${orderNumber}* is on its way to ${payload.deliveryAddress || "your campus spot"}!${riderInfo}\n\nPlease keep your phone nearby.\nLive tracking: ${trackUrl}`;
      break;

    case "COMPLETED":
      message = `*AYOTD Order Delivered!*\n\nYour order *${orderNumber}* has been successfully fulfilled. Enjoy your meal!\n\nWe love your feedback. Have a wonderful day!`;
      break;

    case "CANCELLED":
      message = `*AYOTD Order Update*\n\nYour order *${orderNumber}* has been cancelled. If you made an M-Pesa payment, our team will process your refund promptly. Contact us for assistance.`;
      break;

    default:
      return;
  }

  return await sendWhatsAppMessage(customerPhone, message);
}

