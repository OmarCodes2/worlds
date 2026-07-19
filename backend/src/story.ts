import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { StoryDefinition, StoryNode, VocalOption } from "./types.js";

const sourceDir = path.dirname(fileURLToPath(import.meta.url));
const projectRootCandidates = [
  path.resolve(sourceDir, "../.."),
  path.resolve(sourceDir, "../../.."),
];
export const projectRoot = projectRootCandidates.find((candidate) =>
  fs.existsSync(path.join(candidate, "story-audio/greywatch/manifest.json")),
) ?? projectRootCandidates[0];
export const audioRoot = path.join(projectRoot, "story-audio/greywatch");
const manifestPath = path.join(audioRoot, "manifest.json");

type ManifestLine = {
  id: string;
  nodeTitle: string;
  index: number;
  speaker: string;
  kind: "speech" | "sfx";
  text: string;
  status: "ready" | "failed" | "pending";
  audioPath?: string;
};

const yesNo = (yesLabel: string, noLabel: string): VocalOption[] => [
  { id: "yes", label: yesLabel, aliases: ["yes", "do it", "we should", "trust", "change"] },
  { id: "no", label: noLabel, aliases: ["no", "do not", "don't", "refuse", "unchanged"] },
];

const configs: Array<Omit<StoryNode, "lines"> & { nodeTitle: string }> = [
  {
    id: "root",
    nodeTitle: "Root — Blood in the Chapel",
    title: "Blood in the Chapel",
    label: "Choose Edric's fate",
    objective: "Should Garrick kill Edric, or do we keep him alive?",
    interaction: "vocal",
    vocalOptions: [
      {
        id: "keep_edric_alive",
        label: "Keep Edric alive",
        aliases: ["keep him alive", "save Edric", "do not kill him", "don't kill him", "stop Garrick", "we need him alive"],
        target: "keep_edric_alive",
      },
      {
        id: "let_garrick_kill_edric",
        label: "Let Garrick kill Edric",
        aliases: ["kill Edric", "kill him", "let Garrick do it", "let him die", "he deserves to die", "do it Garrick"],
        target: "let_garrick_kill_edric",
      },
    ],
  },
  {
    id: "keep_edric_alive",
    nodeTitle: "Choice A — Keep Edric alive",
    title: "Keep Edric alive",
    label: "Choose a route",
    objective: "Turn left for the flooded passage or right for Garrick's stair.",
    interaction: "direction",
    leftTarget: "flooded_passage",
    rightTarget: "guard_stair",
  },
  {
    id: "let_garrick_kill_edric",
    nodeTitle: "Choice B — Let Garrick kill Edric",
    title: "Let Garrick kill Edric",
    label: "Choose a route",
    objective: "Turn left to search Edric or right for the Lantern Gate.",
    interaction: "direction",
    leftTarget: "search_dead",
    rightTarget: "lantern_gate",
  },
  {
    id: "flooded_passage",
    nodeTitle: "A1 — The flooded passage (pace showcase)",
    title: "The flooded passage",
    label: "Hold your pace",
    objective: "Keep the water from breaking your pace.",
    interaction: "pace",
    successTarget: "through_grate",
    failureTarget: "current_takes_mara",
  },
  {
    id: "guard_stair",
    nodeTitle: "A2 — The guard stair / cadence trial",
    title: "The guard stair",
    label: "Hold Garrick's cadence",
    objective: "Keep your simulated pace steady across the boards.",
    interaction: "pace",
    successTarget: "boards_hold",
    failureTarget: "stair_breaks",
  },
  {
    id: "search_dead",
    nodeTitle: "B1 — Search the dead / stop trial",
    title: "Search the dead",
    label: "Stop in the shadows",
    objective: "Stop while the patrol lantern crosses.",
    interaction: "stop",
    successTarget: "map_in_lining",
    failureTarget: "empty_hands",
  },
  {
    id: "lantern_gate",
    nodeTitle: "B2 — Force the lantern gate / pace trial",
    title: "Force the Lantern Gate",
    label: "Keep Garrick with you",
    objective: "Hold your pace until Garrick clears the gate.",
    interaction: "pace",
    successTarget: "unread_ledger",
    failureTarget: "garrick_cut_off",
  },
  {
    id: "through_grate",
    nodeTitle: "A1A — Through the grate",
    title: "Through the grate",
    label: "Answer Mara",
    objective: "Tell Mara whether you trust Edric to open the Vault.",
    interaction: "vocal",
    vocalOptions: yesNo("Trust Edric", "Do not trust Edric"),
    terminal: true,
  },
  {
    id: "current_takes_mara",
    nodeTitle: "A1B — The current takes Mara",
    title: "The current takes Mara",
    label: "Answer Mara",
    objective: "Choose whether to bind Mara's knee or keep moving.",
    interaction: "vocal",
    vocalOptions: [
      { id: "bind_knee", label: "Bind Mara's knee", aliases: ["bind", "knee", "stop", "treat", "help Mara"] },
      { id: "keep_moving", label: "Keep moving", aliases: ["move", "continue", "keep going", "no time"] },
    ],
    terminal: true,
  },
  {
    id: "boards_hold",
    nodeTitle: "A2A — The boards hold",
    title: "The boards hold",
    label: "Answer Garrick",
    objective: "Choose whether to place Thomas's token in Edric's hands.",
    interaction: "vocal",
    vocalOptions: yesNo("Give Edric the token", "Keep the token from Edric"),
    terminal: true,
  },
  {
    id: "stair_breaks",
    nodeTitle: "A2B — The stair breaks",
    title: "The stair breaks",
    label: "Answer Garrick",
    objective: "Say whether Edric saving Garrick changes what happens to him.",
    interaction: "vocal",
    vocalOptions: yesNo("It changes the judgment", "It changes nothing"),
    terminal: true,
  },
  {
    id: "map_in_lining",
    nodeTitle: "B1A — The map in the lining",
    title: "The map in the lining",
    label: "Answer Mara",
    objective: "Choose whether to follow Edric's route.",
    interaction: "vocal",
    vocalOptions: yesNo("Follow Edric's route", "Reject Edric's route"),
    terminal: true,
  },
  {
    id: "empty_hands",
    nodeTitle: "B1B — Empty hands",
    title: "Empty hands",
    label: "Answer Mara",
    objective: "Choose whether to descend using the chain.",
    interaction: "vocal",
    vocalOptions: yesNo("Take the chain", "Do not take the chain"),
    terminal: true,
  },
  {
    id: "unread_ledger",
    nodeTitle: "B2A — The unread ledger",
    title: "The unread ledger",
    label: "Answer Mara",
    objective: "Choose whether to press the key's mark against the first seal.",
    interaction: "vocal",
    vocalOptions: yesNo("Press the key to the seal", "Do not press the key"),
    terminal: true,
  },
  {
    id: "garrick_cut_off",
    nodeTitle: "B2B — Garrick is cut off",
    title: "Garrick is cut off",
    label: "Answer Mara",
    objective: "Choose whether to force the release wheel or search for another way.",
    interaction: "vocal",
    vocalOptions: [
      { id: "force_wheel", label: "Force the release wheel", aliases: ["force", "wheel", "turn it", "open it now"] },
      { id: "search", label: "Search for another way", aliases: ["search", "another way", "look around", "find another"] },
    ],
    terminal: true,
  },
];

