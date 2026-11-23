import { NextResponse } from "next/server";
import {
  generateGuestId,
  signCustomerSession,
  CUSTOMER_COOKIE_NAME
} from "@/lib/customer-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const guestId = body.guestId || generateGuestId();

    // Guest sessions are active for 12 hours (expires once fulfilled or 12h max)
    const expiresAt = Date.now() + 12 * 60 * 60 * 1000;

    const token = signCustomerSession({
      customerId: guestId,
      name: `Guest (${guestId})`,
      phone: "",
      address: "",
      isGuest: true,
      expiresAt
    });

    const response = NextResponse.json({
      success: true,
      guestId,
      user: {
        id: guestId,
        name: "",
        phone: "",
        address: "",
        isGuest: true
      }
    });

    response.cookies.set(CUSTOMER_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 12 * 60 * 60,
      path: "/"
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to start guest session." },
      { status: 500 }
    );
  }
}

