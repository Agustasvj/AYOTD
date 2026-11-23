import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  verifyPassword,
  signCustomerSession,
  CUSTOMER_COOKIE_NAME
} from "@/lib/customer-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, password } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Please enter your name or phone number." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Please enter your password." },
        { status: 400 }
      );
    }

    const trimmedQuery = name.trim();
    const db = getSupabaseAdmin();

    if (!db) {
      return NextResponse.json(
        { error: "Database offline. Please try guest checkout or verify Supabase connection." },
        { status: 503 }
      );
    }

    // Query customer by phone or name (case-insensitive)
    const { data: customer, error: fetchErr } = await db
      .from("customers")
      .select("id, full_name, phone, password_hash, default_address")
      .or(`full_name.ilike.%${trimmedQuery}%,phone.eq.${trimmedQuery}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr || !customer) {
      return NextResponse.json(
        { error: "Invalid credentials. No account found with this name or phone." },
        { status: 401 }
      );
    }

    if (!customer.password_hash) {
      return NextResponse.json(
        { error: "This account was created without a password. Please sign up to create your password." },
        { status: 400 }
      );
    }

    const isMatch = verifyPassword(password, customer.password_hash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Incorrect password. Please try again." },
        { status: 401 }
      );
    }

    // Fetch saved addresses
    let addresses: string[] = [];
    if (customer.default_address) {
      addresses.push(customer.default_address);
    }
    const { data: addrRows } = await db
      .from("customer_addresses")
      .select("location")
      .eq("customer_id", customer.id);

    if (addrRows && addrRows.length > 0) {
      for (const row of addrRows) {
        if (row.location && !addresses.includes(row.location)) {
          addresses.push(row.location);
        }
      }
    }

    // Issue 30-day session token
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    const token = signCustomerSession({
      customerId: customer.id,
      name: customer.full_name,
      phone: customer.phone,
      address: addresses[0] || "",
      isGuest: false,
      expiresAt
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: customer.id,
        name: customer.full_name,
        phone: customer.phone,
        address: addresses[0] || "",
        addresses,
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
    console.error("Login error:", err);
    return NextResponse.json(
      { error: err.message || "Login failed." },
      { status: 500 }
    );
  }
}
