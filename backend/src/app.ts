import crypto from "node:crypto";
import cors from "cors";
import express, { type Request } from "express";
import multer from "multer";
import { audioRoot, loadStory, nodeById } from "./story.js";
import type {
  FreestyleChoice,
  FreestyleDirector,
  GeneratedSpeechSynthesizer,
  RunRecord,
  SpeechTranscriber,
  StoryDefinition,
  StoryNode,
  VocalClassifier,
} from "./types.js";

type Dependencies = {
  vocalClassifier: VocalClassifier;
  speechTranscriber?: SpeechTranscriber;
  freestyleDirector?: FreestyleDirector;
  generatedSpeech?: GeneratedSpeechSynthesizer;
};

function requestBaseUrl(req: Request): string {
  return `${req.protocol}://${req.get("host")}`;
}

function asNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function createApp({ vocalClassifier, speechTranscriber, freestyleDirector, generatedSpeech }: Dependencies) {
  const app = express();
  const runs = new Map<string, RunRecord>();
  const freestyleNodes = new Map<string, Map<string, StoryNode>>();
  const generatedAudio = new Map<string, Buffer>();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  });

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use("/audio", express.static(audioRoot, { fallthrough: false, maxAge: "1h" }));

  function currentNode(story: StoryDefinition, run: RunRecord): StoryNode | undefined {
    return nodeById(story, run.currentNodeId) ?? freestyleNodes.get(run.id)?.get(run.currentNodeId);
  }

  async function continueFreestyle(baseUrl: string, run: RunRecord, choice: FreestyleChoice): Promise<StoryNode | null> {
    if (!freestyleDirector) return null;
    const beat = await freestyleDirector.generate({ run, choice });
    const turn = (run.freestyleTurn ?? 0) + 1;
    const nodeId = `freestyle-${turn}-${crypto.randomUUID().slice(0, 8)}`;
    const renderedLines = await Promise.all(beat.lines.map(async (line, index) => {
      const audio = await generatedSpeech?.synthesize(line) ?? null;
      let audioUrl: string | undefined;
      if (audio?.length) {
        const audioId = crypto.randomUUID();
        generatedAudio.set(audioId, audio);
        audioUrl = `${baseUrl}/api/generated-audio/${audioId}`;
      }
      return {
        id: `${nodeId}-line-${index + 1}`,
        index: index + 1,
        speaker: line.speaker,
        kind: "speech" as const,
        text: line.text,
        emotion: line.emotion,
        audioUrl,
      };
    }));
    const nextNode: StoryNode = {
      id: nodeId,
      title: beat.title,
      label: beat.label,
      objective: beat.objective,
      interaction: beat.interaction,
      lines: renderedLines,
      vocalOptions: beat.interaction === "vocal" ? beat.vocalOptions : undefined,
      generated: true,
    };
    const nodesForRun = freestyleNodes.get(run.id) ?? new Map<string, StoryNode>();
    nodesForRun.set(nodeId, nextNode);
    freestyleNodes.set(run.id, nodesForRun);
    run.mode = "freestyle";
    run.freestyleTurn = turn;
    run.freestyleSummary = beat.summary;
    run.characterEmotions = {
      ...(run.characterEmotions ?? {}),
      ...Object.fromEntries(beat.lines.map((line) => [line.speaker, line.emotion])),
    };
    run.currentNodeId = nodeId;
    run.completed = false;
    run.updatedAt = new Date().toISOString();
    return nextNode;
  }

  app.get("/api/generated-audio/:audioId", (req, res) => {
    const audio = generatedAudio.get(req.params.audioId);
    if (!audio) return void res.status(404).json({ error: "Generated audio not found" });
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(audio);
  });

  app.get("/api/health", (req, res) => {
    const story = loadStory(requestBaseUrl(req));
    const audioLines = story.nodes.reduce((sum, node) => sum + node.lines.length, 0);
    res.json({ ok: true, service: "worlds-backend", storyId: story.id, nodes: story.nodes.length, audioLines });
  });

  app.get("/api/stories", (req, res) => {
    res.json({
      mainStoryId: "greywatch",
      stories: [
        { id: "greywatch", title: "Greywatch", subtitle: "Blood in the Chapel", playable: true },
        { id: "north-road", title: "The North Road", subtitle: "A kingdom at dusk", playable: false },
        { id: "signal-lost", title: "Signal Lost", subtitle: "Deep-space survival", playable: false },
        { id: "blackwater", title: "Blackwater", subtitle: "Coastal mystery", playable: false },
      ],
    });
  });

  app.get("/api/stories/greywatch", (req, res) => {
    res.json(loadStory(requestBaseUrl(req)));
  });

  app.post("/api/transcriptions", upload.single("audio"), async (req, res) => {
    if (!speechTranscriber) return void res.status(503).json({ error: "Speech transcription is not configured" });
    if (!req.file?.buffer.length) return void res.status(400).json({ error: "Provide a non-empty audio recording" });
    try {
      const transcript = await speechTranscriber.transcribe({
        audio: req.file.buffer,
        mimeType: req.file.mimetype || "audio/mp4",
        fileName: req.file.originalname || "answer.m4a",
      });
      res.json({ transcript, provider: "elevenlabs", model: "scribe_v2" });
    } catch (error) {
      res.status(502).json({ error: (error as Error).message });
    }
  });

  app.post("/api/runs", (req, res) => {
    const targetPaceSeconds = asNumber(req.body?.targetPaceSeconds);
    if (targetPaceSeconds === null || targetPaceSeconds < 180 || targetPaceSeconds > 900) {
      res.status(400).json({ error: "targetPaceSeconds must be between 180 and 900" });
      return;
    }
    const story = loadStory(requestBaseUrl(req));
    const now = new Date().toISOString();
    const run: RunRecord = {
      id: crypto.randomUUID(),
      storyId: story.id,
      targetPaceSeconds,
      currentNodeId: story.startNodeId,
      history: [],
      completed: false,
      mode: "authored",
      freestyleTurn: 0,
      characterEmotions: {
        Mara: "focused",
        Garrick: "grieving",
        Edric: "afraid",
      },
      createdAt: now,
      updatedAt: now,
    };
    runs.set(run.id, run);
    res.status(201).json(run);
  });

  app.get("/api/runs/:runId", (req, res) => {
    const run = runs.get(req.params.runId);
    if (!run) return void res.status(404).json({ error: "Run not found" });
    res.json(run);
  });

  app.post("/api/runs/:runId/resolve", async (req, res) => {
    const run = runs.get(req.params.runId);
    if (!run) return void res.status(404).json({ error: "Run not found" });
    const story = loadStory(requestBaseUrl(req));
    const node = currentNode(story, run);
    if (!node) return void res.status(500).json({ error: "Current story node is missing" });

    let nextNodeId: string | undefined;
    let result: string;
    if (node.interaction === "direction") {
      const direction = req.body?.direction;
      if (direction !== "left" && direction !== "right") return void res.status(400).json({ error: "direction must be left or right" });
      nextNodeId = direction === "left" ? node.leftTarget : node.rightTarget;
      result = direction;
    } else if (node.interaction === "pace") {
      const currentPaceSeconds = asNumber(req.body?.currentPaceSeconds);
      if (currentPaceSeconds === null) return void res.status(400).json({ error: "currentPaceSeconds is required" });
      const delta = currentPaceSeconds - run.targetPaceSeconds;
      const paceState = delta < -story.paceToleranceSeconds ? "faster" : Math.abs(delta) <= story.paceToleranceSeconds ? "held" : "missed";
      nextNodeId = paceState === "missed" ? node.failureTarget : node.successTarget;
      result = paceState;
    } else if (node.interaction === "stop") {
      const stopped = req.body?.stopped === true;
      nextNodeId = stopped ? node.successTarget : node.failureTarget;
      result = stopped ? "stopped" : "moved";
    } else {
      return void res.status(400).json({ error: "Use the vocal decision endpoint for this node" });
    }

    run.history.push({ nodeId: node.id, input: node.interaction, result, at: new Date().toISOString() });

    if (node.generated) {
      const resultLabel = node.interaction === "direction"
        ? `turned ${result}`
        : result === "faster"
          ? "pushed faster"
          : result === "held"
            ? "held the pace"
            : "fell behind";
      try {
        const nextNode = await continueFreestyle(requestBaseUrl(req), run, {
          nodeId: node.id,
          interaction: node.interaction,
          result,
          label: resultLabel,
        });
        if (!nextNode) return void res.status(503).json({ error: "The freestyle director is not configured" });
        res.json({ run, result, nextNodeId: nextNode.id, nextNode });
      } catch (error) {
        res.status(502).json({ error: (error as Error).message });
      }
      return;
    }

    if (!nextNodeId || !nodeById(story, nextNodeId)) return void res.status(500).json({ error: "Authored target is missing" });
    run.currentNodeId = nextNodeId;
    run.updatedAt = new Date().toISOString();
    res.json({ run, result, nextNodeId, nextNode: nodeById(story, nextNodeId) });
  });

  app.post("/api/runs/:runId/vocal-decision", async (req, res) => {
    const run = runs.get(String(req.params.runId));
    if (!run) return void res.status(404).json({ error: "Run not found" });
    const story = loadStory(requestBaseUrl(req));
    const node = currentNode(story, run);
    if (!node || node.interaction !== "vocal") return void res.status(400).json({ error: "The current node is not awaiting a vocal decision" });
    const transcript = typeof req.body?.transcript === "string" ? req.body.transcript.trim() : "";
    if (!transcript) return void res.status(400).json({ error: "Provide a non-empty transcript" });

    try {
      const classification = await vocalClassifier.classify({
        node,
        transcript,
      });
      const option = node.vocalOptions?.find((candidate) => candidate.id === classification.choiceId);
      if (!option) return void res.status(502).json({ error: "Classifier returned an invalid authored choice" });
      run.history.push({ nodeId: node.id, input: "vocal", result: option.id, at: new Date().toISOString() });
      let nextNode: StoryNode | undefined;
      if (node.terminal || node.generated) {
        const generated = await continueFreestyle(requestBaseUrl(req), run, {
          nodeId: node.id,
          interaction: "vocal",
          result: option.id,
          label: option.label,
        });
        if (generated) {
          nextNode = generated;
        } else {
          run.completed = true;
        }
      } else {
        nextNode = option.target ? nodeById(story, option.target) : undefined;
        if (!nextNode) return void res.status(500).json({ error: "Authored vocal target is missing" });
        run.currentNodeId = nextNode.id;
      }
      run.updatedAt = new Date().toISOString();
      res.json({ ...classification, choice: option, run, nextNodeId: nextNode?.id, nextNode });
    } catch (error) {
      res.status(502).json({ error: (error as Error).message });
    }
  });

  app.use((error: unknown, _req: Request, res: express.Response, _next: express.NextFunction) => {
    console.error(error);
    res.status(500).json({ error: "Unexpected backend error" });
  });

  return app;
}
