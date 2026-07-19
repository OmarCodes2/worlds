import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { GoogleGenAI } from "@google/genai";
import type {
  FreestyleBeat,
  FreestyleDirector,
  GeneratedSpeechSynthesizer,
  RunRecord,
  VocalOption,
} from "./types.js";

const CHARACTERS = ["Mara", "Garrick", "Edric", "Narrator"] as const;
const INTERACTIONS = ["direction", "pace", "vocal"] as const;
const TTS_MODEL = "eleven_v3";
const TTS_TIMEOUT_MS = 20_000;

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function optionId(value: unknown, fallback: string): string {
  const cleaned = cleanText(value, 60)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || fallback;
}

function fallbackBeat(run: RunRecord, choiceLabel: string): FreestyleBeat {
  const turn = run.freestyleTurn ?? 0;
  const interaction = INTERACTIONS[turn % INTERACTIONS.length];
  const sparedEdric = run.history.some((entry) => entry.result === "keep_edric_alive");
  const garrickIsCutOff = run.history.some((entry) => entry.nodeId === "garrick_cut_off");

  const reactions = sparedEdric
    ? [
        { speaker: "Mara" as const, emotion: "wary relief", text: `“${choiceLabel}. Then we keep him close. I hope you were right.”` },
        garrickIsCutOff
          ? { speaker: "Narrator" as const, emotion: "tense", text: "The gate seals Garrick's voice on the far side." }
          : { speaker: "Garrick" as const, emotion: "restrained anger", text: "“I am watching him.”" },
      ]
    : [
        { speaker: "Mara" as const, emotion: "controlled anger", text: `“${choiceLabel}. Now carry that decision with you.”` },
        garrickIsCutOff
          ? { speaker: "Narrator" as const, emotion: "tense", text: "Garrick's blows fade behind the sealed gate." }
          : { speaker: "Garrick" as const, emotion: "hollow resolve", text: "“The vault is still ahead.”" },
      ];

  if (interaction === "direction") {
    return {
      title: "Below the Lantern Vault",
      label: "Choose the passage",
      objective: "Take the low arch on the left or the bell stair on the right.",
      summary: `The group carries the consequence of ${choiceLabel} into a fork beneath the Lantern Vault.`,
      interaction,
      lines: [
        ...reactions,
        { speaker: "Mara", emotion: "urgent focus", text: "Low arch to the left. Bell stair to the right. Choose before they reach us." },
      ],
    };
  }

  if (interaction === "pace") {
    return {
      title: "The Falling Gate",
      label: "Reach the gate",
      objective: "Keep the gate within reach.",
      summary: `The choice ${choiceLabel} brings the group to a falling iron gate.`,
      interaction,
      lines: [
        ...reactions,
        garrickIsCutOff
          ? { speaker: "Mara", emotion: "sharp urgency", text: "The gate is dropping. Stay with me." }
          : { speaker: "Garrick", emotion: "sharp urgency", text: "The gate is dropping. Stay with me." },
      ],
    };
  }

  const vocalOptions: VocalOption[] = [
    { id: "open_the_seal", label: "Open the seal", aliases: ["open it", "break the seal", "use the key"] },
    { id: "bar_the_door", label: "Bar the door", aliases: ["bar it", "hold the door", "wait"] },
  ];
  return {
    title: "The First Seal",
    label: "Answer Mara",
    objective: "Tell Mara whether to open the seal or bar the door.",
    summary: `The group reaches the first seal after ${choiceLabel}.`,
    interaction,
    lines: [
      ...reactions,
      { speaker: "Mara", emotion: "guarded urgency", text: "The seal is moving. Do we open it, or bar the door?" },
    ],
    vocalOptions,
  };
}

function normalizeBeat(value: unknown, fallback: FreestyleBeat): FreestyleBeat {
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Record<string, unknown>;
  const interaction = INTERACTIONS.includes(raw.interaction as typeof INTERACTIONS[number])
    ? raw.interaction as FreestyleBeat["interaction"]
    : fallback.interaction;
  const rawLines = Array.isArray(raw.lines) ? raw.lines : [];
  const lines = rawLines.slice(0, 4).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const line = item as Record<string, unknown>;
    const speaker = CHARACTERS.includes(line.speaker as typeof CHARACTERS[number])
      ? line.speaker as typeof CHARACTERS[number]
      : null;
    const emotion = cleanText(line.emotion, 40).replace(/[\[\]{}<>]/g, "");
    const text = cleanText(line.text, 320);
    return speaker && emotion && text ? [{ speaker, emotion, text }] : [];
  });
  if (lines.length < 2) return fallback;

  let vocalOptions: VocalOption[] | undefined;
  if (interaction === "vocal") {
    const rawOptions = Array.isArray(raw.vocalOptions) ? raw.vocalOptions : [];
    vocalOptions = rawOptions.slice(0, 2).flatMap((item, index) => {
      if (!item || typeof item !== "object") return [];
      const option = item as Record<string, unknown>;
      const label = cleanText(option.label, 100);
      if (!label) return [];
      const aliases = Array.isArray(option.aliases)
        ? option.aliases.map((alias) => cleanText(alias, 100)).filter(Boolean).slice(0, 8)
        : [];
      return [{ id: optionId(option.id, `choice_${index + 1}`), label, aliases: [label, ...aliases] }];
    });
    if (vocalOptions.length !== 2) return fallback;
  }

  return {
    title: cleanText(raw.title, 100) || fallback.title,
    label: cleanText(raw.label, 80) || fallback.label,
    objective: cleanText(raw.objective, 180) || fallback.objective,
    summary: cleanText(raw.summary, 500) || fallback.summary,
    interaction,
    lines,
    vocalOptions,
  };
}