function readManifest(): ManifestLine[] {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as { lines: ManifestLine[] };
  const unavailable = manifest.lines.filter((line) => line.status !== "ready" || !line.audioPath);
  if (unavailable.length) throw new Error(`Audio manifest has ${unavailable.length} unavailable lines`);
  return manifest.lines;
}

export function loadStory(baseUrl: string): StoryDefinition {
  const lines = readManifest();
  const nodes = configs.map(({ nodeTitle, ...config }) => {
    const nodeLines = lines
      .filter((line) => line.nodeTitle === nodeTitle)
      .sort((a, b) => a.index - b.index)
      .map((line) => {
        const relativePath = line.audioPath!.replace(/^story-audio\/greywatch\//, "");
        return {
          id: line.id,
          index: line.index,
          speaker: line.speaker,
          kind: line.kind,
          text: line.text,
          audioUrl: `${baseUrl}/audio/${relativePath.split(path.sep).map(encodeURIComponent).join("/")}`,
        };
      });
    if (!nodeLines.length) throw new Error(`No audio lines found for ${nodeTitle}`);
    return { ...config, lines: nodeLines } satisfies StoryNode;
  });

  return {
    id: "greywatch",
    title: "Greywatch",
    subtitle: "Blood in the Chapel",
    startNodeId: "root",
    paceToleranceSeconds: 15,
    nodes,
  };
}

export function nodeById(story: StoryDefinition, nodeId: string): StoryNode | undefined {
  return story.nodes.find((node) => node.id === nodeId);
}
