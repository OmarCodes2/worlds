import { Router } from "express";
import type { AppServices } from "../appContext.js";

export function createAudioRouter(services: AppServices): Router {
  const router = Router();

  router.get("/:fileId", async (req, res) => {
    const fileId = req.params.fileId!;
    if (!/^[a-f0-9]{64}$/i.test(fileId)) {
      res.status(400).json({ error: "Invalid file id" });
      return;
    }

    const buffer = await services.audioCache.get(fileId);
    if (!buffer) {
      res.status(404).json({ error: "Audio not found" });
      return;
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.send(buffer);
  });

  return router;
}
