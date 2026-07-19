import { useEffect, useMemo, useRef, useState } from "react";

type ConversationTurn = { speaker: string; text: string; timestamp: string };

type PaceChallenge = {
  active: boolean;
  targetMinSecondsPerKm?: number;
  targetMaxSecondsPerKm?: number;
  requiredDurationSeconds?: number;
  narrativePurpose?: string;
} | null;

type StorySession = {
  id: string;
  currentScene: string;
  conversationHistory: ConversationTurn[];
  playerResponses: Array<{ text: string; intentSummary: string }>;
  establishedFacts: string[];
  playerCommitments: string[];
  characterMemories: Record<string, string[]>;
  characterStates: Record<string, { attitude?: string; emotionalState?: string }>;
  storyState: Record<string, string | number | boolean | null>;
  currentPaceState: string;
  paceChallenge: PaceChallenge;
  paceSamples: unknown[];
  wowMomentTriggered: boolean;
};

type Dialogue = { character: string; text: string; audioUrl: string | null };

const CHARACTERS = ["Mara", "Garrick", "Edric", "Rowan", "Narrator"] as const;

const SAMPLE_LINES: Record<(typeof CHARACTERS)[number], string> = {
  Mara: "Rowan. What do we do?",
  Garrick: "You expect us to believe that?",
  Edric: "I opened the gate for them.",
  Rowan: "We open the door. Hold Edric back.",
  Narrator: "Beneath Greywatch, the pursuit closes in.",
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof body.error === "string" ? body.error : `Request failed (${res.status})`,
    );
  }
  return body as T;
}

