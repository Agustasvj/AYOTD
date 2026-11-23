import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { validateKenyanPhone } from "@/lib/validation";
import {
  verifyCustomerSession,
  signCustomerSession,
  hashPassword,
  verifyPassword,
  CUSTOMER_COOKIE_NAME
} from "@/lib/customer-auth";

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(new RegExp(`${CUSTOMER_COOKIE_NAME}=([^;]+)`));
    const token = match ? decodeURIComponent(match[1]) : null;

    const session = verifyCustomerSession(token);

    if (!session) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const db = getSupabaseAdmin();
    let addresses: string[] = [];

    if (session.address) {
      addresses.push(session.address);
    }

    if (db && !session.isGuest && !session.customerId.startsWith("cust-")) {
      const { data: addrRows } = await db
        .from("customer_addresses")
        .select("location, label")
        .eq("customer_id", session.customerId);

      if (addrRows && addrRows.length > 0) {
        for (const row of addrRows) {
          if (row.location && row.label !== "AUTH_CREDENTIALS" && !addresses.includes(row.location)) {
            addresses.push(row.location);
          }
        }
      }
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.customerId,
        name: session.name,
        phone: session.phone,
        address: session.address || addresses[0] || "",
        addresses,
        isGuest: !!session.isGuest
      }
    });
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, user: null });
  }
}

export async function PUT(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(new RegExp(`${CUSTOMER_COOKIE_NAME}=([^;]+)`));
    const token = match ? decodeURIComponent(match[1]) : null;

    const session = verifyCustomerSession(token);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    if (session.isGuest) {
      return NextResponse.json(
        { error: "Guest sessions cannot edit profile. Please sign up to create a permanent account." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, phone, address, currentPassword, newPassword } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Full Name must be at least 2 characters." },
        { status: 400 }
      );
    }

    const phoneCheck = validateKenyanPhone(phone);
    if (!phoneCheck.isValid) {
      return NextResponse.json(
        { error: phoneCheck.error || "Please enter a valid Kenyan phone number." },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const cleanPhone = phoneCheck.normalized;
    const trimmedAddress = address?.trim() || "";

    const db = getSupabaseAdmin();

    if (db && !session.customerId.startsWith("cust-")) {
      // If changing password, verify old password first
      if (newPassword) {
        if (!currentPassword) {
          return NextResponse.json(
            { error: "Current password is required to set a new password." },
            { status: 400 }
          );
        }

        const { data: authRecord } = await db
          .from("customer_addresses")
          .select("id, instructions")
          .eq("customer_id", session.customerId)
          .eq("label", "AUTH_CREDENTIALS")
          .maybeSingle();

        if (authRecord?.instructions) {
          const valid = verifyPassword(currentPassword, authRecord.instructions);
          if (!valid) {
            return NextResponse.json(
              { error: "Incorrect current password." },
              { status: 400 }
            );
          }

          // Update password
          await db
            .from("customer_addresses")
            .update({ instructions: hashPassword(newPassword) })
            .eq("id", authRecord.id);
        }
      }

      // Check if new phone is used by another customer
      if (cleanPhone !== session.phone) {
        const { data: phoneConflict } = await db
          .from("customers")
          .select("id")
          .eq("phone", cleanPhone)
          .neq("id", session.customerId)
          .maybeSingle();

        if (phoneConflict) {
          return NextResponse.json(
            { error: "This phone number is already registered to another account." },
            { status: 409 }
          );
        }
      }

      // Update customer details in DB
      await db
        .from("customers")
        .update({
          full_name: trimmedName,
          phone: cleanPhone,
          updated_at: new Date().toISOString()
        })
        .eq("id", session.customerId);

      // Add address to customer_addresses if new
      if (trimmedAddress) {
        try {
          await db.from("customer_addresses").insert({
            customer_id: session.customerId,
            location: trimmedAddress,
            label: "Default"
          });
        } catch {}
      }
    }

    // Refresh token with updated details
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    const newToken = signCustomerSession({
      customerId: session.customerId,
      name: trimmedName,
      phone: cleanPhone,
      address: trimmedAddress,
      isGuest: false,
      expiresAt
    });

    const response = NextResponse.json({
      success: true,
      message: "Profile updated successfully!",
      user: {
        id: session.customerId,
        name: trimmedName,
        phone: cleanPhone,
        address: trimmedAddress,
        isGuest: false
      }
    });

    response.cookies.set(CUSTOMER_COOKIE_NAME, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/"
    });

    return response;
  } catch (err: any) {
    console.error("Profile update error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update profile." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  // Logout
  const response = NextResponse.json({ success: true, message: "Logged out." });
  response.cookies.set(CUSTOMER_COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/"
  });
  return response;
}
