import { GoogleGenAI } from "@google/genai";
import { enqueueGemini } from "@/lib/api-queue";
import {
  buildAiColumnSystemPrompt,
  buildPersonVariables,
  interpolatePrompt,
} from "@/lib/ai-column-prompt";
import type { LeadPerson } from "@/types/lead";

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";

function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("Gemini is not configured. Add GEMINI_API_KEY to your environment.");
  }
  return key;
}

function formatPersonContext(person: LeadPerson): string {
  const vars = buildPersonVariables(person);
  const lines = Object.entries(vars)
    .filter(([, value]) => value.trim())
    .map(([key, value]) => `- ${key}: ${value}`);

  return lines.join("\n");
}

export async function enrichPersonWithAiColumn(
  person: LeadPerson,
  promptTemplate: string,
): Promise<string> {
  return enqueueGemini(async () => {
    const variables = buildPersonVariables(person);
    const userPrompt = interpolatePrompt(promptTemplate, variables);
    const context = formatPersonContext(person);

    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${buildAiColumnSystemPrompt()}

Contact context:
${context}

Task:
${userPrompt}`,
            },
          ],
        },
      ],
      config: {
        temperature: 0.3,
        maxOutputTokens: 512,
      },
    });

    const text = response.text?.trim();
    if (!text) {
      throw new Error("AI returned an empty cell value.");
    }

    return text.replace(/^["']|["']$/g, "").trim();
  });
}
