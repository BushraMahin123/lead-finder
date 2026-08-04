import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/auth";
import {
  assertActiveCallingSubscription,
  CallingSubscriptionRequiredError,
} from "@/lib/billing/call-minutes";
import { toE164 } from "@/lib/phone";
import {
  isTelnyxNumberOrderingConfigured,
  orderPhoneNumber,
  searchAvailablePhoneNumbers,
} from "@/lib/telnyx";
import {
  createUserPhoneNumber,
  listUserPhoneNumbers,
  setDefaultUserPhoneNumber,
} from "@/lib/user-phone-numbers";

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");

    if (mode === "search") {
      try {
        await assertActiveCallingSubscription(userId);
      } catch (error) {
        if (error instanceof CallingSubscriptionRequiredError) {
          return NextResponse.json(
            {
              error: error.message,
              code: "CALLING_SUBSCRIPTION_REQUIRED",
              settingsPath: "/pricing#calling",
            },
            { status: 402 },
          );
        }
        throw error;
      }

      if (!isTelnyxNumberOrderingConfigured()) {
        return NextResponse.json(
          { error: "Number ordering is not configured" },
          { status: 503 },
        );
      }

      const countryCode = (searchParams.get("country") || "US").toUpperCase();
      const areaCode = searchParams.get("areaCode") || undefined;
      const locality = searchParams.get("locality") || undefined;

      const numbers = await searchAvailablePhoneNumbers({
        countryCode,
        areaCode,
        locality,
        limit: 20,
      });

      return NextResponse.json({ numbers });
    }

    const numbers = await listUserPhoneNumbers(userId);
    return NextResponse.json({ numbers });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load phone numbers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedResponse();

    try {
      await assertActiveCallingSubscription(userId);
    } catch (error) {
      if (error instanceof CallingSubscriptionRequiredError) {
        return NextResponse.json(
          {
            error: error.message,
            code: "CALLING_SUBSCRIPTION_REQUIRED",
            settingsPath: "/pricing#calling",
          },
          { status: 402 },
        );
      }
      throw error;
    }

    if (!isTelnyxNumberOrderingConfigured()) {
      return NextResponse.json(
        { error: "Number ordering is not configured" },
        { status: 503 },
      );
    }

    const body = (await request.json()) as {
      phoneNumber?: string;
      countryCode?: string;
      monthlyCost?: number | null;
      upfrontCost?: number | null;
    };

    const phoneNumber = toE164(body.phoneNumber);
    if (!phoneNumber) {
      return NextResponse.json(
        { error: "A valid phone number is required" },
        { status: 400 },
      );
    }

    const existing = await listUserPhoneNumbers(userId);
    if (existing.some((n) => n.phoneNumber === phoneNumber)) {
      return NextResponse.json(
        { error: "You already own this number" },
        { status: 409 },
      );
    }

    // Soft limit for v1 — one owned number per user.
    if (existing.filter((n) => n.status === "active").length >= 1) {
      return NextResponse.json(
        {
          error:
            "You already have a phone number. Release/support multi-number later.",
        },
        { status: 400 },
      );
    }

    const ordered = await orderPhoneNumber({ phoneNumber });

    const saved = await createUserPhoneNumber({
      userId,
      phoneNumber: ordered.phoneNumber,
      countryCode: (body.countryCode || "US").toUpperCase(),
      telnyxNumberId: ordered.phoneNumberId,
      telnyxOrderId: ordered.orderId,
      status: ordered.status === "failure" ? "failed" : "active",
      monthlyCost: body.monthlyCost ?? null,
      upfrontCost: body.upfrontCost ?? null,
      makeDefault: true,
    });

    return NextResponse.json({ number: saved });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to purchase number";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedResponse();

    const body = (await request.json()) as { id?: string };
    if (!body.id?.trim()) {
      return NextResponse.json({ error: "Number id is required" }, { status: 400 });
    }

    const number = await setDefaultUserPhoneNumber({
      userId,
      id: body.id.trim(),
    });

    return NextResponse.json({ number });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update number";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
