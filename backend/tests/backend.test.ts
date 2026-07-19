import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { GeminiFreestyleDirector } from "../src/freestyle.js";
import type {
  FreestyleDirector,
  GeneratedSpeechSynthesizer,
  SpeechTranscriber,
  VocalClassifier,
  RunRecord,
} from "../src/types.js";

const fakeClassifier: VocalClassifier = {
  async classify({ node, transcript }) {
    const option = node.vocalOptions?.find((candidate) => candidate.aliases.some((alias) => transcript.toLowerCase().includes(alias.toLowerCase())))
      ?? node.vocalOptions![0];
    return { choiceId: option.id, transcript, confidence: 0.99, mode: "fallback" };
  },
};

const fakeTranscriber: SpeechTranscriber = {
  async transcribe({ audio }) {
    expect(audio.length).toBeGreaterThan(0);
    return "Keep Edric alive";
  },
};

const fakeFreestyleDirector: FreestyleDirector = {
  async generate({ run, choice }) {
    return {
      title: `Freestyle turn ${(run.freestyleTurn ?? 0) + 1}`,
      label: "Choose the passage",
      objective: "Take the left arch or the right stair.",
      summary: `Mara reacted to ${choice.label}.`,
      interaction: "direction",
      lines: [
        { speaker: "Mara", emotion: "guarded", text: `You chose ${choice.label}. Stay close.` },
        { speaker: "Garrick", emotion: "urgent", text: "Left arch or right stair. Decide." },
      ],
    };
  },
};

const fakeGeneratedSpeech: GeneratedSpeechSynthesizer = {
  async synthesize({ speaker, emotion, text }) {
    return Buffer.from(`${speaker}|${emotion}|${text}`.repeat(20));
  },
};

