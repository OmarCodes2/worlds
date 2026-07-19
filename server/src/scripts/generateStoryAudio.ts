import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "../../..");
const storyFile = path.join(projectRoot, "story-paths.html");
const outputDir = path.join(projectRoot, "story-audio/greywatch");
const manifestPath = path.join(outputDir, "manifest.json");
const manifestScriptPath = path.join(outputDir, "manifest.js");
const sfxPromptCatalogPath = path.join(outputDir, "sfx-prompts.json");
const envPath = path.join(projectRoot, ".env");

const TTS_MODEL = "eleven_v3";
const SFX_MODEL = "eleven_text_to_sound_v2";
const MUSIC_MODEL = "music_v2";
const OUTPUT_FORMAT = "mp3_44100_128";
const MUSIC_OUTPUT_FORMAT = "mp3_48000_192";

dotenv.config({ path: envPath });

type AudioKind = "speech" | "sfx" | "music";
type AudioStatus = "pending" | "ready" | "failed";

type StoryLine = {
  id: string;
  nodeTitle: string;
  nodeSlug: string;
  index: number;
  speaker: string;
  character: "MARA" | "GARRICK" | "EDRIC" | "ROWAN" | "NARRATOR" | "SFX" | "MUSIC";
  kind: AudioKind;
  text: string;
  direction: string;
  requestText: string;
  previousText?: string;
  nextText?: string;
  durationSeconds?: number;
  fingerprint: string;
};

type ManifestEntry = StoryLine & {
  status: AudioStatus;
  generation: number;
  audioPath?: string;
  generatedAt?: string;
  error?: string;
};

type SfxPromptEntry = {
  id: string;
  nodeTitle: string;
  source: string;
  durationSeconds: number;
  prompt: string;
};

type AudioManifest = {
  version: 1;
  storyFile: string;
  generatedAt: string;
  models: { speech: string; sfx: string; music: string };
  lines: ManifestEntry[];
};

type CliOptions = {
  dryRun: boolean;
  force: boolean;
  kindFilter?: AudioKind;
  lineFilter?: string;
  nodeFilter?: string;
  concurrency: number;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { dryRun: false, force: false, concurrency: 2 };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--force") options.force = true;
    else if (arg === "--kind") {
      const kind = argv[++index];
      if (kind !== "speech" && kind !== "sfx" && kind !== "music") throw new Error("--kind must be speech, sfx, or music");
      options.kindFilter = kind;
    }
    else if (arg === "--line") options.lineFilter = argv[++index];
    else if (arg === "--node") options.nodeFilter = argv[++index];
    else if (arg === "--concurrency") options.concurrency = Math.max(1, Number(argv[++index] ?? 2));
    else if (arg === "--help") {
      console.log([
        "Generate Greywatch dialogue and SFX with ElevenLabs.",
        "",
        "  npm run audio:generate -- --dry-run",
        "  npm run audio:generate",
        "  npm run audio:generate -- --line <line-id> --force",
        "  npm run audio:generate -- --node <title-fragment> --force",
        "",
        "Options: --dry-run --force --kind <speech|sfx|music> --line --node --concurrency",
      ].join("\n"));
      process.exit(0);
    }
  }
  return options;
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 56);
}

function decodeHtml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function characterForSpeaker(speaker: string): StoryLine["character"] {
  const normalized = speaker.toUpperCase();
  if (normalized === "MARA") return "MARA";
  if (normalized === "GARRICK") return "GARRICK";
  if (normalized === "EDRIC") return "EDRIC";
  if (normalized.includes("ROWAN")) return "ROWAN";
  if (normalized === "SFX") return "SFX";
  if (normalized === "MUSIC") return "MUSIC";
  return "NARRATOR";
}

