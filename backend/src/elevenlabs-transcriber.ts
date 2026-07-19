import type { SpeechTranscriber } from "./types.js";

type ElevenLabsTranscript = {
  text?: string;
  detail?: { message?: string } | string;
};

export class ElevenLabsSpeechTranscriber implements SpeechTranscriber {
  constructor(private readonly apiKey: string | undefined) {}

  async transcribe(args: { audio: Buffer; mimeType: string; fileName: string }): Promise<string> {
    if (!this.apiKey) throw new Error("ELEVENLABS_API_KEY is not configured");
    if (!args.audio.length) throw new Error("The recorded answer was empty");

    const form = new FormData();
    const bytes = new Uint8Array(args.audio);
    form.append("file", new Blob([bytes], { type: args.mimeType }), args.fileName);
    form.append("model_id", "scribe_v2");
    form.append("language_code", "eng");
    form.append("tag_audio_events", "false");
    form.append("diarize", "false");

    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": this.apiKey },
      body: form,
    });
    const body = await response.json() as ElevenLabsTranscript;
    if (!response.ok) {
      const detail = typeof body.detail === "string" ? body.detail : body.detail?.message;
      throw new Error(detail || `ElevenLabs transcription failed (${response.status})`);
    }
    const transcript = body.text?.trim() ?? "";
    if (!transcript) throw new Error("No speech was detected in the recording");
    return transcript;
  }
}
