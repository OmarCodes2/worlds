import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createApp } from "./app.js";
import { ElevenLabsSpeechTranscriber } from "./elevenlabs-transcriber.js";
import { ElevenLabsGeneratedSpeechSynthesizer, GeminiFreestyleDirector } from "./freestyle.js";
import { GeminiVocalClassifier } from "./gemini.js";

const sourceDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(sourceDir, "../../.env") });

const port = Number(process.env.BACKEND_PORT || 3002);
const classifier = new GeminiVocalClassifier(process.env.GEMINI_API_KEY, process.env.GEMINI_MODEL || "gemini-2.5-flash");
const freestyleDirector = new GeminiFreestyleDirector(process.env.GEMINI_API_KEY, process.env.GEMINI_MODEL || "gemini-2.5-flash");
const transcriber = new ElevenLabsSpeechTranscriber(process.env.ELEVENLABS_API_KEY);
const generatedSpeech = new ElevenLabsGeneratedSpeechSynthesizer(
  process.env.ELEVENLABS_API_KEY,
  {
    Mara: process.env.ELEVENLABS_MARA_VOICE_ID,
    Garrick: process.env.ELEVENLABS_GARRICK_VOICE_ID,
    Edric: process.env.ELEVENLABS_EDRIC_VOICE_ID,
    Narrator: process.env.ELEVENLABS_NARRATOR_VOICE_ID,
  },
);
const app = createApp({
  vocalClassifier: classifier,
  speechTranscriber: transcriber,
  freestyleDirector,
  generatedSpeech,
});

app.listen(port, "0.0.0.0", () => {
  console.log(`[backend] Worlds audio backend listening on http://0.0.0.0:${port}`);
});
