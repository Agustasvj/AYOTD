import { NextResponse } from "next/server";
import { isStaffAuthorized } from "@/lib/admin-auth";

export async function GET(req: Request) {
  const authenticated = isStaffAuthorized(req);
  return NextResponse.json({ authenticated });
}

