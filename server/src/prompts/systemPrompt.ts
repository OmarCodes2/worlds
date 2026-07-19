import type { StorySession, StoryWorld } from "../models/types.js";
import { greywatchPromptHints } from "../story/worlds/greywatch/promptHints.js";
import { buildMemoryContext } from "../story/sessionService.js";

export function buildSystemPrompt(world: StoryWorld): string {
  const characters = world.characters
    .map(
      (c) =>
        `- ${c.displayName} (${c.role}): ${c.personality} Motivation: ${c.motivation} Relationships: ${c.relationships}`,
    )
    .join("\n");

  const scene =
    world.scenes.find((s) => s.id === world.defaultSceneId) ?? world.scenes[0];

  return `You are the AI game director for Worlds, an audio-first running game.

Product rules:
- The world is authored. The experience is adaptive.
- You interpret free-form natural-language player responses. Do NOT match against a fixed option list.
- You propose narrative updates and short character dialogue only.
- You must NEVER return file paths, shell commands, API credentials, executable code, route names, or instructions for backend execution.
- You are a narrative reasoning service, not an application controller.

World: ${world.title}
Setting: ${world.setting}
Tone: ${world.tone}
Synopsis: ${world.synopsis}

Characters:
${characters}

Current demo scene (${scene?.id}):
${scene?.summary}
Stakes: ${scene?.stakes}

Dialogue style:
${greywatchPromptHints.dialogueRules.map((r) => `- ${r}`).join("\n")}
Tone hint: ${greywatchPromptHints.tone}

When the player answers Mara, reason from scene context, characters, prior responses, established facts, commitments, and current pace performance.
Respond with structured JSON only matching the required schema.
Dialogue must be speakable while running — short and natural.`;
}

export function buildInterpretUserPrompt(
  world: StoryWorld,
  session: StorySession,
  playerText: string,
): string {
  const memory = buildMemoryContext(session);
  return `World id: ${world.id}
Player character: Rowan

Memory context (structured; do not invent contradicting lore):
${JSON.stringify(memory, null, 2)}

The player just typed this free-form response (interpret intent; do not treat as a menu selection):
"""
${playerText}
"""

Produce a structured story update:
- Summarize what the player intended.
- List new established facts and player commitments created by this response.
- Update character attitudes/memories if warranted.
- Write one short next dialogue line from the most appropriate character (usually Mara).
- If the decision creates a physical consequence for the run, enable a paceChallenge (typical targets 380–405 seconds per km) with an in-world narrativePurpose.
- confidence between 0 and 1.`;
}

export function buildContextualPacePrompt(
  session: StorySession,
  options: {
    paceState: string;
    sustainedSeconds: number;
    respondingCharacter?: string;
  },
): string {
  const latest = session.playerResponses[session.playerResponses.length - 1];
  const memory = buildMemoryContext(session);

  return `Generate ONE short contextual dialogue line that connects the player's earlier free-form decision to the current pace failure.

Earlier player response:
"""
${latest?.text ?? "(none)"}
"""

Stored interpretation:
${latest?.intentSummary ?? "(none)"}

Player commitments:
${JSON.stringify(session.playerCommitments)}

Current situation:
${JSON.stringify({
    storySummary: memory.storySummary,
    paceChallenge: session.paceChallenge,
    storyState: session.storyState,
  })}

Current performance:
The player has remained ${options.paceState} for about ${options.sustainedSeconds} seconds.

Responding character (prefer): ${options.respondingCharacter ?? "Mara"}

Rules:
- Reference the actual prior decision/commitment; do not use a generic canned line unless commitments are empty.
- One or two short sentences. In-world. No fitness-coach language.
- Return JSON with respondingCharacter, dialogueText, confidence.`;
}
