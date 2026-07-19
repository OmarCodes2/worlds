# Worlds

## Run the Story

Worlds is an audio-first running game where the runner becomes an active character inside a premium authored story.

The product turns real-world movement into story input. The runner does not simply listen to a fixed episode while running. Their direction, pace, distance, stops, and physical performance influence what happens next.

Examples:

- Turning left can select the forest path.
- Turning right can approach a village or fortress.
- Running faster can help escape an enemy.
- Slowing down can trigger stealth or investigation.
- Stopping can uncover an optional scene, resource, or character interaction.
- Failing a challenge can injure a character, lose supplies, alter trust, or create a more difficult path forward.

The central product idea is:

> Premium authored adventures where your run controls the story.

The core tagline is:

> Run the Story.

---

# Product Positioning

Worlds should not be described as an AI-generated audiobook or a generic story generator.

It is a platform for premium authored story worlds that adapt to the runner.

The writer, creator, studio, or brand defines:

- The world
- The characters
- The tone
- The important relationships
- The core mission
- Major plot points
- Important reveals
- Canonical lore
- Possible character deaths
- Major consequences
- The climax
- The ending space

AI does not replace the writer.

AI acts as the live game director inside the authored world.

It can decide:

- Which compatible scene happens next
- How a character reacts to the runner
- How difficult a challenge should be
- How the story should respond to success or failure
- How to shorten or extend the story based on run length
- Which previous decisions should be referenced
- How the emotional tone should change
- How characters should speak while preserving their personalities
- How the end-of-run recap should reflect the runner’s exact journey

The core philosophy is:

> The world is authored. The experience is adaptive.

Another important framing line is:

> The writer creates the world. The runner determines the story.

---

# The Problem

Traditional running apps are mostly performance tools.

They focus on:

- Pace
- Distance
- Heart rate
- Routes
- Personal records
- Training plans

These tools are useful, but running can still feel repetitive, clinical, and mentally unrewarding.

Narrative running apps have already proven that people are willing to run for a story. Products such as Zombies, Run! demonstrate clear demand for immersive audio-based fitness experiences.

However, existing narrative running experiences are still largely linear. The runner listens to a story that mostly plays around them. Their route and physical behaviour have limited influence over the characters, scenes, and outcomes.

Worlds changes the relationship between the run and the story.

The story does not merely accompany the run.

The run directs the story.

---

# Target User

The primary target user is a story- and game-motivated person who wants running to feel less repetitive.

This includes:

- Beginner runners who struggle with motivation
- Casual runners who find standard fitness apps boring
- Gamers who dislike conventional cardio
- Existing runners looking for entertainment
- Audiobook and podcast listeners
- Fans of fantasy, horror, science fiction, mystery, and adventure
- Users of existing narrative fitness products who want greater agency
- Fans of creators, franchises, and entertainment brands

The initial audience should not be framed only as beginners.

A useful user definition is:

> People who are physically capable of running but need entertainment, immersion, and narrative agency to make the experience compelling.

---

# The Experience

A runner opens Worlds and selects a story world.

The story may be an original campaign, a creator collaboration, or eventually a licensed entertainment universe.

Before starting, the runner may choose a target duration or distance.

Once the run begins, the experience is primarily delivered through:

- Expressive character dialogue
- Narration
- Background music
- Ambience
- Sound effects
- Minimal visual feedback

The runner is an active character inside the story.

The app may present an in-world choice such as:

> “The forest could hide us. The village may still have horses. The mountain road is exposed, but it leads north.”

The runner chooses through movement.

A left turn may enter the forest.

A right turn may approach the village.

Continuing straight may take the mountain road.

Later, the runner may hear:

> “They found us. Move!”

Increasing pace becomes a chase mechanic.

A later scene may say:

> “Torches ahead. Quiet your steps.”

Slowing down becomes a stealth mechanic.

The app should avoid breaking immersion with robotic instructions such as:

- Press left
- Select an option
- Sprint for ten seconds
- Slow down now

The world should communicate the mechanic naturally.

---

# Story Design Philosophy

Worlds should use premium authored stories rather than unlimited freeform generation.

The story should be structured around authored scenes and major beats.

The AI may adapt transitions, reactions, pacing, and consequences, but it should not freely invent plot-critical material.

The preferred narrative structure is foldback branching.

This means:

- Choices create meaningful differences
- Different routes and encounters are possible
- Characters may react differently
- Resources or relationships may change
- A character may be injured, saved, or lost
- The same major story arc can reconverge around authored plot points

This preserves quality while still allowing replayability.

A single story may contain:

- Multiple route choices
- Different encounters
- Success and failure states
- Optional discoveries
- Different character reactions
- Different consequences
- A shared major climax
- A personalized ending state

The same mission should feel different across runs without becoming incoherent.

---

# Persistent Campaign Vision

