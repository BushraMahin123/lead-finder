import { getSupabaseAdmin } from "@/lib/supabase";
import { getCampaignForUser, updateCampaignContactMeta } from "@/lib/campaigns";
import type {
  CallDisposition,
  CallLog,
  CallLogStatus,
  TranscriptionStatus,
} from "@/types/dialer";

export type { CallDisposition, CallLog, CallLogStatus, TranscriptionStatus } from "@/types/dialer";

const CALL_LOGS_TABLE = "call_logs";
export const CALL_RECORDINGS_BUCKET = "call-recordings";

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
  recording_path: string | null;
  recording_mime_type: string | null;
  recording_bytes: number | null;
  transcript: string | null;
  transcription_status: string | null;
  transcription_error: string | null;
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
    recordingPath: row.recording_path ?? null,
    recordingMimeType: row.recording_mime_type ?? null,
    recordingBytes: row.recording_bytes ?? null,
    transcript: row.transcript ?? null,
    transcriptionStatus:
      (row.transcription_status as TranscriptionStatus | null) ?? null,
    transcriptionError: row.transcription_error ?? null,
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
      transcription_status: "none",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapCallLog(data as CallLogRow);
}

export async function getCallLogForUser(
  id: string,
  userId: string,
): Promise<CallLog | null> {
  const admin = getAdminOrThrow();
  const { data, error } = await admin
    .from(CALL_LOGS_TABLE)
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapCallLog(data as CallLogRow) : null;
}

export async function listCallLogsForUser(
  userId: string,
  options?: { limit?: number },
): Promise<CallLog[]> {
  const admin = getAdminOrThrow();
  const limit = Math.min(Math.max(options?.limit ?? 100, 1), 200);

  const { data, error } = await admin
    .from(CALL_LOGS_TABLE)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapCallLog(row as CallLogRow));
}

export async function updateCallLog(input: {
  id: string;
  userId: string;
  status?: CallLogStatus;
  disposition?: CallDisposition | null;
  durationSeconds?: number | null;
  telnyxCallId?: string | null;
  errorMessage?: string | null;
  recordingPath?: string | null;
  recordingMimeType?: string | null;
  recordingBytes?: number | null;
  transcript?: string | null;
  transcriptionStatus?: TranscriptionStatus | null;
  transcriptionError?: string | null;
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
  if (input.recordingPath !== undefined) {
    updates.recording_path = input.recordingPath;
  }
  if (input.recordingMimeType !== undefined) {
    updates.recording_mime_type = input.recordingMimeType;
  }
  if (input.recordingBytes !== undefined) {
    updates.recording_bytes = input.recordingBytes;
  }
  if (input.transcript !== undefined) updates.transcript = input.transcript;
  if (input.transcriptionStatus !== undefined) {
    updates.transcription_status = input.transcriptionStatus;
  }
  if (input.transcriptionError !== undefined) {
    updates.transcription_error = input.transcriptionError;
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

export async function createCallRecordingSignedUrl(
  path: string,
  expiresInSeconds = 3600,
): Promise<string | null> {
  const admin = getAdminOrThrow();
  const { data, error } = await admin.storage
    .from(CALL_RECORDINGS_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error) throw new Error(error.message);
  return data?.signedUrl ?? null;
}
