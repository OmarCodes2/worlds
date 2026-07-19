export type PaceState = "TOO_FAST" | "IN_RANGE" | "TOO_SLOW" | "UNKNOWN";

export type ConversationTurn = {
  speaker: string;
  text: string;
  timestamp: string;
};

export type PlayerResponseRecord = {
  text: string;
  intentSummary: string;
  timestamp: string;
};

export type CharacterState = {
  attitude?: string;
  emotionalState?: string;
};

export type PaceChallenge = {
  active: boolean;
  targetMinSecondsPerKm?: number;
  targetMaxSecondsPerKm?: number;
  requiredDurationSeconds?: number;
  narrativePurpose?: string;
};

export type PaceSample = {
  paceSecondsPerKm: number;
  recordedAt: string;
};

export type StorySession = {
  id: string;
  worldId: string;
  currentScene: string;
  storySummary: string;
  conversationHistory: ConversationTurn[];
  playerResponses: PlayerResponseRecord[];
  establishedFacts: string[];
  playerCommitments: string[];
  characterMemories: Record<string, string[]>;
  characterStates: Record<string, CharacterState>;
  storyState: Record<string, string | number | boolean | null>;
  currentPaceState: PaceState;
  paceChallenge: PaceChallenge | null;
  paceSamples: PaceSample[];
  recentPaceMedians: PaceState[];
  paceStateChangedAt: string | null;
  wowMomentTriggered: boolean;
  triggeredEvents: string[];
  createdAt: string;
  updatedAt: string;
};

export type CharacterStateUpdate = {
  character: string;
  attitudeChange?: string;
  emotionalState?: string;
  memory?: string;
};

export type GeminiPaceChallenge = {
  enabled: boolean;
  narrativePurpose?: string;
  targetMinSecondsPerKm?: number;
  targetMaxSecondsPerKm?: number;
  requiredDurationSeconds?: number;
};

export type GeminiStoryResponse = {
  playerIntentSummary: string;
  establishedFacts: string[];
  playerCommitments: string[];
  characterStateUpdates: CharacterStateUpdate[];
  storyStateUpdates: Record<string, string | number | boolean | null>;
  nextSceneSummary: string;
  respondingCharacter: string;
  dialogueText: string;
  paceChallenge?: GeminiPaceChallenge;
  confidence: number;
};

export type DialoguePayload = {
  character: string;
  text: string;
  audioUrl: string | null;
};

export type StoryWorldCharacter = {
  id: string;
  displayName: string;
  role: string;
  personality: string;
  motivation: string;
  relationships: string;
  voiceNotes: string;
};

export type OpeningLine = {
  speaker: string;
  text: string;
};

export type StoryScene = {
  id: string;
  title: string;
  summary: string;
  stakes: string;
  openingDialogue: OpeningLine[];
  initialStoryState: Record<string, string | number | boolean | null>;
  initialFacts: string[];
  defaultPaceChallenge: Omit<PaceChallenge, "active"> & { active?: boolean };
};

export type StoryWorld = {
  id: string;
  title: string;
  setting: string;
  tone: string;
  synopsis: string;
  characters: StoryWorldCharacter[];
  scenes: StoryScene[];
  defaultSceneId: string;
};
