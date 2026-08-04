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

export type SoftphoneStartCallInput = {
  toNumber: string;
  personName?: string | null;
  campaignId?: string | null;
  personId?: string | null;
};

type SoftphoneContextValue = {
  startCall: (input: SoftphoneStartCallInput) => Promise<void>;
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
  const [savingDisposition, setSavingDisposition] = useState(false);

  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const clientRef = useRef<TelnyxClientLike | null>(null);
  const callRef = useRef<TelnyxCallLike | null>(null);
  const callLogIdRef = useRef<string | null>(null);
  const callerNumberRef = useRef<string | null>(null);
  const connectedAtRef = useRef<number | null>(null);
  const hangupSentRef = useRef(false);
  const everActiveRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
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
    const duration =
      connectedAtRef.current != null
        ? Math.max(0, Math.round((Date.now() - connectedAtRef.current) / 1000))
        : elapsedSeconds;

    const call = callRef.current;
    if (call && !hangupSentRef.current && isLiveCallState(call.state)) {
      hangupSentRef.current = true;
      try {
        call.hangup();
      } catch {
        // ignore stale bye / already-ended call
      }
    } else {
      hangupSentRef.current = true;
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
  }, [clearTimer, elapsedSeconds, isLiveCallState, patchCallLog]);

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
    cleanupClient();
    callLogIdRef.current = null;
    connectedAtRef.current = null;
    setIsOpen(false);
    setStatus("idle");
    setError(null);
    setToNumber(null);
    setPersonName(null);
    setElapsedSeconds(0);
    setMuted(false);
  }, [cleanupClient]);

  const setDisposition = useCallback(
    async (disposition: CallDisposition) => {
      setSavingDisposition(true);
      try {
        const duration =
          connectedAtRef.current != null
            ? Math.max(
                0,
                Math.round((Date.now() - connectedAtRef.current) / 1000),
              )
            : elapsedSeconds;

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
    [elapsedSeconds, hangup, patchCallLog, status],
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
      hangupSentRef.current = false;
      everActiveRef.current = false;
      callLogIdRef.current = null;
      setIsOpen(true);
      setStatus("connecting");
      setError(null);
      setMuted(false);
      setElapsedSeconds(0);
      setToNumber(normalized);
      setPersonName(input.personName ?? null);

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

        if (!tokenResponse.ok || !tokenData.token) {
          throw new ApiError(
            tokenData.error ?? "Failed to get dialer token",
            tokenResponse.status,
          );
        }

        callerNumberRef.current = tokenData.callerNumber ?? null;

        const { response: callResponse, data: callData } = await fetchJson<{
          call?: { id: string };
          error?: string;
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

        if (!callResponse.ok || !callData.call?.id) {
          throw new ApiError(
            callData.error ?? "Failed to start call log",
            callResponse.status,
          );
        }

        callLogIdRef.current = callData.call.id;

        const { TelnyxRTC } = await import("@telnyx/webrtc");
        const client = new TelnyxRTC({
          login_token: tokenData.token,
          remoteElement: remoteAudioRef.current ?? undefined,
        }) as unknown as TelnyxClientLike;

        clientRef.current = client;

        client.on("telnyx.ready", () => {
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
          const notificationType = notification.type;
          const call = notification.call;

          if (
            notificationType === "userMediaError" ||
            notificationType === "peerConnectionFailedError" ||
            notificationType === "peerConnectionFailureError"
          ) {
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
            return;
          }

          if (!call) return;

          callRef.current = call;
          const state = call.state;
          attachRemoteAudio(remoteAudioRef.current, call.remoteStream);

          if (state === "requesting" || state === "trying" || state === "connecting") {
            setStatus("connecting");
          }

          if (state === "ringing") {
            setStatus("ringing");
          }

          if (state === "active" || state === "answered") {
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
          }

          if (state === "hangup") {
            hangupSentRef.current = true;
            const duration =
              connectedAtRef.current != null
                ? Math.max(
                    0,
                    Math.round((Date.now() - connectedAtRef.current) / 1000),
                  )
                : 0;
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
          }

          // destroy/purge are cleanup states — don't overwrite hangup reason
          if (
            (state === "destroy" || state === "purge" || state === "done") &&
            !hangupSentRef.current
          ) {
            hangupSentRef.current = true;
            clearTimer();
            setStatus("ended");
            if (!everActiveRef.current) {
              setError(`Call ended before connect: ${formatHangupReason(call)}`);
            }
            void patchCallLog({
              status: "failed",
              telnyxCallId: call.id ?? null,
              ended: true,
              errorMessage: formatHangupReason(call),
            });
          }
        });

        client.on("telnyx.error", (notification) => {
          const message =
            notification.error?.message ?? "Call failed to connect";
          setStatus("error");
          setError(message);
          void patchCallLog({
            status: "failed",
            errorMessage: message,
            ended: true,
          });
        });

        client.connect();
      } catch (err) {
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
    [cleanupClient, clearTimer, patchCallLog],
  );

  const value = useMemo<SoftphoneContextValue>(
    () => ({
      startCall,
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

  return (
    <SoftphoneContext.Provider value={value}>
      {children}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      {isOpen ? (
        <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {personName || "Outbound call"}
                </p>
                <p className="truncate text-xs text-slate-500">{toNumber}</p>
              </div>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                title="Close"
              >
                ×
              </button>
            </div>

            <div className="px-4 py-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Status
                  </p>
                  <p className="text-sm font-medium text-slate-800 capitalize">
                    {status === "error" ? "Failed" : status}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Duration
                  </p>
                  <p className="font-mono text-sm font-medium text-slate-800">
                    {formatElapsed(elapsedSeconds)}
                  </p>
                </div>
              </div>

              {error ? (
                <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  <p>{error}</p>
                  {/phone number|Phone numbers/i.test(error) ? (
                    <a
                      href="/settings/phone-numbers"
                      className="mt-2 inline-block font-medium text-emerald-700 underline hover:text-emerald-800"
                    >
                      Get a phone number
                    </a>
                  ) : null}
                </div>
              ) : null}

              <div className="mb-4 flex gap-2">
                {(status === "connecting" ||
                  status === "ringing" ||
                  status === "active") && (
                  <>
                    <button
                      type="button"
                      onClick={toggleMute}
                      disabled={status !== "active"}
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    >
                      {muted ? "Unmute" : "Mute"}
                    </button>
                    <button
                      type="button"
                      onClick={hangup}
                      className="flex-1 rounded-xl bg-red-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-red-700"
                    >
                      Hang up
                    </button>
                  </>
                )}
                {(status === "ended" || status === "error") && (
                  <button
                    type="button"
                    onClick={dismiss}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Close
                  </button>
                )}
              </div>

              {(status === "ended" ||
                status === "active" ||
                status === "ringing") && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                    Disposition
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {DISPOSITIONS.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        disabled={savingDisposition}
                        onClick={() => void setDisposition(item.value)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {item.label}
                      </button>
                    ))}
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