export class GeminiFreestyleDirector implements FreestyleDirector {
  private readonly client: GoogleGenAI | null;
  private modelCandidates: string[];

  constructor(apiKey: string | undefined, model = "gemini-2.5-flash") {
    this.client = apiKey ? new GoogleGenAI({ apiKey }) : null;
    this.modelCandidates = [...new Set([model, "gemini-3.5-flash"] )];
  }

  async generate({ run, choice }: Parameters<FreestyleDirector["generate"]>[0]): Promise<FreestyleBeat> {
    const fallback = fallbackBeat(run, choice.label);
    if (!this.client) return fallback;

    const prompt = `You are the live game director for Greywatch, a premium authored audio-first running story.

Canon and character boundaries:
- The group is beneath Greywatch Castle during an enemy siege, trying to reach the Lantern Vault.
- Mara is a steady injured commander: protective, direct, calm urgency.
- Garrick is Rowan's blunt, grieving friend, angry about his brother Tomas and suspicious of Edric.
- Edric is frightened and defensive; he claims he opened the eastern gate to save civilians. Keep his motives ambiguous.
- Rowan is the runner and player character. Never write Rowan's dialogue or decide Rowan's beliefs.
- Do not invent plot-critical lore, new factions, magical systems, or a new mission. Extend this immediate escape only.
- Treat every stored choice as binding canon. If let_garrick_kill_edric appears, Edric is dead and can never speak or act again. If keep_edric_alive appears, he remains alive.
- If garrick_cut_off appears as a node, Garrick is behind the gate and cannot speak in the current beat. Never resurrect or silently reunite separated characters.

The authored four-choice demo is complete. The player's latest choice was:
${JSON.stringify(choice)}

Run memory:
${JSON.stringify({
      authoredAndFreestyleChoices: run.history.slice(-12),
      freestyleSummary: run.freestyleSummary ?? "The authored demo has just ended.",
      characterEmotions: run.characterEmotions ?? {},
      targetPaceSecondsPerKm: run.targetPaceSeconds,
      freestyleTurn: run.freestyleTurn ?? 0,
    }, null, 2)}

Write the next short playable beat. Characters must react specifically to the latest choice and may disagree. Select their current emotions and write 2-4 short speakable lines. The final line must naturally establish exactly one next interaction.

Allowed next interactions:
- direction: dialogue must name a physical left route and right route; objective confirms them.
- pace: dialogue creates an in-world need to change or hold pace; never sound like a fitness coach.
- vocal: a character asks Rowan a direct question; provide exactly two concise interpretation options for speech classification.

The UI will never say AI or generated. Keep the tone tense, grounded, and immediate. No speeches, menus, scores, tutorials, or exclamation marks. Return structured JSON only.`;

    let lastError: unknown;
    for (const model of this.modelCandidates) {
      try {
        const response = await this.client.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: 0.75,
            responseMimeType: "application/json",
            responseJsonSchema: {
              type: "object",
              additionalProperties: false,
              properties: {
                title: { type: "string" },
                label: { type: "string" },
                objective: { type: "string" },
                summary: { type: "string" },
                interaction: { type: "string", enum: [...INTERACTIONS] },
                lines: {
                  type: "array",
                  minItems: 2,
                  maxItems: 4,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      speaker: { type: "string", enum: [...CHARACTERS] },
                      emotion: { type: "string" },
                      text: { type: "string" },
                    },
                    required: ["speaker", "emotion", "text"],
                  },
                },
                vocalOptions: {
                  type: "array",
                  maxItems: 2,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      id: { type: "string" },
                      label: { type: "string" },
                      aliases: { type: "array", items: { type: "string" } },
                    },
                    required: ["id", "label", "aliases"],
                  },
                },
              },
              required: ["title", "label", "objective", "summary", "interaction", "lines"],
            },
          },
        });
        if (!response.text) throw new Error("Gemini returned no freestyle beat");
        const beat = normalizeBeat(JSON.parse(response.text), fallback);
        this.modelCandidates = [model, ...this.modelCandidates.filter((candidate) => candidate !== model)];
        return beat;
      } catch (error) {
        lastError = error;
      }
    }

    console.warn(`[gemini] freestyle generation failed: ${(lastError as Error)?.message ?? String(lastError)}`);
    return fallback;
  }
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

export class ElevenLabsGeneratedSpeechSynthesizer implements GeneratedSpeechSynthesizer {
  private readonly client: ElevenLabsClient | null;

  constructor(
    apiKey: string | undefined,
    private readonly voiceIds: Partial<Record<"Mara" | "Garrick" | "Edric" | "Narrator", string>>,
  ) {
    this.client = apiKey ? new ElevenLabsClient({ apiKey }) : null;
  }

  async synthesize({ speaker, emotion, text }: Parameters<GeneratedSpeechSynthesizer["synthesize"]>[0]): Promise<Buffer | null> {
    const voiceId = this.voiceIds[speaker]?.trim();
    if (!this.client || !voiceId) return null;
    const safeEmotion = emotion.replace(/[^a-zA-Z ,'-]/g, "").slice(0, 40) || "tense";
    try {
      const speech = this.client.textToSpeech.convert(voiceId, {
        text: `[${safeEmotion}] ${text}`,
        modelId: TTS_MODEL,
        outputFormat: "mp3_44100_128",
      });
      const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("ElevenLabs freestyle speech timed out")), TTS_TIMEOUT_MS);
      });
      return await streamToBuffer(await Promise.race([speech, timeout]) as ReadableStream<Uint8Array>);
    } catch (error) {
      console.warn(`[elevenlabs] freestyle speech failed for ${speaker}: ${(error as Error).message}`);
      return null;
    }
  }
}
