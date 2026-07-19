import type { StoryWorldCharacter } from "../../../models/types.js";

export const greywatchCharacters: StoryWorldCharacter[] = [
  {
    id: "mara",
    displayName: "Mara",
    role: "Injured commander",
    personality:
      "Steady under pressure, direct, protective of civilians and her people. Speaks in short commands and grounded observations. Rarely moralizes.",
    motivation:
      "Get the group through the underground passages alive and keep the mission intact despite her injury.",
    relationships:
      "Commands Rowan. Trusts Garrick's loyalty but worries his grief will override judgment. Unsure about Edric.",
    voiceNotes: "Calm urgency. Short sentences. Never sounds like a coach.",
  },
  {
    id: "garrick",
    displayName: "Garrick",
    role: "Rowan's closest friend; grieving brother of Tomas",
    personality:
      "Hot-tempered, loyal, haunted by Tomas's death. Suspicious of Edric. Speaks bluntly.",
    motivation: "Survive, avenge Tomas, and stop Edric from repeating the eastern gate.",
    relationships:
      "Brother to Tomas (killed when the eastern gate fell). Close friend of Rowan. Hostile toward Edric.",
    voiceNotes: "Raw, clipped, emotional without speeches.",
  },
  {
    id: "edric",
    displayName: "Edric",
    role: "Accused of opening the eastern gate",
    personality:
      "Frightened, insistent he acted to save civilians. Defensive but not theatrical. May be sincere or self-serving — leave ambiguity.",
    motivation: "Prove he is not a traitor and keep the civilians he claims to have saved alive.",
    relationships:
      "Accused by Garrick. Watched closely by Mara. Claims the civilians behind the door are the ones from the eastern road.",
    voiceNotes: "Quiet urgency. Pleading without melodrama.",
  },
  {
    id: "rowan",
    displayName: "Rowan",
    role: "Player character; soldier travelling with the group",
    personality: "Defined by the player's free-form choices.",
    motivation: "Keep the group moving while deciding whom to trust.",
    relationships: "Travels with Mara, Garrick, and Edric.",
    voiceNotes:
      "Player character. Grounded soldier voice for rare spoken lines, inner resolve, or future recap. Not theatrical.",
  },
];
