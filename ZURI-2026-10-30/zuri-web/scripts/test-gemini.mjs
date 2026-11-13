import { GoogleGenAI } from "@google/genai";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY");
}

const ai = new GoogleGenAI({ apiKey });

try {
  const result = await ai.models.generateContent({
    model:
    
       process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite",
    contents:
      "Reply with exactly: ZURI AI connection successful.",
    config: {
      maxOutputTokens: 100,
    },
  });

  console.log("Provider: Gemini");
  console.log("Response:", result.text);
  console.log(
    "Total tokens:",
    result.usageMetadata?.totalTokenCount ?? "unknown"
  );
} catch (error) {
  console.error(
    "Gemini test failed:",
    error instanceof Error ? error.message : "Unknown error"
  );
  process.exitCode = 1;
}