In the long-term product, stories can continue across multiple runs.

The user does not need to select a rigid episode every time.

Instead, they can select how long they want to run.

Examples:

- A 15-minute run reaches a small objective and cliffhanger.
- A 30-minute run includes additional encounters.
- A 45-minute run reaches a major story milestone.
- A recovery run becomes a stealth or exploration sequence.
- Interval training becomes a chase or battle.
- A long run becomes a multi-stage journey.

The AI director uses the runner’s planned duration and existing campaign state to decide how much of the authored world to surface.

Persistent story state may include:

- Story progress
- Previous decisions
- Character trust
- Character injuries
- Character deaths
- Resources
- Inventory
- Faction relationships
- Discovered locations
- Unresolved consequences

This is part of the product vision, even if the hackathon MVP only demonstrates a small portion of it.

---

# Brand and Content Vision

Worlds is designed as a platform for curated story experiences.

Possible content categories include:

- Worlds Originals
- Creator Worlds
- Featured Worlds
- Licensed Worlds
- Seasonal Worlds
- Multiplayer Worlds

The strongest long-term opportunity is collaboration with:

- Authors
- Game studios
- Film and television studios
- Anime and comic properties
- Musicians
- Fitness creators
- Entertainment brands

The product value to a partner is not simply another narrated episode.

It is:

> A world that fans can physically enter and influence through movement.

Brands and creators should retain control over:

- Canon
- Character behaviour
- Approved locations
- Allowed outcomes
- Voice casting
- Tone
- Safety boundaries
- Narrative rules

Worlds then turns those approved assets into a replayable, adaptive running experience.

---

# Hackathon Context

This project is being built for a hackathon.

The primary target prize is:

## ElevenLabs: Best Project Built with ElevenLabs

There is one winner.

The judging criteria are:

### Agentic Depth

Does the project go beyond simple text-to-speech?

Judges prioritize autonomous agents that handle complex logic and real-time dialogue.

Worlds should demonstrate that the AI is not merely reading generated text.

The AI game director should appear to:

- Maintain story state
- Track previous runner decisions
- React to pace, direction, stopping, and challenge outcomes
- Preserve character personalities
- Select compatible story scenes
- Generate context-aware dialogue
- Adjust emotional tone
- Produce a personalized recap

### Interaction Design

How lifelike is the experience?

Judges value:

- Low-latency reactions
- Emotional inflection
- Natural dialogue
- Believable character responses
- Immersive interaction

Worlds should feel like a living audio experience rather than an app issuing fitness commands.

### Technical Integration

How creatively is the ElevenLabs API used?

Judges especially value:

- Multimodal implementations
- Voice combined with other live inputs
- Clever prompt engineering
- Strong agent personalities

Worlds uses movement as the multimodal input layer.

Direction, pace, distance, stops, and performance become inputs to the AI director.

ElevenLabs is intended to support:

- Expressive character voices
- Multiple consistent characters
- Emotionally adaptive dialogue
- Live reactions
- Personalized recaps
- Music
- Sound effects
- Ambience

Voice is not an add-on to Worlds.

Voice is the primary interface and the core experience.

### Novelty

Judges want a use case they have not seen before that solves a real-world problem through conversational AI.

The novelty of Worlds is not simply AI storytelling.

The novelty is:

> A premium authored story controlled through real-world movement, with an AI director adapting characters, consequences, and pacing in real time.

The real-world problem is that many people find running repetitive and struggle to stay motivated.

Worlds creates motivation during the run by giving every physical action a narrative purpose.

### Prize

Each member of the winning team receives:

- Six months of the ElevenLabs Scale tier
- Approximately $1,794 in value per team member
- 1.8 million credits per month

---

# What the Demo Must Prove

The hackathon demo should prove the product concept emotionally before explaining it technically.

The strongest demo sequence is:

1. The user selects a premium story.
2. A cinematic scene begins immediately.
3. Music, ambience, and expressive character dialogue create urgency.
4. The story presents a meaningful route choice.
5. The user changes direction.
6. The visible route changes.
7. The character immediately acknowledges the decision.
8. A pace challenge begins.
9. The user speeds up or slows down.
10. The story reacts to success or failure.
11. The user stops or continues at an optional moment.
12. The story reaches a cinematic climax.
13. The final recap references the user’s exact decisions.

The audience should understand:

- The runner is not following the story.
- The runner is controlling it.
- The story remembers what happened.
- The AI is directing an authored world.
- ElevenLabs makes the world feel alive.

---

# Demo and Product Principles

## Audio first

Audio is the primary experience.

Visuals should support the story without competing with it.

## Movement is the interface

The user should not need to stare at the screen, type, or constantly speak while running.

## Authored quality over AI volume

The goal is not infinite generated content.

The goal is premium authored content with meaningful adaptation.

## AI as director, not replacement writer

