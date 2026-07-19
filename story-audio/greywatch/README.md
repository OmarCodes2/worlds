# Greywatch story audio

This folder is generated from `story-paths.html` by the ElevenLabs batch script.

## Regenerate audio

From the project root:

```bash
npm --prefix server run audio:generate
```

Regenerate one line using the stable ID shown beneath its playback control:

```bash
npm --prefix server run audio:generate -- --line <line-id> --force
```

Regenerate every line in one node:

```bash
npm --prefix server run audio:generate -- --node "Blood in the Chapel" --force
```

The generator is resumable. Current files with matching text, direction, and model settings are reused. Forced regeneration creates a new generation-numbered MP3 and updates `manifest.json` and `manifest.js`.

Secrets are read from the project-root `.env` file and are never written into the manifest or browser HTML.
