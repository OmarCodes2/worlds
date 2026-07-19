import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { loadEnv } from "../config/env.js";
import { AudioCache, buildCacheKey } from "./audioCache.js";

const TTS_MODEL = "eleven_multilingual_v2";
const TTS_TIMEOUT_MS = 20_000;

export type SpeechResult = {
  character: string;
  text: string;
  audioUrl: string | null;
  cacheHit: boolean;
  error?: string;
  fileId?: string;
};

function normalizeCharacter(character: string): keyof ReturnType<typeof loadEnv>["voiceIds"] | null {
  const key = character.trim().toUpperCase();
  if (
    key === "MARA" ||
    key === "GARRICK" ||
    key === "EDRIC" ||
    key === "ROWAN" ||
    key === "NARRATOR"
  ) {
    return key;
  }
  return null;
}

async function streamToBuffer(stream: ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>): Promise<Buffer> {
  if (Symbol.asyncIterator in Object(stream)) {
    const chunks: Buffer[] = [];
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  const reader = (stream as ReadableStream<Uint8Array>).getReader();
  const chunks: Buffer[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

export class ElevenLabsService {
  private client: ElevenLabsClient | null = null;

  constructor(private readonly cache: AudioCache = new AudioCache()) {}

  private getClient(): ElevenLabsClient | null {
    const env = loadEnv();
    if (!env.elevenLabsAvailable) return null;
    if (!this.client) {
      this.client = new ElevenLabsClient({ apiKey: env.elevenLabsApiKey });
    }
    return this.client;
  }

  async generateSpeech(character: string, text: string): Promise<SpeechResult> {
    const env = loadEnv();
    const charKey = normalizeCharacter(character) ?? "NARRATOR";
    const voiceId = env.voiceIds[charKey];

    if (!env.elevenLabsAvailable || !voiceId) {
      return {
        character,
        text,
        audioUrl: null,
        cacheHit: false,
        error: "ElevenLabs unavailable (missing API key or voice IDs)",
      };
    }

    const fileId = buildCacheKey(charKey, voiceId, text, TTS_MODEL);
    const cached = await this.cache.get(fileId);
    if (cached) {
      return {
        character,
        text,
        audioUrl: `/api/audio/${fileId}`,
        cacheHit: true,
        fileId,
      };
    }

    const client = this.getClient();
    if (!client) {
      return {
        character,
        text,
        audioUrl: null,
        cacheHit: false,
        error: "ElevenLabs client unavailable",
      };
    }

    try {
      const audioPromise = client.textToSpeech.convert(voiceId, {
        text,
        modelId: TTS_MODEL,
        outputFormat: "mp3_44100_128",
      });

      const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("ElevenLabs timeout")), TTS_TIMEOUT_MS);
      });

      const audio = await Promise.race([audioPromise, timeout]);
      const buffer = await streamToBuffer(audio as ReadableStream<Uint8Array>);
      await this.cache.set(fileId, buffer);

      return {
        character,
        text,
        audioUrl: `/api/audio/${fileId}`,
        cacheHit: false,
        fileId,
      };
    } catch (err) {
      return {
        character,
        text,
        audioUrl: null,
        cacheHit: false,
        error: (err as Error).message,
      };
    }
  }
}
