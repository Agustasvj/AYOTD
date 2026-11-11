# A Year or Two Delicacies (AYOTD)
## Complete Food Ordering, Order Management & Delivery Platform

Production-ready food ordering, kitchen management, campus delivery, and financial reconciliation system built for **A Year or Two Delicacies (AYOTD)** in Kenya.

---

## 1. System Architecture & Overview

AYOTD centralizes all food business operations into a single real-time database. Whether an order originates on the customer website, a student WhatsApp group, a direct WhatsApp message, a phone call, or a walk-in at the counter, it flows through one unified pipeline:

```
[Customer Web Storefront] ──┐
[WhatsApp Cloud API Webhook] ┼──▶ [Next.js API & Server Engine] ──▶ [Supabase PostgreSQL (17 Tables)]
[Staff Manual Entry Portal]  ──┘         │                                         │
                                         ▼                                         ▼
                            [Safaricom Daraja STK Push]            [Role-Based Operational UI]
                                         │                          ├─ Kitchen Display (KDS)
                                         ▼                          ├─ Rider Delivery Portal
                              [M-Pesa STK Callback]                 └─ Executive Dashboard
```

---

## 2. Key Modules & Features

### A. Customer Website (`/`)
- **Brand Identity**: Deep black background (`#09090b`), charcoal panels (`#151519`), crimson red accent (`#b91c35`), typography paired with Playfair Display and DM Sans.
- **Hero & Specials**: Value highlights for campus delivery (15–30 min delivery to hostels, labs, and faculty halls).
- **Interactive Menu**: Category filtering, instant search bar, dietary descriptions, and live availability badges ("Fresh & Ready" vs "Sold Out Today").
- **Food Detail Quick View**: Modal displaying dish imagery, portion quantity selectors, and kitchen customization notes.
- **Sliding Basket Drawer**: Real-time subtotal calculation, campus delivery fee estimation (`KES 50` or free collection), and one-click checkout.
- **Mobile Floating Cart**: Bottom sticky pill showing item count, total in KES, and fast view basket trigger.

### B. Guest Checkout (`/checkout`)
- **No Mandatory Login**: Frictionless ordering for students and campus visitors.
- **Campus Fulfilment**: Choose between Campus Delivery (requires hostel name, room/block number, and landmarks) or Counter Pickup.
- **Payment Method Selection**:
  - **Safaricom M-Pesa STK Push**: Initiates an automated PIN prompt directly on the customer's phone.
  - **Cash on Delivery / Pickup**: Generates a pending cash collection record requiring staff verification upon handover.
- **Server-Side Price Recalculation**: Prices and totals submitted by the client are never trusted; the server verifies item prices against canonical database records.

### C. Live Order Radar & Tracking (`/track`)
- **Real-Time Visual Stepper**:
  1. `PENDING` (Order Received)
  2. `ACCEPTED` (Order Accepted by Kitchen)
  3. `PREPARING` (Chef Cooking on Stoves)
  4. `READY` (Packed & Ready for Dispatch / Collection)
  5. `OUT_FOR_DELIVERY` (Rider on the Way)
  6. `COMPLETED` (Delivered & Fulfilled)
- **Rider Contact**: Displays the assigned delivery runner's name and quick call button when in transit.
- **WhatsApp Support**: Direct link to AYOTD WhatsApp customer care with order reference pre-filled.

