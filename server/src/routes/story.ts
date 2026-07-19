import { Router } from "express";
import type { AppServices } from "../appContext.js";
import { getWorld } from "../story/worldRegistry.js";
import { applyPaceSample } from "../services/pace.js";

export function createStoryRouter(services: AppServices): Router {
  const router = Router();
  const { sessions, gemini, elevenLabs } = services;

  router.post("/sessions", async (req, res) => {
    try {
      const worldId =
        typeof req.body?.worldId === "string" ? req.body.worldId : undefined;
      const session = await sessions.createSession(worldId);
      res.status(201).json({
        session,
        openingDialogue: session.conversationHistory,
        meta: { mode: "ok" },
      });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  router.get("/sessions/:sessionId", async (req, res) => {
    const session = await sessions.getSession(req.params.sessionId!);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.json({ session });
  });

  router.post("/sessions/:sessionId/respond", async (req, res) => {
    const session = await sessions.getSession(req.params.sessionId!);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    if (!text) {
      res.status(400).json({ error: "text is required" });
      return;
    }

    try {
      const world = getWorld(session.worldId);
      const interpretation = await gemini.interpretPlayerResponse(
        world,
        session,
        text,
      );

      let updated = sessions.applyGeminiUpdate(
        session,
        text,
        interpretation.response,
      );
      updated = await sessions.save(updated);

      const speech = await elevenLabs.generateSpeech(
        interpretation.response.respondingCharacter,
        interpretation.response.dialogueText,
      );

      res.json({
        session: updated,
        playerInterpretation: interpretation.response.playerIntentSummary,
        establishedFacts: interpretation.response.establishedFacts,
        playerCommitments: interpretation.response.playerCommitments,
        characterStateUpdates: interpretation.response.characterStateUpdates,
        storyStateUpdates: interpretation.response.storyStateUpdates,
        dialogue: {
          character: interpretation.response.respondingCharacter,
          text: interpretation.response.dialogueText,
          audioUrl: speech.audioUrl,
        },
        paceChallenge: updated.paceChallenge,
        meta: {
          mode: interpretation.mode,
          repaired: interpretation.repaired,
          ttsError: speech.error ?? null,
          ttsCacheHit: speech.cacheHit,
        },
        debug: req.query.debug === "1" ? interpretation.response : undefined,
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post("/sessions/:sessionId/pace", async (req, res) => {
    const session = await sessions.getSession(req.params.sessionId!);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const paceSecondsPerKm = Number(req.body?.paceSecondsPerKm);
    const recordedAt =
      typeof req.body?.recordedAt === "string"
        ? req.body.recordedAt
        : new Date().toISOString();

    if (!Number.isFinite(paceSecondsPerKm) || paceSecondsPerKm <= 0) {
      res.status(400).json({ error: "paceSecondsPerKm must be a positive number" });
      return;
    }

    try {
      const evaluation = applyPaceSample(session, paceSecondsPerKm, recordedAt);
      let updated = evaluation.session;
      let reaction: {
        character: string;
        text: string;
        audioUrl: string | null;
        kind: "wow" | "none";
      } | null = null;
      let metaMode: "live" | "fallback" | null = null;

      if (evaluation.shouldTriggerWow) {
        const line = await gemini.generateContextualPaceLine(updated, {
          paceState: updated.currentPaceState,
          sustainedSeconds: evaluation.sustainedOutsideSeconds,
          respondingCharacter: "Mara",
        });
        metaMode = line.mode;
        updated = sessions.appendDialogue(
          updated,
          line.response.respondingCharacter,
          line.response.dialogueText,
          "wow_moment",
        );
        updated.wowMomentTriggered = true;
        const speech = await elevenLabs.generateSpeech(
          line.response.respondingCharacter,
          line.response.dialogueText,
        );
        reaction = {
          character: line.response.respondingCharacter,
          text: line.response.dialogueText,
          audioUrl: speech.audioUrl,
          kind: "wow",
        };
      }

      updated = await sessions.save(updated);

      res.json({
        session: updated,
        pace: {
          paceSecondsPerKm,
          medianPaceSecondsPerKm: evaluation.medianPaceSecondsPerKm,
          categorized: evaluation.categorized,
          currentPaceState: updated.currentPaceState,
          stateChanged: evaluation.stateChanged,
          sampleCount: evaluation.sampleCount,
          sustainedOutsideSeconds: evaluation.sustainedOutsideSeconds,
          wowMomentTriggered: updated.wowMomentTriggered,
        },
        reaction,
        meta: {
          mode: metaMode,
        },
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post("/sessions/:sessionId/reset", async (req, res) => {
    try {
      const existing = await sessions.getSession(req.params.sessionId!);
      if (!existing) {
        res.status(404).json({ error: "Session not found" });
        return;
      }
      const session = await sessions.resetSession(req.params.sessionId!);
      res.json({
        session,
        openingDialogue: session.conversationHistory,
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
