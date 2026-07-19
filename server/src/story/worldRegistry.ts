import type { StoryWorld } from "../models/types.js";
import { greywatchWorld } from "./worlds/greywatch/world.js";

const worlds: Record<string, StoryWorld> = {
  [greywatchWorld.id]: greywatchWorld,
};

export function getWorld(worldId: string): StoryWorld {
  const world = worlds[worldId];
  if (!world) {
    throw new Error(`Unknown worldId: ${worldId}`);
  }
  return world;
}

export function getDefaultWorld(): StoryWorld {
  return greywatchWorld;
}

export function listWorldIds(): string[] {
  return Object.keys(worlds);
}
