import { NextResponse } from "next/server";
import {
  verifyCustomerSession,
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

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.customerId,
        name: session.name,
        phone: session.phone,
        address: session.address,
        isGuest: !!session.isGuest
      }
    });
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, user: null });
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

