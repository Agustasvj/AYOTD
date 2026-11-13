import { NextResponse } from "next/server";
import { verifyStaffPasscode, generateStaffSessionToken, STAFF_COOKIE_NAME } from "@/lib/admin-auth";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { passcode } = body;

    if (!passcode || typeof passcode !== "string") {
      return NextResponse.json(
        { error: "Passcode is required." },
        { status: 400 }
      );
    }

    if (!verifyStaffPasscode(passcode)) {
      return NextResponse.json(
        { error: "Incorrect staff passcode. Access denied." },
        { status: 401 }
      );
    }

    const token = generateStaffSessionToken();
    const response = NextResponse.json({
      success: true,
      message: "Passcode verified. Staff session active."
    });

    response.cookies.set({
      name: STAFF_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7 // 7 days session
    });

    return response;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Authentication error." },
      { status: 500 }
    );
  }
}