The AI should preserve the world rather than invent random lore.

## Immediate reaction

The experience should react quickly enough to feel alive.

## Failure creates story

Failing a physical challenge should create consequences rather than simply ending the run.

## The runner is a character

The user should feel addressed by the world and responsible for what happens.

## One incredible experience beats broad scope

For the hackathon, one polished playable story is more valuable than many incomplete stories.

---

# UI and Frontend Design Authority

Any task that creates, changes, reviews, or discusses the user interface or frontend must use the Worlds UI and Brand Direction as a design authority.

This includes:

- Screens and navigation
- React Native, Expo, web, or other frontend components
- Layout, spacing, typography, color, icons, and imagery
- Active-run states and route visualization
- World cards, story discovery, pre-run, and recap experiences
- Motion, transitions, haptics, loading, empty, failure, and degraded states
- Product copy that appears in the interface
- Accessibility behavior
- UI-focused prototypes, demos, screenshots, and generated visual assets

The reference files are:

- `output/pdf/Worlds_UI_and_Brand_Direction.pdf` - visual and presentation authority
- `output/ui/Worlds_UI_and_Brand_Direction.docx` - editable reference document
- `tools/build_worlds_ui_guide.py` - source used to rebuild the document

## Required frontend workflow

Before making a frontend or UI change:

1. Read the relevant sections of the UI and Brand Direction.
2. Identify the existing design tokens, interaction rules, component behavior, and copy principles that apply.
3. Inspect the current implementation before introducing a new pattern.
4. Build the change as an extension of the documented system rather than as a standalone visual idea.

While implementing:

- Preserve the document's core direction: cinematic content, athletic operation, strong hierarchy, restrained color, and low cognitive load while moving.
- Treat audio as the primary interface and the screen as confirmation.
- Keep movement as the control surface. Do not turn movement choices into conventional multiple-choice UI.
- Use the documented typography, color, spacing, component, motion, haptic, voice, and accessibility rules.
- Keep the active-run experience route-first and glanceable in under one second.
- Present failure as story consequence rather than punishment, score loss, or a retry modal.
- Keep the parent Worlds interface genre-neutral; individual story art may carry genre expression.
- Borrow NRC's interaction discipline only. Do not copy proprietary artwork, icons, wording, exact compositions, branded typefaces, or distinctive trade dress.

If a requested UI change conflicts with the guide, do not silently create a second design system. State the conflict and either adapt the change to the existing direction or explicitly update the design direction when the user wants the standard to change.

When a frontend decision changes or adds a reusable design rule, token, component state, screen pattern, or interaction principle:

1. Update `tools/build_worlds_ui_guide.py` so the decision becomes part of the maintained source.
2. Rebuild both the DOCX and PDF references.
3. Render and visually inspect the complete document before treating the update as finished.
4. Keep the filenames and paths above stable so future agents always find the current authority.

Minor implementation work that already follows a documented rule does not require rewriting the guide, but it still requires consulting and following it.

The user's explicit instructions always take precedence. If the user deliberately changes the visual direction, update this reference system rather than leaving the implementation and guide inconsistent.

---

# Current MVP Product Scope

The current product concept for the hackathon includes:

- One playable premium authored story
- A library that suggests multiple future worlds
- A mobile-first runner experience
- A moving route visualization
- Direction choices
- Pace changes
- Stop and resume decisions
- A small authored branching structure
- At least one meaningful success or failure consequence
- Expressive ElevenLabs character voices
- Music and selected sound effects
- Short adaptive dialogue
- A state-aware personalized recap
- A platform vision for originals, creators, and brand collaborations

The exact story, genre, characters, and plot are not yet finalized.

The story should be selected based on which concept creates the strongest emotional hook in the first ten seconds and the clearest interactive demo.

---

# Out of Scope for This Document

This document intentionally does not define technical implementation.

Do not assume decisions yet regarding:

- Backend architecture
- Expo architecture
- API routes
- Data models
- Story engine code
- Audio playback libraries
- GPS implementation
- Pace calculation
- Database design
- Deployment
- Caching
- Networking
- File structure

Those decisions will be specified separately.

This file exists to give an AI agent a shared understanding of:

- What Worlds is
- Why it exists
- How it is positioned
- How AI should be used
- Why ElevenLabs is central
- What the hackathon demo must communicate
- What should remain authored versus adaptive

---

# Final Summary

Worlds is an audio-first running game built around premium authored story worlds.

The runner becomes an active character and controls the experience through movement.

Direction chooses paths.

Pace changes encounters.

Stops uncover moments.

Success and failure create consequences.

The AI maintains state, directs the authored story, preserves character personalities, and generates context-aware reactions.

ElevenLabs provides the voices, emotion, music, sound, and immediacy that make the world feel alive.

The key message is:

> Worlds is not a story you listen to while running.
>
> It is a story you run.