describe("Worlds backend", () => {
  const app = createApp({ vocalClassifier: fakeClassifier, speechTranscriber: fakeTranscriber });

  async function chooseKill(runId: string) {
    return request(app)
      .post(`/api/runs/${runId}/vocal-decision`)
      .send({ transcript: "Let Garrick kill Edric" })
      .expect(200);
  }

  it("serves the complete prerecorded Greywatch graph", async () => {
    const health = await request(app).get("/api/health").expect(200);
    expect(health.body).toMatchObject({ ok: true, nodes: 15, audioLines: 171 });

    const response = await request(app).get("/api/stories/greywatch").expect(200);
    expect(response.body.startNodeId).toBe("root");
    expect(response.body.nodes).toHaveLength(15);
    expect(response.body.nodes.every((node: { lines: unknown[] }) => node.lines.length > 0)).toBe(true);
  });

  it("serves referenced audio files", async () => {
    const story = await request(app).get("/api/stories/greywatch").expect(200);
    const audioUrl = new URL(story.body.nodes[0].lines[0].audioUrl);
    const response = await request(app).get(audioUrl.pathname).expect(200);
    expect(response.headers["content-type"]).toMatch(/audio|mpeg/);
    expect(response.body.length).toBeGreaterThan(512);
  });

  it("starts a run and resolves the opening voice choice plus held pace", async () => {
    const created = await request(app).post("/api/runs").send({ targetPaceSeconds: 360 }).expect(201);
    const runId = created.body.id;

    const root = await chooseKill(runId);
    expect(root.body.nextNodeId).toBe("let_garrick_kill_edric");
    expect(root.body.run.completed).toBe(false);

    const route = await request(app).post(`/api/runs/${runId}/resolve`).send({ direction: "right" }).expect(200);
    expect(route.body.nextNodeId).toBe("lantern_gate");

    const pace = await request(app).post(`/api/runs/${runId}/resolve`).send({ currentPaceSeconds: 370 }).expect(200);
    expect(pace.body.result).toBe("held");
    expect(pace.body.nextNodeId).toBe("unread_ledger");
  });

  it("routes missed pace to the authored failure", async () => {
    const created = await request(app).post("/api/runs").send({ targetPaceSeconds: 360 }).expect(201);
    const runId = created.body.id;
    await chooseKill(runId);
    await request(app).post(`/api/runs/${runId}/resolve`).send({ direction: "right" }).expect(200);
    const pace = await request(app).post(`/api/runs/${runId}/resolve`).send({ currentPaceSeconds: 390 }).expect(200);
    expect(pace.body.result).toBe("missed");
    expect(pace.body.nextNodeId).toBe("garrick_cut_off");
  });

  it("accepts a constrained vocal decision", async () => {
    const created = await request(app).post("/api/runs").send({ targetPaceSeconds: 360 }).expect(201);
    const runId = created.body.id;
    await chooseKill(runId);
    await request(app).post(`/api/runs/${runId}/resolve`).send({ direction: "right" }).expect(200);
    await request(app).post(`/api/runs/${runId}/resolve`).send({ currentPaceSeconds: 390 }).expect(200);
    const response = await request(app)
      .post(`/api/runs/${runId}/vocal-decision`)
      .send({ transcript: "Force the release wheel now" })
      .expect(200);
    expect(response.body.choice.id).toBe("force_wheel");
    expect(response.body.run.completed).toBe(true);
  });

  it("enters ongoing freestyle only after the fourth authored choice", async () => {
    const freestyleApp = createApp({
      vocalClassifier: fakeClassifier,
      freestyleDirector: fakeFreestyleDirector,
      generatedSpeech: fakeGeneratedSpeech,
    });
    const created = await request(freestyleApp).post("/api/runs").send({ targetPaceSeconds: 360 }).expect(201);
    const runId = created.body.id;

    await request(freestyleApp)
      .post(`/api/runs/${runId}/vocal-decision`)
      .send({ transcript: "Let Garrick kill Edric" })
      .expect(200);
    await request(freestyleApp)
      .post(`/api/runs/${runId}/resolve`)
      .send({ direction: "right" })
      .expect(200);
    await request(freestyleApp)
      .post(`/api/runs/${runId}/resolve`)
      .send({ currentPaceSeconds: 360 })
      .expect(200);

    const fourthChoice = await request(freestyleApp)
      .post(`/api/runs/${runId}/vocal-decision`)
      .send({ transcript: "Press the key to the seal" })
      .expect(200);

    expect(fourthChoice.body.run).toMatchObject({ completed: false, mode: "freestyle", freestyleTurn: 1 });
    expect(fourthChoice.body.run.history).toHaveLength(4);
    expect(fourthChoice.body.nextNode).toMatchObject({ generated: true, interaction: "direction" });
    expect(fourthChoice.body.nextNode.lines[0]).toMatchObject({ speaker: "Mara", emotion: "guarded" });

    const generatedAudioUrl = new URL(fourthChoice.body.nextNode.lines[0].audioUrl);
    const audio = await request(freestyleApp).get(generatedAudioUrl.pathname).expect(200);
    expect(audio.headers["content-type"]).toMatch(/audio|mpeg/);
    expect(audio.body.length).toBeGreaterThan(100);

    const continuation = await request(freestyleApp)
      .post(`/api/runs/${runId}/resolve`)
      .send({ direction: "left" })
      .expect(200);
    expect(continuation.body.run).toMatchObject({ completed: false, freestyleTurn: 2 });
    expect(continuation.body.nextNode).toMatchObject({ generated: true });
    expect(continuation.body.nextNodeId).not.toBe(fourthChoice.body.nextNodeId);
  });

  it("keeps a direction, pace, or vocal choice at the end of every fallback beat", async () => {
    const director = new GeminiFreestyleDirector(undefined);
    const baseRun: RunRecord = {
      id: "fallback-run",
      storyId: "greywatch",
      targetPaceSeconds: 360,
      currentNodeId: "freestyle",
      history: [],
      completed: false,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    };
    const choice = { nodeId: "last-node", interaction: "vocal" as const, result: "yes", label: "open the seal" };

    const direction = await director.generate({ run: { ...baseRun, freestyleTurn: 0 }, choice });
    const pace = await director.generate({ run: { ...baseRun, freestyleTurn: 1 }, choice });
    const vocal = await director.generate({ run: { ...baseRun, freestyleTurn: 2 }, choice });

    expect([direction.interaction, pace.interaction, vocal.interaction]).toEqual(["direction", "pace", "vocal"]);
    expect(vocal.vocalOptions).toHaveLength(2);
    expect([direction, pace, vocal].every((beat) => beat.lines.length >= 2 && beat.objective.length > 0)).toBe(true);
  });

  it("transcribes a recorded answer before Gemini classification", async () => {
    const response = await request(app)
      .post("/api/transcriptions")
      .attach("audio", Buffer.from("recorded voice"), { filename: "answer.m4a", contentType: "audio/mp4" })
      .expect(200);
    expect(response.body).toEqual({ transcript: "Keep Edric alive", provider: "elevenlabs", model: "scribe_v2" });
  });

  it("rejects audio uploads so Gemini can only receive transcript text", async () => {
    const created = await request(app).post("/api/runs").send({ targetPaceSeconds: 360 }).expect(201);
    const response = await request(app)
      .post(`/api/runs/${created.body.id}/vocal-decision`)
      .attach("audio", Buffer.from("not audio"), "answer.m4a")
      .expect(400);
    expect(response.body.error).toBe("Provide a non-empty transcript");
  });
});
