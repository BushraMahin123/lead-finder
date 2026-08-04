import { NextResponse } from "next/server";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/auth";
import {
  assertActiveCallingSubscription,
  assertHasCallMinutes,
  CallingSubscriptionRequiredError,
  InsufficientCallMinutesError,
} from "@/lib/billing/call-minutes";
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

    try {
      await assertActiveCallingSubscription(userId);
      await assertHasCallMinutes(userId);
    } catch (error) {
      if (
        error instanceof CallingSubscriptionRequiredError ||
        error instanceof InsufficientCallMinutesError
      ) {
        return NextResponse.json(
          {
            error: error.message,
            code:
              error instanceof CallingSubscriptionRequiredError
                ? "CALLING_SUBSCRIPTION_REQUIRED"
                : "CALL_MINUTES_REQUIRED",
            settingsPath: "/pricing#calling",
          },
          { status: 402 },
        );
      }
      throw error;
    }

    const owned = await getDefaultUserPhoneNumber(userId);
    if (!owned?.phoneNumber) {
      return NextResponse.json(
        {
          error:
            "Your Unlimited plan includes a number. Open Phone numbers to search and get one.",
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
