import { NextResponse } from "next/server";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/auth";
import {
  createTelnyxLoginToken,
  isTelnyxSoftphoneConfigured,
} from "@/lib/telnyx";
import { getDefaultUserPhoneNumber } from "@/lib/user-phone-numbers";

export async function POST() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedResponse();

    if (!isTelnyxSoftphoneConfigured()) {
      return NextResponse.json(
        { error: "Dialer is not configured" },
        { status: 503 },
      );
    }

    const owned = await getDefaultUserPhoneNumber(userId);
    if (!owned?.phoneNumber) {
      return NextResponse.json(
        {
          error:
            "Buy a phone number before calling. Open Settings → Phone numbers to get one.",
          code: "PHONE_NUMBER_REQUIRED",
          settingsPath: "/settings/phone-numbers",
        },
        { status: 400 },
      );
    }

    const token = await createTelnyxLoginToken();

    return NextResponse.json({
      token,
      callerNumber: owned.phoneNumber,
      source: "user",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create dialer token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