export default function App() {
  const [session, setSession] = useState<StorySession | null>(null);
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [lastGemini, setLastGemini] = useState<unknown>(null);
  const [playerText, setPlayerText] = useState("");
  const [submittedText, setSubmittedText] = useState<string | null>(null);
  const [paceInput, setPaceInput] = useState(390);
  const [paceInfo, setPaceInfo] = useState<{
    median: number | null;
    categorized: string;
    sampleCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioStatus, setAudioStatus] = useState("idle");
  const [debug, setDebug] = useState(false);
  const [health, setHealth] = useState<{
    geminiAvailable: boolean;
    elevenLabsAvailable: boolean;
    missingEnvNames: string[];
  } | null>(null);

  // Voice prompt tester
  const [voiceCharacter, setVoiceCharacter] =
    useState<(typeof CHARACTERS)[number]>("Mara");
  const [voicePrompt, setVoicePrompt] = useState(SAMPLE_LINES.Mara);
  const [voiceAudioUrl, setVoiceAudioUrl] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceCacheHit, setVoiceCacheHit] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const latestTurn = useMemo(() => {
    const hist = session?.conversationHistory ?? [];
    return hist[hist.length - 1] ?? null;
  }, [session]);

  async function playUrl(url: string | null) {
    if (!url || !audioRef.current) {
      setAudioStatus(url ? "missing-player" : "no-audio");
      return;
    }
    try {
      setAudioStatus("loading");
      audioRef.current.src = url;
      audioRef.current.load();
      await audioRef.current.play();
      setAudioStatus("playing");
    } catch (err) {
      setAudioStatus(`blocked: ${(err as Error).message}`);
    }
  }

  async function generateVoice(character: string, text: string, autoplay = true) {
    const trimmed = text.trim();
    if (!trimmed) {
      setVoiceError("Enter a text prompt to speak.");
      return null;
    }
    setVoiceBusy(true);
    setVoiceError(null);
    setError(null);
    try {
      const result = await api<{
        character: string;
        text: string;
        audioUrl: string | null;
        cacheHit: boolean;
        error: string | null;
      }>("/api/speech/generate", {
        method: "POST",
        body: JSON.stringify({ character, text: trimmed }),
      });

      if (result.error || !result.audioUrl) {
        setVoiceError(result.error ?? "No audioUrl returned from backend");
        setVoiceAudioUrl(null);
        setAudioStatus("failed");
        return null;
      }

      setVoiceAudioUrl(result.audioUrl);
      setVoiceCacheHit(result.cacheHit);
      setDialogue({
        character: result.character,
        text: result.text,
        audioUrl: result.audioUrl,
      });
      if (autoplay) {
        await playUrl(result.audioUrl);
      } else {
        setAudioStatus("ready");
      }
      return result;
    } catch (err) {
      setVoiceError((err as Error).message);
      setAudioStatus("failed");
      return null;
    } finally {
      setVoiceBusy(false);
    }
  }

  async function refreshHealth() {
    try {
      const h = await api<{
        geminiAvailable: boolean;
        elevenLabsAvailable: boolean;
        missingEnvNames: string[];
      }>("/health");
      setHealth(h);
    } catch {
      setHealth(null);
    }
  }

  useEffect(() => {
    void refreshHealth();
  }, []);

  async function startSession() {
    setLoading(true);
    setError(null);
    try {
      await refreshHealth();
      const data = await api<{ session: StorySession }>("/api/story/sessions", {
        method: "POST",
        body: "{}",
      });
      setSession(data.session);
      setInterpretation(null);
      setLastGemini(null);
      setSubmittedText(null);
      setPaceInfo(null);
      const last = data.session.conversationHistory.at(-1);
      if (last) {
        setVoiceCharacter(
          (CHARACTERS.includes(last.speaker as (typeof CHARACTERS)[number])
            ? last.speaker
            : "Mara") as (typeof CHARACTERS)[number],
        );
        setVoicePrompt(last.text);
        setDialogue({ character: last.speaker, text: last.text, audioUrl: null });
        await generateVoice(last.speaker, last.text, true);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function resetSession() {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ session: StorySession }>(
        `/api/story/sessions/${session.id}/reset`,
        { method: "POST", body: "{}" },
      );
      setSession(data.session);
      setInterpretation(null);
      setLastGemini(null);
      setSubmittedText(null);
      setPaceInfo(null);
      const last = data.session.conversationHistory.at(-1);
      if (last) {
        setVoicePrompt(last.text);
        setVoiceCharacter("Mara");
        await generateVoice(last.speaker, last.text, true);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function submitResponse() {
    if (!session || !playerText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api<{
        session: StorySession;
        playerInterpretation: string;
        dialogue: Dialogue;
        establishedFacts: string[];
        playerCommitments: string[];
        characterStateUpdates: unknown;
        storyStateUpdates: unknown;
        meta: { mode?: string; ttsError?: string | null };
        debug?: unknown;
      }>(`/api/story/sessions/${session.id}/respond?debug=1`, {
        method: "POST",
        body: JSON.stringify({ text: playerText.trim() }),
      });
      setSession(data.session);
      setSubmittedText(playerText.trim());
      setInterpretation(data.playerInterpretation);
      setLastGemini({
        establishedFacts: data.establishedFacts,
        playerCommitments: data.playerCommitments,
        characterStateUpdates: data.characterStateUpdates,
        storyStateUpdates: data.storyStateUpdates,
        meta: data.meta,
        debug: data.debug,
      });
      setPlayerText("");

      setVoiceCharacter(
        (CHARACTERS.includes(data.dialogue.character as (typeof CHARACTERS)[number])
          ? data.dialogue.character
          : "Mara") as (typeof CHARACTERS)[number],
      );
      setVoicePrompt(data.dialogue.text);

      if (data.dialogue.audioUrl) {
        setDialogue(data.dialogue);
        setVoiceAudioUrl(data.dialogue.audioUrl);
        await playUrl(data.dialogue.audioUrl);
      } else {
        if (data.meta?.ttsError) setVoiceError(data.meta.ttsError);
        await generateVoice(data.dialogue.character, data.dialogue.text, true);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function sendPace(paceSecondsPerKm: number) {
    if (!session) return;
    setLoading(true);
    setError(null);
    setPaceInput(paceSecondsPerKm);
    try {
      const data = await api<{
        session: StorySession;
        pace: {
          medianPaceSecondsPerKm: number | null;
          categorized: string;
          sampleCount: number;
        };
        reaction: (Dialogue & { kind: string }) | null;
      }>(`/api/story/sessions/${session.id}/pace`, {
        method: "POST",
        body: JSON.stringify({
          paceSecondsPerKm,
          recordedAt: new Date().toISOString(),
        }),
      });
      setSession(data.session);
      setPaceInfo({
        median: data.pace.medianPaceSecondsPerKm,
        categorized: data.pace.categorized,
        sampleCount: data.pace.sampleCount,
      });
      if (data.reaction) {
        setVoiceCharacter(
          (CHARACTERS.includes(data.reaction.character as (typeof CHARACTERS)[number])
            ? data.reaction.character
            : "Mara") as (typeof CHARACTERS)[number],
        );
        setVoicePrompt(data.reaction.text);
        if (data.reaction.audioUrl) {
          setDialogue(data.reaction);
          setVoiceAudioUrl(data.reaction.audioUrl);
          await playUrl(data.reaction.audioUrl);
        } else {
          await generateVoice(data.reaction.character, data.reaction.text, true);
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const challenge = session?.paceChallenge;

  return (
    <div>
      <h1>Worlds — Greywatch demo</h1>
      <p className="sub">
        Generate character voices from a text prompt, then run the adaptive story loop.
      </p>

      <div className="panel" style={{ marginBottom: "0.9rem", borderColor: "#e8573a55" }}>
        <h2>Voice generator (text prompt → ElevenLabs)</h2>
        <p className="meta">
          Pick a character, type what they should say, generate audio on the backend.
        </p>
        <div className="row" style={{ marginBottom: "0.5rem" }}>
          {CHARACTERS.map((name) => (
            <button
              key={name}
              className={voiceCharacter === name ? "primary" : undefined}
              onClick={() => {
                setVoiceCharacter(name);
                setVoicePrompt(SAMPLE_LINES[name]);
              }}
            >
              {name}
            </button>
          ))}
        </div>
        <textarea
          rows={3}
          value={voicePrompt}
          onChange={(e) => setVoicePrompt(e.target.value)}
          placeholder="Text prompt for this character to speak…"
        />
        <div className="row" style={{ marginTop: "0.5rem" }}>
          <button
            className="primary"
            disabled={voiceBusy || !voicePrompt.trim()}
            onClick={() => void generateVoice(voiceCharacter, voicePrompt, true)}
          >
            {voiceBusy ? "Generating…" : "Generate & play"}
          </button>
          <button
            disabled={!voiceAudioUrl}
            onClick={() => void playUrl(voiceAudioUrl)}
          >
            Replay
          </button>
          <span className="pill">Audio: {audioStatus}</span>
          {voiceCacheHit && <span className="pill ok">cache hit</span>}
          {health && (
            <span className={`pill ${health.elevenLabsAvailable ? "ok" : "warn"}`}>
              ElevenLabs {health.elevenLabsAvailable ? "live" : "fallback"}
            </span>
          )}
        </div>
        <audio
          ref={audioRef}
          controls
          style={{ width: "100%", marginTop: "0.75rem" }}
          onEnded={() => setAudioStatus("ended")}
          onPlay={() => setAudioStatus("playing")}
        />
        {voiceAudioUrl && (
          <p className="meta" style={{ marginTop: "0.35rem" }}>
            {voiceAudioUrl}
          </p>
        )}
        {voiceError && <p className="error">{voiceError}</p>}
      </div>

      <div className="panel" style={{ marginBottom: "0.9rem" }}>
        <h2>Session</h2>
        <div className="row">
          <button className="primary" disabled={loading} onClick={() => void startSession()}>
            Start session
          </button>
          <button disabled={loading || !session} onClick={() => void resetSession()}>
            Reset
          </button>
          <button className="ghost" onClick={() => void refreshHealth()}>
            Refresh health
          </button>
          <button className="ghost" onClick={() => setDebug((d) => !d)}>
            {debug ? "Hide debug" : "Show debug"}
          </button>
          {session && <span className="pill">id {session.id.slice(0, 8)}</span>}
          {health && (
            <span className={`pill ${health.geminiAvailable ? "ok" : "warn"}`}>
              Gemini {health.geminiAvailable ? "live" : "fallback"}
            </span>
          )}
        </div>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="grid grid-main">
        <div className="panel">
          <h2>Story</h2>
          <p className="meta">Scene: {session?.currentScene ?? "—"}</p>
          {dialogue ? (
            <div className="turn" style={{ marginBottom: "0.75rem" }}>
              <strong>{dialogue.character}</strong>
              {dialogue.text}
              <div className="row" style={{ marginTop: "0.35rem" }}>
                <button
                  disabled={voiceBusy}
                  onClick={() =>
                    void generateVoice(dialogue.character, dialogue.text, true)
                  }
                >
                  Speak this line
                </button>
              </div>
            </div>
          ) : (
            <p className="meta">Start a session or generate a voice above.</p>
          )}
          <div className="history">
            {(session?.conversationHistory ?? []).map((turn, i) => (
              <div className="turn" key={`${turn.timestamp}-${i}`}>
                <strong>{turn.speaker}</strong>
                {turn.text}
                <div className="row" style={{ marginTop: "0.25rem" }}>
                  <button
                    className="ghost"
                    disabled={voiceBusy}
                    onClick={() => {
                      setVoiceCharacter(
                        (CHARACTERS.includes(turn.speaker as (typeof CHARACTERS)[number])
                          ? turn.speaker
                          : "Narrator") as (typeof CHARACTERS)[number],
                      );
                      setVoicePrompt(turn.text);
                      void generateVoice(turn.speaker, turn.text, true);
                    }}
                  >
                    Speak
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid">
          <div className="panel">
            <h2>Your response</h2>
            <textarea
              rows={4}
              placeholder="Type anything… e.g. Open the door, but keep Edric away from it."
              value={playerText}
              onChange={(e) => setPlayerText(e.target.value)}
              disabled={!session || loading}
            />
            <div className="row" style={{ marginTop: "0.5rem" }}>
              <button
                className="primary"
                disabled={!session || loading || !playerText.trim()}
                onClick={() => void submitResponse()}
              >
                Submit
              </button>
            </div>
            {submittedText && (
              <p className="meta" style={{ marginTop: "0.5rem" }}>
                Submitted: “{submittedText}”
              </p>
            )}
          </div>

          <div className="panel">
            <h2>Gemini interpretation</h2>
            <p>{interpretation ?? latestTurn?.text ?? "—"}</p>
            {session && (
              <>
                <p className="meta">Commitments</p>
                <ul className="compact">
                  {session.playerCommitments.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
                <p className="meta">Facts (recent)</p>
                <ul className="compact">
                  {session.establishedFacts.slice(-6).map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </>
            )}
            {debug && lastGemini != null && (
              <details open>
                <summary>Debug payload</summary>
                <pre>{JSON.stringify(lastGemini, null, 2)}</pre>
              </details>
            )}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: "0.9rem" }}>
        <h2>Pace simulator</h2>
        <p className="meta">
          Target:{" "}
          {challenge?.active
            ? `${challenge.targetMinSecondsPerKm}–${challenge.targetMaxSecondsPerKm} s/km`
            : "no active challenge yet"}{" "}
          · State: {session?.currentPaceState ?? "—"} · Samples:{" "}
          {paceInfo?.sampleCount ?? session?.paceSamples.length ?? 0} · Wow:{" "}
          {session?.wowMomentTriggered ? "triggered" : "not yet"}
        </p>
        <div className="row">
          <button disabled={!session || loading} onClick={() => void sendPace(360)}>
            Too fast
          </button>
          <button disabled={!session || loading} onClick={() => void sendPace(390)}>
            In target range
          </button>
          <button disabled={!session || loading} onClick={() => void sendPace(450)}>
            Too slow
          </button>
          <button disabled={!session || loading} onClick={() => void sendPace(392)}>
            Recover
          </button>
        </div>
        <div className="row" style={{ marginTop: "0.6rem" }}>
          <label className="meta" htmlFor="pace">
            s/km
          </label>
          <input
            id="pace"
            type="number"
            style={{ width: "120px" }}
            value={paceInput}
            onChange={(e) => setPaceInput(Number(e.target.value))}
          />
          <button disabled={!session || loading} onClick={() => void sendPace(paceInput)}>
            Send sample
          </button>
        </div>
      </div>
    </div>
  );
}
