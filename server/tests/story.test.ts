import { describe, it, expect } from "vitest";
import request from "supertest";
import {
  createTestApp,
  mockGeminiResponse,
  MockGeminiService,
  MockElevenLabsService,
} from "./helpers.js";
import { geminiStoryResponseSchema } from "../src/models/schemas.js";
import {
  applyPaceSample,
  categorizePace,
  PACE_DEFAULTS,
} from "../src/services/pace.js";
import { createEmptySession } from "../src/story/sessionService.js";
import { getDefaultWorld } from "../src/story/worldRegistry.js";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import { __testables } from "../src/services/gemini.js";

describe("story sessions", () => {
  it("creates a story session with Greywatch opening dialogue", async () => {
    const { app } = createTestApp();
    const res = await request(app).post("/api/story/sessions").send({});
    expect(res.status).toBe(201);
    expect(res.body.session.id).toBeTruthy();
    expect(res.body.session.worldId).toBe("greywatch");
    expect(res.body.session.currentScene).toBe("locked_storage_door");
    expect(res.body.openingDialogue.at(-1).text).toBe("Rowan. What do we do?");
    expect(res.body.session.establishedFacts.length).toBeGreaterThan(0);
  });

  it("stores a free-form player response exactly", async () => {
    const { app } = createTestApp();
    const created = await request(app).post("/api/story/sessions").send({});
    const sessionId = created.body.session.id;
    const playerText =
      "Open the door, but keep Edric away from it. Also check the hinges first!!!";

    const res = await request(app)
      .post(`/api/story/sessions/${sessionId}/respond`)
      .send({ text: playerText });

    expect(res.status).toBe(200);
    expect(res.body.session.playerResponses).toHaveLength(1);
    expect(res.body.session.playerResponses[0].text).toBe(playerText);
  });

  it("updates story facts and commitments from a mocked Gemini response", async () => {
    const gemini = new MockGeminiService();
    const { app } = createTestApp({ gemini });
    const created = await request(app).post("/api/story/sessions").send({});
    const sessionId = created.body.session.id;

    const res = await request(app)
      .post(`/api/story/sessions/${sessionId}/respond`)
      .send({ text: "Open the door, but keep Edric away from it." });

    expect(res.body.playerCommitments).toEqual(
      expect.arrayContaining(["Protect the civilians behind the door."]),
    );
    expect(res.body.session.playerCommitments).toEqual(
      expect.arrayContaining(["Protect the civilians behind the door."]),
    );
    expect(res.body.session.establishedFacts).toEqual(
      expect.arrayContaining(["Rowan ordered the storage door opened."]),
    );
    expect(res.body.dialogue.text).toContain("door");
    expect(res.body.paceChallenge.active).toBe(true);
  });

  it("produces different stored context for different player responses", async () => {
    const gemini = new MockGeminiService();
    gemini.interpretImpl = async (_w, _s, text) => ({
      response: mockGeminiResponse({
        playerIntentSummary: `Interpreted: ${text}`,
        playerCommitments: [`Commitment from: ${text}`],
        establishedFacts: [`Fact from: ${text}`],
        dialogueText: `Acknowledged: ${text.slice(0, 40)}`,
      }),
      mode: "live",
      repaired: false,
    });

    const { app } = createTestApp({ gemini });
    const a = await request(app).post("/api/story/sessions").send({});
    const b = await request(app).post("/api/story/sessions").send({});

    const resA = await request(app)
      .post(`/api/story/sessions/${a.body.session.id}/respond`)
      .send({ text: "Leave them. We do not have time." });
    const resB = await request(app)
      .post(`/api/story/sessions/${b.body.session.id}/respond`)
      .send({ text: "Let Edric open it. I believe him." });

    expect(resA.body.session.playerCommitments[0]).not.toBe(
      resB.body.session.playerCommitments[0],
    );
    expect(resA.body.playerInterpretation).toContain("Leave them");
    expect(resB.body.playerInterpretation).toContain("Let Edric");
  });

  it("resets a demo session", async () => {
    const { app } = createTestApp();
    const created = await request(app).post("/api/story/sessions").send({});
    const sessionId = created.body.session.id;
    await request(app)
      .post(`/api/story/sessions/${sessionId}/respond`)
      .send({ text: "Open it." });

    const reset = await request(app)
      .post(`/api/story/sessions/${sessionId}/reset`)
      .send({});
    expect(reset.status).toBe(200);
    expect(reset.body.session.playerResponses).toHaveLength(0);
    expect(reset.body.session.wowMomentTriggered).toBe(false);
    expect(reset.body.openingDialogue.at(-1).text).toBe("Rowan. What do we do?");
  });
});

