"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  IconMic,
  IconMicOff,
  IconPhone,
  IconPhoneOff,
} from "@/components/icons";
import { createCallRecorder } from "@/lib/call-recorder";
import { ApiError, fetchJson } from "@/lib/fetch-json";
import { toE164 } from "@/lib/phone";
import type { CallDisposition } from "@/types/dialer";

type SoftphoneStatus =
  | "idle"
  | "connecting"
  | "ringing"
  | "active"
  | "ended"
  | "error";

type CallMediaStatus =
  | "idle"
  | "recording"
  | "uploading"
  | "transcribing"
  | "ready"
  | "failed";

export type SoftphoneStartCallInput = {
  toNumber: string;
  personName?: string | null;
  campaignId?: string | null;
  personId?: string | null;
};

type SoftphoneContextValue = {
  startCall: (input: SoftphoneStartCallInput) => Promise<void>;
  openManualDial: () => void;
  hangup: () => void;
  toggleMute: () => void;
  setDisposition: (disposition: CallDisposition) => Promise<void>;
  dismiss: () => void;
  status: SoftphoneStatus;
  muted: boolean;
  elapsedSeconds: number;
  toNumber: string | null;
  personName: string | null;
  error: string | null;
  isOpen: boolean;
};

const SoftphoneContext = createContext<SoftphoneContextValue | null>(null);

const DISPOSITIONS: { value: CallDisposition; label: string }[] = [
  { value: "connected", label: "Connected" },
  { value: "no_answer", label: "No answer" },
  { value: "voicemail", label: "Voicemail" },
  { value: "wrong_number", label: "Wrong number" },
  { value: "callback", label: "Callback" },
  { value: "busy", label: "Busy" },
];

const DIAL_KEYS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "*",
  "0",
  "#",
] as const;

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

type TelnyxCallLike = {
  id?: string;
  state?: string;
  cause?: string | null;
  causeCode?: number | null;
  sipCode?: number | null;
  sipReason?: string | null;
  hangup: () => void;
  muteAudio?: () => void;
  unmuteAudio?: () => void;
  remoteStream?: MediaStream;
  localStream?: MediaStream;
};

type TelnyxClientLike = {
  connect: () => void;
  disconnect: () => void;
  on: (
    event: string,
    handler: (notification: {
      type?: string;
      call?: TelnyxCallLike;
      error?: { message?: string };
    }) => void,
  ) => void;
  newCall: (options: {
    destinationNumber: string;
    callerNumber?: string;
    audio?: boolean;
    remoteElement?: HTMLAudioElement | string;
  }) => TelnyxCallLike;
};

function attachRemoteAudio(
  audioEl: HTMLAudioElement | null,
  stream?: MediaStream | null,
) {
  if (!audioEl || !stream) return;
  if (audioEl.srcObject !== stream) {
    audioEl.srcObject = stream;
  }
  void audioEl.play().catch(() => {
    // Autoplay may require a user gesture; Call click usually counts.
  });
}

