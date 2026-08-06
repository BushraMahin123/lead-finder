import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/auth";
import { transcribeCallAudio } from "@/lib/call-transcription";
import {
  CALL_RECORDINGS_BUCKET,
  createCallRecordingSignedUrl,
  getCallLogForUser,
  updateCallLog,
} from "@/lib/dialer";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BYTES = 40 * 1024 * 1024; // 40MB

// Must stay in sync with allowed_mime_types on the call-recordings bucket,
// which rejects any value carrying codec parameters (e.g. audio/webm;codecs=opus).
const ALLOWED_MIME_TYPES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/x-wav",
]);

function normalizeMime(raw: string): string {
  const base = raw.split(";")[0].trim().toLowerCase();
  if (ALLOWED_MIME_TYPES.has(base)) return base;
  if (base === "audio/x-m4a" || base === "audio/m4a") return "audio/mp4";
  if (base === "audio/mp3") return "audio/mpeg";
  return "audio/webm";
}

function extensionForMime(mime: string): string {
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  return "webm";
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedResponse();

    const { id } = await context.params;
    const call = await getCallLogForUser(id, userId);
    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    let recordingUrl: string | null = null;
    if (call.recordingPath) {
      recordingUrl = await createCallRecordingSignedUrl(call.recordingPath);
    }

    return NextResponse.json({
      call: {
        id: call.id,
        recordingUrl,
        recordingMimeType: call.recordingMimeType,
        recordingBytes: call.recordingBytes,
        transcript: call.transcript,
        transcriptionStatus: call.transcriptionStatus,
        transcriptionError: call.transcriptionError,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load recording";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedResponse();

    const { id } = await context.params;
    const call = await getCallLogForUser(id, userId);
    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Recording file is required" },
        { status: 400 },
      );
    }

    if (file.size <= 0) {
      return NextResponse.json(
        { error: "Recording file is empty" },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Recording is too large (max 40MB)" },
        { status: 413 },
      );
    }

    const mimeType = normalizeMime(file.type || "audio/webm");
    const ext = extensionForMime(mimeType);
    const path = `${userId}/${id}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Storage is not configured" },
        { status: 503 },
      );
    }

    await updateCallLog({
      id,
      userId,
      transcriptionStatus: "pending",
      transcriptionError: null,
    });

    const { error: uploadError } = await admin.storage
      .from(CALL_RECORDINGS_BUCKET)
      .upload(path, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      await updateCallLog({
        id,
        userId,
        transcriptionStatus: "failed",
        transcriptionError: uploadError.message,
      });
      throw new Error(uploadError.message);
    }

    await updateCallLog({
      id,
      userId,
      recordingPath: path,
      recordingMimeType: mimeType,
      recordingBytes: buffer.length,
      transcriptionStatus: "processing",
      transcriptionError: null,
    });

    let transcript: string | null = null;
    let transcriptionStatus: "completed" | "failed" = "completed";
    let transcriptionError: string | null = null;

    try {
      transcript = await transcribeCallAudio({
        audioBase64: buffer.toString("base64"),
        mimeType,
      });
    } catch (err) {
      transcriptionStatus = "failed";
      transcriptionError =
        err instanceof Error ? err.message : "Transcription failed";
    }

    const updated = await updateCallLog({
      id,
      userId,
      transcript,
      transcriptionStatus,
      transcriptionError,
    });

    const recordingUrl = await createCallRecordingSignedUrl(path);

    return NextResponse.json({
      call: {
        id: updated.id,
        recordingUrl,
        recordingMimeType: updated.recordingMimeType,
        recordingBytes: updated.recordingBytes,
        transcript: updated.transcript,
        transcriptionStatus: updated.transcriptionStatus,
        transcriptionError: updated.transcriptionError,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save recording";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
