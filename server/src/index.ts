import { createApp } from "./app.js";
import { loadEnv, logMissingEnv } from "./config/env.js";
import { SessionService } from "./story/sessionService.js";
import { InMemorySessionRepository } from "./store/sessionRepository.js";
import { GeminiService } from "./services/gemini.js";
import { ElevenLabsService } from "./services/elevenlabs.js";
import { AudioCache } from "./services/audioCache.js";

const env = loadEnv();
logMissingEnv(env);

const repo = new InMemorySessionRepository();
const services = {
  repo,
  sessions: new SessionService(repo),
  gemini: new GeminiService(),
  elevenLabs: new ElevenLabsService(),
  audioCache: new AudioCache(),
};

const app = createApp(services);

app.listen(env.port, () => {
  console.log(`[server] Worlds story API listening on http://localhost:${env.port}`);
  console.log(
    `[server] Gemini: ${env.geminiAvailable ? "live" : "fallback"} | ElevenLabs: ${env.elevenLabsAvailable ? "live" : "fallback"}`,
  );
});
