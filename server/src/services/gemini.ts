import { GoogleGenAI } from "@google/genai";
import { loadEnv } from "../config/env.js";
import type { StorySession, StoryWorld } from "../models/types.js";
import {
  contextualPaceLineJsonSchema,
  contextualPaceLineSchema,
  geminiStoryJsonSchema,
  geminiStoryResponseSchema,
  type ValidatedContextualPaceLine,
  type ValidatedGeminiStoryResponse,
} from "../models/schemas.js";
import {
  buildContextualPacePrompt,
  buildInterpretUserPrompt,
  buildSystemPrompt,
} from "../prompts/systemPrompt.js";

export type InterpretResult = {
  response: ValidatedGeminiStoryResponse;
  mode: "live" | "fallback";
  repaired: boolean;
};

export type ContextualLineResult = {
  response: ValidatedContextualPaceLine;
  mode: "live" | "fallback";
};

function fallbackInterpret(playerText: string): ValidatedGeminiStoryResponse {
  return {
    playerIntentSummary: `The player said: "${playerText.slice(0, 200)}". Intent could not be fully interpreted; continuing with a cautious rescue pace challenge.`,
    establishedFacts: [
      "Rowan gave an order at the locked storage door.",
    ],
    playerCommitments: [
      "Rowan accepted responsibility for what happens next at the door.",
    ],
    characterStateUpdates: [
      {
        character: "Mara",
        attitudeChange: "following_rowan",
        emotionalState: "urgent",
        memory: "Rowan made a call at the storage door.",
      },
    ],
    storyStateUpdates: {
      doorDecisionMade: true,
      awaitingPace: true,
    },
    nextSceneSummary:
      "The group acts on Rowan's call and must keep moving before the pursuit closes in.",
    respondingCharacter: "Mara",
    dialogueText: "On me. We move — stay close.",
    paceChallenge: {
      enabled: true,
      narrativePurpose: "Keep the group together after the door decision.",
      targetMinSecondsPerKm: 380,
      targetMaxSecondsPerKm: 405,
      requiredDurationSeconds: 60,
    },
    confidence: 0.2,
  };
}

function fallbackContextualLine(session: StorySession): ValidatedContextualPaceLine {
  const hasCommitments = session.playerCommitments.length > 0;
  return {
    respondingCharacter: "Mara",
    dialogueText: hasCommitments
      ? "Rowan, stay with them."
      : "They're gaining. Move.",
    confidence: 0.1,
  };
}

export class GeminiService {
  private client: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI | null {
    const env = loadEnv();
    if (!env.geminiAvailable) return null;
    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey: env.geminiApiKey });
    }
    return this.client;
  }

  async interpretPlayerResponse(
    world: StoryWorld,
    session: StorySession,
    playerText: string,
  ): Promise<InterpretResult> {
    const env = loadEnv();
    const client = this.getClient();
    if (!client || !env.geminiAvailable) {
      return { response: fallbackInterpret(playerText), mode: "fallback", repaired: false };
    }

    const system = buildSystemPrompt(world);
    const user = buildInterpretUserPrompt(world, session, playerText);

    try {
      const first = await this.generateJson(client, env.geminiModel, system, user, geminiStoryJsonSchema);
      const parsed = this.safeParseStory(first);
      if (parsed) {
        return { response: parsed, mode: "live", repaired: false };
      }

      const repairPrompt = `Your previous JSON was invalid or unsafe. Return corrected JSON only matching the schema. Previous output:\n${first}`;
      const second = await this.generateJson(
        client,
        env.geminiModel,
        system,
        repairPrompt,
        geminiStoryJsonSchema,
      );
      const repaired = this.safeParseStory(second);
      if (repaired) {
        return { response: repaired, mode: "live", repaired: true };
      }
    } catch (err) {
      console.warn("[gemini] interpret failed; using fallback:", (err as Error).message);
    }

    return { response: fallbackInterpret(playerText), mode: "fallback", repaired: false };
  }

  async generateContextualPaceLine(
    session: StorySession,
    options: {
      paceState: string;
      sustainedSeconds: number;
      respondingCharacter?: string;
    },
  ): Promise<ContextualLineResult> {
    const env = loadEnv();
    const client = this.getClient();
    if (!client || !env.geminiAvailable) {
      return { response: fallbackContextualLine(session), mode: "fallback" };
    }

    const worldPrompt = `You write short in-world dialogue for Worlds. Never return code, paths, or credentials. JSON only.`;
    const user = buildContextualPacePrompt(session, options);

    try {
      const text = await this.generateJson(
        client,
        env.geminiModel,
        worldPrompt,
        user,
        contextualPaceLineJsonSchema,
      );
      const parsed = contextualPaceLineSchema.safeParse(JSON.parse(text));
      if (parsed.success) {
        return { response: parsed.data, mode: "live" };
      }
    } catch (err) {
      console.warn("[gemini] contextual line failed; using fallback:", (err as Error).message);
    }

    return { response: fallbackContextualLine(session), mode: "fallback" };
  }

  private safeParseStory(text: string): ValidatedGeminiStoryResponse | null {
    try {
      const json = JSON.parse(text);
      const result = geminiStoryResponseSchema.safeParse(json);
      return result.success ? result.data : null;
    } catch {
      return null;
    }
  }

  private async generateJson(
    client: GoogleGenAI,
    model: string,
    system: string,
    user: string,
    schema: object,
  ): Promise<string> {
    const response = await client.models.generateContent({
      model,
      contents: user,
      config: {
        systemInstruction: system,
        responseMimeType: "application/json",
        responseJsonSchema: schema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty Gemini response");
    }
    return text;
  }
}

/** Exported for tests */
export const __testables = {
  fallbackInterpret,
  fallbackContextualLine,
};
