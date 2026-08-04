import { getSupabaseAdmin } from "@/lib/supabase";
import { getCampaignForUser, updateCampaignContactMeta } from "@/lib/campaigns";
import type {
  CallDisposition,
  CallLog,
  CallLogStatus,
} from "@/types/dialer";

export type { CallDisposition, CallLog, CallLogStatus } from "@/types/dialer";

const CALL_LOGS_TABLE = "call_logs";

interface CallLogRow {
  id: string;
  user_id: string;
  campaign_id: string | null;
  person_id: string | null;
  person_name: string | null;
  to_number: string;
  from_number: string | null;
  direction: string;
  status: string;
  disposition: string | null;
  duration_seconds: number | null;
  telnyx_call_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  ended_at: string | null;
}

function getAdminOrThrow() {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error("Supabase is not configured");
  }
  return admin;
}

function mapCallLog(row: CallLogRow): CallLog {
  return {
    id: row.id,
    userId: row.user_id,
    campaignId: row.campaign_id,
    personId: row.person_id,
    personName: row.person_name,
    toNumber: row.to_number,
    fromNumber: row.from_number,
    direction: row.direction,
    status: row.status as CallLogStatus,
    disposition: (row.disposition as CallDisposition | null) ?? null,
    durationSeconds: row.duration_seconds,
    telnyxCallId: row.telnyx_call_id,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    endedAt: row.ended_at,
  };
}

export async function createCallLog(input: {
  userId: string;
  toNumber: string;
  fromNumber?: string | null;
  campaignId?: string | null;
  personId?: string | null;
  personName?: string | null;
}): Promise<CallLog> {
  const admin = getAdminOrThrow();

  if (input.campaignId) {
    const campaign = await getCampaignForUser(input.campaignId, input.userId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }
  }

  const { data, error } = await admin
    .from(CALL_LOGS_TABLE)
    .insert({
      user_id: input.userId,
      campaign_id: input.campaignId ?? null,
      person_id: input.personId ?? null,
      person_name: input.personName ?? null,
      to_number: input.toNumber,
      from_number: input.fromNumber ?? null,
      direction: "outbound",
      status: "initiated",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapCallLog(data as CallLogRow);
}

export async function updateCallLog(input: {
  id: string;
  userId: string;
  status?: CallLogStatus;
  disposition?: CallDisposition | null;
  durationSeconds?: number | null;
  telnyxCallId?: string | null;
  errorMessage?: string | null;
  ended?: boolean;
}): Promise<CallLog> {
  const admin = getAdminOrThrow();

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.status !== undefined) updates.status = input.status;
  if (input.disposition !== undefined) updates.disposition = input.disposition;
  if (input.durationSeconds !== undefined) {
    updates.duration_seconds = input.durationSeconds;
  }
  if (input.telnyxCallId !== undefined) {
    updates.telnyx_call_id = input.telnyxCallId;
  }
  if (input.errorMessage !== undefined) {
    updates.error_message = input.errorMessage;
  }
  if (input.ended) {
    updates.ended_at = new Date().toISOString();
  }

  const { data, error } = await admin
    .from(CALL_LOGS_TABLE)
    .update(updates)
    .eq("id", input.id)
    .eq("user_id", input.userId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const log = mapCallLog(data as CallLogRow);

  if (
    input.disposition &&
    log.campaignId &&
    log.personId &&
    ["connected", "voicemail", "callback", "no_answer", "busy"].includes(
      input.disposition,
    )
  ) {
    try {
      await updateCampaignContactMeta({
        campaignId: log.campaignId,
        personId: log.personId,
        userId: input.userId,
        status: "contacted",
      });
    } catch {
      // Call log update succeeded; contact status is best-effort.
    }
  }

  return log;
}