function speechDirection(speaker: string, text: string, nodeTitle: string): string {
  const lower = text.toLowerCase();
  if (speaker === "ROWAN — THOUGHT") return "[quietly] [intimate, reflective, breath-aware]";
  if (speaker === "Patrol") return "[distant] [muffled, alert]";

  if (speaker === "Mara") {
    if (lower === "garrick, are you okay?" || lower === "are you hurt?") return "[softly] [deeply concerned, careful and afraid of the answer]";
    if (text === "Garrick!") return "[screaming his name] [sudden fear]";
    if (lower === "only halfway.") return "[alarmed] [urgent over grinding machinery]";
    if (lower.includes("the treadle winds the counterweight")) return "[commanding loudly over machinery] [precise and urgent]";
    if (lower.startsWith("i cross first.")) return "[decisive] [clear battlefield command]";
    if (lower === "then keep moving.") return "[sharp urgent command]";
    if (lower.startsWith("hold your pace, rowan")) return "[shouting urgently] [driving Rowan forward]";
    if (lower === "we are through.") return "[breathless relief] [still alert]";
    if (lower === "none that i can read.") return "[quiet, grim realization]";
    if (lower === "the patrol is behind you.") return "[urgent] [fear rising despite her control]";
    if (lower.startsWith("there is a release wheel on our side")) return "[shouting through iron] [desperate but commanding]";
    if (lower.startsWith("rowan, do we force the release wheel")) return "[shouting through iron] [desperate but commanding]";
    if (text === "Please! No!" || lower.includes("rowan! do something") || lower.includes("edric is the last lantern keeper")) {
      return "[screaming desperately] [urgent, terrified, voice breaking]";
    }
    if (lower.includes("please")) return "[pleading softly] [controlled fear]";
    if (lower.includes("rowan") && text.endsWith("?")) return "[direct, urgent, trusting]";
    if (lower.includes("alive") || lower.includes("hurt")) return "[strained but composed]";
    return nodeTitle.includes("Mara is cut off")
      ? "[muffled through iron] [commanding, controlled urgency]"
      : "[steady, low, commanding]";
  }

  if (speaker === "Garrick") {
    if (lower === "that is for thomas.") return "[normal volume] [flat, emotionally spent, no triumph]";
    if (lower === "do not comfort me.") return "[angrily] [sharp defensive snap]";
    if (lower === "i found the key on his body.") return "[shouting] [urgent, adrenaline high]";
    if (lower === "i need the key!") return "[shouting urgently] [commanding over machinery]";
    if (lower === "it opened.") return "[surprised] [breathless, speaking over the gate mechanism]";
    if (lower.startsWith("if the gate falls")) return "[grim warning] [loud enough to carry over machinery]";
    if (nodeTitle === "B2B — Garrick is cut off") return "[muffled through an iron gate] [breathless but controlled, preparing to fight]";
    if (lower === "say his name." || lower === "say what you did.") return "[shouting angrily] [grief breaking through every word]";
    if (lower.includes("my brother died on that floor") || lower.includes("time for you to die")) return "[screaming in rage] [voice cracking with grief]";
    if (lower.includes("kill") || lower.includes("murder")) return "[low, grief-hardened] [restrained anger]";
    if (lower.includes("thought it would sound different")) return "[shaken] [nearly voiceless]";
    if (text.endsWith("?")) return "[raw, guarded, searching]";
    return nodeTitle.includes("Let Garrick kill") || nodeTitle.startsWith("B")
      ? "[clipped, grief-struck, trying to stay useful]"
      : "[clipped, suspicious, protective]";
  }

  if (speaker === "Edric") {
    if (text === "Tho—mas.") return "[breathing heavily] [struggling to speak] [the name breaks into two painful syllables]";
    if (nodeTitle === "Root — Blood in the Chapel") return "[out of breath] [labored breathing between phrases] [strained but defiant]";
    if (lower.includes("killed") || lower.includes("struck")) return "[quietly] [guilty, precise, unflinching]";
    if (text.endsWith("?")) return "[tense, careful, sincere]";
    return "[quiet urgency] [defensive but controlled]";
  }

  return "[grounded, distant, tense]";
}