### D. Operations & Staff Dashboard (`/admin`)
- **Overview (`/admin`)**: Real-time sales metrics, M-Pesa vs Cash revenue breakdown, pending approvals, and active cooking tickets.
- **Orders Queue (`/admin/orders`)**: Filterable queue by lifecycle status and origin channel (`WEBSITE`, `WHATSAPP_GROUP`, `WHATSAPP_DM`, `PHONE_CALL`, `WALK_IN`). Instant actions: Accept, Reject, Start Prep, Mark Ready, Dispatch, and Cancel with audit reasons.
- **Manual Order Entry (`/admin/orders/new`)**: Rapid order capture for student WhatsApp groups, phone calls, and walk-ins. Multi-item meal picker with automatic pricing.
- **Kitchen Display System (`/admin/kitchen`)**: High-visibility touch screen for kitchen staff. Displays ticket elapsed times, priority badges for orders exceeding 20 minutes, meal items, quantities, and special cooking instructions. One-tap "Start Cooking" and "Mark Ready" buttons.
- **Campus Logistics & Deliveries (`/admin/deliveries`)**: Runner dispatch board. Assign delivery personnel to orders, view hostel destinations, and monitor delivery attempts.
- **Mobile Rider Portal (`/rider`)**: Simplified mobile screen for delivery runners. Shows assigned hostel runs, customer call/WhatsApp triggers, and a "STK Push at Doorstep" button for collecting cash-on-delivery payments electronically.
- **Menu & Pricing Manager (`/admin/menu`)**: Live catalog editor. Create food categories, add new dishes, upload photos, edit descriptions, adjust prices in KES, and toggle in-stock / sold-out availability during lunch rushes.
- **WhatsApp Message Queue (`/admin/whatsapp`)**: Ingestion inbox for messages arriving via Meta's WhatsApp Cloud API webhook. Highlights unread messages requiring admin review with a 1-click "Convert to Order" shortcut that pre-populates customer info and message notes into the order form.
- **Payments & Reconciliation (`/admin/payments`)**: Financial ledger. Reconcile Safaricom M-Pesa transaction IDs, receipt numbers (`MpesaReceiptNumber`), and staff-confirmed cash receipts.
- **Customer Directory (`/admin/customers`)**: CRM table tracking customer order frequencies, lifetime spend in KES, and contact info.
- **Analytics & Reports (`/admin/analytics`)**: Gross sales, average order value (AOV), fulfillment rates, revenue by payment method (M-Pesa vs Cash), order channel distribution, and campus best-selling dishes ranking.

---

## 3. Database Architecture (Supabase PostgreSQL)

The schema includes 17 relational tables with UUID primary keys, Row Level Security (RLS) policies, foreign key integrity, and automatic timestamps.

### Table Schema Summary

| Table | Purpose |
| :--- | :--- |
| `profiles` | Staff accounts linked to Supabase Auth (`SUPER_ADMIN`, `ADMIN`, `KITCHEN`, `DELIVERY`). |
| `customers` | Customer directory indexed by unique phone number. |
| `customer_addresses` | Campus delivery destinations (hostels, rooms, landmarks). |
| `categories` | Menu categories (`Special Combos`, `Main Meals`, `Student Favourites`, etc.). |
| `menu_items` | Dishes, descriptions, prices in KES, image URLs, active & availability flags. |
| `menu_item_availability`| Time and day-based availability schedules. |
| `orders` | Central order record with unique `order_number`, channel source, status, and financials. |
| `order_items` | Historical item snapshots preserving unit prices at the time of purchase. |
| `order_status_history` | Audit log of all lifecycle status changes with notes and timestamps. |
| `payments` | Payment attempts, methods (`MPESA`, `CASH`), statuses, and transaction references. |
| `mpesa_transactions` | Safaricom Daraja STK Push records, `CheckoutRequestID`, receipts, and callbacks. |
| `payment_events` | Granular webhook and payment audit log. |
| `deliveries` | Rider assignment records, dispatch timestamps, and delivery completion times. |
| `delivery_events` | Delivery status timeline and failure logs. |
| `whatsapp_contacts` | WhatsApp sender phone numbers and contact names. |
| `whatsapp_messages` | Webhook message inbox with deduplication on `external_message_id`. |
| `activity_logs` | Administrative audit trail for security and auditing. |

### Row Level Security (RLS) Principles
- Anonymous public users can only read active categories and in-stock menu items.
- Public guest order creation is performed securely via server-side service-role code.
- Staff members can read and update orders according to their assigned roles (`KITCHEN` sees active prep tickets; `DELIVERY` sees assigned deliveries; `ADMIN` and `SUPER_ADMIN` have full operational access).

---

## 4. Safaricom Daraja M-Pesa Integration Guide

