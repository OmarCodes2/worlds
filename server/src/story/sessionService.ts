import { v4 as uuidv4 } from "uuid";
import type {
  GeminiStoryResponse,
  StorySession,
  StoryWorld,
} from "../models/types.js";
import { getDefaultWorld, getWorld } from "./worldRegistry.js";
import type { SessionRepository } from "../store/sessionRepository.js";

const MAX_HISTORY = 24;
const MAX_MEMORIES_PER_CHARACTER = 8;

function nowIso(): string {
  return new Date().toISOString();
}

function uniquePush(list: string[], items: string[]): string[] {
  const set = new Set(list);
  for (const item of items) {
    const trimmed = item.trim();
    if (trimmed) set.add(trimmed);
  }
  return [...set];
}

export function createEmptySession(world: StoryWorld, sceneId?: string): StorySession {
  const scene =
    world.scenes.find((s) => s.id === (sceneId ?? world.defaultSceneId)) ??
    world.scenes[0];
  if (!scene) {
    throw new Error(`World ${world.id} has no scenes`);
  }

  const timestamp = nowIso();
  const conversationHistory = scene.openingDialogue.map((line) => ({
    speaker: line.speaker,
    text: line.text,
    timestamp,
  }));

  return {
    id: uuidv4(),
    worldId: world.id,
    currentScene: scene.id,
    storySummary: scene.summary,
    conversationHistory,
    playerResponses: [],
    establishedFacts: [...scene.initialFacts],
    playerCommitments: [],
    characterMemories: {},
    characterStates: {
      Mara: { attitude: "commanding", emotionalState: "focused" },
      Garrick: { attitude: "hostile_to_Edric", emotionalState: "grieving" },
      Edric: { attitude: "defensive", emotionalState: "afraid" },
    },
    storyState: { ...scene.initialStoryState },
    currentPaceState: "UNKNOWN",
    paceChallenge: null,
    paceSamples: [],
    recentPaceMedians: [],
    paceStateChangedAt: null,
    wowMomentTriggered: false,
    triggeredEvents: ["scene_started"],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export class SessionService {
  constructor(private readonly repo: SessionRepository) {}

  async createSession(worldId?: string): Promise<StorySession> {
    const world = worldId ? getWorld(worldId) : getDefaultWorld();
    const session = createEmptySession(world);
    return this.repo.create(session);
  }

  async getSession(id: string): Promise<StorySession | null> {
    return this.repo.get(id);
  }

  async resetSession(id: string): Promise<StorySession> {
    const existing = await this.repo.get(id);
    const worldId = existing?.worldId;
    const world = worldId ? getWorld(worldId) : getDefaultWorld();
    const fresh = createEmptySession(world);
    fresh.id = id;
    return this.repo.update(id, fresh);
  }

  applyGeminiUpdate(
    session: StorySession,
    playerText: string,
    gemini: GeminiStoryResponse,
  ): StorySession {
    const timestamp = nowIso();
    const next: StorySession = structuredClone(session);

    next.playerResponses.push({
      text: playerText,
      intentSummary: gemini.playerIntentSummary,
      timestamp,
    });

    next.establishedFacts = uniquePush(
      next.establishedFacts,
      gemini.establishedFacts,
    );
    next.playerCommitments = uniquePush(
      next.playerCommitments,
      gemini.playerCommitments,
    );

    for (const update of gemini.characterStateUpdates) {
      const name = update.character;
      const state = next.characterStates[name] ?? {};
      if (update.attitudeChange) state.attitude = update.attitudeChange;
      if (update.emotionalState) state.emotionalState = update.emotionalState;
      next.characterStates[name] = state;

      if (update.memory) {
        const memories = next.characterMemories[name] ?? [];
        memories.push(update.memory);
        next.characterMemories[name] = memories.slice(-MAX_MEMORIES_PER_CHARACTER);
      }
    }

    next.storyState = {
      ...next.storyState,
      ...gemini.storyStateUpdates,
    };
    next.storySummary = gemini.nextSceneSummary || next.storySummary;

    next.conversationHistory.push({
      speaker: gemini.respondingCharacter,
      text: gemini.dialogueText,
      timestamp,
    });
    if (next.conversationHistory.length > MAX_HISTORY) {
      next.conversationHistory = next.conversationHistory.slice(-MAX_HISTORY);
    }

    if (gemini.paceChallenge?.enabled) {
      next.paceChallenge = {
        active: true,
        targetMinSecondsPerKm:
          gemini.paceChallenge.targetMinSecondsPerKm ?? 380,
        targetMaxSecondsPerKm:
          gemini.paceChallenge.targetMaxSecondsPerKm ?? 405,
        requiredDurationSeconds:
          gemini.paceChallenge.requiredDurationSeconds ?? 60,
        narrativePurpose:
          gemini.paceChallenge.narrativePurpose ??
          "Stay with the group after the door decision.",
      };
      next.triggeredEvents = uniquePush(next.triggeredEvents, [
        "pace_challenge_started",
      ]);
    }

    next.updatedAt = timestamp;
    return next;
  }

  appendDialogue(
    session: StorySession,
    character: string,
    text: string,
    eventId?: string,
  ): StorySession {
    const next = structuredClone(session);
    const timestamp = nowIso();
    next.conversationHistory.push({ speaker: character, text, timestamp });
    if (next.conversationHistory.length > MAX_HISTORY) {
      next.conversationHistory = next.conversationHistory.slice(-MAX_HISTORY);
    }
    if (eventId) {
      next.triggeredEvents = uniquePush(next.triggeredEvents, [eventId]);
    }
    next.updatedAt = timestamp;
    return next;
  }

  async save(session: StorySession): Promise<StorySession> {
    return this.repo.update(session.id, session);
  }
}

/** Compact memory payload for Gemini — never unbounded raw history. */
export function buildMemoryContext(session: StorySession) {
  const recentTurns = session.conversationHistory.slice(-8);
  const characterMemories: Record<string, string[]> = {};
  for (const [name, memories] of Object.entries(session.characterMemories)) {
    characterMemories[name] = memories.slice(-5);
  }

  return {
    currentScene: session.currentScene,
    storySummary: session.storySummary,
    recentConversation: recentTurns,
    establishedFacts: session.establishedFacts,
    playerCommitments: session.playerCommitments,
    characterMemories,
    characterStates: session.characterStates,
    storyState: session.storyState,
    currentPaceState: session.currentPaceState,
    paceChallenge: session.paceChallenge,
    recentPlayerResponses: session.playerResponses.slice(-5).map((r) => ({
      text: r.text,
      intentSummary: r.intentSummary,
    })),
  };
}
