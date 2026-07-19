import type { StoryWorld } from "../../../models/types.js";
import { greywatchCharacters } from "./characters.js";
import { lockedStorageDoorScene } from "./scenes/locked_storage_door.js";

export const greywatchWorld: StoryWorld = {
  id: "greywatch",
  title: "Greywatch Castle",
  setting: "Greywatch Castle during an enemy siege; underground passages beneath the walls.",
  tone: "Gritty wartime urgency with moral ambiguity around trust and sacrifice.",
  synopsis:
    "Enemy soldiers entered after Edric opened the eastern gate. Garrick's brother Tomas was killed. The group — injured commander Mara, grieving Garrick, accused Edric, and soldier Rowan — flee through underground passages and reach a locked door with civilians behind it.",
  characters: greywatchCharacters,
  scenes: [lockedStorageDoorScene],
  defaultSceneId: lockedStorageDoorScene.id,
};
