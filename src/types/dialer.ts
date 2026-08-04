export type CallLogStatus =
  | "initiated"
  | "ringing"
  | "active"
  | "hangup"
  | "failed";

export type CallDisposition =
  | "connected"
  | "no_answer"
  | "wrong_number"
  | "voicemail"
  | "callback"
  | "busy";

export interface CallLog {
  id: string;
  userId: string;
  campaignId: string | null;
  personId: string | null;
  personName: string | null;
  toNumber: string;
  fromNumber: string | null;
  direction: string;
  status: CallLogStatus;
  disposition: CallDisposition | null;
  durationSeconds: number | null;
  telnyxCallId: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  endedAt: string | null;
}
