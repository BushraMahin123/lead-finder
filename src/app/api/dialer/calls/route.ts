import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/auth";
import {
  assertActiveCallingSubscription,
  assertHasCallMinutes,
  billableCallMinutes,
  CallingSubscriptionRequiredError,
  debitCallMinutes,
  InsufficientCallMinutesError,
} from "@/lib/billing/call-minutes";
import {
  createCallLog,
  listCallLogsForUser,
  updateCallLog,
} from "@/lib/dialer";
import type { CallDisposition, CallLogStatus } from "@/types/dialer";
import { toE164 } from "@/lib/phone";
import { isTelnyxSoftphoneConfigured } from "@/lib/telnyx";
import { getDefaultUserPhoneNumber } from "@/lib/user-phone-numbers";

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedResponse();

    const limitParam = request.nextUrl.searchParams.get("limit");
    const parsed = limitParam ? Number(limitParam) : undefined;
    const limit =
      parsed != null && Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;

    const calls = await listCallLogsForUser(userId, { limit });
    return NextResponse.json({ calls });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load call logs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const body = (await request.json()) as {
      toNumber?: string;
      campaignId?: string | null;
      personId?: string | null;
      personName?: string | null;
    };

    const toNumber = toE164(body.toNumber);
    if (!toNumber) {
      return NextResponse.json(
        { error: "A valid phone number is required" },
        { status: 400 },
      );
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

    const call = await createCallLog({
      userId,
      toNumber,
      fromNumber: owned.phoneNumber,
      campaignId: body.campaignId ?? null,
      personId: body.personId ?? null,
      personName: body.personName ?? null,
    });

    return NextResponse.json({ call });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create call log";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedResponse();

    const body = (await request.json()) as {
      id?: string;
      status?: CallLogStatus;
      disposition?: CallDisposition | null;
      durationSeconds?: number | null;
      telnyxCallId?: string | null;
      errorMessage?: string | null;
      ended?: boolean;
    };

    if (!body.id?.trim()) {
      return NextResponse.json({ error: "Call id is required" }, { status: 400 });
    }

    const call = await updateCallLog({
      id: body.id.trim(),
      userId,
      status: body.status,
      disposition: body.disposition,
      durationSeconds: body.durationSeconds,
      telnyxCallId: body.telnyxCallId,
      errorMessage: body.errorMessage,
      ended: body.ended,
    });

    if (body.ended) {
      const minutes = billableCallMinutes(body.durationSeconds ?? call.durationSeconds);
      if (minutes > 0) {
        try {
          await debitCallMinutes({
            userId,
            amount: minutes,
            type: "call_usage",
            description: `Call to ${call.toNumber}`,
            metadata: {
              callLogId: call.id,
              durationSeconds: body.durationSeconds ?? call.durationSeconds,
            },
            idempotencyKey: `call_usage:${call.id}`,
          });
        } catch (error) {
          if (!(error instanceof InsufficientCallMinutesError)) {
            console.error("[dialer/calls] minute debit failed", error);
          }
          // Don't fail the hangup path if balance is short mid-call.
        }
      }
    }

    return NextResponse.json({ call });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update call log";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
