import express from "express";
import cors from "cors";
import { loadEnv } from "./config/env.js";
import type { AppServices } from "./appContext.js";
import { createStoryRouter } from "./routes/story.js";
import { createSpeechRouter } from "./routes/speech.js";
import { createAudioRouter } from "./routes/audio.js";

export function createApp(services: AppServices) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    const env = loadEnv();
    res.json({
      ok: true,
      geminiAvailable: env.geminiAvailable,
      elevenLabsAvailable: env.elevenLabsAvailable,
      missingEnvNames: env.missingEnvNames,
    });
  });

  app.use("/api/story", createStoryRouter(services));
  app.use("/api/speech", createSpeechRouter(services));
  app.use("/api/audio", createAudioRouter(services));

  return app;
}
