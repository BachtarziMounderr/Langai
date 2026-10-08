# Student demo V1 · step 10.5

This short vertical slice demonstrates the link between structured lessons and AI conversation. The existing Student workspace and context routing remain in place.

## What works

- `/student/learn` presents two short courses: English B1 **Past experiences** and German A2 **Everyday situations**. Each has two readable lessons and a scored multiple-choice exercise.
- Exercise feedback appears immediately. Results are kept in browser `sessionStorage`, keyed by authenticated user and selected context. Dashboard and progress pages update when the learner returns. Refreshing the tab preserves results; closing the browser session or clearing site data resets them.
- `/student/practice` offers four scenarios. A learner can type a turn or record a short voice message. FastAPI checks the active Student context, sends the turn to Gemini, and returns a transcription, short AI reply, and, when available, Gemini TTS audio. The browser reads the same AI text with its local speech engine if Gemini TTS is unavailable. This is **turn-based**, not real-time voice streaming.
- The dashboard highlights the two paths, language progress, review preview, activity, recent exercise score and concepts to revisit.
- The Academic Path now shows the actual `Past Simple — Student Worksheet` supplied for the demo. The student can open it in `/student/learn/resources/past-simple-a1-worksheet`, read it in the browser's native PDF viewer, open a new tab, or download it. Its A1 metadata is displayed explicitly even though the linked demo course is English B1.
- The dashboard and Student routes use short page-entry animations; progress and weekly bars grow into place, and exercise, microphone, AI-thinking, and audio playback states have visual feedback. `prefers-reduced-motion` turns off nonessential motion.

## Demo data and limits

Course content, base progress, reviews, weekly activity, and scenario descriptions live in `frontend/src/features/student/demo-data/index.ts`. The four scenario IDs and their safe prompt context are also registered server-side in `backend/app/modules/ai_demo/routes.py`, so the browser cannot choose an arbitrary AI prompt. English and German are data entries, not separate product implementations. All course content is shared demo material; no school content is exposed.

**DEMO RESOURCE — NOT PRODUCTION STORAGE.** The worksheet is a byte-for-byte copy of the supplied local PDF in `frontend/public/demo-resources/Past-Simple-A1-Students-worksheet.pdf`; the source at the repository root is unchanged. The resource metadata and visible course association live in `frontend/src/features/student/demo-data/index.ts`. The viewer page inherits Student routing protection, but files under `public/` are publicly addressable by URL. This is suitable only for this non-private demonstration file. Private school PDFs need the future authorized backend/S3 file flow.

Exercise results are interactive but are **not** stored in PostgreSQL and do not implement the final learning engine, SRS, 70% rule, or course completion rules. Review counts and weekly activity are illustrative and do not change. Conversations are not persisted. Audio is returned directly for each turn; the S3/TTS cache described in the broader MVP guide is deferred beyond this demo.

## Gemini setup

1. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey). Check the [current pricing and model availability](https://ai.google.dev/gemini-api/docs/pricing) for your account and region.
2. Add `GEMINI_API_KEY=...` to the **ignored root `.env`** on your own machine. Do not add it to `.env.example`, a frontend variable, Git, screenshots, or issue comments.
3. The backend defaults to `GEMINI_MODEL=gemini-3.8-flash` and `GEMINI_TTS_MODEL=gemini-3.8-flash-lite-tts`. Compose passes these only to the backend container. The official `google-genai` SDK creates the client server-side; the browser never receives the key. Text replies use a validated JSON schema. If TTS fails, the browser can read the text with its local speech engine.
4. If Google returns `403 PERMISSION_DENIED` with “Your project has been denied access,” check the project associated with the API key in Google AI Studio and Google Cloud Console. This is a project-access decision outside the app. A `404` for a model means that model ID must be updated.
5. Run `docker compose up --build -d` from the repository root, then sign in with the existing Student DEV fixture and open `/student/practice`.

Without a key the conversation panel shows a configuration error; lessons and exercises still work. Microphone access needs browser permission and `localhost` or HTTPS. Recordings are limited to 1.5 MB and short turns. Gemini quota, model access and TTS availability can vary. The server never logs or persists the audio in this demo.

The local demo account is provisioned through `backend/app/modules/identity/dev_cli.py` and the ignored `backend/.env.dev-fixtures`. Use the existing fixture instructions in `docs/routing-and-context.md`; do not copy the fixture password into tracked documentation.

## API boundary

`POST /api/v1/student/demo/conversation` accepts a validated context ID, one registered scenario, a short text or Base64 audio message, and at most six short prior turns. It requires a bearer token and re-resolves the user's active Student context in the database. The API key remains in FastAPI. No schema migration is needed.

References: `CAHIER DES CHARGES V1.docx` and `Guide_MVP_Plateforme_Langues_Scalable.pdf` supplied with the project; [Gemini audio understanding](https://ai.google.dev/gemini-api/docs/generate-content/audio) and [Gemini speech generation](https://ai.google.dev/gemini-api/docs/speech-generation).
