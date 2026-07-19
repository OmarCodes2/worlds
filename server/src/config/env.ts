import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(__dirname, "../../../.env");

dotenv.config({ path: rootEnvPath });

const REQUIRED_NAMES = [
  "GEMINI_API_KEY",
  "ELEVENLABS_API_KEY",
  "ELEVENLABS_MARA_VOICE_ID",
  "ELEVENLABS_GARRICK_VOICE_ID",
  "ELEVENLABS_EDRIC_VOICE_ID",
  "ELEVENLABS_ROWAN_VOICE_ID",
  "ELEVENLABS_NARRATOR_VOICE_ID",
] as const;

function read(name: string): string {
  return (process.env[name] ?? "").trim();
}

export type AppEnv = {
  port: number;
  geminiApiKey: string;
  geminiModel: string;
  elevenLabsApiKey: string;
  voiceIds: {
    MARA: string;
    GARRICK: string;
    EDRIC: string;
    ROWAN: string;
    NARRATOR: string;
  };
  geminiAvailable: boolean;
  elevenLabsAvailable: boolean;
  missingEnvNames: string[];
};

let cached: AppEnv | null = null;

export function loadEnv(): AppEnv {
  if (cached) return cached;

  const geminiApiKey = read("GEMINI_API_KEY");
  const elevenLabsApiKey = read("ELEVENLABS_API_KEY");
  const voiceIds = {
    MARA: read("ELEVENLABS_MARA_VOICE_ID"),
    GARRICK: read("ELEVENLABS_GARRICK_VOICE_ID"),
    EDRIC: read("ELEVENLABS_EDRIC_VOICE_ID"),
    ROWAN: read("ELEVENLABS_ROWAN_VOICE_ID"),
    NARRATOR: read("ELEVENLABS_NARRATOR_VOICE_ID"),
  };

  const missingEnvNames = REQUIRED_NAMES.filter((name) => !read(name));

  const geminiAvailable = Boolean(geminiApiKey);
  const elevenLabsAvailable =
    Boolean(elevenLabsApiKey) &&
    Boolean(voiceIds.MARA) &&
    Boolean(voiceIds.GARRICK) &&
    Boolean(voiceIds.EDRIC) &&
    Boolean(voiceIds.ROWAN) &&
    Boolean(voiceIds.NARRATOR);

  cached = {
    port: Number(read("PORT") || "3001"),
    geminiApiKey,
    geminiModel: read("GEMINI_MODEL") || "gemini-2.5-flash",
    elevenLabsApiKey,
    voiceIds,
    geminiAvailable,
    elevenLabsAvailable,
    missingEnvNames,
  };

  return cached;
}

/** Test helper: clear cached env so tests can control process.env */
export function resetEnvCache(): void {
  cached = null;
}

export function logMissingEnv(env: AppEnv): void {
  if (env.missingEnvNames.length === 0) {
    console.log("[env] All required environment variables are set.");
    return;
  }
  console.warn(
    `[env] Missing environment variables (values never logged): ${env.missingEnvNames.join(", ")}`,
  );
  console.warn("[env] Starting in fallback mode where possible.");
}
