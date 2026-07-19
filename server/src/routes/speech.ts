import { Router } from "express";
import type { AppServices } from "../appContext.js";

export function createSpeechRouter(services: AppServices): Router {
  const router = Router();

  router.post("/generate", async (req, res) => {
    const character =
      typeof req.body?.character === "string" ? req.body.character : "";
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";

    if (!character || !text) {
      res.status(400).json({ error: "character and text are required" });
      return;
    }

    const result = await services.elevenLabs.generateSpeech(character, text);
    res.json({
      character: result.character,
      text: result.text,
      audioUrl: result.audioUrl,
      cacheHit: result.cacheHit,
      error: result.error ?? null,
    });
  });

  return router;
}
