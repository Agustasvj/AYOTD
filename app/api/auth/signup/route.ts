import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { validateKenyanPhone } from "@/lib/validation";
import {
  hashPassword,
  signCustomerSession,
  CUSTOMER_COOKIE_NAME
} from "@/lib/customer-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, password, address } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Please enter your full name (minimum 2 characters)." },
        { status: 400 }
      );
    }

    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        { error: "Phone number is required." },
        { status: 400 }
      );
    }

    const phoneCheck = validateKenyanPhone(phone);
    if (!phoneCheck.isValid) {
      return NextResponse.json(
        { error: phoneCheck.error || "Please enter a valid Kenyan phone number (e.g. 0712345678)." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 4) {
      return NextResponse.json(
        { error: "Password must be at least 4 characters long." },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const trimmedAddress = address?.trim() || "";
    const cleanPhone = phoneCheck.normalized;
    const pwdHash = hashPassword(password);

    const db = getSupabaseAdmin();

    let customerId = `cust-${Date.now()}`;

    if (db) {
      // 1. Check if phone is already registered with a password
      const { data: existing } = await db
        .from("customers")
        .select("id, password_hash")
        .eq("phone", cleanPhone)
        .maybeSingle();

      if (existing?.password_hash) {
        return NextResponse.json(
          { error: "An account with this phone number already exists. Please login instead." },
          { status: 409 }
        );
      }

      // 2. Insert or update customer
      const { data: savedCustomer, error: upsertErr } = await db
        .from("customers")
        .upsert(
          {
            full_name: trimmedName,
            phone: cleanPhone,
            password_hash: pwdHash,
            default_address: trimmedAddress || null
          },
          { onConflict: "phone" }
        )
        .select("id, full_name, phone, default_address")
        .single();

      if (upsertErr) {
        console.warn("Database signup upsert note:", upsertErr.message);
      }
      if (savedCustomer?.id) {
        customerId = savedCustomer.id;
      }

      // 3. If address provided, save to customer_addresses
      if (trimmedAddress && customerId && !customerId.startsWith("cust-")) {
        try {
          await db.from("customer_addresses").insert({
            customer_id: customerId,
            location: trimmedAddress,
            label: "Default"
          });
        } catch {
          // ignore
        }
      }
    }

    // 4. Issue signed session token (30 days for registered accounts)
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    const token = signCustomerSession({
      customerId,
      name: trimmedName,
      phone: cleanPhone,
      address: trimmedAddress,
      isGuest: false,
      expiresAt
    });

    const response = NextResponse.json({
      success: true,
      message: "Account created successfully!",
      user: {
        id: customerId,
        name: trimmedName,
        phone: cleanPhone,
        address: trimmedAddress,
        isGuest: false
      }
    });

    response.cookies.set(CUSTOMER_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/"
    });

    return response;
  } catch (err: any) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create account." },
      { status: 500 }
    );
  }
}
