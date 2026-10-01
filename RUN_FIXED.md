# Forma AI - fixed portfolio version

## Objective coverage

### User Intake Dashboard
- `/dashboard` loads the latest active schema.
- `/form/:schemaId` loads a specific schema.
- AI Magic Input accepts freeform narrative and can pre-fill schema fields.
- Dynamic fields render from the stored JSON schema.
- `showIf` supports chained dependencies and nested `all` / `any` condition groups.
- Text, long text, email, date, number, select, radio, and checkbox fields are supported.
- Drafts can be saved locally and recovered from the backend, scoped to the signed-in user or anonymous browser.
- Final submissions are persisted for reviewer/admin access.
- The API validates submission fields, required values, formats, ranges, and conditional visibility before persisting.

### Admin & Reviewer Dashboard
- `/admin/dashboard` lets admins create, edit, switch between, and archive forms, and restore revisions.
- Archiving retains existing submissions and audit history.
- The claims overview supports filtering by form, inspecting submitted values, and marking claims reviewed.
- Submission rows expose status, average AI confidence, and manual-review flags.
- Existing immutable audit logging is preserved.

## Run

1. `npm install`
2. Copy `.env.example` to `.env`.
3. Set a long random `JWT_SECRET` and put your own OpenAI API key in `OPENAI_API_KEY`. The example key is intentionally a placeholder and is not treated as configured. Do not commit `.env`.
4. Set `MONGO_URI` to a MongoDB instance for persistent schemas, drafts, submissions, and audit logs. The in-memory fallback is for development only and loses data when the server stops.
5. Start backend: `npm run server`
6. Start frontend in another terminal: `npm run dev`
7. Open the Vite URL, normally `http://localhost:5173/dashboard`.

## AI

Configure OpenAI with `OPENAI_API_KEY` and optionally `OPENAI_MODEL` / `OPENAI_BASE_URL`. The AI panel reports which providers the backend detects. The key stays on the backend; it is never sent to the browser. Anthropic and OpenAI-compatible Ollama fallback providers are also supported.
