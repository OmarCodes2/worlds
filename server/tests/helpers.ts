import type { AppServices } from "../src/appContext.js";
import { createApp } from "../src/app.js";
import { SessionService } from "../src/story/sessionService.js";
import { InMemorySessionRepository } from "../src/store/sessionRepository.js";
import { AudioCache } from "../src/services/audioCache.js";
import type { StorySession, StoryWorld } from "../src/models/types.js";
import type {
  ContextualLineResult,
  InterpretResult,
} from "../src/services/gemini.js";
import type { SpeechResult } from "../src/services/elevenlabs.js";
import type { ValidatedGeminiStoryResponse } from "../src/models/schemas.js";
import path from "node:path";
import os from "node:os";

export function mockGeminiResponse(
  overrides: Partial<ValidatedGeminiStoryResponse> = {},
): ValidatedGeminiStoryResponse {
  return {
    playerIntentSummary:
      "The player chose to rescue the civilians but does not trust Edric.",
    establishedFacts: [
      "Rowan ordered the storage door opened.",
      "Rowan wants Edric kept away from the door.",
    ],
    playerCommitments: [
      "Protect the civilians behind the door.",
      "Do not let Edric control the rescue.",
    ],
    characterStateUpdates: [
      {
        character: "Mara",
        attitudeChange: "aligned_with_rowan",
        emotionalState: "urgent",
        memory: "Rowan told me to open the door and keep Edric back.",
      },
      {
        character: "Garrick",
        attitudeChange: "watch_edric",
        memory: "Rowan wants me to hold Edric.",
      },
    ],
    storyStateUpdates: {
      doorStatus: "opening",
      edricRestrained: true,
      civiliansRescued: true,
    },
    nextSceneSummary:
      "The door is opened; Rowan must stay with the civilians while Garrick holds Edric.",
    respondingCharacter: "Mara",
    dialogueText: "Garrick, hold Edric. Rowan wants that door open.",
    paceChallenge: {
      enabled: true,
      narrativePurpose: "Stay with the civilians at the rear.",
      targetMinSecondsPerKm: 380,
      targetMaxSecondsPerKm: 405,
      requiredDurationSeconds: 60,
    },
    confidence: 0.9,
    ...overrides,
  };
}

export class MockGeminiService {
  interpretImpl?: (
    world: StoryWorld,
    session: StorySession,
    text: string,
  ) => Promise<InterpretResult>;
  contextualImpl?: (
    session: StorySession,
    options: {
      paceState: string;
      sustainedSeconds: number;
      respondingCharacter?: string;
    },
  ) => Promise<ContextualLineResult>;

  interpretCalls: Array<{ text: string; sessionId: string }> = [];
  contextualCalls = 0;

  async interpretPlayerResponse(
    world: StoryWorld,
    session: StorySession,
    playerText: string,
  ): Promise<InterpretResult> {
    this.interpretCalls.push({ text: playerText, sessionId: session.id });
    if (this.interpretImpl) {
      return this.interpretImpl(world, session, playerText);
    }
    return {
      response: mockGeminiResponse(),
      mode: "live",
      repaired: false,
    };
  }

  async generateContextualPaceLine(
    session: StorySession,
    options: {
      paceState: string;
      sustainedSeconds: number;
      respondingCharacter?: string;
    },
  ): Promise<ContextualLineResult> {
    this.contextualCalls += 1;
    if (this.contextualImpl) {
      return this.contextualImpl(session, options);
    }
    return {
      response: {
        respondingCharacter: "Mara",
        dialogueText:
          "Rowan, you were the one who told me to open that door. Don't leave them behind now.",
        confidence: 0.85,
      },
      mode: "live",
    };
  }
}

export class MockElevenLabsService {
  calls: Array<{ character: string; text: string }> = [];
  fail = false;

  async generateSpeech(character: string, text: string): Promise<SpeechResult> {
    this.calls.push({ character, text });
    if (this.fail) {
      return {
        character,
        text,
        audioUrl: null,
        cacheHit: false,
        error: "mocked failure",
      };
    }
    return {
      character,
      text,
      audioUrl: `/api/audio/${"a".repeat(64)}`,
      cacheHit: false,
      fileId: "a".repeat(64),
    };
  }
}

export function createTestApp(options?: {
  gemini?: MockGeminiService;
  elevenLabs?: MockElevenLabsService;
}) {
  const repo = new InMemorySessionRepository();
  const gemini = options?.gemini ?? new MockGeminiService();
  const elevenLabs = options?.elevenLabs ?? new MockElevenLabsService();
  const audioCache = new AudioCache(
    path.join(os.tmpdir(), `worlds-audio-test-${Date.now()}`),
  );

  const services: AppServices = {
    repo,
    sessions: new SessionService(repo),
    gemini: gemini as unknown as AppServices["gemini"],
    elevenLabs: elevenLabs as unknown as AppServices["elevenLabs"],
    audioCache,
  };

  return {
    app: createApp(services),
    services,
    gemini,
    elevenLabs,
    repo,
  };
}
