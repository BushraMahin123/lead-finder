"use client";

type CallRecorder = {
  start: (local?: MediaStream | null, remote?: MediaStream | null) => Promise<void>;
  stop: () => Promise<Blob | null>;
  isRecording: () => boolean;
};

function pickMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const type of candidates) {
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(type)
    ) {
      return type;
    }
  }
  return "audio/webm";
}

export function createCallRecorder(): CallRecorder {
  let recorder: MediaRecorder | null = null;
  let audioCtx: AudioContext | null = null;
  let chunks: BlobPart[] = [];
  let mimeType = "audio/webm";
  let started = false;

  return {
    isRecording: () => started && recorder?.state === "recording",

    async start(local, remote) {
      if (started) return;

      let localStream = local ?? null;
      if (!localStream?.getAudioTracks().length) {
        try {
          localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
        } catch {
          localStream = null;
        }
      }

      const hasLocal = Boolean(localStream?.getAudioTracks().length);
      const hasRemote = Boolean(remote?.getAudioTracks().length);
      if (!hasLocal && !hasRemote) {
        throw new Error("No audio streams available to record");
      }

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      audioCtx = new AudioCtx();
      if (audioCtx.state === "suspended") {
        await audioCtx.resume().catch(() => undefined);
      }

      const destination = audioCtx.createMediaStreamDestination();
      if (hasLocal && localStream) {
        audioCtx.createMediaStreamSource(localStream).connect(destination);
      }
      if (hasRemote && remote) {
        audioCtx.createMediaStreamSource(remote).connect(destination);
      }

      mimeType = pickMimeType();
      chunks = [];
      recorder = new MediaRecorder(destination.stream, { mimeType });
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.start(1000);
      started = true;
    },

    stop() {
      return new Promise((resolve) => {
        const finish = () => {
          const blob =
            chunks.length > 0
              ? new Blob(chunks, { type: mimeType })
              : null;
          chunks = [];
          started = false;
          recorder = null;
          if (audioCtx) {
            void audioCtx.close().catch(() => undefined);
            audioCtx = null;
          }
          resolve(blob && blob.size > 0 ? blob : null);
        };

        if (!recorder || recorder.state === "inactive") {
          finish();
          return;
        }

        recorder.onstop = finish;
        try {
          recorder.stop();
        } catch {
          finish();
        }
      });
    },
  };
}
