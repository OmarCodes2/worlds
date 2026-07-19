import { Platform } from 'react-native';

export type InteractionKind = 'direction' | 'pace' | 'stop' | 'vocal';

export type StoryLine = {
  id: string;
  index: number;
  speaker: string;
  kind: 'speech' | 'sfx';
  text: string;
  audioUrl?: string;
  emotion?: string;
};

export type VocalOption = { id: string; label: string; aliases: string[]; target?: string };

export type StoryNode = {
  id: string;
  title: string;
  label: string;
  objective: string;
  interaction: InteractionKind;
  lines: StoryLine[];
  vocalOptions?: VocalOption[];
  terminal?: boolean;
  generated?: boolean;
};

export type StoryDefinition = {
  id: 'greywatch';
  title: string;
  subtitle: string;
  startNodeId: string;
  paceToleranceSeconds: number;
  nodes: StoryNode[];
};

export type RunRecord = {
  id: string;
  targetPaceSeconds: number;
  currentNodeId: string;
  completed: boolean;
  mode?: 'authored' | 'freestyle';
  freestyleTurn?: number;
  history: Array<{ nodeId: string; input: string; result: string; at: string }>;
};

const defaultHost = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? `http://${defaultHost}:3002`;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
  return body as T;
}

export function getGreywatchStory() {
  return api<StoryDefinition>('/api/stories/greywatch');
}

export function startRun(targetPaceSeconds: number) {
  return api<RunRecord>('/api/runs', {
    method: 'POST',
    body: JSON.stringify({ targetPaceSeconds }),
  });
}

export type Resolution = {
  run: RunRecord;
  result: string;
  nextNodeId: string;
  nextNode: StoryNode;
};

export function resolveRun(runId: string, input: Record<string, unknown>) {
  return api<Resolution>(`/api/runs/${runId}/resolve`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function resolveVocalDecision(runId: string, transcript: string) {
  return api<{
    choiceId: string;
    transcript: string;
    confidence: number;
    mode: 'gemini' | 'fallback';
    choice: VocalOption;
    run: RunRecord;
    nextNodeId?: string;
    nextNode?: StoryNode;
  }>(`/api/runs/${runId}/vocal-decision`, {
    method: 'POST',
    body: JSON.stringify({ transcript }),
  });
}

export async function transcribeRecordedAnswer(uri: string) {
  const form = new FormData();
  form.append('audio', {
    uri,
    name: 'answer.m4a',
    type: 'audio/mp4',
  } as unknown as Blob);
  const response = await fetch(`${BACKEND_URL}/api/transcriptions`, {
    method: 'POST',
    body: form,
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? `Transcription failed (${response.status})`);
  return body as { transcript: string; provider: 'elevenlabs'; model: 'scribe_v2' };
}