function speechRequestText(speaker: string, text: string, direction: string): string {
  if (speaker === "Edric" && text === "Tho—mas.") {
    return `${direction} Tho... [strained breath] mas.`;
  }
  return `${direction} ${text}`;
}

function musicPrompt(): string {
  return [
    "A seamless-loop instrumental decision underscore for a dark medieval fantasy audio game.",
    "Sparse and intimate: low bowed cello drone, a muted heartbeat-like frame drum at roughly 54 BPM, and a fragile two-note viola motif that never resolves.",
    "The mood is moral paralysis, grief, and urgent thought—not action or triumph.",
    "Maintain an even restrained intensity from beginning to end with no intro swell, climax, cadence, or final hit, so the ending can loop invisibly into the beginning.",
    "Leave generous midrange space for a close-mic internal monologue.",
    "No vocals, no choir, no spoken words, no heroic brass, no trailer percussion, no modern synthesizers.",
  ].join(" ");
}

function loadSfxPromptCatalog(): Map<string, SfxPromptEntry> {
  if (!fs.existsSync(sfxPromptCatalogPath)) {
    throw new Error(`Missing SFX prompt catalog: ${sfxPromptCatalogPath}`);
  }
  const entries = JSON.parse(fs.readFileSync(sfxPromptCatalogPath, "utf8")) as SfxPromptEntry[];
  const catalog = new Map<string, SfxPromptEntry>();
  for (const entry of entries) {
    if (!entry.id || !entry.prompt || !Number.isFinite(entry.durationSeconds)) {
      throw new Error(`Invalid SFX prompt catalog entry: ${JSON.stringify(entry)}`);
    }
    if (catalog.has(entry.id)) throw new Error(`Duplicate SFX prompt ID: ${entry.id}`);
    catalog.set(entry.id, entry);
  }
  return catalog;
}

function parseVocalPrompts(html: string): Map<string, string> {
  const section = html.match(/const vocalPrompts = new Map\(\[([\s\S]*?)\]\);/)?.[1] ?? "";
  const prompts = new Map<string, string>();
  for (const match of section.matchAll(/\['([^']+)',\s*'([^']+)'\]/g)) {
    prompts.set(match[1], match[2]);
  }
  return prompts;
}

