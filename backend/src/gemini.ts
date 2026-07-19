import { GoogleGenAI } from "@google/genai";
import type { StoryNode, VocalClassification, VocalClassifier, VocalOption } from "./types.js";

function keywordFallback(transcript: string, options: VocalOption[]): VocalClassification {
  const normalized = transcript.toLowerCase();
  const scored = options.map((option) => ({
    option,
    score: option.aliases.reduce((score, alias) => score + (normalized.includes(alias.toLowerCase()) ? 1 : 0), 0),
  })).sort((a, b) => b.score - a.score);
  return {
    choiceId: scored[0]?.option.id ?? options[0].id,
    transcript,
    confidence: scored[0]?.score ? Math.min(0.9, 0.55 + scored[0].score * 0.15) : 0.25,
    mode: "fallback",
  };
}

export class GeminiVocalClassifier implements VocalClassifier {
  private client: GoogleGenAI | null;
  private modelCandidates: string[];

  constructor(apiKey: string | undefined, model = "gemini-2.5-flash") {
    this.client = apiKey ? new GoogleGenAI({ apiKey }) : null;
    this.modelCandidates = [...new Set([model, "gemini-3.5-flash"])];
  }

  async classify(args: {
    node: StoryNode;
    transcript: string;
  }): Promise<VocalClassification> {
    const options = args.node.vocalOptions ?? [];
    if (!options.length) throw new Error("The current node has no vocal choices");
    if (!this.client) return keywordFallback(args.transcript, options);

    const optionDescription = options.map((option) => `${option.id}: ${option.label}`).join("\n");
    const prompt = [
      "You are the voice decision interpreter for an authored running story.",
      `The runner is answering: ${args.node.objective}`,
      "Select exactly one allowed choice ID from the runner's transcript.",
      "Resolve paraphrases by meaning. Never invent a choice. If ambiguous, choose the closest option and lower confidence.",
      `Allowed choices:\n${optionDescription}`,
      `Runner transcript: ${args.transcript}`,
    ].join("\n\n");

    let lastError: unknown;
    for (const model of this.modelCandidates) {
      try {
        const response = await this.client.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: 0.1,
            responseMimeType: "application/json",
            responseJsonSchema: {
              type: "object",
              additionalProperties: false,
              properties: {
                choiceId: { type: "string", enum: options.map((option) => option.id) },
                transcript: { type: "string" },
                confidence: { type: "number", minimum: 0, maximum: 1 },
              },
              required: ["choiceId", "transcript", "confidence"],
            },
          },
        });
        if (!response.text) throw new Error("Gemini returned no classification");
        const parsed = JSON.parse(response.text) as Omit<VocalClassification, "mode">;
        if (!options.some((option) => option.id === parsed.choiceId)) throw new Error("Gemini returned an unknown choice");
        this.modelCandidates = [model, ...this.modelCandidates.filter((candidate) => candidate !== model)];
        return { ...parsed, mode: "gemini" };
      } catch (error) {
        lastError = error;
      }
    }
    console.warn(`[gemini] vocal classification failed: ${(lastError as Error)?.message ?? String(lastError)}`);
    return keywordFallback(args.transcript, options);
  }
}
