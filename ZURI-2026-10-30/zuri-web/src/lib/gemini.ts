
import "server-only";
import { GoogleGenAI } from "@google/genai";

export async function testGeminiConnection() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model =
    process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model,
    contents:
      "Reply with exactly: ZURI AI connection successful.",
    config: {
      maxOutputTokens: 100,
    },
  });

  return {
    provider: "gemini",
    model,
    text: response.text ?? "",
    usage: {
      inputTokens:
        response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens:
        response.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens:
        response.usageMetadata?.totalTokenCount ?? 0,
    },
  };
}