function parseStoryLines(html: string): StoryLine[] {
  const vocalPrompts = parseVocalPrompts(html);
  const sfxPromptCatalog = loadSfxPromptCatalog();
  const lines: StoryLine[] = [];
  const usedSfxPromptIds = new Set<string>();

  for (const article of html.matchAll(/<article class="node[^"]*"([^>]*)>/g)) {
    const attrs = Object.fromEntries(
      [...article[1].matchAll(/data-([\w-]+)="([^"]*)"/g)].map((match) => [match[1], decodeHtml(match[2])]),
    );
    if (!attrs.title || !attrs.dialogue) continue;

    const nodeTitle = attrs.title;
    const nodeSlug = slugify(nodeTitle);
    const rawLines = attrs.dialogue.split("|");
    const vocalPrompt = vocalPrompts.get(nodeTitle);
    if (vocalPrompt) rawLines.push(vocalPrompt);
    const spokenContext = rawLines
      .filter((line) => !line.startsWith("SFX::") && !line.startsWith("MUSIC::"))
      .map((line) => line.slice(line.indexOf("::") + 2));

    let spokenIndex = 0;
    rawLines.forEach((rawLine, index) => {
      const separator = rawLine.indexOf("::");
      if (separator < 0) return;
      const speaker = rawLine.slice(0, separator).trim();
      const text = rawLine.slice(separator + 2).trim();
      const kind: AudioKind = speaker === "SFX" ? "sfx" : speaker === "MUSIC" ? "music" : "speech";
      const character = characterForSpeaker(speaker);
      const lineId = `${nodeSlug}-l${String(index + 1).padStart(2, "0")}-${slugify(speaker).slice(0, 18)}`;
      const sfxEntry = kind === "sfx" ? sfxPromptCatalog.get(lineId) : undefined;
      if (kind === "sfx" && !sfxEntry) throw new Error(`Missing curated SFX prompt for ${lineId}`);
      if (sfxEntry && (sfxEntry.nodeTitle !== nodeTitle || sfxEntry.source !== text)) {
        throw new Error(`Stale curated SFX prompt for ${lineId}; story title or source text changed`);
      }
      if (sfxEntry) usedSfxPromptIds.add(lineId);
      const direction = kind === "music" ? musicPrompt() : sfxEntry?.prompt ?? speechDirection(speaker, text, nodeTitle);
      const requestText = kind === "speech" ? speechRequestText(speaker, text, direction) : direction;
      const durationSeconds = kind === "music" ? 12 : sfxEntry?.durationSeconds;
      const model = kind === "sfx" ? SFX_MODEL : kind === "music" ? MUSIC_MODEL : TTS_MODEL;
      const fingerprint = crypto
        .createHash("sha256")
        .update(JSON.stringify({ kind, character, text, direction, durationSeconds, model }))
        .digest("hex");

      const previousText = kind === "speech" ? spokenContext[spokenIndex - 1] : undefined;
      const nextText = kind === "speech" ? spokenContext[spokenIndex + 1] : undefined;
      if (kind === "speech") spokenIndex += 1;

      lines.push({
        id: lineId,
        nodeTitle,
        nodeSlug,
        index,
        speaker,
        character,
        kind,
        text,
        direction,
        requestText,
        previousText,
        nextText,
        durationSeconds,
        fingerprint,
      });
    });
  }

  const unusedSfxPromptIds = [...sfxPromptCatalog.keys()].filter((id) => !usedSfxPromptIds.has(id));
  if (unusedSfxPromptIds.length) {
    throw new Error(`Unused curated SFX prompt IDs: ${unusedSfxPromptIds.join(", ")}`);
  }

  return lines;
}

function loadManifest(): AudioManifest {
  if (!fs.existsSync(manifestPath)) {
    return {
      version: 1,
      storyFile: path.relative(projectRoot, storyFile),
      generatedAt: new Date().toISOString(),
      models: { speech: TTS_MODEL, sfx: SFX_MODEL, music: MUSIC_MODEL },
      lines: [],
    };
  }
  return JSON.parse(fs.readFileSync(manifestPath, "utf8")) as AudioManifest;
}

function saveManifest(manifest: AudioManifest): void {
  manifest.generatedAt = new Date().toISOString();
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(
    manifestScriptPath,
    `globalThis.STORY_AUDIO_MANIFEST = ${JSON.stringify(manifest)};\n`,
  );
}

function currentManifestEntry(storyLine: StoryLine, existingById: Map<string, ManifestEntry>): ManifestEntry {
  const existing = existingById.get(storyLine.id);
  if (!existing) return { ...storyLine, status: "pending", generation: 0 };
  return {
    ...storyLine,
    status: existing.status,
    generation: existing.generation,
    audioPath: existing.audioPath,
    generatedAt: existing.generatedAt,
    error: existing.error,
  };
}

