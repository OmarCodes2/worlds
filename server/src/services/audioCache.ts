import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_AUDIO_CACHE_DIR = path.resolve(
  __dirname,
  "../../data/audio-cache",
);

export function buildCacheKey(
  character: string,
  voiceId: string,
  text: string,
  modelId: string,
): string {
  const raw = `${character}|${voiceId}|${text}|${modelId}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export class AudioCache {
  constructor(private readonly dir: string = DEFAULT_AUDIO_CACHE_DIR) {}

  filePath(key: string): string {
    return path.join(this.dir, `${key}.mp3`);
  }

  async ensureDir(): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(this.filePath(key));
    } catch {
      return null;
    }
  }

  async set(key: string, data: Buffer): Promise<string> {
    await this.ensureDir();
    const file = this.filePath(key);
    await fs.writeFile(file, data);
    return file;
  }

  async has(key: string): Promise<boolean> {
    try {
      await fs.access(this.filePath(key));
      return true;
    } catch {
      return false;
    }
  }
}
