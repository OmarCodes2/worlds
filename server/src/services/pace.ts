import type { PaceState, StorySession } from "../models/types.js";

export type PaceEvaluation = {
  session: StorySession;
  sampleCount: number;
  medianPaceSecondsPerKm: number | null;
  categorized: PaceState;
  stateChanged: boolean;
  sustainedOutsideSeconds: number;
  shouldTriggerWow: boolean;
};

const SAMPLE_WINDOW = 5;
const CONSECUTIVE_REQUIRED = 3;
const SUSTAINED_MS_FOR_WOW = 5000;

export function categorizePace(
  paceSecondsPerKm: number,
  min?: number,
  max?: number,
): PaceState {
  if (min == null || max == null) return "UNKNOWN";
  if (paceSecondsPerKm < min) return "TOO_FAST";
  if (paceSecondsPerKm > max) return "TOO_SLOW";
  return "IN_RANGE";
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

/**
 * Apply a pace sample with median smoothing and consecutive-state debounce.
 * Does not generate dialogue — only updates session pace fields and flags wow eligibility.
 */
export function applyPaceSample(
  session: StorySession,
  paceSecondsPerKm: number,
  recordedAt: string,
): PaceEvaluation {
  const next = structuredClone(session);
  next.paceSamples.push({ paceSecondsPerKm, recordedAt });
  if (next.paceSamples.length > 50) {
    next.paceSamples = next.paceSamples.slice(-50);
  }

  const challenge = next.paceChallenge;
  const window = next.paceSamples.slice(-SAMPLE_WINDOW);
  const med = median(window.map((s) => s.paceSecondsPerKm));
  const categorized =
    med == null
      ? "UNKNOWN"
      : categorizePace(
          med,
          challenge?.targetMinSecondsPerKm,
          challenge?.targetMaxSecondsPerKm,
        );

  const previousMedians = next.recentPaceMedians;
  const updatedMedians = [...previousMedians, categorized].slice(-CONSECUTIVE_REQUIRED);
  next.recentPaceMedians = updatedMedians;

  let stateChanged = false;
  const allSame =
    updatedMedians.length >= CONSECUTIVE_REQUIRED &&
    updatedMedians.every((s) => s === categorized);

  if (allSame && categorized !== "UNKNOWN" && categorized !== next.currentPaceState) {
    next.currentPaceState = categorized;
    next.paceStateChangedAt = recordedAt;
    stateChanged = true;
  } else if (next.currentPaceState === "UNKNOWN" && allSame && categorized !== "UNKNOWN") {
    next.currentPaceState = categorized;
    next.paceStateChangedAt = recordedAt;
    stateChanged = true;
  }

  let sustainedOutsideSeconds = 0;
  if (
    next.currentPaceState === "TOO_SLOW" &&
    next.paceStateChangedAt &&
    challenge?.active
  ) {
    sustainedOutsideSeconds =
      (new Date(recordedAt).getTime() -
        new Date(next.paceStateChangedAt).getTime()) /
      1000;
  }

  const shouldTriggerWow =
    Boolean(challenge?.active) &&
    next.currentPaceState === "TOO_SLOW" &&
    !next.wowMomentTriggered &&
    next.playerCommitments.length > 0 &&
    sustainedOutsideSeconds * 1000 >= SUSTAINED_MS_FOR_WOW;

  next.updatedAt = recordedAt;

  return {
    session: next,
    sampleCount: next.paceSamples.length,
    medianPaceSecondsPerKm: med,
    categorized,
    stateChanged,
    sustainedOutsideSeconds,
    shouldTriggerWow,
  };
}

export const PACE_DEFAULTS = {
  SAMPLE_WINDOW,
  CONSECUTIVE_REQUIRED,
  SUSTAINED_MS_FOR_WOW,
  TARGET_MIN: 380,
  TARGET_MAX: 405,
};