### STK Push Workflow
1. The customer selects **M-Pesa** at checkout and enters their Kenyan phone number (`07...`, `01...`, or `+254...`).
2. The server endpoint `POST /api/payments/stk-push` normalizes the phone number to `254...`.
3. The backend generates a Daraja OAuth access token (cached in memory with expiration tracking).
4. The backend constructs a 14-digit timestamp (`YYYYMMDDHHmmss`) and computes `Password = Base64(Shortcode + Passkey + Timestamp)`.
5. The request is dispatched to Safaricom's `/mpesa/stkpush/v1/processrequest`.
6. Safaricom returns a `CheckoutRequestID` and triggers a SIM toolkit PIN prompt on the customer's phone.
7. Upon PIN entry, Safaricom sends an asynchronous webhook callback to `POST /api/payments/mpesa/callback`.
8. The callback endpoint verifies the payload, checks for duplicate callback submission (idempotency), updates `mpesa_transactions` and `payments`, and marks the order payment status as `PAID`.

> **Important Security Rule**: A payment being marked as `PAID` does not alter the food preparation or delivery status. Delivery completion must never automatically mark an unpaid order as paid without explicit cash/M-Pesa confirmation.

### Environment Credentials
```env
DARAJA_CONSUMER_KEY=your_daraja_consumer_key
DARAJA_CONSUMER_SECRET=your_daraja_consumer_secret
DARAJA_SHORTCODE=174379 # Sandbox test shortcode
DARAJA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
DARAJA_CALLBACK_URL=https://your-domain.vercel.app/api/payments/mpesa/callback
DARAJA_ENVIRONMENT=sandbox # "sandbox" or "production"
```

---

## 5. Meta WhatsApp Cloud API Integration Guide

### Inbound Webhook Verification (`GET /api/webhooks/whatsapp`)
- When configuring the webhook in the Meta Developer Portal, Meta sends a GET request with `hub.mode`, `hub.verify_token`, and `hub.challenge`.
- The endpoint verifies that `hub.verify_token === WHATSAPP_VERIFY_TOKEN` and returns the `hub.challenge` string with a 200 HTTP status.

### Inbound Message Handling (`POST /api/webhooks/whatsapp`)
- **HMAC-SHA256 Signature Verification**: The raw request body is verified against the `x-hub-signature-256` header using `WHATSAPP_APP_SECRET`.
- **Idempotency**: Incoming messages are indexed by `external_message_id` (`wamid...`). Duplicate messages are ignored.
- **Message Storage**: Stored in `whatsapp_messages` with status `REVIEW_REQUIRED`.
- **Conversion to Order**: Authorized staff in `/admin/whatsapp` click **"Convert to Order"** to pre-populate the manual order entry form with the sender's phone, meal preferences, and delivery notes.

### Campus Group Handling Policy
Meta's official WhatsApp Cloud API does not support reading arbitrary third-party personal WhatsApp groups without official business group API permissions. For campus food groups:
1. Students order via the dedicated business WhatsApp number or the website.
2. Staff capture orders posted in WhatsApp groups using the `/admin/orders/new` manual order form, tagging the source as `WHATSAPP_GROUP`.

---

## 6. API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/orders` | Customer guest checkout (server price verification). |
| `GET` | `/api/orders/track?orderNumber=...` | Public order tracking endpoint. |
| `GET` | `/api/menu` | List active categories and in-stock menu items. |
| `POST` | `/api/payments/stk-push` | Initiate Safaricom Daraja STK Push prompt. |
| `POST` | `/api/payments/mpesa/callback` | Safaricom asynchronous payment callback receiver. |
| `POST` | `/api/payments/cash/confirm` | Staff confirmation of cash received. |
| `GET` | `/api/webhooks/whatsapp` | Meta WhatsApp Cloud API challenge verification. |
| `POST` | `/api/webhooks/whatsapp` | Meta WhatsApp Cloud API incoming message receiver. |
| `GET` | `/api/admin/orders` | Admin list orders with status, source, and search filters. |
| `POST` | `/api/admin/orders/manual` | Staff manual order capture. |
| `POST` | `/api/admin/orders/[id]/status` | Update order lifecycle status and notify customer. |
| `POST` | `/api/admin/orders/[id]/assign` | Assign campus delivery runner to an order. |
| `GET` | `/api/admin/menu` | List catalog items (including unavailable items). |
| `POST` | `/api/admin/menu` | Create a new meal dish or food category. |
| `PATCH`| `/api/admin/menu` | Update meal availability, price, or description. |
| `GET` | `/api/admin/payments` | Payment transactions ledger. |
| `GET` | `/api/admin/customers` | Customer directory with spend analytics. |
| `GET` | `/api/admin/riders` | Active delivery runners directory. |
| `GET` | `/api/admin/whatsapp` | WhatsApp incoming message queue. |
| `PATCH`| `/api/admin/whatsapp` | Mark WhatsApp message as reviewed, processed, or ignored. |
| `GET` | `/api/health` | System health check and database connectivity probe. |

