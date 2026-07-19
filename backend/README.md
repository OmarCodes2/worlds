# Worlds backend

Serves the complete prerecorded Greywatch story and audio, maintains in-memory demo runs, resolves simulated movement inputs, and uses Gemini to classify authored vocal decisions from transcript text.

The mobile app performs speech recognition with the device's native recognizer. Only the resulting transcript is posted to this service; recordings and audio bytes are never sent to Gemini.

```bash
npm run dev
```

The backend reads `/Users/bakro/Documents/Worlds/.env`, uses `BACKEND_PORT` (default `3002`), and never exposes API keys to the mobile client. Port `3001` remains available to the legacy server.

Core endpoints:

- `GET /api/health`
- `GET /api/stories`
- `GET /api/stories/greywatch`
- `POST /api/runs`
- `POST /api/runs/:runId/resolve`
- `POST /api/runs/:runId/vocal-decision`
- `GET /audio/*`

Vocal requests are JSON only:

```json
{ "transcript": "Search for another way" }
```

Gemini receives that text and the current node's authored option IDs. Multipart audio uploads are intentionally rejected.