describe("Gemini validation", () => {
  it("validates well-formed Gemini output", () => {
    const parsed = geminiStoryResponseSchema.safeParse(mockGeminiResponse());
    expect(parsed.success).toBe(true);
  });

  it("rejects malformed Gemini output with suspicious content", () => {
    const parsed = geminiStoryResponseSchema.safeParse(
      mockGeminiResponse({
        dialogueText: "Run rm -rf / now",
      }),
    );
    expect(parsed.success).toBe(false);
  });

  it("uses safe fallback for malformed Gemini output via service path", async () => {
    const gemini = new MockGeminiService();
    gemini.interpretImpl = async (_w, _s, text) => ({
      response: __testables.fallbackInterpret(text),
      mode: "fallback",
      repaired: false,
    });
    const { app } = createTestApp({ gemini });
    const created = await request(app).post("/api/story/sessions").send({});
    const res = await request(app)
      .post(`/api/story/sessions/${created.body.session.id}/respond`)
      .send({ text: "Whatever free form answer" });

    expect(res.status).toBe(200);
    expect(res.body.meta.mode).toBe("fallback");
    expect(res.body.session.playerResponses[0].text).toBe(
      "Whatever free form answer",
    );
    expect(res.body.paceChallenge.active).toBe(true);
  });
});

describe("pace processing", () => {
  it("categorizes pace values correctly", () => {
    expect(categorizePace(370, 380, 405)).toBe("TOO_FAST");
    expect(categorizePace(390, 380, 405)).toBe("IN_RANGE");
    expect(categorizePace(420, 380, 405)).toBe("TOO_SLOW");
  });

  it("debounces noisy transitions (single sample does not change state)", () => {
    let session = createEmptySession(getDefaultWorld());
    session.paceChallenge = {
      active: true,
      targetMinSecondsPerKm: 380,
      targetMaxSecondsPerKm: 405,
      requiredDurationSeconds: 60,
    };

    const t0 = "2026-07-18T22:00:00.000Z";
    const eval1 = applyPaceSample(session, 450, t0);
    expect(eval1.session.currentPaceState).toBe("UNKNOWN");
    expect(eval1.stateChanged).toBe(false);
  });

  it("requires consecutive samples before adopting a pace state", () => {
    let session = createEmptySession(getDefaultWorld());
    session.paceChallenge = {
      active: true,
      targetMinSecondsPerKm: PACE_DEFAULTS.TARGET_MIN,
      targetMaxSecondsPerKm: PACE_DEFAULTS.TARGET_MAX,
    };

    const base = Date.parse("2026-07-18T22:00:00.000Z");
    let evaluation = applyPaceSample(session, 450, new Date(base).toISOString());
    session = evaluation.session;
    evaluation = applyPaceSample(session, 448, new Date(base + 1000).toISOString());
    session = evaluation.session;
    expect(session.currentPaceState).toBe("UNKNOWN");

    evaluation = applyPaceSample(session, 452, new Date(base + 2000).toISOString());
    expect(evaluation.session.currentPaceState).toBe("TOO_SLOW");
    expect(evaluation.stateChanged).toBe(true);
  });

  it("triggers contextual wow at most once after sustained too-slow", async () => {
    const gemini = new MockGeminiService();
    const { app } = createTestApp({ gemini });
    const created = await request(app).post("/api/story/sessions").send({});
    const sessionId = created.body.session.id;

    await request(app)
      .post(`/api/story/sessions/${sessionId}/respond`)
      .send({ text: "Open the door, but keep Edric away from it." });

    const base = Date.parse("2026-07-18T22:00:00.000Z");

    // Establish TOO_SLOW with 3 consecutive samples
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post(`/api/story/sessions/${sessionId}/pace`)
        .send({
          paceSecondsPerKm: 450,
          recordedAt: new Date(base + i * 1000).toISOString(),
        });
    }

    // Sustained 5+ seconds later
    const wow = await request(app)
      .post(`/api/story/sessions/${sessionId}/pace`)
      .send({
        paceSecondsPerKm: 455,
        recordedAt: new Date(base + 8000).toISOString(),
      });

    expect(wow.body.reaction?.kind).toBe("wow");
    expect(wow.body.session.wowMomentTriggered).toBe(true);
    expect(gemini.contextualCalls).toBe(1);
    expect(wow.body.reaction.text.toLowerCase()).toContain("door");

    const again = await request(app)
      .post(`/api/story/sessions/${sessionId}/pace`)
      .send({
        paceSecondsPerKm: 460,
        recordedAt: new Date(base + 15000).toISOString(),
      });
    expect(again.body.reaction).toBeNull();
    expect(gemini.contextualCalls).toBe(1);
  });
});

