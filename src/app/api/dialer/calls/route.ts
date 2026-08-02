import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/auth";
import {
  createCallLog,
  updateCallLog,
} from "@/lib/dialer";
import type { CallDisposition, CallLogStatus } from "@/types/dialer";
import { toE164 } from "@/lib/phone";
import { getTelnyxCallerNumber, isTelnyxDialerConfigured } from "@/lib/telnyx";

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedResponse();

    if (!isTelnyxDialerConfigured()) {
      return NextResponse.json(
        { error: "Dialer is not configured" },
        { status: 503 },
      );
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

    const call = await createCallLog({
      userId,
      toNumber,
      fromNumber: getTelnyxCallerNumber(),
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

    return NextResponse.json({ call });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update call log";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
