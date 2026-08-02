import { NextResponse } from "next/server";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/auth";
import {
  createTelnyxLoginToken,
  getTelnyxCallerNumber,
  isTelnyxDialerConfigured,
} from "@/lib/telnyx";

export async function POST() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedResponse();

    if (!isTelnyxDialerConfigured()) {
      return NextResponse.json(
        { error: "Dialer is not configured" },
        { status: 503 },
      );
    }

    const [token, callerNumber] = await Promise.all([
      createTelnyxLoginToken(),
      Promise.resolve(getTelnyxCallerNumber()),
    ]);

    return NextResponse.json({ token, callerNumber });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create dialer token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