---

## 7. Installation & Local Development

### Prerequisites
- Node.js 20.x or later
- npm 10.x or later
- Supabase Project (free tier or self-hosted)

### Steps

1. Clone or navigate to the repository directory:
   ```bash
   cd ayotd-platform
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env.local
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.
   - Storefront: `http://localhost:3000`
   - Order Tracking: `http://localhost:3000/track`
   - Staff Operations Dashboard: `http://localhost:3000/admin`
   - Kitchen Display Screen (KDS): `http://localhost:3000/admin/kitchen`
   - Runner Delivery Screen: `http://localhost:3000/rider`

---

## 8. Database Setup & Seeding

1. Open your **Supabase Dashboard** > **SQL Editor**.
2. Run `supabase/migrations/001_initial_schema.sql` to create all enums, tables, indexes, triggers, and RLS policies.
3. Run `supabase/seed.sql` to populate initial categories (`Main Meals`, `Student Favourites`, `Special Combos`), authentic Kenyan dishes, sample customers, and WhatsApp test messages.
4. Go to **Authentication** > **Users** in Supabase and create your first staff user account.
5. In the SQL Editor, promote that user to `SUPER_ADMIN`:
   ```sql
   update public.profiles
   set role = 'SUPER_ADMIN', full_name = 'Admin Director'
   where id = '<user-uuid-from-auth.users>';
   ```

---

## 9. Automated Testing & Quality Checks

Run the automated test suite powered by Node.js 20's built-in test runner:

```bash
# Run unit & integration test suites
npm test

# Run TypeScript typecheck
npm run typecheck

# Run Next.js production build verification
npm run build

# Run code style & linting check
npm run lint
```

### Test Coverage (21 Automated Tests Across 5 Suites)
1. **`tests/cart-money.test.ts`**: KES currency formatting, cent conversions, Kenyan phone number normalization (`07...`, `+254...`, `01...` to `254...`), delivery fee additions.
2. **`tests/validation.test.ts`**: Zod validation for guest checkout, address requirement on delivery, pickup tolerance, phone regex, manual order sources, and STK push schemas.
3. **`tests/daraja.test.ts`**: Daraja timestamp formatting, Base64 password generation, successful STK callback parsing, and user cancellation handling.
4. **`tests/whatsapp.test.ts`**: HMAC-SHA256 signature verification, Meta webhook payload extraction, and heuristic delivery location parsing.
5. **`tests/orders-lifecycle.test.ts`**: Server-side price recalculation (tamper protection), order state transitions, and strict separation of payment vs delivery status.

---

## 10. Production Deployment (Vercel + Supabase)

1. Push your code to a GitHub / GitLab repository.
2. Import the project into [Vercel](https://vercel.com).
3. Set the Root Directory to `ayotd-platform`.
4. Add all environment variables from `.env.example` into Vercel Project Settings > Environment Variables.
5. Set `NEXT_PUBLIC_APP_URL` to your production domain (e.g. `https://ayotd.co.ke`).
6. Update your **Daraja Callback URL** in the Safaricom Developer portal to `https://your-domain.vercel.app/api/payments/mpesa/callback`.
7. Configure the **Meta WhatsApp Webhook URL** to `https://your-domain.vercel.app/api/webhooks/whatsapp` with your verify token.
8. Deploy!
