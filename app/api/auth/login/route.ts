import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { validateKenyanPhone } from "@/lib/validation";
import {
  verifyPassword,
  signCustomerSession,
  CUSTOMER_COOKIE_NAME
} from "@/lib/customer-auth";

type CustomerRow = { id: string; full_name: string; phone: string };

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

    const query = name.trim();
    const db = getSupabaseAdmin();

    if (!db) {
      return NextResponse.json(
        { error: "Database offline. Please try guest checkout or try again shortly." },
        { status: 503 }
      );
    }

    // Decide whether the user typed a phone number or a name.
    const looksLikePhone = /^[+\d][\d\s\-().]{6,}$/.test(query);
    let customers: CustomerRow[] = [];

    if (looksLikePhone) {
      const phoneCheck = validateKenyanPhone(query);
      if (!phoneCheck.isValid) {
        return NextResponse.json(
          { error: phoneCheck.error || "Please enter a valid Kenyan phone number." },
          { status: 400 }
        );
      }
      const n = phoneCheck.normalized; // 2547XXXXXXXX
      const variants = [n, `+${n}`, `0${n.slice(3)}`];

      const { data, error } = await db
        .from("customers")
        .select("id, full_name, phone")
        .in("phone", variants);

      if (error) {
        console.error("Login: phone lookup failed:", error);
        return NextResponse.json(
          { error: `Could not reach the account database: ${error.message}` },
          { status: 500 }
        );
      }
      customers = (data || []) as CustomerRow[];
    } else {
      // Escape LIKE wildcards so names are matched literally
      const literal = query.replace(/[\\%_]/g, (c) => `\\${c}`);

      // Exact (case-insensitive) name first, then partial as a fallback
      const exact = await db
        .from("customers")
        .select("id, full_name, phone")
        .ilike("full_name", literal)
        .order("created_at", { ascending: false })
        .limit(20);

      if (exact.error) {
        console.error("Login: name lookup failed:", exact.error);
        return NextResponse.json(
          { error: `Could not reach the account database: ${exact.error.message}` },
          { status: 500 }
        );
      }
      customers = (exact.data || []) as CustomerRow[];

      if (customers.length === 0) {
        const partial = await db
          .from("customers")
          .select("id, full_name, phone")
          .ilike("full_name", `%${literal}%`)
          .order("created_at", { ascending: false })
          .limit(20);

        if (partial.error) {
          console.error("Login: partial name lookup failed:", partial.error);
          return NextResponse.json(
            { error: `Could not reach the account database: ${partial.error.message}` },
            { status: 500 }
          );
        }
        customers = (partial.data || []) as CustomerRow[];
      }
    }

    if (customers.length === 0) {
      return NextResponse.json(
        { error: "No account found with that name or phone number. Please check it or create an account." },
        { status: 401 }
      );
    }

    // Find the customer whose stored password matches
    let authenticatedCustomer: CustomerRow | null = null;
    let savedLocations: string[] = [];
    let foundAnyPassword = false;

    for (const cust of customers) {
      const { data: addresses, error: addrErr } = await db
        .from("customer_addresses")
        .select("label, location, instructions")
        .eq("customer_id", cust.id);

      if (addrErr) {
        console.error("Login: address lookup failed:", addrErr);
        return NextResponse.json(
          { error: `Could not reach the account database: ${addrErr.message}` },
          { status: 500 }
        );
      }

      const authRows = (addresses || []).filter((a) => a.label === "AUTH_CREDENTIALS" && a.instructions);
      if (authRows.length > 0) foundAnyPassword = true;

      if (authRows.some((row) => verifyPassword(password, row.instructions as string))) {
        authenticatedCustomer = cust;
        savedLocations = Array.from(
          new Set(
            (addresses || [])
              .filter((a) => a.label !== "AUTH_CREDENTIALS")
              .map((a) => a.location)
              .filter((l): l is string => Boolean(l && l !== "Campus Delivery"))
          )
        );
        break;
      }
    }

    if (!authenticatedCustomer) {
      return NextResponse.json(
        {
          error: foundAnyPassword
            ? "Incorrect password. Please try again."
            : "This customer has no password yet. Please use Create Account with the same phone number to set one."
        },
        { status: 401 }
      );
    }

    // Issue 30-day session token
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    const token = signCustomerSession({
      customerId: authenticatedCustomer.id,
      name: authenticatedCustomer.full_name,
      phone: authenticatedCustomer.phone,
      address: savedLocations[0] || "",
      isGuest: false,
      expiresAt
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: authenticatedCustomer.id,
        name: authenticatedCustomer.full_name,
        phone: authenticatedCustomer.phone,
        address: savedLocations[0] || "",
        addresses: savedLocations,
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
