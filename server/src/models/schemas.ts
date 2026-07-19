import { z } from "zod";

const suspiciousPatterns = [
  /(\.\.|\/etc\/|\/usr\/|C:\\)/i,
  /\b(rm\s+-rf|curl\s+|wget\s+|powershell|bash\s+-c)\b/i,
  /\b(api[_-]?key|secret|password|token)\s*[:=]/i,
  /```(?:js|ts|python|bash|sh)/i,
];

function rejectSuspicious(value: string, ctx: z.RefinementCtx): void {
  if (value.length > 2000) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "String too long" });
    return;
  }
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Disallowed content in model output",
      });
      return;
    }
  }
}

const safeString = z.string().superRefine(rejectSuspicious);

export const characterStateUpdateSchema = z.object({
  character: safeString,
  attitudeChange: safeString.optional(),
  emotionalState: safeString.optional(),
  memory: safeString.optional(),
});

export const paceChallengeSchema = z.object({
  enabled: z.boolean(),
  narrativePurpose: safeString.optional(),
  targetMinSecondsPerKm: z.number().positive().optional(),
  targetMaxSecondsPerKm: z.number().positive().optional(),
  requiredDurationSeconds: z.number().positive().optional(),
});

export const geminiStoryResponseSchema = z.object({
  playerIntentSummary: safeString,
  establishedFacts: z.array(safeString).max(20),
  playerCommitments: z.array(safeString).max(20),
  characterStateUpdates: z.array(characterStateUpdateSchema).max(10),
  storyStateUpdates: z.record(
    z.union([z.string(), z.number(), z.boolean(), z.null()]),
  ),
  nextSceneSummary: safeString,
  respondingCharacter: safeString,
  dialogueText: safeString,
  paceChallenge: paceChallengeSchema.optional(),
  confidence: z.number().min(0).max(1),
});

export const contextualPaceLineSchema = z.object({
  respondingCharacter: safeString,
  dialogueText: safeString,
  confidence: z.number().min(0).max(1),
});

export type ValidatedGeminiStoryResponse = z.infer<typeof geminiStoryResponseSchema>;
export type ValidatedContextualPaceLine = z.infer<typeof contextualPaceLineSchema>;

/** JSON schema for Gemini structured output (OpenAPI-ish). */
export const geminiStoryJsonSchema = {
  type: "object",
  properties: {
    playerIntentSummary: { type: "string" },
    establishedFacts: { type: "array", items: { type: "string" } },
    playerCommitments: { type: "array", items: { type: "string" } },
    characterStateUpdates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          character: { type: "string" },
          attitudeChange: { type: "string" },
          emotionalState: { type: "string" },
          memory: { type: "string" },
        },
        required: ["character"],
      },
    },
    storyStateUpdates: {
      type: "object",
      additionalProperties: {
        anyOf: [
          { type: "string" },
          { type: "number" },
          { type: "boolean" },
          { type: "null" },
        ],
      },
    },
    nextSceneSummary: { type: "string" },
    respondingCharacter: { type: "string" },
    dialogueText: { type: "string" },
    paceChallenge: {
      type: "object",
      properties: {
        enabled: { type: "boolean" },
        narrativePurpose: { type: "string" },
        targetMinSecondsPerKm: { type: "number" },
        targetMaxSecondsPerKm: { type: "number" },
        requiredDurationSeconds: { type: "number" },
      },
      required: ["enabled"],
    },
    confidence: { type: "number" },
  },
  required: [
    "playerIntentSummary",
    "establishedFacts",
    "playerCommitments",
    "characterStateUpdates",
    "storyStateUpdates",
    "nextSceneSummary",
    "respondingCharacter",
    "dialogueText",
    "confidence",
  ],
} as const;

export const contextualPaceLineJsonSchema = {
  type: "object",
  properties: {
    respondingCharacter: { type: "string" },
    dialogueText: { type: "string" },
    confidence: { type: "number" },
  },
  required: ["respondingCharacter", "dialogueText", "confidence"],
} as const;