export function SoftphoneProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SoftphoneStatus>("idle");
  const [muted, setMuted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [toNumber, setToNumber] = useState<string | null>(null);
  const [personName, setPersonName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isDialPadOpen, setIsDialPadOpen] = useState(false);
  const [manualNumber, setManualNumber] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [savingDisposition, setSavingDisposition] = useState(false);
  const [mediaStatus, setMediaStatus] = useState<CallMediaStatus>("idle");
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const clientRef = useRef<TelnyxClientLike | null>(null);
  const callRef = useRef<TelnyxCallLike | null>(null);
  const callLogIdRef = useRef<string | null>(null);
  const callerNumberRef = useRef<string | null>(null);
  const connectedAtRef = useRef<number | null>(null);
  const finalDurationRef = useRef<number | null>(null);
  const hangupSentRef = useRef(false);
  const everActiveRef = useRef(false);
  const callPlacedRef = useRef(false);
  const dialGenerationRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recorderRef = useRef<ReturnType<typeof createCallRecorder> | null>(null);
  const mediaFinalizedRef = useRef(false);
  const recordingStartedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Wall clock since connect stops tracking talk time once the call ends, so the
  // duration is frozen at the first end event and reused by later patches
  // (e.g. a disposition picked minutes after hangup).
  const captureFinalDuration = useCallback((fallbackSeconds = 0) => {
    if (finalDurationRef.current == null) {
      finalDurationRef.current =
        connectedAtRef.current != null
          ? Math.max(0, Math.round((Date.now() - connectedAtRef.current) / 1000))
          : fallbackSeconds;
    }
    connectedAtRef.current = null;
    return finalDurationRef.current;
  }, []);

  const isLiveCallState = useCallback((state?: string) => {
    return Boolean(
      state &&
        !["hangup", "destroy", "purge", "done", "idle"].includes(state),
    );
  }, []);

  const patchCallLog = useCallback(
    async (body: Record<string, unknown>) => {
      if (!callLogIdRef.current) return;
      try {
        await fetchJson("/api/dialer/calls", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: callLogIdRef.current, ...body }),
        });
      } catch {
        // Best-effort logging; UI should still work.
      }
    },
    [],
  );

  const startRecordingIfNeeded = useCallback(async (call: TelnyxCallLike) => {
    if (recordingStartedRef.current || hangupSentRef.current) return;
    recordingStartedRef.current = true;
    try {
      const recorder = createCallRecorder();
      recorderRef.current = recorder;
      await recorder.start(call.localStream ?? null, call.remoteStream ?? null);
      setMediaStatus("recording");
      setMediaError(null);
    } catch (err) {
      recordingStartedRef.current = false;
      recorderRef.current = null;
      setMediaStatus("failed");
      setMediaError(
        err instanceof Error ? err.message : "Could not start call recording",
      );
    }
  }, []);

  const finalizeCallMedia = useCallback(async () => {
    if (mediaFinalizedRef.current) return;
    mediaFinalizedRef.current = true;

    const callId = callLogIdRef.current;
    const recorder = recorderRef.current;
    recorderRef.current = null;

    if (!recorder) {
      if (everActiveRef.current) {
        setMediaStatus((prev) => (prev === "ready" ? prev : "idle"));
      }
      return;
    }

    setMediaStatus("uploading");
    const blob = await recorder.stop();

    if (!blob || !callId) {
      setMediaStatus("failed");
      setMediaError(
        !blob ? "No audio was captured for this call." : "Missing call id.",
      );
      return;
    }

    try {
      setMediaStatus("transcribing");
      const form = new FormData();
      form.append("file", blob, `call-${callId}.webm`);

      const { response, data } = await fetchJson<{
        call?: {
          recordingUrl?: string | null;
          transcript?: string | null;
          transcriptionStatus?: string | null;
          transcriptionError?: string | null;
        };
        error?: string;
      }>(`/api/dialer/calls/${callId}/recording`, {
        method: "POST",
        body: form,
      });

      if (!response.ok || !data.call) {
        throw new ApiError(
          data.error ?? "Failed to save recording",
          response.status,
        );
      }

      setRecordingUrl(data.call.recordingUrl ?? null);
      setTranscript(data.call.transcript ?? null);

      if (data.call.transcriptionStatus === "failed") {
        setMediaStatus("failed");
        setMediaError(
          data.call.transcriptionError ??
            "Recording saved, but transcription failed.",
        );
      } else {
        setMediaStatus("ready");
        setMediaError(null);
      }
    } catch (err) {
      setMediaStatus("failed");
      setMediaError(
        err instanceof Error ? err.message : "Failed to upload recording",
      );
    }
  }, []);

  const finalizeCallMediaRef = useRef(finalizeCallMedia);
  finalizeCallMediaRef.current = finalizeCallMedia;

  const cleanupClient = useCallback(() => {
    clearTimer();
    const call = callRef.current;
    if (call && !hangupSentRef.current && isLiveCallState(call.state)) {
      hangupSentRef.current = true;
      try {
        call.hangup();
      } catch {
        // ignore — Telnyx may already have closed the call
      }
    }
    try {
      clientRef.current?.disconnect();
    } catch {
      // ignore
    }
    callRef.current = null;
    clientRef.current = null;
  }, [clearTimer, isLiveCallState]);

  const cleanupClientRef = useRef(cleanupClient);
  cleanupClientRef.current = cleanupClient;

  // Only disconnect when the provider unmounts — not when callback identity changes.
  useEffect(() => {
    return () => {
      cleanupClientRef.current();
    };
  }, []);

  function formatHangupReason(call: TelnyxCallLike): string {
    const parts = [
      call.cause,
      call.sipCode != null ? `SIP ${call.sipCode}` : null,
      call.sipReason,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : "unknown reason";
  }

  const hangup = useCallback(() => {
    // Invalidate any in-flight startCall / telnyx.ready so it cannot redial.
    dialGenerationRef.current += 1;
    hangupSentRef.current = true;
    callPlacedRef.current = true;

    const duration = captureFinalDuration(elapsedSeconds);

    const call = callRef.current;
    if (call && isLiveCallState(call.state)) {
      try {
        call.hangup();
      } catch {
        // ignore stale bye / already-ended call
      }
    }

    void patchCallLog({
      status: "hangup",
      durationSeconds: duration,
      telnyxCallId: call?.id ?? null,
      ended: true,
    });

    clearTimer();
    setStatus("ended");
    setMuted(false);

    // Stop recording before tearing down WebRTC streams.
    void (async () => {
      await finalizeCallMediaRef.current();
      try {
        clientRef.current?.disconnect();
      } catch {
        // ignore
      }
      clientRef.current = null;
      callRef.current = null;
    })();
  }, [
    captureFinalDuration,
    clearTimer,
    elapsedSeconds,
    isLiveCallState,
    patchCallLog,
  ]);

  const toggleMute = useCallback(() => {
    const call = callRef.current;
    if (!call) return;

    if (muted) {
      call.unmuteAudio?.();
      setMuted(false);
    } else {
      call.muteAudio?.();
      setMuted(true);
    }
  }, [muted]);

  const dismiss = useCallback(() => {
    dialGenerationRef.current += 1;
    hangupSentRef.current = true;
    callPlacedRef.current = true;
    void (async () => {
      await finalizeCallMediaRef.current();
      cleanupClient();
      callLogIdRef.current = null;
    })();
    connectedAtRef.current = null;
    finalDurationRef.current = null;
    setIsOpen(false);
    setStatus("idle");
    setError(null);
    setToNumber(null);
    setPersonName(null);
    setElapsedSeconds(0);
    setMuted(false);
    setMediaStatus("idle");
    setRecordingUrl(null);
    setTranscript(null);
    setMediaError(null);
  }, [cleanupClient]);

  const openManualDial = useCallback(() => {
    setManualError(null);
    setIsDialPadOpen(true);
  }, []);

  const closeManualDial = useCallback(() => {
    setIsDialPadOpen(false);
    setManualError(null);
  }, []);

  const setDisposition = useCallback(
    async (disposition: CallDisposition) => {
      setSavingDisposition(true);
      try {
        const duration = captureFinalDuration(elapsedSeconds);

        await patchCallLog({
          disposition,
          status: status === "active" || status === "ringing" ? "hangup" : status === "error" ? "failed" : "hangup",
          durationSeconds: duration,
          ended: true,
        });

        if (status === "active" || status === "ringing" || status === "connecting") {
          hangup();
        } else {
          setStatus("ended");
        }
      } finally {
        setSavingDisposition(false);
      }
    },
    [captureFinalDuration, elapsedSeconds, hangup, patchCallLog, status],
  );

  const startCall = useCallback(
    async (input: SoftphoneStartCallInput) => {
      const normalized = toE164(input.toNumber);
      if (!normalized) {
        setIsOpen(true);
        setStatus("error");
        setError("Invalid phone number");
        return;
      }

      cleanupClient();
      clearTimer();
      connectedAtRef.current = null;
      finalDurationRef.current = null;
      hangupSentRef.current = false;
      everActiveRef.current = false;
      callPlacedRef.current = false;
      callLogIdRef.current = null;
      mediaFinalizedRef.current = false;
      recordingStartedRef.current = false;
      recorderRef.current = null;
      const dialGeneration = ++dialGenerationRef.current;
      setIsOpen(true);
      setStatus("connecting");
      setError(null);
      setMuted(false);
      setElapsedSeconds(0);
      setToNumber(normalized);
      setPersonName(input.personName ?? null);
      setMediaStatus("idle");
      setRecordingUrl(null);
      setTranscript(null);
      setMediaError(null);

      const isCurrentDial = () => dialGenerationRef.current === dialGeneration;

      try {
        // Unlock audio playback from the Call click gesture.
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = null;
          void remoteAudioRef.current.play().catch(() => undefined);
          remoteAudioRef.current.pause();
        }

        const { response: tokenResponse, data: tokenData } = await fetchJson<{
          token?: string;
          callerNumber?: string;
          error?: string;
          code?: string;
          settingsPath?: string;
        }>("/api/dialer/token", { method: "POST" });

        if (!isCurrentDial()) return;

        if (!tokenResponse.ok || !tokenData.token) {
          if (tokenData.code === "CALL_MINUTES_REQUIRED") {
            setIsOpen(true);
            setStatus("error");
            setError(
              tokenData.error ??
                "Your monthly calling limit of 3500 minutes is exceeded. Minutes reset on your next billing date.",
            );
            return;
          }
          if (
            tokenData.code === "CALLING_SUBSCRIPTION_REQUIRED" ||
            /Unlimited calling/i.test(tokenData.error ?? "")
          ) {
            setIsOpen(false);
            setStatus("idle");
            window.location.assign("/pricing#calling");
            return;
          }
          if (
            tokenData.code === "PHONE_NUMBER_REQUIRED" ||
            /phone number/i.test(tokenData.error ?? "")
          ) {
            setIsOpen(false);
            setStatus("idle");
            window.location.assign("/settings/phone-numbers");
            return;
          }
          throw new ApiError(
            tokenData.error ?? "Failed to get dialer token",
            tokenResponse.status,
          );
        }

        callerNumberRef.current = tokenData.callerNumber ?? null;

        const { response: callResponse, data: callData } = await fetchJson<{
          call?: { id: string };
          error?: string;
          code?: string;
        }>("/api/dialer/calls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toNumber: normalized,
            campaignId: input.campaignId ?? null,
            personId: input.personId ?? null,
            personName: input.personName ?? null,
          }),
        });

        if (!isCurrentDial()) return;

        if (!callResponse.ok || !callData.call?.id) {
          if (callData.code === "CALL_MINUTES_REQUIRED") {
            setIsOpen(true);
            setStatus("error");
            setError(
              callData.error ??
                "Your monthly calling limit of 3500 minutes is exceeded. Minutes reset on your next billing date.",
            );
            return;
          }
          if (
            callData.code === "CALLING_SUBSCRIPTION_REQUIRED" ||
            /Unlimited calling/i.test(callData.error ?? "")
          ) {
            setIsOpen(false);
            setStatus("idle");
            window.location.assign("/pricing#calling");
            return;
          }
          if (
            callData.code === "PHONE_NUMBER_REQUIRED" ||
            /phone number/i.test(callData.error ?? "")
          ) {
            setIsOpen(false);
            setStatus("idle");
            window.location.assign("/settings/phone-numbers");
            return;
          }
          throw new ApiError(
            callData.error ?? "Failed to start call log",
            callResponse.status,
          );
        }

        callLogIdRef.current = callData.call.id;

        const { TelnyxRTC } = await import("@telnyx/webrtc");
        if (!isCurrentDial()) return;

        const client = new TelnyxRTC({
          login_token: tokenData.token,
        }) as unknown as TelnyxClientLike;

        clientRef.current = client;

        client.on("telnyx.ready", () => {
          // telnyx.ready can fire again after reconnect / hangup — only dial once.
          if (!isCurrentDial() || hangupSentRef.current || callPlacedRef.current) {
            return;
          }
          if (clientRef.current !== client) return;

          callPlacedRef.current = true;
          const call = client.newCall({
            destinationNumber: normalized,
            callerNumber: callerNumberRef.current ?? undefined,
            audio: true,
            remoteElement: remoteAudioRef.current ?? undefined,
          });
          callRef.current = call;
          attachRemoteAudio(remoteAudioRef.current, call.remoteStream);
          setStatus("connecting");
          void patchCallLog({
            status: "ringing",
            telnyxCallId: call.id ?? null,
          });
        });

        client.on("telnyx.notification", (notification) => {
          if (!isCurrentDial() || clientRef.current !== client) return;

          const notificationType = notification.type;
          const call = notification.call;

          if (
            notificationType === "userMediaError" ||
            notificationType === "peerConnectionFailedError" ||
            notificationType === "peerConnectionFailureError"
          ) {
            hangupSentRef.current = true;
            const message =
              notificationType === "userMediaError"
                ? "Microphone permission is required to place calls."
                : "Browser could not establish call media (WebRTC).";
            setStatus("error");
            setError(message);
            void patchCallLog({
              status: "failed",
              errorMessage: message,
              ended: true,
            });
            try {
              client.disconnect();
            } catch {
              // ignore
            }
            if (clientRef.current === client) {
              clientRef.current = null;
              callRef.current = null;
            }
            return;
          }

          if (!call) return;

          callRef.current = call;
          const state = call.state;
          attachRemoteAudio(remoteAudioRef.current, call.remoteStream);

          if (state === "requesting" || state === "trying" || state === "connecting") {
            if (!hangupSentRef.current) setStatus("connecting");
          }

          if (state === "ringing") {
            if (!hangupSentRef.current) setStatus("ringing");
          }

          if (state === "active" || state === "answered") {
            if (hangupSentRef.current) return;
            everActiveRef.current = true;
            if (connectedAtRef.current == null) {
              connectedAtRef.current = Date.now();
              clearTimer();
              timerRef.current = setInterval(() => {
                if (connectedAtRef.current == null) return;
                setElapsedSeconds(
                  Math.max(
                    0,
                    Math.round((Date.now() - connectedAtRef.current) / 1000),
                  ),
                );
              }, 1000);
            }
            setStatus("active");
            setError(null);
            void patchCallLog({
              status: "active",
              telnyxCallId: call.id ?? null,
            });
            void startRecordingIfNeeded(call);
          }

          if (state === "hangup") {
            hangupSentRef.current = true;
            callPlacedRef.current = true;
            const duration = captureFinalDuration();
            clearTimer();
            setStatus("ended");
            setMuted(false);

            const reason = formatHangupReason(call);
            if (!everActiveRef.current) {
              setError(`Call failed before connect: ${reason}`);
            }

            void patchCallLog({
              status: everActiveRef.current ? "hangup" : "failed",
              durationSeconds: duration,
              telnyxCallId: call.id ?? null,
              ended: true,
              errorMessage: everActiveRef.current ? null : reason,
            });

            void (async () => {
              await finalizeCallMediaRef.current();
              try {
                client.disconnect();
              } catch {
                // ignore
              }
              if (clientRef.current === client) {
                clientRef.current = null;
                callRef.current = null;
              }
            })();
          }

          // destroy/purge are cleanup states — don't overwrite hangup reason
          if (
            (state === "destroy" || state === "purge" || state === "done") &&
            !hangupSentRef.current
          ) {
            hangupSentRef.current = true;
            callPlacedRef.current = true;
            const duration = captureFinalDuration();
            clearTimer();
            setStatus("ended");
            if (!everActiveRef.current) {
              setError(`Call ended before connect: ${formatHangupReason(call)}`);
            }
            void patchCallLog({
              status: "failed",
              durationSeconds: duration,
              telnyxCallId: call.id ?? null,
              ended: true,
              errorMessage: formatHangupReason(call),
            });
            void (async () => {
              await finalizeCallMediaRef.current();
              try {
                client.disconnect();
              } catch {
                // ignore
              }
              if (clientRef.current === client) {
                clientRef.current = null;
                callRef.current = null;
              }
            })();
          }
        });

        client.on("telnyx.error", (notification) => {
          if (!isCurrentDial() || clientRef.current !== client) return;
          hangupSentRef.current = true;
          callPlacedRef.current = true;
          const message =
            notification.error?.message ?? "Call failed to connect";
          const duration = captureFinalDuration();
          setStatus("error");
          setError(message);
          void patchCallLog({
            status: "failed",
            durationSeconds: duration,
            errorMessage: message,
            ended: true,
          });
          try {
            client.disconnect();
          } catch {
            // ignore
          }
          if (clientRef.current === client) {
            clientRef.current = null;
            callRef.current = null;
          }
        });

        if (!isCurrentDial()) {
          try {
            client.disconnect();
          } catch {
            // ignore
          }
          return;
        }

        client.connect();
      } catch (err) {
        if (!isCurrentDial()) return;
        const message =
          err instanceof Error ? err.message : "Failed to start call";
        setStatus("error");
        setError(message);
        void patchCallLog({
          status: "failed",
          errorMessage: message,
          ended: true,
        });
        cleanupClient();
      }
    },
    [
      captureFinalDuration,
      cleanupClient,
      clearTimer,
      patchCallLog,
      startRecordingIfNeeded,
    ],
  );

  const value = useMemo<SoftphoneContextValue>(
    () => ({
      startCall,
      openManualDial,
      hangup,
      toggleMute,
      setDisposition,
      dismiss,
      status,
      muted,
      elapsedSeconds,
      toNumber,
      personName,
      error,
      isOpen,
    }),
    [
      startCall,
      openManualDial,
      hangup,
      toggleMute,
      setDisposition,
      dismiss,
      status,
      muted,
      elapsedSeconds,
      toNumber,
      personName,
      error,
      isOpen,
    ],
  );

  const placeManualCall = useCallback(async () => {
    const digits = manualNumber.replace(/\D/g, "");
    if (digits.length < 10) {
      setManualError("Enter a valid phone number (at least 10 digits).");
      return;
    }

    setManualError(null);
    setIsDialPadOpen(false);
    await startCall({ toNumber: digits });
  }, [manualNumber, startCall]);

  const statusLabel =
    status === "connecting"
      ? "Connecting…"
      : status === "ringing"
        ? "Ringing…"
        : status === "active"
          ? "On call"
          : status === "ended"
            ? "Call ended"
            : status === "error"
              ? "Call failed"
              : "Ready";

  const showActiveChrome =
    isOpen &&
    (status === "connecting" ||
      status === "ringing" ||
      status === "active" ||
      status === "ended" ||
      status === "error");

  return (
    <SoftphoneContext.Provider value={value}>
      {children}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {isDialPadOpen && !showActiveChrome ? (
        <div className="softphone-sheet fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 sm:p-6">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_24px_64px_-16px_rgba(15,23,42,0.35)]">
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 px-5 pb-6 pt-5 text-white">
              <div
                className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-emerald-400/20 blur-2xl"
                aria-hidden
              />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300/90">
                    Dialer
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
                    Dial a number
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeManualDial}
                  className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 transition hover:bg-white/20"
                >
                  Close
                </button>
              </div>
              <div className="relative mt-5 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur-sm">
                <label className="sr-only" htmlFor="softphone-manual-number">
                  Phone number
                </label>
                <input
                  id="softphone-manual-number"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  autoFocus
                  value={manualNumber}
                  onChange={(event) => {
                    const next = event.target.value
                      .replace(/[^\d+*#]/g, "")
                      .slice(0, 16);
                    setManualNumber(next);
                    if (manualError) setManualError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void placeManualCall();
                    }
                  }}
                  placeholder="Enter number"
                  className="w-full rounded-xl border-0 bg-black/40 px-2 py-2 text-center font-mono text-2xl tracking-[0.12em] text-white caret-emerald-300 outline-none placeholder:text-white/35 focus:bg-black/55 [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_rgb(0,0,0)] [&:-webkit-autofill]:[-webkit-text-fill-color:#fff]"
                />
              </div>
            </div>

            <div className="space-y-4 bg-slate-50 px-5 py-5">
              <div className="grid grid-cols-3 gap-2.5">
                {DIAL_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setManualNumber((prev) => `${prev}${key}`.slice(0, 16))
                    }
                    className="softphone-key flex h-14 items-center justify-center rounded-2xl border border-slate-200/90 bg-white text-xl font-semibold text-slate-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"
                  >
                    {key}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setManualNumber((prev) => prev.slice(0, -1))}
                  className="flex h-12 flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => void placeManualCall()}
                  className="flex h-12 flex-[1.4] items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-500 active:scale-[0.98]"
                >
                  <IconPhone className="h-4 w-4" />
                  Call
                </button>
              </div>

              {manualError ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {manualError}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {showActiveChrome ? (
        <div className="softphone-sheet fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 sm:p-6">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_24px_64px_-16px_rgba(15,23,42,0.35)]">
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 px-5 pb-8 pt-5 text-white">
              <div
                className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-emerald-400/15 blur-3xl"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -right-6 bottom-0 h-28 w-28 rounded-full bg-teal-300/10 blur-2xl"
                aria-hidden
              />

              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300/90">
                    Call
                  </p>
                  <h2 className="mt-1 truncate text-xl font-semibold tracking-tight text-white">
                    {personName || "Outbound call"}
                  </h2>
                  <p className="mt-0.5 truncate font-mono text-sm text-white/55">
                    {toNumber}
                  </p>
                </div>
                {(status === "ended" || status === "error") && (
                  <button
                    type="button"
                    onClick={dismiss}
                    className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 transition hover:bg-white/20"
                  >
                    Close
                  </button>
                )}
              </div>

              <div className="relative mt-6 flex flex-col items-center">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/10 backdrop-blur-sm ${
                    status === "ringing" || status === "connecting"
                      ? "softphone-pulse"
                      : ""
                  }`}
                >
                  <IconPhone className="h-7 w-7 text-emerald-300" />
                </div>
                <p className="mt-4 font-mono text-3xl font-semibold tabular-nums tracking-tight text-white">
                  {formatElapsed(elapsedSeconds)}
                </p>
                <span
                  className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    status === "active"
                      ? "bg-emerald-400/20 text-emerald-200"
                      : status === "error"
                        ? "bg-rose-400/20 text-rose-200"
                        : status === "ended"
                          ? "bg-white/10 text-white/70"
                          : "bg-amber-400/15 text-amber-100"
                  }`}
                >
                  {(status === "ringing" || status === "connecting") && (
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                  )}
                  {statusLabel}
                  {status === "active" && mediaStatus === "recording"
                    ? " · Recording"
                    : ""}
                </span>
              </div>
            </div>

            <div className="space-y-4 bg-slate-50 px-5 py-5">
              {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-relaxed text-rose-700">
                  <p>{error}</p>
                  {/phone number|Phone numbers/i.test(error) ? (
                    <a
                      href="/settings/phone-numbers"
                      className="mt-2 inline-block font-medium text-emerald-700 underline hover:text-emerald-800"
                    >
                      Get your included number
                    </a>
                  ) : null}
                  {/Subscribe to Unlimited|Unlimited calling required/i.test(
                    error,
                  ) ? (
                    <a
                      href="/pricing#calling"
                      className="mt-2 inline-block font-medium text-emerald-700 underline hover:text-emerald-800"
                    >
                      View Unlimited calling
                    </a>
                  ) : null}
                </div>
              ) : null}

              {status === "connecting" ||
              status === "ringing" ||
              status === "active" ? (
                <div className="flex items-center justify-center gap-5">
                  <button
                    type="button"
                    onClick={toggleMute}
                    disabled={status !== "active"}
                    className={`flex h-14 w-14 flex-col items-center justify-center rounded-full border transition disabled:opacity-50 ${
                      muted
                        ? "border-amber-300 bg-amber-50 text-amber-800"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                    aria-label={muted ? "Unmute" : "Mute"}
                  >
                    {muted ? (
                      <IconMicOff className="h-5 w-5" />
                    ) : (
                      <IconMic className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={hangup}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg shadow-rose-600/30 transition hover:bg-rose-500 active:scale-95"
                    aria-label="Hang up"
                  >
                    <IconPhoneOff className="h-6 w-6" />
                  </button>
                </div>
              ) : null}

              {(status === "ended" || status === "error") && (
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Recording & transcript
                    </p>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                      {mediaStatus === "recording" ||
                      mediaStatus === "uploading" ||
                      mediaStatus === "transcribing" ? (
                        <p className="text-xs text-slate-600">
                          {mediaStatus === "recording"
                            ? "Recording call…"
                            : mediaStatus === "uploading"
                              ? "Saving recording…"
                              : "Transcribing call…"}
                        </p>
                      ) : null}

                      {mediaStatus === "idle" && !recordingUrl && !transcript ? (
                        <p className="text-xs text-slate-500">
                          No recording for this call yet.
                        </p>
                      ) : null}

                      {recordingUrl ? (
                        <audio
                          controls
                          src={recordingUrl}
                          className="mt-1 w-full"
                          preload="metadata"
                        />
                      ) : null}

                      {transcript ? (
                        <p className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
                          {transcript}
                        </p>
                      ) : null}

                      {mediaError ? (
                        <p className="mt-2 text-xs text-rose-600">{mediaError}</p>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Call outcome
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {DISPOSITIONS.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          disabled={savingDisposition}
                          onClick={() => void setDisposition(item.value)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-60"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </SoftphoneContext.Provider>
  );
}

export function useSoftphone(): SoftphoneContextValue {
  const ctx = useContext(SoftphoneContext);
  if (!ctx) {
    throw new Error("useSoftphone must be used within SoftphoneProvider");
  }
  return ctx;
}

/** Safe hook when SoftphoneProvider may be absent (returns null). */
export function useSoftphoneOptional(): SoftphoneContextValue | null {
  return useContext(SoftphoneContext);
}

export default SoftphoneProvider;