async function streamToBuffer(stream: ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>): Promise<Buffer> {
  if (Symbol.asyncIterator in Object(stream)) {
    const chunks: Buffer[] = [];
    for await (const chunk of stream as AsyncIterable<Uint8Array>) chunks.push(Buffer.from(chunk));
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

function voiceIdFor(character: StoryLine["character"]): string {
  if (character === "SFX" || character === "MUSIC") throw new Error(`${character} lines do not have voices`);
  const envName = `ELEVENLABS_${character}_VOICE_ID`;
  const voiceId = (process.env[envName] ?? "").trim();
  if (!voiceId) throw new Error(`Missing ${envName}`);
  return voiceId;
}

function voiceSettings(character: StoryLine["character"]) {
  if (character === "ROWAN") return { stability: 0.42, similarityBoost: 0.78, useSpeakerBoost: true, speed: 0.94 };
  if (character === "MARA") return { stability: 0.48, similarityBoost: 0.8, useSpeakerBoost: true, speed: 0.98 };
  if (character === "GARRICK") return { stability: 0.38, similarityBoost: 0.78, useSpeakerBoost: true, speed: 0.97 };
  if (character === "EDRIC") return { stability: 0.44, similarityBoost: 0.8, useSpeakerBoost: true, speed: 0.96 };
  return { stability: 0.5, similarityBoost: 0.76, useSpeakerBoost: true, speed: 0.96 };
}

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const status = (error as { statusCode?: number; status?: number })?.statusCode
        ?? (error as { status?: number })?.status;
      if (status && status >= 400 && status < 500 && status !== 429) throw error;
      if (attempt === 4) break;
      const delay = 750 * 2 ** (attempt - 1);
      console.warn(`[retry ${attempt}/3] ${label} in ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

async function generateLine(client: ElevenLabsClient, line: StoryLine): Promise<Buffer> {
  if (line.kind === "sfx") {
    const audio = await client.textToSoundEffects.convert({
      text: line.requestText,
      modelId: SFX_MODEL,
      outputFormat: OUTPUT_FORMAT,
      durationSeconds: line.durationSeconds,
      promptInfluence: 0.82,
      loop: false,
    });
    return streamToBuffer(audio as ReadableStream<Uint8Array>);
  }

  if (line.kind === "music") {
    const audio = await client.music.compose({
      prompt: line.requestText,
      musicLengthMs: Math.round((line.durationSeconds ?? 12) * 1000),
      modelId: MUSIC_MODEL,
      outputFormat: MUSIC_OUTPUT_FORMAT,
      forceInstrumental: true,
    });
    return streamToBuffer(audio as ReadableStream<Uint8Array>);
  }

  const audio = await client.textToSpeech.convert(voiceIdFor(line.character), {
    text: line.requestText,
    modelId: TTS_MODEL,
    outputFormat: OUTPUT_FORMAT,
    voiceSettings: voiceSettings(line.character),
  });
  return streamToBuffer(audio as ReadableStream<Uint8Array>);
}

async function runPool<T>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<void>): Promise<void> {
  let cursor = 0;
  async function runWorker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => runWorker()));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const apiKey = (process.env.ELEVENLABS_API_KEY ?? "").trim();
  if (!apiKey) throw new Error("Missing ELEVENLABS_API_KEY");

  const html = fs.readFileSync(storyFile, "utf8");
  const allLines = parseStoryLines(html);
  let selected = allLines;
  if (options.kindFilter) selected = selected.filter((line) => line.kind === options.kindFilter);
  if (options.lineFilter) selected = selected.filter((line) => line.id.includes(options.lineFilter!));
  if (options.nodeFilter) selected = selected.filter((line) => line.nodeTitle.toLowerCase().includes(options.nodeFilter!.toLowerCase()));
  if (!selected.length) throw new Error("No story audio lines matched the supplied filters");

  const manifest = loadManifest();
  manifest.models = { speech: TTS_MODEL, sfx: SFX_MODEL, music: MUSIC_MODEL };
  const existingById = new Map(manifest.lines.map((line) => [line.id, line]));
  const reusableByFingerprint = new Map(
    manifest.lines
      .filter((line) => line.status === "ready" && line.audioPath && fs.existsSync(path.join(projectRoot, line.audioPath)))
      .map((line) => [line.fingerprint, line]),
  );
  let reusedCount = 0;
  if (!options.force) {
    for (const line of selected) {
      const existing = existingById.get(line.id);
      const existingIsCurrent = existing?.status === "ready"
        && existing.fingerprint === line.fingerprint
        && existing.audioPath
        && fs.existsSync(path.join(projectRoot, existing.audioPath));
      if (existingIsCurrent) continue;
      const reusable = reusableByFingerprint.get(line.fingerprint);
      if (!reusable?.audioPath) continue;
      existingById.set(line.id, {
        ...line,
        status: "ready",
        generation: 1,
        audioPath: reusable.audioPath,
        generatedAt: reusable.generatedAt,
      });
      reusedCount += 1;
    }
  }
  const speechCount = selected.filter((line) => line.kind === "speech").length;
  const sfxCount = selected.filter((line) => line.kind === "sfx").length;
  const musicCount = selected.filter((line) => line.kind === "music").length;
  const estimatedSpeechCredits = selected
    .filter((line) => line.kind === "speech")
    .reduce((sum, line) => sum + line.requestText.length, 0);
  const estimatedSfxCredits = selected
    .filter((line) => line.kind === "sfx")
    .reduce((sum, line) => sum + (line.durationSeconds ?? 3) * 40, 0);
  const estimatedMusicCredits = selected
    .filter((line) => line.kind === "music")
    .reduce((sum, line) => sum + (line.durationSeconds ?? 12) * 40, 0);
  console.log(JSON.stringify({
    total: selected.length,
    speech: speechCount,
    sfx: sfxCount,
    music: musicCount,
    estimatedCredits: Math.ceil(estimatedSpeechCredits + estimatedSfxCredits + estimatedMusicCredits),
    filters: { kind: options.kindFilter ?? null, line: options.lineFilter ?? null, node: options.nodeFilter ?? null },
  }, null, 2));
  if (options.dryRun) return;

  const client = new ElevenLabsClient({ apiKey });
  const subscription = await client.user.subscription.get();
  const remaining = subscription.characterLimit - subscription.characterCount;
  if (remaining < estimatedSpeechCredits + estimatedSfxCredits + estimatedMusicCredits) {
    throw new Error(`Estimated generation cost exceeds remaining credits (${remaining})`);
  }

  const pending = selected.filter((line) => {
    const existing = existingById.get(line.id);
    if (options.force || !existing || existing.status !== "ready" || existing.fingerprint !== line.fingerprint) return true;
    return !existing.audioPath || !fs.existsSync(path.join(projectRoot, existing.audioPath));
  });
  console.log(`[audio] ${pending.length} to generate, ${selected.length - pending.length} already current (${reusedCount} reused)`);

  await runPool(pending, options.concurrency, async (line, index) => {
    const old = existingById.get(line.id);
    const generation = (old?.generation ?? 0) + 1;
    const filename = `${line.id}-g${generation}.mp3`;
    const nodeDir = path.join(outputDir, line.nodeSlug);
    const diskPath = path.join(nodeDir, filename);
    const relativeAudioPath = path.relative(projectRoot, diskPath).split(path.sep).join("/");
    fs.mkdirSync(nodeDir, { recursive: true });

    console.log(`[${index + 1}/${pending.length}] ${line.id}`);
    try {
      const buffer = await withRetry(line.id, () => generateLine(client, line));
      if (buffer.length < 512) throw new Error("Generated audio was unexpectedly small");
      fs.writeFileSync(diskPath, buffer);
      const entry: ManifestEntry = {
        ...line,
        status: "ready",
        generation,
        audioPath: relativeAudioPath,
        generatedAt: new Date().toISOString(),
      };
      existingById.set(line.id, entry);
    } catch (error) {
      const entry: ManifestEntry = {
        ...line,
        status: "failed",
        generation,
        error: error instanceof Error ? error.message : String(error),
      };
      existingById.set(line.id, entry);
      console.error(`[failed] ${line.id}: ${entry.error}`);
    }
    manifest.lines = allLines.map((storyLine) => currentManifestEntry(storyLine, existingById));
    saveManifest(manifest);
  });

  manifest.lines = allLines.map((storyLine) => currentManifestEntry(storyLine, existingById));
  saveManifest(manifest);
  const ready = manifest.lines.filter((line) => line.status === "ready").length;
  const failed = manifest.lines.filter((line) => line.status === "failed").length;
  console.log(`[audio] complete: ${ready} ready, ${failed} failed, ${manifest.lines.length - ready - failed} pending`);
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
