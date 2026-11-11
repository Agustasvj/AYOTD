import { getSupabaseAdmin } from "@/lib/supabase/server";
import { kes } from "@/lib/money";
import { notFound } from "next/navigation";
import { Printer, ArrowLeft, Bike, CheckSquare, Phone, MapPin } from "lucide-react";
import Link from "next/link";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export default async function OrderPrintPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const db = getSupabaseAdmin();

  let order: any = null;

  if (db) {
    // Lookup by ID or order_number
    const query = id.startsWith("AYOTD-")
      ? db.from("orders").select(`
          id, order_number, source, status, fulfilment_type, delivery_address,
          instructions, subtotal, delivery_fee, total_amount, payment_status, created_at,
          customers(full_name, phone),
          order_items(item_name, quantity, unit_price, subtotal),
          payments(method, status, transaction_reference),
          deliveries(rider_id, profiles(full_name))
        `).eq("order_number", id).maybeSingle()
      : db.from("orders").select(`
          id, order_number, source, status, fulfilment_type, delivery_address,
          instructions, subtotal, delivery_fee, total_amount, payment_status, created_at,
          customers(full_name, phone),
          order_items(item_name, quantity, unit_price, subtotal),
          payments(method, status, transaction_reference),
          deliveries(rider_id, profiles(full_name))
        `).eq("id", id).maybeSingle();

    const { data } = await query;
    if (data) {
      order = {
        order_number: data.order_number,
        source: data.source,
        status: data.status,
        fulfilment_type: data.fulfilment_type,
        delivery_address: data.delivery_address,
        instructions: data.instructions,
        subtotal: Number(data.subtotal),
        delivery_fee: Number(data.delivery_fee),
        total_amount: Number(data.total_amount),
        payment_status: data.payment_status,
        payment_method: (data.payments as any)?.[0]?.method || "MPESA",
        payment_ref: (data.payments as any)?.[0]?.transaction_reference,
        created_at: data.created_at,
        customer: data.customers,
        items: data.order_items || [],
        rider: (data.deliveries as any)?.[0]?.profiles?.full_name
      };
    }
  }

  // Fallback demo order if testing locally without Supabase
  if (!order) {
    order = {
      order_number: id.startsWith("AYOTD-") ? id : `AYOTD-DEMO-${id.slice(0, 6)}`,
      source: "WHATSAPP_GROUP",
      status: "PREPARING",
      fulfilment_type: "DELIVERY",
      delivery_address: "Hall 4 (Moi Hostel), 3rd Floor, Room 318",
      instructions: "Call on arrival, customer in group study room",
      subtotal: 530,
      delivery_fee: 50,
      total_amount: 580,
      payment_status: "PAID",
      payment_method: "MPESA",
      payment_ref: "SHB892KL90",
      created_at: new Date().toISOString(),
      customer: {
        full_name: "Kevin Otieno",
        phone: "0712345678"
      },
      items: [
        { item_name: "Swahili Chicken Biryani", quantity: 1, unit_price: 320, subtotal: 320 },
        { item_name: "AYOTD Sizzling Chips Masala", quantity: 1, unit_price: 180, subtotal: 180 },
        { item_name: "Crispy Beef Samosas (Pair)", quantity: 1, unit_price: 100, subtotal: 100 }
      ],
      rider: "Samuel (Campus Runner #1)"
    };
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-8 print:p-0 print:bg-white print:text-black">
      {/* Top On-Screen Controls Bar (Hidden during Print) */}
      <div className="max-w-2xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link
          href="/admin/deliveries"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white"
        >
          <ArrowLeft size={14} /> Back to Deliveries
        </Link>

        <div className="flex items-center gap-2">
          <PrintButton />
        </div>
      </div>

      {/* Printable Delivery Docket & Slip */}
      <div className="max-w-2xl mx-auto bg-white text-black p-8 sm:p-10 rounded-2xl shadow-2xl print:shadow-none print:rounded-none print:p-6 print:max-w-full border border-zinc-200 print:border-0 font-sans">
        {/* Header */}
        <div className="border-b-2 border-black pb-4 text-center">
          <div className="text-xl font-black tracking-widest uppercase">
            A Year or Two Delicacies
          </div>
          <div className="text-xs font-bold tracking-widest text-zinc-600 uppercase mt-0.5">
            AYOTD CAMPUS DISPATCH & DELIVERY DOCKET
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            University Campus Kitchen • Hotline / WhatsApp: 07XX-AYOTD
          </div>
        </div>

        {/* Order Reference Box */}
        <div className="my-5 p-3 border-2 border-dashed border-black flex justify-between items-center">
          <div>
            <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
              ORDER REFERENCE
            </div>
            <div className="text-2xl font-black font-mono tracking-tight">
              {order.order_number}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold text-zinc-600 uppercase">
              ORDER CHANNEL
            </div>
            <div className="text-sm font-bold uppercase">
              {order.source.replace("_", " ")}
            </div>
            <div className="text-[10px] text-zinc-500">
              {new Date(order.created_at).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </div>
          </div>
        </div>

        {/* Customer & Destination Details */}
        <div className="grid grid-cols-2 gap-4 py-3 border-b border-zinc-300 text-xs">
          <div>
            <div className="font-bold text-zinc-500 uppercase text-[10px]">
              CUSTOMER INFO
            </div>
            <div className="font-bold text-sm text-black mt-0.5">
              {order.customer?.full_name || "Guest Customer"}
            </div>
            <div className="font-mono text-zinc-800 text-xs mt-0.5 flex items-center gap-1">
              <Phone size={11} /> {order.customer?.phone || "No phone"}
            </div>
          </div>

          <div>
            <div className="font-bold text-zinc-500 uppercase text-[10px]">
              FULFILMENT MODE
            </div>
            <div className="font-black text-sm uppercase text-black mt-0.5">
              {order.fulfilment_type === "DELIVERY"
                ? "CAMPUS HOSTEL DELIVERY"
                : "COUNTER COLLECTION"}
            </div>
            {order.rider && (
              <div className="text-zinc-700 text-xs mt-0.5">
                Runner: <strong>{order.rider}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Delivery Location & Instructions */}
        {order.fulfilment_type === "DELIVERY" && (
          <div className="my-3 p-3 bg-zinc-100 border border-zinc-300 rounded text-xs">
            <div className="font-bold uppercase text-[10px] text-zinc-600 flex items-center gap-1">
              <MapPin size={12} /> DELIVERY DESTINATION
            </div>
            <div className="font-extrabold text-sm text-black mt-0.5">
              {order.delivery_address || "Campus Spot"}
            </div>

            {order.instructions && (
              <div className="mt-2 pt-2 border-t border-zinc-200 text-zinc-700">
                <strong className="text-black">Special Notes:</strong> {order.instructions}
              </div>
            )}
          </div>
        )}

        {/* Order Items Table */}
        <div className="mt-5">
          <div className="font-bold text-xs uppercase tracking-wider text-black pb-1.5 border-b border-black">
            MEAL ITEMS FOR DISPATCH
          </div>
          <table className="w-full text-xs text-left my-2">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500">
                <th className="py-1.5 w-12 font-bold">QTY</th>
                <th className="py-1.5 font-bold">DISH DESCRIPTION</th>
                <th className="py-1.5 text-right font-bold w-20">RATE</th>
                <th className="py-1.5 text-right font-bold w-24">SUBTOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {order.items.map((it: any, idx: number) => (
                <tr key={idx}>
                  <td className="py-2 font-black text-sm">{it.quantity}×</td>
                  <td className="py-2 font-medium">{it.item_name}</td>
                  <td className="py-2 text-right font-mono text-zinc-600">
                    {kes(it.unit_price)}
                  </td>
                  <td className="py-2 text-right font-mono font-bold">
                    {kes(it.subtotal || it.unit_price * it.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Payment Summary */}
        <div className="border-t-2 border-black pt-3 mt-3 space-y-1 text-xs">
          <div className="flex justify-between text-zinc-600">
            <span>Food Subtotal</span>
            <span className="font-mono">{kes(order.subtotal)}</span>
          </div>

          <div className="flex justify-between text-zinc-600">
            <span>Campus Delivery Charge</span>
            <span className="font-mono">
              {order.delivery_fee > 0 ? kes(order.delivery_fee) : "FREE"}
            </span>
          </div>

          <div className="flex justify-between text-base font-black text-black pt-2 border-t border-zinc-300">
            <span>GRAND TOTAL</span>
            <span className="font-mono">{kes(order.total_amount)}</span>
          </div>
        </div>

        {/* Payment Reconciliation Box */}
        <div className="mt-4 p-3 border-2 border-black rounded text-xs flex justify-between items-center">
          <div>
            <div className="text-[10px] font-bold text-zinc-600 uppercase">
              PAYMENT METHOD & STATUS
            </div>
            <div className="font-black text-sm uppercase mt-0.5">
              {order.payment_status === "PAID" ? (
                <span className="text-black">
                  ✓ PAID IN FULL ({order.payment_method})
                </span>
              ) : (
                <span className="text-black underline">
                  ⚠ CASH DUE ON DELIVERY: {kes(order.total_amount)}
                </span>
              )}
            </div>
            {order.payment_ref && (
              <div className="text-[11px] font-mono text-zinc-600 mt-0.5">
                Receipt / Ref: {order.payment_ref}
              </div>
            )}
          </div>

          <div className="text-right">
            <span className="inline-block border border-black px-3 py-1 font-mono font-black text-xs uppercase">
              {order.payment_status}
            </span>
          </div>
        </div>

        {/* Verification Checkboxes for Delivery Runner */}
        <div className="mt-6 pt-4 border-t border-dashed border-zinc-400 text-[11px] space-y-3">
          <div className="font-bold text-zinc-700 uppercase">
            RUNNER FULFILMENT CHECKLIST
          </div>
          <div className="grid grid-cols-2 gap-3 text-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border border-black shrink-0" />
              <span>Items Packed & Verified Hot</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border border-black shrink-0" />
              <span>Payment Reconciled (M-Pesa / Cash)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border border-black shrink-0" />
              <span>Delivered to Correct Hostel Room</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border border-black shrink-0" />
              <span>Customer Confirmed Receipt</span>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-6 mt-4 border-t border-zinc-200">
            <div>
              <div className="border-b border-black h-8" />
              <div className="text-[10px] text-zinc-500 uppercase mt-1">
                Runner Name & Signature
              </div>
            </div>
            <div>
              <div className="border-b border-black h-8" />
              <div className="text-[10px] text-zinc-500 uppercase mt-1">
                Student / Customer Signature
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center text-[10px] text-zinc-400 mt-6 pt-3 border-t border-zinc-200">
          Thank you for choosing A Year or Two Delicacies (AYOTD) • Good Food. Good Mood.
        </div>
      </div>
    </div>
  );
}

