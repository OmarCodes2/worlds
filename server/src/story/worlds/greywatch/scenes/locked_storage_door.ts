import type { StoryScene } from "../../../../models/types.js";

export const lockedStorageDoorScene: StoryScene = {
  id: "locked_storage_door",
  title: "The Locked Storage Door",
  summary:
    "The group moves through underground passages beneath Greywatch Castle during an enemy siege. They reach a locked storage door. Frightened civilians can be heard behind it. Edric says these are the people he opened the eastern gate to save. Opening the door will slow the group and let pursuing soldiers get closer. Mara asks Rowan what to do.",
  stakes:
    "Open the door and risk the pursuit catching up, or leave civilians behind. Trust in Edric hangs in the balance after Tomas's death at the eastern gate.",
  openingDialogue: [
    { speaker: "Garrick", text: "Stop." },
    { speaker: "Mara", text: "What is it?" },
    { speaker: "Garrick", text: "Voices." },
    { speaker: "Edric", text: "They're still here." },
    { speaker: "Garrick", text: "Who?" },
    { speaker: "Edric", text: "The people from the eastern road." },
    { speaker: "Garrick", text: "You expect us to believe that?" },
    { speaker: "Edric", text: "I opened the gate for them." },
    { speaker: "Garrick", text: "And the soldiers came through behind them." },
    { speaker: "Mara", text: "Rowan. What do we do?" },
  ],
  initialStoryState: {
    location: "underground_storage_corridor",
    doorStatus: "locked",
    civiliansBehindDoor: true,
    pursuitNearby: true,
    maraInjured: true,
    tomasDead: true,
    easternGateOpenedBy: "Edric",
  },
  initialFacts: [
    "Greywatch Castle is under siege.",
    "Edric opened the eastern gate; enemy soldiers entered; Tomas was killed.",
    "Edric claims he opened the gate to save civilians trapped outside.",
    "The group is in underground passages with enemy soldiers searching for them.",
    "Civilians can be heard behind a locked storage door.",
    "Edric claims those civilians are the people from the eastern road.",
    "Opening the door will slow the group and allow pursuers to get closer.",
  ],
  defaultPaceChallenge: {
    active: false,
    targetMinSecondsPerKm: 380,
    targetMaxSecondsPerKm: 405,
    requiredDurationSeconds: 60,
    narrativePurpose: "Stay with the group after the door decision.",
  },
};