describe("ElevenLabs mocking and env safety", () => {
  it("mocks ElevenLabs generation in respond flow", async () => {
    const elevenLabs = new MockElevenLabsService();
    const { app } = createTestApp({ elevenLabs });
    const created = await request(app).post("/api/story/sessions").send({});
    await request(app)
      .post(`/api/story/sessions/${created.body.session.id}/respond`)
      .send({ text: "Open the door." });
    expect(elevenLabs.calls.length).toBeGreaterThan(0);
    expect(elevenLabs.calls[0]?.character).toBe("Mara");
  });

  it("does not crash or expose secret values when API keys are missing", () => {
    resetEnvCache();
    const previous = { ...process.env };
    delete process.env.GEMINI_API_KEY;
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_MARA_VOICE_ID;
    delete process.env.ELEVENLABS_GARRICK_VOICE_ID;
    delete process.env.ELEVENLABS_EDRIC_VOICE_ID;
    delete process.env.ELEVENLABS_ROWAN_VOICE_ID;
    delete process.env.ELEVENLABS_NARRATOR_VOICE_ID;

    resetEnvCache();
    const env = loadEnv();
    expect(env.geminiAvailable).toBe(false);
    expect(env.elevenLabsAvailable).toBe(false);
    expect(env.missingEnvNames).toContain("GEMINI_API_KEY");
    expect(env.missingEnvNames).toContain("ELEVENLABS_API_KEY");

    const healthPayload = JSON.stringify({
      missingEnvNames: env.missingEnvNames,
      geminiAvailable: env.geminiAvailable,
    });
    expect(healthPayload).not.toMatch(/AIza/);
    expect(healthPayload).not.toContain("sk_");

    process.env = previous;
    resetEnvCache();
  });

  it("health endpoint lists missing names without values", async () => {
    const { app } = createTestApp();
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.missingEnvNames)).toBe(true);
  });

  it("speech endpoint survives ElevenLabs failure", async () => {
    const elevenLabs = new MockElevenLabsService();
    elevenLabs.fail = true;
    const { app } = createTestApp({ elevenLabs });
    const res = await request(app)
      .post("/api/speech/generate")
      .send({ character: "Mara", text: "Stay with them." });
    expect(res.status).toBe(200);
    expect(res.body.audioUrl).toBeNull();
    expect(res.body.text).toBe("Stay with them.");
    expect(res.body.error).toBeTruthy();
  });
});

describe("GET session", () => {
  it("returns current session state", async () => {
    const { app } = createTestApp();
    const created = await request(app).post("/api/story/sessions").send({});
    const res = await request(app).get(
      `/api/story/sessions/${created.body.session.id}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.session.id).toBe(created.body.session.id);
  });
});
