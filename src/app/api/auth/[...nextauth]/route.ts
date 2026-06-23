import { NextRequest, NextResponse } from "next/server";

import { handlers } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    return await handlers.GET(request);
  } catch (error) {
    console.error("[api/auth] GET failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load auth session." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handlers.POST(request);
  } catch (error) {
    console.error("[api/auth] POST failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to complete auth request." },
      { status: 500 },
    );
  }
}
