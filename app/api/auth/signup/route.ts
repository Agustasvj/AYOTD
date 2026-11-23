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
    const trimmedAddress = typeof address === "string" ? address.trim() : "";
    const cleanPhone = phoneCheck.normalized;
    const pwdHash = hashPassword(password);

    const db = getSupabaseAdmin();

    // Accounts only make sense if they are really saved. Never pretend to
    // create one when the database is unreachable / not configured.
    if (!db) {
      return NextResponse.json(
        { error: "We can't save accounts right now (database not connected). Please continue as guest or try again shortly." },
        { status: 503 }
      );
    }

    let customerId = "";
    let createdNewCustomer = false;

    // 1. Does a customer with this phone already exist?
    const { data: existing, error: existingErr } = await db
      .from("customers")
      .select("id")
      .eq("phone", cleanPhone)
      .maybeSingle();

    if (existingErr) {
      console.error("Signup: customer lookup failed:", existingErr);
      return NextResponse.json(
        { error: `Could not check existing accounts: ${existingErr.message}` },
        { status: 500 }
      );
    }

    if (existing) {
      // Already has a password? Then they should log in instead.
      const { data: existingAuth, error: authLookupErr } = await db
        .from("customer_addresses")
        .select("id")
        .eq("customer_id", existing.id)
        .eq("label", "AUTH_CREDENTIALS")
        .limit(1);

      if (authLookupErr) {
        console.error("Signup: credential lookup failed:", authLookupErr);
        return NextResponse.json(
          { error: `Could not check existing accounts: ${authLookupErr.message}` },
          { status: 500 }
        );
      }

      if (existingAuth && existingAuth.length > 0) {
        return NextResponse.json(
          { error: "An account with this phone number already exists. Please sign in instead." },
          { status: 409 }
        );
      }

      // Customer exists from an earlier order but never set a password: claim it.
      customerId = existing.id;
      const { error: updErr } = await db
        .from("customers")
        .update({ full_name: trimmedName, updated_at: new Date().toISOString() })
        .eq("id", customerId);
      if (updErr) {
        console.error("Signup: customer update failed:", updErr);
        return NextResponse.json(
          { error: `Could not save your account: ${updErr.message}` },
          { status: 500 }
        );
      }
    } else {
      const { data: newCustomer, error: insertErr } = await db
        .from("customers")
        .insert({ full_name: trimmedName, phone: cleanPhone })
        .select("id")
        .single();

      if (insertErr || !newCustomer) {
        console.error("Signup: customer insert failed:", insertErr);
        return NextResponse.json(
          { error: `Could not save your account: ${insertErr?.message || "unknown database error"}` },
          { status: 500 }
        );
      }
      customerId = newCustomer.id;
      createdNewCustomer = true;
    }

    // 2. Persist the password hash. If this fails the account is useless
    //    (you could never log back in), so roll back and report it.
    const { error: credErr } = await db.from("customer_addresses").insert({
      customer_id: customerId,
      label: "AUTH_CREDENTIALS",
      location: trimmedAddress || "Campus Delivery",
      instructions: pwdHash
    });

    if (credErr) {
      console.error("Signup: credential insert failed:", credErr);
      if (createdNewCustomer) {
        await db.from("customers").delete().eq("id", customerId);
      }
      return NextResponse.json(
        { error: `Could not save your password: ${credErr.message}` },
        { status: 500 }
      );
    }

    // 3. Optional default delivery address (best effort)
    if (trimmedAddress) {
      const { error: addrErr } = await db.from("customer_addresses").insert({
        customer_id: customerId,
        label: "Default",
        location: trimmedAddress
      });
      if (addrErr) console.error("Signup: default address insert failed:", addrErr);
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
