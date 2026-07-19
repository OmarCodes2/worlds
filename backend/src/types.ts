export type InteractionKind = "direction" | "pace" | "stop" | "vocal";

export type StoryLine = {
  id: string;
  index: number;
  speaker: string;
  kind: "speech" | "sfx";
  text: string;
  audioUrl?: string;
  emotion?: string;
};

export type VocalOption = {
  id: string;
  label: string;
  aliases: string[];
  target?: string;
};

export type StoryNode = {
  id: string;
  title: string;
  label: string;
  objective: string;
  interaction: InteractionKind;
  lines: StoryLine[];
  leftTarget?: string;
  rightTarget?: string;
  successTarget?: string;
  failureTarget?: string;
  vocalOptions?: VocalOption[];
  terminal?: boolean;
  generated?: boolean;
};

export type StoryDefinition = {
  id: "greywatch";
  title: string;
  subtitle: string;
  startNodeId: string;
  paceToleranceSeconds: number;
  nodes: StoryNode[];
};

export type RunRecord = {
  id: string;
  storyId: "greywatch";
  targetPaceSeconds: number;
  currentNodeId: string;
  history: Array<{
    nodeId: string;
    input: string;
    result: string;
    at: string;
  }>;
  completed: boolean;
  mode?: "authored" | "freestyle";
  freestyleTurn?: number;
  freestyleSummary?: string;
  characterEmotions?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

export type VocalClassification = {
  choiceId: string;
  transcript: string;
  confidence: number;
  mode: "gemini" | "fallback";
};

export type VocalClassifier = {
  classify(args: {
    node: StoryNode;
    transcript: string;
  }): Promise<VocalClassification>;
};

export type SpeechTranscriber = {
  transcribe(args: {
    audio: Buffer;
    mimeType: string;
    fileName: string;
  }): Promise<string>;
};

export type FreestyleChoice = {
  nodeId: string;
  interaction: InteractionKind;
  result: string;
  label: string;
};

export type FreestyleLine = {
  speaker: "Mara" | "Garrick" | "Edric" | "Narrator";
  emotion: string;
  text: string;
};

export type FreestyleBeat = {
  title: string;
  label: string;
  objective: string;
  summary: string;
  interaction: Exclude<InteractionKind, "stop">;
  lines: FreestyleLine[];
  vocalOptions?: VocalOption[];
};

export type FreestyleDirector = {
  generate(args: {
    run: RunRecord;
    choice: FreestyleChoice;
  }): Promise<FreestyleBeat>;
};

export type GeneratedSpeechSynthesizer = {
  synthesize(args: {
    speaker: FreestyleLine["speaker"];
    emotion: string;
    text: string;
  }): Promise<Buffer | null>;
};
