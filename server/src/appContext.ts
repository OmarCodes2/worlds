import type { SessionService } from "./story/sessionService.js";
import type { GeminiService } from "./services/gemini.js";
import type { ElevenLabsService } from "./services/elevenlabs.js";
import type { AudioCache } from "./services/audioCache.js";
import type { SessionRepository } from "./store/sessionRepository.js";

export type AppServices = {
  sessions: SessionService;
  gemini: GeminiService;
  elevenLabs: ElevenLabsService;
  audioCache: AudioCache;
  repo: SessionRepository;
};
