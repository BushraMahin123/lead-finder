import { GoogleGenAI } from "@google/genai";
import { enqueueGemini } from "@/lib/api-queue";

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";

function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("Gemini is not configured. Add GEMINI_API_KEY to your environment.");
  }
  return key;
}

export async function transcribeCallAudio(input: {
  audioBase64: string;
  mimeType: string;
}): Promise<string> {
  return enqueueGemini(async () => {
    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Transcribe this outbound sales phone call audio.

Rules:
- Return only the transcript text.
- Label speakers as "Agent:" and "Lead:" when you can tell them apart.
- If one side is unclear, keep the best-effort text.
- If there is no speech, return exactly: (no speech detected)`,
            },
            {
              inlineData: {
                mimeType: input.mimeType || "audio/webm",
                data: input.audioBase64,
              },
            },
          ],
        },
      ],
    });

    const text = response.text?.trim();
    if (!text) {
      throw new Error("Transcription returned empty text");
    }
    return text;
  });
}
